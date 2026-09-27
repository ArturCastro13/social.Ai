import Stripe from "stripe";
import { describe, expect, it } from "vitest";
import { createStripeGateway } from "@/lib/billing/stripe-adapter";

const workspaceId = "aa6ef591-f218-4ea7-9943-c16d019ca357";
const attemptId = "6287fd79-437d-42e7-a119-6818ffaf78a5";
const config = { secretKey: "sk_test_fixture", priceId: "price_monthly", origin: "https://example.test" };
const price = { id: "price_monthly", livemode: false, active: true, currency: "brl", type: "recurring", recurring: { interval: "month", interval_count: 1, usage_type: "licensed" } };
const customer = { id: "cus_owner", livemode: false, metadata: { workspace_id: workspaceId } };
const session = { id: "cs_test_1", livemode: false, mode: "subscription", status: "open", customer: customer.id, subscription: null, metadata: { workspace_id: workspaceId, attempt_id: attemptId }, success_url: `${config.origin}/app/billing/retorno?attempt=${attemptId}`, cancel_url: `${config.origin}/app/billing/retorno?attempt=${attemptId}&cancel=1`, url: "https://checkout.stripe.test/session", expires_at: 1_800_000_000 };
const subscription = { id: "sub_1", livemode: false, customer: customer.id, metadata: { workspace_id: workspaceId, attempt_id: attemptId }, status: "active", cancel_at_period_end: false, latest_invoice: "in_1", items: { data: [{ id: "si_1", price, quantity: 1, current_period_start: 1_772_323_200, current_period_end: 1_774_742_400 }], has_more: false } };
const invoice = { id: "in_1", livemode: false, customer: customer.id, status: "paid", billing_reason: "subscription_cycle", parent: { type: "subscription_details", subscription_details: { subscription: "sub_1" } } };
const invoiceLine = { id: "il_1", livemode: false, parent: { type: "subscription_item_details", subscription_item_details: { subscription: "sub_1", subscription_item: "si_1", proration: false } }, pricing: { type: "price_details", price_details: { price: "price_monthly" } }, quantity: 1, period: { start: 1_772_323_200, end: 1_774_742_400 }, subscription: "sub_1" };

function sdk(overrides: { price?: object; session?: object; expireSession?: object; subscription?: object; invoice?: object; lines?: object[]; linePages?: object[][]; portalConfiguration?: object } = {}): Stripe {
  const p = overrides.price ?? price;
  const s = overrides.session ?? session;
  const inv = overrides.invoice ?? invoice;
  const sub = overrides.subscription ?? subscription;
  const lines = overrides.lines ?? [invoiceLine];
  const linePages = overrides.linePages ?? [lines];
  return {
    prices: { retrieve: async () => p },
    customers: { retrieve: async () => customer, create: async () => customer },
    checkout: { sessions: { create: async () => s, retrieve: async () => s, expire: async () => overrides.expireSession ?? { ...s, status: "expired" }, listLineItems: async () => ({ data: [{ id: "li_1", price: p, quantity: 1 }], has_more: false }) } },
    subscriptions: { retrieve: async () => sub, list: async (params?: { price?: string }) => ({ data: params?.price && (sub as typeof subscription).items.data[0].price.id !== params.price ? [] : [sub], has_more: false }) },
    subscriptionItems: { list: async () => ({ data: [], has_more: false }) },
    invoices: { retrieve: async () => inv, listLineItems: async (...[, params]: [string, { starting_after?: string }?]) => {
      const index = params?.starting_after ? linePages.findIndex(page => page.some(line => (line as { id?: string }).id === params.starting_after)) + 1 : 0;
      return { data: linePages[index] ?? [], has_more: index < linePages.length - 1 };
    } },
    billingPortal: { configurations: { retrieve: async () => overrides.portalConfiguration ?? { id: "bpc_safe", livemode: false, active: true, features: { subscription_update: { enabled: false }, subscription_cancel: { enabled: true, mode: "at_period_end", proration_behavior: "none" } } } }, sessions: { create: async () => ({ livemode: false, customer: customer.id, configuration: "bpc_safe", return_url: `${config.origin}/app/billing`, url: "https://billing.stripe.test/portal" }) } },
  } as unknown as Stripe;
}

describe("Stripe SDK 22.6.2 mapping", () => {
  it("cria checkout com Price BRL mensal e metadados opacos", async () => {
    const gateway = createStripeGateway(config, sdk());
    const result = await gateway.createCheckout({ customerId: customer.id, priceId: config.priceId, workspaceId, attemptId, successUrl: session.success_url, cancelUrl: session.cancel_url }, "key-1");
    expect(result).toMatchObject({ id: session.id, priceId: config.priceId, workspaceId, attemptId, status: "open" });
  });

  it("recusa Price de ambiente live e sessão com URL externa", async () => {
    const live = createStripeGateway(config, sdk({ price: { ...price, livemode: true } }));
    await expect(live.createCheckout({ customerId: customer.id, priceId: config.priceId, workspaceId, attemptId, successUrl: session.success_url, cancelUrl: session.cancel_url }, "key-1")).rejects.toThrow();
    const external = createStripeGateway(config, sdk({ session: { ...session, success_url: "https://evil.test/callback" } }));
    await expect(external.getCheckout(session.id)).rejects.toThrow();
  });

  it("usa parent/pricing e período da linha paga, não período da fatura", async () => {
    const result = await createStripeGateway(config, sdk()).getPaidInvoice("in_1");
    expect(result).toMatchObject({ subscriptionId: "sub_1", subscriptionItemId: "si_1", priceId: "price_monthly", billingReason: "subscription_cycle", periodStart: "2026-03-01T00:00:00.000Z" });
  });

  it("segue páginas da fatura até a linha do Price autorizado", async () => {
    const unrelated = { ...invoiceLine, id: "il_other", pricing: { type: "price_details", price_details: { price: "price_other" } } };
    const result = await createStripeGateway(config, sdk({ linePages: [[unrelated], [invoiceLine]] })).getPaidInvoice("in_1");
    expect(result.lineId).toBe("il_1");
  });

  it("recusa fatura aberta e motivo não permitido", async () => {
    await expect(createStripeGateway(config, sdk({ invoice: { ...invoice, status: "open" } })).getPaidInvoice("in_1")).rejects.toMatchObject({ code: "invoice_not_paid" });
    await expect(createStripeGateway(config, sdk({ invoice: { ...invoice, billing_reason: "manual" } })).getPaidInvoice("in_1")).rejects.toMatchObject({ code: "invoice_reason_not_allowed" });
  });

  it("recusa portal com alteração de plano habilitada", async () => {
    const gateway = createStripeGateway(config, sdk({ portalConfiguration: { id: "bpc_safe", livemode: false, active: true, features: { subscription_update: { enabled: true }, subscription_cancel: { enabled: false } } } }));
    await expect(gateway.createPortal(customer.id, workspaceId, "bpc_safe", `${config.origin}/app/billing`)).rejects.toMatchObject({ code: "unsafe_portal_configuration" });
  });

  it("recusa expiração sem confirmação quando a sessão continua aberta", async () => {
    const gateway = createStripeGateway(config, sdk({ expireSession: session }));
    await expect(gateway.expireCheckout(session.id)).rejects.toMatchObject({ code: "checkout_expiration_unconfirmed" });
  });

  it("inspeciona todas assinaturas do Customer mesmo em outro Price", async () => {
    const foreign = { ...subscription, items: { data: [{ ...subscription.items.data[0], price: { ...price, id: "price_other" } }], has_more: false } };
    const gateway = createStripeGateway(config, sdk({ subscription: foreign }));
    await expect(gateway.listCurrentSubscriptions(customer.id)).rejects.toMatchObject({ code: "invalid_subscription_price" });
  });
});
