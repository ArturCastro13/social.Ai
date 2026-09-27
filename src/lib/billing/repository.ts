import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Scope } from "@/lib/assinatura/contrato";
import { billingMode } from "@/lib/assinatura/config";
import { PrivateHttpError } from "@/lib/auth/http";
import { createSessionClient } from "@/lib/auth/server";
import type { AttemptRow, BillingRepository, CheckoutInput, CustomerRow } from "./contrato";

function unavailable(): never { throw new PrivateHttpError(503, "dependency_unavailable", "Cobrança temporariamente indisponível."); }
async function clientFor(scope: Scope) {
  try {
    if (billingMode() !== "test") unavailable();
    const session = await createSessionClient();
    const { data, error } = await session.auth.getUser();
    if (error || data.user?.id !== scope.userId) unavailable();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) unavailable();
    return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  } catch { return unavailable(); }
}
const customerSchema = z.object({ workspace_id: z.uuid(), idempotency_key: z.string(), customer_id: z.string().nullable(), first_requested_at: z.string(), lease_token: z.string().nullable(), lease_until: z.string().nullable(), recovery_required: z.boolean() });
const inputSchema = z.object({ customerId: z.string(), priceId: z.string(), workspaceId: z.uuid(), attemptId: z.uuid(), successUrl: z.url(), cancelUrl: z.url() }).strict();
const attemptSchema = z.object({ id: z.uuid(), workspace_id: z.uuid(), draft_id: z.uuid(), draft_version: z.number().int().positive(), customer_id: z.string(), idempotency_key: z.string(), first_requested_at: z.string(), lease_token: z.string().nullable(), lease_until: z.string().nullable(), session_id: z.string().nullable(), state: z.enum(["pending", "open", "closed", "operator_required"]), frequency_state: z.enum(["pending", "ok", "denied"]), input: inputSchema });
function customerRow(raw: unknown, scope: Scope): CustomerRow {
  const r = customerSchema.safeParse(raw);
  if (!r.success || r.data.workspace_id !== scope.workspaceId) unavailable();
  return { workspaceId: r.data.workspace_id, idempotencyKey: r.data.idempotency_key, customerId: r.data.customer_id, firstRequestedAt: r.data.first_requested_at, leaseToken: r.data.lease_token, leaseUntil: r.data.lease_until, recoveryRequired: r.data.recovery_required };
}
function attemptRow(raw: unknown, scope: Scope): AttemptRow {
  const r = attemptSchema.safeParse(raw);
  if (!r.success || r.data.workspace_id !== scope.workspaceId || r.data.input.workspaceId !== scope.workspaceId || r.data.input.attemptId !== r.data.id || r.data.input.customerId !== r.data.customer_id) unavailable();
  return { id: r.data.id, workspaceId: r.data.workspace_id, draftId: r.data.draft_id, draftVersion: r.data.draft_version, customerId: r.data.customer_id, idempotencyKey: r.data.idempotency_key, firstRequestedAt: r.data.first_requested_at, leaseToken: r.data.lease_token, leaseUntil: r.data.lease_until, sessionId: r.data.session_id, state: r.data.state, frequencyState: r.data.frequency_state, input: r.data.input as CheckoutInput };
}
type Args = { action: string; id?: string; token?: string; key?: string; draftId?: string; draftVersion?: number; customerId?: string; sessionId?: string; input?: CheckoutInput; reason?: string };
async function step(scope: Scope, args: Args): Promise<Record<string, unknown>> {
  const client = await clientFor(scope);
  const { data, error } = await client.rpc("billing_checkout_step", {
    p_actor_user_id: scope.userId, p_workspace_id: scope.workspaceId, p_action: args.action,
    p_id: args.id ?? null, p_token: args.token ?? null, p_key: args.key ?? null,
    p_draft_id: args.draftId ?? null, p_draft_version: args.draftVersion ?? null,
    p_customer_id: args.customerId ?? null, p_session_id: args.sessionId ?? null,
    p_input: args.input ?? null, p_reason: args.reason ?? null,
  });
  if (error || !data || typeof data !== "object" || Array.isArray(data)) unavailable();
  return data as Record<string, unknown>;
}
function ok(result: Record<string, unknown>): boolean { if (typeof result.ok !== "boolean") unavailable(); return result.ok; }
export const supabaseBillingRepository: BillingRepository = {
  async claimCustomer(scope, seed) {
    const r = await step(scope, { action: "claim_customer", key: seed.key, token: seed.token });
    if (typeof r.claimed !== "boolean" || typeof r.created !== "boolean") unavailable();
    return { row: customerRow(r.row, scope), claimed: r.claimed, created: r.created };
  },
  async saveCustomer(scope, token, id) { return ok(await step(scope, { action: "save_customer", token, customerId: id })); },
  async releaseCustomer(scope, token) { await step(scope, { action: "release_customer", token }); },
  async claimAttempt(scope, draftId, draftVersion, seed) {
    const r = await step(scope, { action: "claim_attempt", id: seed.id, key: seed.key, token: seed.token, draftId, draftVersion, customerId: seed.input.customerId, input: seed.input });
    if (r.invalid_draft === true) return { invalidDraft: true };
    if (r.hold === true) return { operatorHold: true };
    if (typeof r.claimed !== "boolean" || typeof r.created !== "boolean" || typeof r.draft_current !== "boolean") unavailable();
    return { row: attemptRow(r.row, scope), claimed: r.claimed, created: r.created, draftCurrent: r.draft_current };
  },
  async markFrequency(scope, id, token, allowed) { return ok(await step(scope, { action: "mark_frequency", id, token, reason: allowed ? "ok" : "denied" })); },
  async saveSession(scope, id, token, sessionId) { return ok(await step(scope, { action: "save_session", id, token, sessionId })); },
  async releaseAttempt(scope, id, token) { await step(scope, { action: "release_attempt", id, token }); },
  async closeAttempt(scope, id, token) { return ok(await step(scope, { action: "close_attempt", id, token })); },
  async hold(scope, reason) { await step(scope, { action: "hold", reason }); },
  async customer(scope) { const r = await step(scope, { action: "customer" }); return r.row === null ? null : customerRow(r.row, scope); },
  async localBillingStatus(scope) {
    const client = await clientFor(scope);
    const { data, error } = await client.from("workspace_billing_access").select("status").eq("workspace_id", scope.workspaceId).maybeSingle();
    if (error || !data || typeof data.status !== "string") unavailable();
    const parsed = z.enum(["none", "incomplete", "incomplete_expired", "trialing", "active", "past_due", "unpaid", "paused", "canceled"]).safeParse(data.status);
    if (!parsed.success) unavailable();
    return parsed.data;
  },
};
