import Stripe from "stripe";
import { assertStripeTestObject } from "@/lib/assinatura/config";
import type { CheckoutInput, RemoteCheckout, RemoteCustomer, RemoteInvoice, RemoteInvoiceReference, RemoteSubscription, StripeGateway } from "./contrato";

type Config = { secretKey: string; priceId: string; origin: string };
export class StripeEvidenceError extends Error { constructor(public readonly code: string) { super(code); } }
function reject(code: string): never { throw new StripeEvidenceError(code); }
function id(value: string | { id: string } | null | undefined): string {
  if (typeof value === "string" && value) return value;
  if (value && typeof value === "object" && typeof value.id === "string" && value.id) return value.id;
  return reject("missing_id");
}
function iso(value: number): string { if (!Number.isSafeInteger(value) || value < 0) reject("invalid_period"); return new Date(value * 1000).toISOString(); }
function safeUrl(raw: string, origin: string, path: string): void {
  let url: URL;
  try { url = new URL(raw); } catch { return reject("invalid_url"); }
  if (url.origin !== origin || url.username || url.password || url.pathname !== path) reject("invalid_url");
}
function metadata(value: Stripe.Metadata | null | undefined, field: string): string {
  const text = value?.[field];
  if (!text || typeof text !== "string") reject("missing_metadata");
  return text;
}
function onlyMetadata(value: Stripe.Metadata | null | undefined, allowed: readonly string[]): void {
  if (Object.keys(value ?? {}).some(key => !allowed.includes(key))) reject("unexpected_metadata");
}
const statuses = ["incomplete", "incomplete_expired", "trialing", "active", "past_due", "unpaid", "paused", "canceled"] as const;
function status(value: string): RemoteSubscription["status"] {
  const found = statuses.find(s => s === value);
  return found ?? reject("unsupported_subscription_status");
}

export function createStripeGateway(config: Config, api: Stripe = new Stripe(config.secretKey, { apiVersion: "2026-08-26.dahlia" })): StripeGateway {
  async function checkPrice() {
    const p = await api.prices.retrieve(config.priceId);
    assertStripeTestObject(p);
    if (p.id !== config.priceId || !p.active || p.currency !== "brl" || p.type !== "recurring" || p.recurring?.interval !== "month" || p.recurring.interval_count !== 1 || p.recurring.usage_type !== "licensed") reject("invalid_price");
  }
  async function normalizeCustomer(c: Stripe.Customer | Stripe.DeletedCustomer, workspaceId?: string): Promise<RemoteCustomer> {
    if ("deleted" in c && c.deleted) reject("deleted_customer");
    if (!("metadata" in c)) reject("deleted_customer");
    assertStripeTestObject(c);
    onlyMetadata(c.metadata, ["workspace_id"]);
    const owner = metadata(c.metadata, "workspace_id");
    if (workspaceId && owner !== workspaceId) reject("wrong_customer");
    return { id: c.id, livemode: false, workspaceId: owner };
  }
  async function linePrice(sessionId: string): Promise<string> {
    const prices: string[] = [];
    let startingAfter: string | undefined;
    do {
      const page = await api.checkout.sessions.listLineItems(sessionId, { limit: 100, ...(startingAfter ? { starting_after: startingAfter } : {}) });
      for (const line of page.data) {
        if (line.quantity !== 1 || !line.price) reject("invalid_checkout_line");
        assertStripeTestObject(line.price);
        prices.push(line.price.id);
      }
      if (!page.has_more) break;
      startingAfter = page.data.at(-1)?.id;
      if (!startingAfter) reject("invalid_pagination");
    } while (true);
    if (prices.length !== 1 || prices[0] !== config.priceId) reject("invalid_checkout_price");
    return prices[0];
  }
  async function normalizeCheckout(s: Stripe.Checkout.Session): Promise<RemoteCheckout> {
    assertStripeTestObject(s);
    if (s.mode !== "subscription" || !s.status || !["open", "complete", "expired"].includes(s.status)) reject("invalid_checkout_status");
    const workspaceId = metadata(s.metadata, "workspace_id");
    const attemptId = metadata(s.metadata, "attempt_id");
    onlyMetadata(s.metadata, ["workspace_id", "attempt_id"]);
    const expectedSuccess = `${config.origin}/app/billing/retorno?attempt=${attemptId}`;
    const expectedCancel = `${config.origin}/app/billing/retorno?attempt=${attemptId}&cancel=1`;
    if (s.success_url !== expectedSuccess || s.cancel_url !== expectedCancel) reject("invalid_checkout_url");
    safeUrl(s.success_url, config.origin, "/app/billing/retorno");
    safeUrl(s.cancel_url, config.origin, "/app/billing/retorno");
    const customerId = id(s.customer);
    const customer = await api.customers.retrieve(customerId);
    await normalizeCustomer(customer, workspaceId);
    const priceId = await linePrice(s.id);
    return { id: s.id, url: s.url, livemode: false, status: s.status as "open" | "complete" | "expired", subscriptionId: s.subscription ? id(s.subscription) : null, customerId, workspaceId, attemptId, priceId, expiresAt: iso(s.expires_at) };
  }
  async function normalizeSubscription(s: Stripe.Subscription): Promise<RemoteSubscription> {
    assertStripeTestObject(s);
    const customerId = id(s.customer);
    const customer = await normalizeCustomer(await api.customers.retrieve(customerId));
    onlyMetadata(s.metadata, ["workspace_id", "attempt_id"]);
    if (metadata(s.metadata, "workspace_id") !== customer.workspaceId || !metadata(s.metadata, "attempt_id")) reject("wrong_subscription_owner");
    let items = [...s.items.data];
    let startingAfter = items.at(-1)?.id;
    while (s.items.has_more && startingAfter) {
      const page = await api.subscriptionItems.list({ subscription: s.id, limit: 100, starting_after: startingAfter });
      items = items.concat(page.data);
      if (!page.has_more) break;
      startingAfter = page.data.at(-1)?.id;
      if (!startingAfter) reject("invalid_pagination");
    }
    if (items.length !== 1) reject("ambiguous_subscription_items");
    const item = items[0];
    assertStripeTestObject(item.price);
    if (item.price.id !== config.priceId || item.quantity !== 1) reject("invalid_subscription_price");
    if (item.current_period_end <= item.current_period_start) reject("invalid_period");
    return { id: s.id, livemode: false, customerId, status: status(s.status), priceId: item.price.id, subscriptionItemId: item.id, cancelAtPeriodEnd: s.cancel_at_period_end, periodStart: iso(item.current_period_start), periodEnd: iso(item.current_period_end), latestInvoiceId: s.latest_invoice ? id(s.latest_invoice) : null };
  }
  async function invoiceReference(invoice: Stripe.Invoice): Promise<RemoteInvoiceReference> {
    assertStripeTestObject(invoice);
    if (invoice.parent?.type !== "subscription_details" || !invoice.parent.subscription_details) reject("invalid_invoice_parent");
    return { id: invoice.id, livemode: false, customerId: id(invoice.customer), subscriptionId: id(invoice.parent.subscription_details.subscription), billingReason: invoice.billing_reason, paid: invoice.status === "paid" };
  }
  return {
    async ensureCustomer(workspaceId, key) {
      const created = await api.customers.create({ metadata: { workspace_id: workspaceId } }, { idempotencyKey: key });
      return normalizeCustomer(created, workspaceId);
    },
    async getCustomer(customerId) { return normalizeCustomer(await api.customers.retrieve(customerId)); },
    async createCheckout(input: CheckoutInput, key) {
      await checkPrice();
      await normalizeCustomer(await api.customers.retrieve(input.customerId), input.workspaceId);
      const expectedSuccess = `${config.origin}/app/billing/retorno?attempt=${input.attemptId}`;
      const expectedCancel = `${config.origin}/app/billing/retorno?attempt=${input.attemptId}&cancel=1`;
      if (input.priceId !== config.priceId || input.successUrl !== expectedSuccess || input.cancelUrl !== expectedCancel) reject("invalid_checkout_input");
      const meta = { workspace_id: input.workspaceId, attempt_id: input.attemptId };
      const created = await api.checkout.sessions.create({ mode: "subscription", ui_mode: "hosted_page", customer: input.customerId, payment_method_types: ["card"], line_items: [{ price: config.priceId, quantity: 1 }], metadata: meta, subscription_data: { metadata: meta }, success_url: input.successUrl, cancel_url: input.cancelUrl }, { idempotencyKey: key });
      return normalizeCheckout(created);
    },
    async getCheckout(sessionId) { return normalizeCheckout(await api.checkout.sessions.retrieve(sessionId)); },
    async expireCheckout(sessionId) {
      let raw: Stripe.Checkout.Session;
      try { raw = await api.checkout.sessions.expire(sessionId); }
      catch { raw = await api.checkout.sessions.retrieve(sessionId); }
      const session = await normalizeCheckout(raw);
      if (session.status === "open") reject("checkout_expiration_unconfirmed");
      return session;
    },
    async listCurrentSubscriptions(customerId) {
      const customer = await normalizeCustomer(await api.customers.retrieve(customerId));
      if (customer.id !== customerId) reject("wrong_customer");
      const result: RemoteSubscription[] = [];
      let startingAfter: string | undefined;
      do {
        const page = await api.subscriptions.list({ customer: customerId, status: "all", limit: 100, ...(startingAfter ? { starting_after: startingAfter } : {}) });
        for (const s of page.data) {
          if (s.status !== "canceled" && s.status !== "incomplete_expired") result.push(await normalizeSubscription(s));
        }
        if (!page.has_more) break;
        startingAfter = page.data.at(-1)?.id;
        if (!startingAfter) reject("invalid_pagination");
      } while (true);
      return result;
    },
    async getSubscription(id) { return normalizeSubscription(await api.subscriptions.retrieve(id)); },
    async getInvoiceReference(id) { return invoiceReference(await api.invoices.retrieve(id)); },
    async getPaidInvoice(invoiceId): Promise<RemoteInvoice> {
      const invoice = await api.invoices.retrieve(invoiceId);
      const ref = await invoiceReference(invoice);
      if (!ref.paid) reject("invoice_not_paid");
      if (ref.billingReason !== "subscription_create" && ref.billingReason !== "subscription_cycle") reject("invoice_reason_not_allowed");
      const subscription = await normalizeSubscription(await api.subscriptions.retrieve(ref.subscriptionId));
      if (subscription.customerId !== ref.customerId) reject("wrong_invoice_customer");
      const eligible: Stripe.InvoiceLineItem[] = [];
      let startingAfter: string | undefined;
      do {
        const page = await api.invoices.listLineItems(invoiceId, { limit: 100, ...(startingAfter ? { starting_after: startingAfter } : {}) });
        for (const line of page.data) {
          assertStripeTestObject(line);
          if (line.parent?.type !== "subscription_item_details" || !line.parent.subscription_item_details || line.pricing?.type !== "price_details" || !line.pricing.price_details) continue;
          const parent = line.parent.subscription_item_details;
          if (parent.subscription !== ref.subscriptionId || parent.subscription_item !== subscription.subscriptionItemId || id(line.pricing.price_details.price) !== config.priceId) continue;
          if (parent.proration || line.quantity !== 1 || (line.subscription && id(line.subscription) !== ref.subscriptionId) || line.period.end <= line.period.start) reject("invalid_invoice_line");
          eligible.push(line);
        }
        if (!page.has_more) break;
        startingAfter = page.data.at(-1)?.id;
        if (!startingAfter) reject("invalid_pagination");
      } while (true);
      if (eligible.length !== 1) reject("ambiguous_invoice_lines");
      const line = eligible[0];
      return { ...ref, paid: true, billingReason: ref.billingReason, subscriptionItemId: subscription.subscriptionItemId, priceId: config.priceId, lineId: line.id, periodStart: iso(line.period.start), periodEnd: iso(line.period.end) };
    },
    async listPaidInvoices(subscriptionId) {
      const result: RemoteInvoice[] = [];
      let startingAfter: string | undefined;
      do {
        const page = await api.invoices.list({ subscription: subscriptionId, limit: 100, ...(startingAfter ? { starting_after: startingAfter } : {}) });
        for (const invoice of page.data) {
          if (invoice.status !== "paid" || (invoice.billing_reason !== "subscription_create" && invoice.billing_reason !== "subscription_cycle")) continue;
          result.push(await this.getPaidInvoice(invoice.id));
        }
        if (!page.has_more) break;
        startingAfter = page.data.at(-1)?.id;
        if (!startingAfter) reject("invalid_pagination");
      } while (true);
      return result;
    },
    verifyEvent(rawBody, signature, secret) {
      let event: Stripe.Event;
      try { event = api.webhooks.constructEvent(rawBody, signature, secret); }
      catch { return reject("invalid_signature"); }
      if (event.livemode !== false || !event.id || !event.data.object || !("id" in event.data.object) || typeof event.data.object.id !== "string" || !event.data.object.id) reject("invalid_event");
      return { eventId: event.id, type: event.type, objectId: event.data.object.id, livemode: false };
    },
    async resolveRisk(kind, objectId) {
      const disputed = kind === "dispute" ? await api.disputes.retrieve(objectId) : null;
      if (disputed) assertStripeTestObject(disputed);
      const chargeId = disputed ? id(disputed.charge) : objectId;
      const charge = await api.charges.retrieve(chargeId);
      assertStripeTestObject(charge);
      const customerId = charge.customer ? id(charge.customer) : null;
      if (!customerId) return { kind: "unresolved", customerId: null };
      await normalizeCustomer(await api.customers.retrieve(customerId));
      const subscriptionIds = new Set<string>();
      let unresolved = false;
      async function inspect(payment: Stripe.InvoicePayment) {
        assertStripeTestObject(payment);
        const invoiceId = id(payment.invoice);
        const ref = await invoiceReference(await api.invoices.retrieve(invoiceId));
        if (ref.customerId !== customerId) unresolved = true;
        else subscriptionIds.add(ref.subscriptionId);
      }
      if (charge.payment_intent) {
        const paymentIntentId = id(charge.payment_intent);
        let startingAfter: string | undefined;
        do {
          const page = await api.invoicePayments.list({ payment: { type: "payment_intent", payment_intent: paymentIntentId }, limit: 100, ...(startingAfter ? { starting_after: startingAfter } : {}) });
          for (const payment of page.data) {
            if (payment.payment.type !== "payment_intent" || !payment.payment.payment_intent || id(payment.payment.payment_intent) !== paymentIntentId) { unresolved = true; continue; }
            await inspect(payment);
          }
          if (!page.has_more) break;
          startingAfter = page.data.at(-1)?.id;
          if (!startingAfter) reject("invalid_pagination");
        } while (true);
      } else {
        // Legacy charges have no charge filter. Inspect each known invoice payment for this Customer.
        let startingAfter: string | undefined;
        do {
          const page = await api.invoices.list({ customer: customerId, limit: 100, ...(startingAfter ? { starting_after: startingAfter } : {}) });
          for (const invoice of page.data) {
            let paymentAfter: string | undefined;
            do {
              const payments = await api.invoicePayments.list({ invoice: invoice.id, limit: 100, ...(paymentAfter ? { starting_after: paymentAfter } : {}) });
              for (const payment of payments.data) if (payment.payment.type === "charge" && payment.payment.charge && id(payment.payment.charge) === chargeId) await inspect(payment);
              if (!payments.has_more) break;
              paymentAfter = payments.data.at(-1)?.id;
              if (!paymentAfter) reject("invalid_pagination");
            } while (true);
          }
          if (!page.has_more) break;
          startingAfter = page.data.at(-1)?.id;
          if (!startingAfter) reject("invalid_pagination");
        } while (true);
      }
      return unresolved || subscriptionIds.size === 0 ? { kind: "unresolved", customerId } : { kind: "resolved", customerId, subscriptionIds: [...subscriptionIds] };
    },
    async createPortal(customerId, workspaceId, configurationId, returnUrl) {
      safeUrl(returnUrl, config.origin, "/app/billing");
      if (returnUrl !== `${config.origin}/app/billing`) reject("invalid_url");
      await normalizeCustomer(await api.customers.retrieve(customerId), workspaceId);
      if (!configurationId.startsWith("bpc_")) reject("invalid_portal_configuration");
      const configuration = await api.billingPortal.configurations.retrieve(configurationId);
      assertStripeTestObject(configuration);
      const cancel = configuration.features.subscription_cancel;
      if (configuration.id !== configurationId || !configuration.active || configuration.features.subscription_update.enabled ||
        !cancel.enabled || cancel.mode !== "at_period_end" || cancel.proration_behavior !== "none" ||
        !configuration.features.invoice_history?.enabled || !configuration.features.payment_method_update?.enabled) reject("unsafe_portal_configuration");
      const session = await api.billingPortal.sessions.create({ customer: customerId, configuration: configurationId, return_url: returnUrl });
      assertStripeTestObject(session);
      if (id(session.customer) !== customerId || id(session.configuration) !== configurationId || session.return_url !== returnUrl) reject("invalid_portal_session");
      return { url: session.url };
    },
  };
}
