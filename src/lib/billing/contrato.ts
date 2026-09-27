import type { BillingStatus, Scope } from "@/lib/assinatura/contrato";

export type { Scope };
export type RemoteCustomer = { id: string; livemode: false; workspaceId: string };
export type RemoteCheckout = { id: string; url: string | null; livemode: false; status: "open" | "complete" | "expired"; subscriptionId: string | null; customerId: string; workspaceId: string; attemptId: string; priceId: string; expiresAt: string };
export type RemoteSubscription = { id: string; livemode: false; customerId: string; status: Exclude<BillingStatus, "none">; priceId: string; subscriptionItemId: string; cancelAtPeriodEnd: boolean; periodStart: string; periodEnd: string; latestInvoiceId: string | null };
export type RemoteInvoiceReference = { id: string; livemode: false; customerId: string; subscriptionId: string; billingReason: string | null; paid: boolean };
export type RemoteInvoice = RemoteInvoiceReference & { paid: true; billingReason: "subscription_create" | "subscription_cycle"; subscriptionItemId: string; priceId: string; lineId: string; periodStart: string; periodEnd: string };
export type VerifiedEvent = { eventId: string; type: string; objectId: string; livemode: false };
export type RiskResolution = { kind: "resolved"; customerId: string; subscriptionIds: string[] } | { kind: "unresolved"; customerId: string | null };
export type CheckoutInput = { customerId: string; priceId: string; workspaceId: string; attemptId: string; successUrl: string; cancelUrl: string };
export interface StripeGateway {
  ensureCustomer(workspaceId: string, key: string): Promise<RemoteCustomer>;
  getCustomer(id: string): Promise<RemoteCustomer>;
  createCheckout(input: CheckoutInput, key: string): Promise<RemoteCheckout>;
  getCheckout(id: string): Promise<RemoteCheckout>;
  expireCheckout(id: string): Promise<RemoteCheckout>;
  listCurrentSubscriptions(customerId: string): Promise<RemoteSubscription[]>;
  getSubscription(id: string): Promise<RemoteSubscription>;
  getInvoiceReference(id: string): Promise<RemoteInvoiceReference>;
  getPaidInvoice(id: string): Promise<RemoteInvoice>;
  listPaidInvoices(subscriptionId: string): Promise<RemoteInvoice[]>;
  verifyEvent(rawBody: string, signature: string, secret: string): VerifiedEvent;
  resolveRisk(kind: "refund" | "dispute", objectId: string): Promise<RiskResolution>;
  createPortal(customerId: string, workspaceId: string, configurationId: string, returnUrl: string): Promise<{ url: string }>;
}

export type CustomerRow = { workspaceId: string; idempotencyKey: string; customerId: string | null; firstRequestedAt: string; leaseToken: string | null; leaseUntil: string | null; recoveryRequired: boolean };
export type AttemptRow = { id: string; workspaceId: string; draftId: string; draftVersion: number; customerId: string; idempotencyKey: string; firstRequestedAt: string; leaseToken: string | null; leaseUntil: string | null; sessionId: string | null; state: "pending" | "open" | "closed" | "operator_required"; frequencyState: "pending" | "ok" | "denied"; input: CheckoutInput };
export type Claim<T> = { row: T; claimed: boolean; created: boolean };
export type AttemptClaim = Claim<AttemptRow> & { draftCurrent: boolean; requestedCurrent: boolean };
export interface BillingRepository {
  claimCustomer(scope: Scope, seed: { key: string; token: string }): Promise<Claim<CustomerRow>>;
  saveCustomer(scope: Scope, token: string, id: string): Promise<boolean>;
  releaseCustomer(scope: Scope, token: string): Promise<void>;
  claimAttempt(scope: Scope, draftId: string, draftVersion: number, seed: { id: string; key: string; token: string; input: CheckoutInput }): Promise<AttemptClaim | { invalidDraft: true } | { operatorHold: true }>;
  markFrequency(scope: Scope, id: string, token: string, ok: boolean): Promise<boolean>;
  saveSession(scope: Scope, id: string, token: string, sessionId: string): Promise<boolean>;
  releaseAttempt(scope: Scope, id: string, token: string): Promise<void>;
  closeAttempt(scope: Scope, id: string, token: string): Promise<boolean>;
  hold(scope: Scope, reason: string): Promise<void>;
  customer(scope: Scope): Promise<CustomerRow | null>;
  localBillingStatus(scope: Scope): Promise<BillingStatus>;
}
