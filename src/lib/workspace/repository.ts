import type { Draft, DraftBody, Scope } from "@/lib/assinatura/contrato";
import { PrivateHttpError } from "@/lib/auth/http";
import { createSessionClient } from "@/lib/auth/server";
import { createClient } from "@supabase/supabase-js";

export type SaveResult = { kind: "ok"; draft: Draft } | { kind: "missing" } | { kind: "conflict" } | { kind: "revoked" };
export interface DraftRepository {
  save(scope: Scope, input: { id?: string; expectedVersion: number; body: DraftBody }): Promise<SaveResult>;
  load(scope: Scope, id: string): Promise<Draft | null>;
  delete(scope: Scope, id: string): Promise<boolean>;
}
function unavailable(): never { throw new PrivateHttpError(503, "dependency_unavailable", "Workspace temporariamente indisponível."); }
async function clientFor(scope: Scope) {
  try {
    const client = await createSessionClient();
    const { data, error } = await client.auth.getUser();
    if (error || data.user?.id !== scope.userId) unavailable();
    return client;
  } catch { return unavailable(); }
}
async function serviceFor(scope: Scope) {
  await clientFor(scope);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) unavailable();
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
function draftFromRow(row: unknown, scope: Scope): Draft {
  if (!row || typeof row !== "object") unavailable();
  const r = row as Record<string, unknown>;
  if (typeof r.id !== "string" || r.workspace_id !== scope.workspaceId || !Number.isSafeInteger(r.version) || !r.body || typeof r.body !== "object") unavailable();
  return { id: r.id, workspaceId: scope.workspaceId, version: r.version as number, body: r.body as DraftBody };
}
export const supabaseDraftRepository: DraftRepository = {
  async save(scope, input) {
    const client = await serviceFor(scope);
    const { data, error } = await client.rpc("save_draft", { p_actor_user_id: scope.userId, p_workspace_id: scope.workspaceId, p_draft_id: input.id ?? null, p_expected_version: input.expectedVersion, p_body: input.body });
    if (error || !data || typeof data !== "object") unavailable();
    const response = data as { status?: unknown; draft?: unknown };
    if (response.status === "missing" || response.status === "conflict" || response.status === "revoked") return { kind: response.status };
    if (response.status !== "ok") unavailable();
    return { kind: "ok", draft: draftFromRow(response.draft, scope) };
  },
  async load(scope, id) {
    const client = await clientFor(scope);
    const { data, error } = await client.from("drafts").select("id, workspace_id, version, body").eq("id", id).eq("workspace_id", scope.workspaceId).maybeSingle();
    if (error) unavailable();
    return data ? draftFromRow(data, scope) : null;
  },
  async delete(scope, id) {
    const client = await serviceFor(scope);
    const { data, error } = await client.rpc("delete_draft", { p_actor_user_id: scope.userId, p_workspace_id: scope.workspaceId, p_draft_id: id });
    if (error || typeof data !== "boolean") unavailable();
    return data;
  },
};
