import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createSessionClient } from "@/lib/auth/server";
import { PrivateHttpError } from "@/lib/auth/http";
import { billingMode } from "@/lib/assinatura/config";
import type { Scope, UsageKind } from "@/lib/assinatura/contrato";

export const TEST_LIMITS = {
  free: { material_extract: 3, context_analyze: 2, competitor_suggest: 1, preview_generate: 1, week_generate: 0, image_generate: 1 },
  paid: { material_extract: 10, context_analyze: 10, competitor_suggest: 10, preview_generate: 0, week_generate: 4, image_generate: 24 },
  postsPerWeek: 6,
} as const satisfies { free: Record<UsageKind, number>; paid: Record<UsageKind, number>; postsPerWeek: number };

export type UsageState = "reserved" | "started" | "completed" | "uncertain";
export type UsageRecord = { operationId: string; state: UsageState | "released"; resultId: string | null; requestHash: string };
type ReserveInput = { operationId: string; kind: UsageKind; draftId: string; draftVersion: number; requestHash?: string };
type PersistedInput = ReserveInput & { requestHash: string };
type ReserveResult = { status: "ok"; record: UsageRecord } | { status: "conflict" | "quota" | "unavailable" };
export interface UsageRepository {
  reserve(scope: Scope, input: PersistedInput): Promise<ReserveResult>;
  transition(scope: Scope, operationId: string, from: UsageRecord["state"], to: UsageRecord["state"], resultId?: string): Promise<boolean>;
}

function unavailable(): never { throw new PrivateHttpError(503, "dependency_unavailable", "Consumo temporariamente indisponível."); }
function conflict(): never { throw new PrivateHttpError(409, "operation_conflict", "Operação já usada com outro pedido ou estado."); }
function validUuid(value: string) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value); }

export function createUsageService(repository: UsageRepository) {
  return {
    async reserve(scope: Scope, input: ReserveInput): Promise<{ operationId: string; state: UsageState; resultId: string | null }> {
      if (!validUuid(scope.userId) || !validUuid(scope.workspaceId) || !validUuid(input.operationId) || !validUuid(input.draftId) ||
        !Number.isSafeInteger(input.draftVersion) || input.draftVersion < 1 || !(input.kind in TEST_LIMITS.free) ||
        (input.requestHash !== undefined && (input.requestHash.length < 1 || input.requestHash.length > 256)))
        throw new PrivateHttpError(400, "invalid_usage", "Operação inválida.");
      const requestHash = createHash("sha256").update(JSON.stringify([input.kind, input.draftId, input.draftVersion, input.requestHash ?? null])).digest("hex");
      const result = await repository.reserve(scope, { ...input, requestHash });
      if (result.status === "conflict") conflict();
      if (result.status === "quota") throw new PrivateHttpError(429, "quota_exceeded", "Limite de uso atingido.");
      if (result.status !== "ok") unavailable();
      if (result.record.state === "released") conflict();
      return { operationId: result.record.operationId, state: result.record.state, resultId: result.record.resultId };
    },
    async markStarted(scope: Scope, operationId: string): Promise<void> {
      if (!await repository.transition(scope, operationId, "reserved", "started")) conflict();
    },
    async finish(scope: Scope, operationId: string, resultId: string): Promise<void> {
      if (!validUuid(resultId) || !await repository.transition(scope, operationId, "started", "completed", resultId)) conflict();
    },
    async markUncertain(scope: Scope, operationId: string): Promise<void> {
      if (!await repository.transition(scope, operationId, "started", "uncertain")) conflict();
    },
    async releaseUnused(scope: Scope, operationId: string): Promise<void> {
      // Started requests remain charged even when their external outcome is unknown.
      await repository.transition(scope, operationId, "reserved", "released");
    },
  };
}

async function serviceFor(scope: Scope) {
  try {
    if (billingMode() !== "test") throw new PrivateHttpError(503, "billing_disabled", "Assinatura indisponível.");
    const session = await createSessionClient();
    const { data, error } = await session.auth.getUser();
    if (error || data.user?.id !== scope.userId) unavailable();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) unavailable();
    return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  } catch { return unavailable(); }
}

export const supabaseUsageRepository: UsageRepository = {
  async reserve(scope, input) {
    const client = await serviceFor(scope);
    const { data, error } = await client.rpc("reserve_workspace_usage", {
      p_actor_user_id: scope.userId, p_workspace_id: scope.workspaceId, p_operation_id: input.operationId,
      p_kind: input.kind, p_draft_id: input.draftId, p_draft_version: input.draftVersion, p_request_hash: input.requestHash,
    });
    if (error || !data || typeof data !== "object") unavailable();
    const row = data as Record<string, unknown>;
    if (row.status === "conflict" || row.status === "quota") return { status: row.status };
    if (row.status !== "ok" || !["reserved", "started", "completed", "uncertain", "released"].includes(String(row.state)) ||
      row.operation_id !== input.operationId || typeof row.request_hash !== "string" || row.request_hash !== input.requestHash ||
      !(row.result_id === null || typeof row.result_id === "string")) unavailable();
    return { status: "ok", record: { operationId: input.operationId, state: row.state as UsageRecord["state"],
      resultId: row.result_id as string | null, requestHash: row.request_hash as string } };
  },
  async transition(scope, operationId, from, to, resultId) {
    const client = await serviceFor(scope);
    const { data, error } = await client.rpc("transition_workspace_usage", {
      p_actor_user_id: scope.userId, p_workspace_id: scope.workspaceId, p_operation_id: operationId,
      p_from: from, p_to: to, p_result_id: resultId ?? null,
    });
    if (error || typeof data !== "boolean") unavailable();
    return data;
  },
};

const service = createUsageService(supabaseUsageRepository);
export const reserveUsage = service.reserve;
export const markUsageStarted = service.markStarted;
export const finishUsage = service.finish;
export const markUsageUncertain = service.markUncertain;
export const releaseUnusedUsage = service.releaseUnused;
