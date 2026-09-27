import { randomUUID } from "node:crypto";
import type { Draft, DraftBody, Scope } from "@/lib/assinatura/contrato";
import { createDraftService } from "@/lib/workspace/drafts";
import type { DraftRepository } from "@/lib/workspace/repository";
import type { AttemptRow, BillingRepository, CustomerRow, RemoteCheckout, RemoteCustomer, RemoteInvoice, RemoteInvoiceReference, RemoteSubscription, StripeGateway } from "@/lib/billing/contrato";
import { createCheckoutService } from "@/lib/billing/checkout";
import { createPortalService } from "@/lib/billing/portal";

export function createWorkspaceHarness() {
  const a = { userId: randomUUID(), workspaceId: randomUUID() };
  const b = { userId: randomUUID(), workspaceId: randomUUID() };
  const rows = new Map<string, Draft>();
  const repo: DraftRepository = {
    async save(scope, input) {
      const prior = input.id ? rows.get(input.id) : undefined;
      if (input.id && (!prior || prior.workspaceId !== scope.workspaceId)) return { kind: "missing" };
      if ((prior?.version ?? 0) !== input.expectedVersion) return { kind: "conflict" };
      const draft = { id: input.id ?? randomUUID(), workspaceId: scope.workspaceId, version: input.expectedVersion + 1, body: input.body };
      rows.set(draft.id, draft);
      return { kind: "ok", draft };
    },
    async load(scope, id) {
      const row = rows.get(id);
      return row?.workspaceId === scope.workspaceId ? row : null;
    },
    async delete(scope, id) {
      const row = rows.get(id);
      if (!row || row.workspaceId !== scope.workspaceId) return false;
      rows.delete(id);
      return true;
    },
  };
  const service = createDraftService(repo);
  const emptyBody: DraftBody = { brand: null, preferencias: { perfil_alvo: "empresa", founder: {}, objetivos: [], formatos_permitidos: [], proibicoes: [], inspiracoes: [], concorrentes: [], noticias: [] }, contexto: null, personalizacoes: {} };
  return { a, b, emptyBody, save: (scope: Scope, input: { id?: string; expectedVersion: number; body: DraftBody }) => service.save(scope, input), load: service.load, remove: service.remove };
}

export function createBillingHarness() {
  const scope: Scope = { userId: randomUUID(), workspaceId: randomUUID() };
  const draftId = randomUUID();
  const draftVersions = new Map<string, number>([[draftId, 1]]);
  let time = new Date("2026-09-27T12:00:00.000Z");
  let customer: CustomerRow | null = null;
  let attempt: AttemptRow | null = null;
  let hold: string | null = null;
  let failWrite: string | null = null;
  let frequencyCount = 0;
  let expireRemainsOpen = false;
  let remoteSubscriptions: RemoteSubscription[] = [];
  const remoteCustomers = new Map<string, RemoteCustomer>();
  const customerKeys = new Map<string, RemoteCustomer>();
  const remoteSessions = new Map<string, RemoteCheckout>();
  const checkoutKeys = new Map<string, RemoteCheckout>();
  const customerId = "cus_test_customer";
  const config = { priceId: "price_test_monthly", origin: "https://example.test", portalConfigurationId: "bpc_test_safe" };
  const maybeFail = (name: string) => { if (failWrite === name) { failWrite = null; throw new Error("injected write failure"); } };
  const repo: BillingRepository = {
    async claimCustomer(s, seed) {
      if (s.workspaceId !== scope.workspaceId || s.userId !== scope.userId) throw new Error("wrong owner");
      let created = false;
      if (!customer) {
        customer = { workspaceId: scope.workspaceId, idempotencyKey: seed.key, customerId: null, firstRequestedAt: time.toISOString(), leaseToken: seed.token, leaseUntil: new Date(time.getTime() + 20_000).toISOString(), recoveryRequired: false };
        created = true;
      } else if (!customer.customerId && (!customer.leaseToken || new Date(customer.leaseUntil ?? 0) < time)) {
        customer.leaseToken = seed.token;
        customer.leaseUntil = new Date(time.getTime() + 20_000).toISOString();
      }
      return { row: { ...customer }, claimed: customer.leaseToken === seed.token, created };
    },
    async saveCustomer(_s, token, id) { maybeFail("customer_id"); if (!customer || customer.leaseToken !== token) return false; customer.customerId = id; customer.leaseToken = null; return true; },
    async releaseCustomer(_s, token) { if (customer?.leaseToken === token) customer.leaseToken = null; },
    async claimAttempt(s, id, version, seed) {
      if (s.workspaceId !== scope.workspaceId || s.userId !== scope.userId) throw new Error("wrong owner");
      if (hold) return { operatorHold: true };
      let created = false;
      if (!attempt || attempt.state === "closed") {
        if (version !== draftVersions.get(id)) return { invalidDraft: true };
        attempt = { id: seed.id, workspaceId: scope.workspaceId, draftId: id, draftVersion: version, customerId, idempotencyKey: seed.key, firstRequestedAt: time.toISOString(), leaseToken: seed.token, leaseUntil: new Date(time.getTime() + 20_000).toISOString(), sessionId: null, state: "pending", frequencyState: "pending", input: seed.input };
        created = true;
      } else if (!attempt.leaseToken || new Date(attempt.leaseUntil ?? 0) < time) {
        attempt.leaseToken = seed.token;
        attempt.leaseUntil = new Date(time.getTime() + 20_000).toISOString();
      }
      return { row: { ...attempt }, claimed: attempt.leaseToken === seed.token, created,
        draftCurrent: attempt.draftVersion === draftVersions.get(attempt.draftId), requestedCurrent: version === draftVersions.get(id) };
    },
    async markFrequency(_s, id, token, ok) { if (!attempt || attempt.id !== id || attempt.leaseToken !== token) return false; attempt.frequencyState = ok ? "ok" : "denied"; if (!ok) attempt.state = "closed"; return true; },
    async saveSession(_s, id, token, sessionId) { maybeFail("checkout_session"); if (!attempt || attempt.id !== id || attempt.leaseToken !== token) return false; attempt.sessionId = sessionId; attempt.state = "open"; return true; },
    async releaseAttempt(_s, id, token) { if (attempt?.id === id && attempt.leaseToken === token) attempt.leaseToken = null; },
    async closeAttempt(_s, id, token) { if (attempt?.id !== id || attempt.leaseToken !== token) return false; attempt.state = "closed"; return true; },
    async hold(_s, reason) { hold = reason; if (attempt) attempt.state = "operator_required"; if (reason === "unknown_customer" && customer) customer.recoveryRequired = true; },
    async customer(s) { return s.workspaceId === scope.workspaceId && s.userId === scope.userId ? customer : null; },
    async localBillingStatus() { return "none"; },
  };
  const gateway: StripeGateway = {
    async ensureCustomer(workspaceId, key) {
      const existing = customerKeys.get(key);
      if (existing) return existing;
      const next: RemoteCustomer = { id: customerId, livemode: false, workspaceId };
      customerKeys.set(key, next); remoteCustomers.set(next.id, next); return next;
    },
    async getCustomer(id) { const row = remoteCustomers.get(id); if (!row) throw new Error("unknown customer"); return row; },
    async createCheckout(input, key) {
      const prior = checkoutKeys.get(key); if (prior) return prior;
      const row: RemoteCheckout = { id: `cs_test_${remoteSessions.size + 1}`, url: `https://checkout.stripe.test/${remoteSessions.size + 1}`, livemode: false, status: "open", subscriptionId: null, customerId: input.customerId, workspaceId: input.workspaceId, attemptId: input.attemptId, priceId: input.priceId, expiresAt: new Date(time.getTime() + 3_600_000).toISOString() };
      checkoutKeys.set(key, row); remoteSessions.set(row.id, row); return row;
    },
    async getCheckout(id) { const row = remoteSessions.get(id); if (!row) throw new Error("unknown session"); return row; },
    async expireCheckout(id) { const row = remoteSessions.get(id); if (!row) throw new Error("unknown session"); if (row.status === "open" && !expireRemainsOpen) row.status = "expired"; return row; },
    async listCurrentSubscriptions() { return remoteSubscriptions; },
    async getSubscription(id) { const row = remoteSubscriptions.find(s => s.id === id); if (!row) throw new Error("unknown subscription"); return row; },
    async getInvoiceReference(): Promise<RemoteInvoiceReference> { throw new Error("not used"); },
    async getPaidInvoice(): Promise<RemoteInvoice> { throw new Error("not used"); },
    async listPaidInvoices(): Promise<RemoteInvoice[]> { return []; },
    verifyEvent() { throw new Error("not used"); },
    async resolveRisk() { return { kind: "unresolved" as const, customerId: null }; },
    async createPortal(id, workspaceId, configurationId, returnUrl) { if (id !== customerId || workspaceId !== scope.workspaceId || configurationId !== config.portalConfigurationId || returnUrl !== `${config.origin}/app/billing`) throw new Error("unsafe portal"); return { url: "https://billing.stripe.test/portal" }; },
  };
  const start = createCheckoutService({ repository: repo, gateway, config, frequency: async () => { frequencyCount++; }, now: () => time, pause: async () => { await new Promise<void>(resolve => setTimeout(resolve, 1)); } });
  const portal = createPortalService(repo, gateway, config);
  return { scope, draftId, start: (s: Scope = scope, version = draftVersions.get(draftId) ?? 1) => start(s, { draftId, draftVersion: version }),
    startDraft: (id: string, version = draftVersions.get(id) ?? 1) => start(scope, { draftId: id, draftVersion: version }),
    createDraft: () => { const id = randomUUID(); draftVersions.set(id, 1); return id; },
    portal, sessions: () => [...remoteSessions.values()], failNextWrite: (name: string) => { failWrite = name; }, frequencyCount: () => frequencyCount, advanceHours: (hours: number) => { time = new Date(time.getTime() + hours * 3_600_000); }, changeDraft: () => { draftVersions.set(draftId, (draftVersions.get(draftId) ?? 0) + 1); }, keepSessionOpenOnExpire: () => { expireRemainsOpen = true; }, setSubscriptions: (rows: RemoteSubscription[]) => { remoteSubscriptions = rows; }, getAttempt: () => attempt, getCustomer: () => customer, tamperSession: (f: (s: RemoteCheckout) => void) => { for (const s of remoteSessions.values()) f(s); }, holdReason: () => hold };
}
