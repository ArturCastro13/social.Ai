import { randomUUID } from "node:crypto";
import type { Draft, DraftBody, Scope } from "@/lib/assinatura/contrato";
import { createDraftService } from "@/lib/workspace/drafts";
import type { DraftRepository } from "@/lib/workspace/repository";

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
