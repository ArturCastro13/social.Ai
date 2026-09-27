import { randomUUID } from "node:crypto";
import type { AccessState, BillingStatus, CheckoutResult, Scope } from "@/lib/assinatura/contrato";
import { stripeTestConfig } from "@/lib/assinatura/config";
import { PrivateHttpError } from "@/lib/auth/http";
import { reserveCheckoutFrequency } from "@/lib/workspace/frequency";
import type { AttemptRow, BillingRepository, CheckoutInput, RemoteCheckout, RemoteSubscription, StripeGateway } from "./contrato";
import { supabaseBillingRepository } from "./repository";
import { createStripeGateway, StripeEvidenceError } from "./stripe-adapter";
import { createBillingReconciler } from "./reconcile";
import { supabaseReconcileRepository } from "./reconcile-repository";

type Config = { priceId: string; origin: string };
type Deps = { repository: BillingRepository; gateway: StripeGateway; reconcile(scope: Scope, customerId: string, subscriptionId: string): Promise<AccessState>; frequency(scope: Scope): Promise<void>; config: Config; now(): Date; pause(ms: number): Promise<void> };
const delay = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
const error = (status: number, code: string, message: string) => new PrivateHttpError(status, code, message);
const ageHours = (first: string, now: Date) => (now.getTime() - new Date(first).getTime()) / 3_600_000;
const current = (s: { status: BillingStatus }) => ["active", "trialing", "past_due", "unpaid", "incomplete", "paused"].includes(s.status);
function validatedSession(session: RemoteCheckout, row: AttemptRow): void {
  if (session.livemode !== false || session.attemptId !== row.id || session.workspaceId !== row.workspaceId || session.customerId !== row.customerId || session.priceId !== row.input.priceId)
    throw error(503, "stripe_mismatch", "Sessão de cobrança inconsistente.");
}
function checkoutResult(session: RemoteCheckout, row: AttemptRow): CheckoutResult {
  validatedSession(session, row);
  if (session.status !== "open" || !session.url) throw error(503, "stripe_mismatch", "Sessão de cobrança indisponível.");
  return { kind: "checkout", attemptId: row.id, sessionId: session.id, url: session.url };
}

export function createCheckoutService({ repository, gateway, reconcile, frequency, config, now, pause }: Deps) {
  async function customer(scope: Scope): Promise<string> {
    for (let i = 0; i < 16; i++) {
      const token = randomUUID();
      const claim = await repository.claimCustomer(scope, { key: `customer-${randomUUID()}`, token });
      const row = claim.row;
      if (row.recoveryRequired) throw error(409, "operator_required", "Cobrança requer verificação manual.");
      if (row.customerId) {
        const remote = await gateway.getCustomer(row.customerId);
        if (remote.workspaceId !== scope.workspaceId) throw error(503, "stripe_mismatch", "Cliente de cobrança inconsistente.");
        return remote.id;
      }
      if (!claim.claimed) { await pause(30); continue; }
      try {
        if (ageHours(row.firstRequestedAt, now()) >= 24) {
          await repository.hold(scope, "unknown_customer");
          throw error(409, "operator_required", "Cliente Stripe requer verificação manual.");
        }
        const remote = await gateway.ensureCustomer(scope.workspaceId, row.idempotencyKey);
        if (remote.workspaceId !== scope.workspaceId || remote.livemode !== false) throw error(503, "stripe_mismatch", "Cliente de cobrança inconsistente.");
        if (!await repository.saveCustomer(scope, token, remote.id)) throw error(503, "billing_write_failed", "Falha ao registrar cliente de cobrança.");
        return remote.id;
      } finally { await repository.releaseCustomer(scope, token); }
    }
    throw error(503, "billing_busy", "Cobrança ocupada. Tente novamente.");
  }

  async function subscriptions(scope: Scope, customerId: string): Promise<CheckoutResult | null> {
    const local = await repository.localBillingStatus(scope);
    let remote: RemoteSubscription[];
    try { remote = (await gateway.listCurrentSubscriptions(customerId)).filter(current); }
    catch (cause) {
      if (!(cause instanceof StripeEvidenceError)) throw cause;
      await repository.hold(scope, "inconsistent_subscription");
      return { kind: "operator_required", reason: "inconsistent_remote_state" };
    }
    if (remote.some(s => s.customerId !== customerId || s.priceId !== config.priceId)) {
      await repository.hold(scope, "inconsistent_subscription");
      return { kind: "operator_required", reason: "inconsistent_remote_state" };
    }
    if (remote.length > 1) {
      await repository.hold(scope, "duplicate_subscription");
      return { kind: "operator_required", reason: "duplicate_subscription" };
    }
    if (remote.length) return { kind: "billing_state", status: remote[0].status, portalAvailable: true };
    if (current({ status: local })) return { kind: "billing_state", status: local, portalAvailable: true };
    return null;
  }

  return async function start(scope: Scope, input: { draftId: string; draftVersion: number }): Promise<CheckoutResult> {
    if (!/^[0-9a-f-]{36}$/i.test(scope.workspaceId) || !/^[0-9a-f-]{36}$/i.test(input.draftId) || !Number.isSafeInteger(input.draftVersion) || input.draftVersion < 1)
      throw error(400, "invalid_checkout", "Rascunho inválido.");
    const customerId = await customer(scope);
    for (let i = 0; i < 18; i++) {
      const existing = await subscriptions(scope, customerId);
      if (existing) return existing;
      const id = randomUUID();
      const nextInput: CheckoutInput = {
        customerId, priceId: config.priceId, workspaceId: scope.workspaceId, attemptId: id,
        successUrl: `${config.origin}/app/billing/retorno?attempt=${id}`,
        cancelUrl: `${config.origin}/app/billing/retorno?attempt=${id}&cancel=1`,
      };
      const token = randomUUID();
      const claim = await repository.claimAttempt(scope, input.draftId, input.draftVersion, { id, key: `checkout-${id}`, token, input: nextInput });
      if ("invalidDraft" in claim) throw error(409, "invalid_draft", "Rascunho alterado ou indisponível.");
      if ("operatorHold" in claim) return { kind: "operator_required", reason: "unknown_outcome" };
      const row = claim.row;
      if (row.state === "operator_required") return { kind: "operator_required", reason: "unknown_outcome" };
      if (!claim.claimed) { await pause(30); continue; }
      try {
        if (claim.draftCurrent && !claim.requestedCurrent)
          throw error(409, "invalid_draft", "Rascunho alterado ou indisponível.");
        if (row.frequencyState === "pending") {
          try { await frequency(scope); }
          catch (cause) { await repository.markFrequency(scope, row.id, token, false); throw cause; }
          if (!await repository.markFrequency(scope, row.id, token, true)) throw error(503, "billing_write_failed", "Falha ao registrar limite de cobrança.");
        } else if (row.frequencyState === "denied") throw error(429, "rate_limited", "Tente novamente mais tarde.");
        if (ageHours(row.firstRequestedAt, now()) >= 24 && !row.sessionId) {
          await repository.hold(scope, "unknown_checkout");
          return { kind: "operator_required", reason: "unknown_outcome" };
        }
        let session = row.sessionId ? await gateway.getCheckout(row.sessionId) : await gateway.createCheckout(row.input, row.idempotencyKey);
        validatedSession(session, row);
        if (!row.sessionId && !await repository.saveSession(scope, row.id, token, session.id)) throw error(503, "billing_write_failed", "Falha ao registrar sessão de cobrança.");
        if (session.status === "open" && (!claim.draftCurrent || (claim.requestedCurrent && (row.draftId !== input.draftId || row.draftVersion !== input.draftVersion)) || new Date(session.expiresAt) <= now())) {
          session = await gateway.expireCheckout(session.id);
          validatedSession(session, row);
          if (session.status === "open") throw error(503, "stripe_mismatch", "Expiração de sessão não confirmada.");
        }
        if (session.status === "complete") {
          if (!session.subscriptionId) return { kind: "operator_required", reason: "unknown_outcome" };
          const sub = await gateway.getSubscription(session.subscriptionId);
          if (sub.id !== session.subscriptionId || sub.customerId !== customerId || sub.priceId !== config.priceId || sub.livemode !== false)
            throw error(503, "stripe_mismatch", "Assinatura de cobrança inconsistente.");
          const access = await reconcile(scope, customerId, sub.id);
          if (access.riskHold) return { kind: "operator_required", reason: "inconsistent_remote_state" };
          if (current(sub)) return { kind: "billing_state", status: sub.status, portalAvailable: true };
          // Both retrieved and reconciled evidence must be terminal. Lease RPCs commit
          // before network calls; only this attempt's fencing token may retire it.
          if (!["canceled", "incomplete_expired"].includes(sub.status) || !["canceled", "incomplete_expired"].includes(access.status))
            return { kind: "operator_required", reason: "unknown_outcome" };
        }
        if (session.status === "expired" || session.status === "complete") {
          const present = await subscriptions(scope, customerId);
          if (present) return present;
          if (!await repository.closeAttempt(scope, row.id, token)) throw error(503, "billing_write_failed", "Falha ao encerrar sessão de cobrança.");
          continue;
        }
        return checkoutResult(session, row);
      } finally { await repository.releaseAttempt(scope, row.id, token); }
    }
    throw error(503, "billing_busy", "Cobrança ocupada. Tente novamente.");
  };
}

export async function startCheckout(scope: Scope, input: { draftId: string; draftVersion: number }): Promise<CheckoutResult> {
  let config;
  try { config = stripeTestConfig(); } catch { throw error(503, "billing_disabled", "Cobrança indisponível."); }
  const gateway = createStripeGateway(config);
  const reconciler = createBillingReconciler(supabaseReconcileRepository, gateway, config.priceId);
  return createCheckoutService({ repository: supabaseBillingRepository, gateway,
    reconcile: (owner, customerId, subscriptionId) => reconciler.reconcileForOwner(owner.workspaceId, customerId, subscriptionId),
    frequency: reserveCheckoutFrequency, config, now: () => new Date(), pause: delay })(scope, input);
}
