import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { AccessState, Scope } from "@/lib/assinatura/contrato";
import { billingMode } from "@/lib/assinatura/config";
import { PrivateHttpError } from "@/lib/auth/http";
import type { RemoteInvoice, RemoteSubscription, VerifiedEvent } from "./contrato";

const fail = (): never => { throw new PrivateHttpError(503, "dependency_unavailable", "Cobrança temporariamente indisponível."); };
function client() {
  if (billingMode() !== "test") return fail();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return fail();
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
const accessSchema = z.object({ status: z.enum(["none","incomplete","incomplete_expired","trialing","active","past_due","unpaid","paused","canceled"]), paid_from: z.string().nullable(), paid_through: z.string().nullable(), cancel_at_period_end: z.boolean(), risk_hold: z.boolean() });
export type Lease = { workspaceId: string; customerId: string; token: string; generation: number };
export interface ReconcileRepository {
  ownerForCustomer(customerId: string): Promise<string | null>;
  ownerForAttempt(scope: Scope, attemptId: string): Promise<{ customerId: string; sessionId: string | null; draftId: string; draftVersion: number } | null>;
  beginEvent(event: VerifiedEvent): Promise<string>;
  finishEvent(eventId: string, state: "processed" | "ignored" | "risk_unresolved", workspaceId?: string): Promise<void>;
  pendingEvents(): Promise<{eventId:string;type:string;objectId:string}[]>;
  claim(workspaceId: string, customerId: string, token: string): Promise<Lease | null>;
  release(lease: Lease): Promise<void>;
  apply(lease: Lease, subscription: RemoteSubscription, invoice?: RemoteInvoice): Promise<void>;
  hold(lease: Lease, reason: string, eventId?: string, subscriptionId?: string): Promise<void>;
  access(workspaceId: string): Promise<AccessState>;
}
type StepArgs = { action: string; workspaceId?: string; customerId?: string; token?: string; generation?: number; eventId?: string; eventType?: string; objectId?: string; subscriptionId?: string; status?: string; cancel?: boolean; invoiceId?: string; priceId?: string; lineId?: string; paidFrom?: string; paidThrough?: string; billingReason?: string; reason?: string };
async function step(a: StepArgs): Promise<Record<string, unknown>> {
  const { data, error } = await client().rpc("billing_reconcile_step", {
    p_action: a.action,p_workspace_id:a.workspaceId ?? null,p_customer_id:a.customerId ?? null,p_token:a.token ?? null,p_generation:a.generation ?? null,
    p_event_id:a.eventId ?? null,p_event_type:a.eventType ?? null,p_object_id:a.objectId ?? null,p_subscription_id:a.subscriptionId ?? null,
    p_status:a.status ?? null,p_cancel:a.cancel ?? null,p_invoice_id:a.invoiceId ?? null,p_price_id:a.priceId ?? null,p_line_id:a.lineId ?? null,
    p_paid_from:a.paidFrom ?? null,p_paid_through:a.paidThrough ?? null,p_billing_reason:a.billingReason ?? null,p_reason:a.reason ?? null,
  });
  if (error || !data || typeof data !== "object" || Array.isArray(data)) return fail();
  return data as Record<string, unknown>;
}
function mustOk(result: Record<string, unknown>) { if (result.ok !== true) fail(); }
export const supabaseReconcileRepository: ReconcileRepository = {
  async ownerForCustomer(customerId) {
    const { data, error } = await client().from("billing_customers").select("workspace_id").eq("customer_id",customerId).eq("environment","test").maybeSingle();
    if (error) fail();
    return data?.workspace_id ?? null;
  },
  async ownerForAttempt(scope, attemptId) {
    const owner=await client().from("workspaces").select("owner_user_id").eq("id",scope.workspaceId).maybeSingle();
    if(owner.error)return fail();
    if(owner.data?.owner_user_id!==scope.userId)return null;
    const { data, error } = await client().from("checkout_attempts").select("customer_id,session_id,draft_id,draft_version").eq("id",attemptId).eq("workspace_id",scope.workspaceId).eq("environment","test").maybeSingle();
    if (error) fail();
    if (!data) return null;
    const parsed = z.object({ customer_id:z.string(),session_id:z.string().nullable(),draft_id:z.uuid(),draft_version:z.number().int().positive() }).safeParse(data);
    if (!parsed.success) return fail();
    return {customerId:parsed.data.customer_id,sessionId:parsed.data.session_id,draftId:parsed.data.draft_id,draftVersion:parsed.data.draft_version};
  },
  async beginEvent(event) { const r=await step({action:"event_begin",eventId:event.eventId,eventType:event.type,objectId:event.objectId}); if(typeof r.state!=="string") return fail(); return r.state; },
  async finishEvent(eventId,state,workspaceId) { mustOk(await step({action:"event_finish",eventId,status:state,workspaceId})); },
  async pendingEvents() { const r=await step({action:"pending"}); const v=z.array(z.object({eventId:z.string(),type:z.string(),objectId:z.string()})).safeParse(r.events); if(!v.success) return fail(); return v.data; },
  async claim(workspaceId,customerId,token) { const r=await step({action:"claim",workspaceId,customerId,token}); if(r.claimed===false)return null; if(r.claimed!==true||typeof r.generation!=="number")return fail(); return {workspaceId,customerId,token,generation:r.generation}; },
  async release(lease) { await step({action:"release",...lease}); },
  async apply(lease,sub,invoice) { mustOk(await step({action:"apply",...lease,subscriptionId:sub.id,status:sub.status,cancel:sub.cancelAtPeriodEnd,invoiceId:invoice?.id,priceId:invoice?.priceId,lineId:invoice?.lineId,paidFrom:invoice?.periodStart,paidThrough:invoice?.periodEnd,billingReason:invoice?.billingReason})); },
  async hold(lease,reason,eventId,subscriptionId) { mustOk(await step({action:"hold",...lease,reason,eventId,subscriptionId})); },
  async access(workspaceId) {
    const {data,error}=await client().from("workspace_billing_access").select("status,paid_from,paid_through,cancel_at_period_end,risk_hold").eq("workspace_id",workspaceId).single();
    if(error) return fail();const parsed=accessSchema.safeParse(data);if(!parsed.success)return fail();
    return {status:parsed.data.status,paidFrom:parsed.data.paid_from,paidThrough:parsed.data.paid_through,cancelAtPeriodEnd:parsed.data.cancel_at_period_end,riskHold:parsed.data.risk_hold};
  },
};
