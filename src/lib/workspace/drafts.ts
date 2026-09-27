import { z } from "zod";
import { isDeepStrictEqual } from "node:util";
import type { Draft, DraftBody, Scope } from "@/lib/assinatura/contrato";
import { contextoConfirmadoSchema, hexSchema } from "@/lib/contexto/contrato";
import { preferenciasSchema } from "@/lib/motor/contrato";
import { PrivateHttpError } from "@/lib/auth/http";
import { supabaseDraftRepository, type DraftRepository } from "./repository";

const text = (max: number) => z.string().max(max);
export const brandProfileSchema = z.object({
  url: text(2048), dominio: text(255), nome: text(300), title: text(500).nullable(), description: text(2000).nullable(),
  og: z.object({ title: text(500).nullable(), description: text(2000).nullable(), image: text(2048).nullable() }).strict(),
  favicon: text(2048).nullable(), appleTouchIcon: text(2048).nullable(), logo: text(2048).nullable(), themeColor: text(100).nullable(),
  headings: z.object({ h1: z.array(text(500)).max(30), h2: z.array(text(500)).max(30) }).strict(),
  paragrafos: z.array(text(2000)).max(100), provas: z.array(text(1000)).max(30).optional(),
  redesEncontradas: z.object({ instagram: text(2048).optional(), linkedin: text(2048).optional(), x: text(2048).optional(), facebook: text(2048).optional(), youtube: text(2048).optional(), tiktok: text(2048).optional() }).strict(),
  handles: z.object({ instagram: text(500).optional(), linkedin: text(500).optional(), x: text(500).optional(), facebook: text(500).optional() }).strict(),
  paleta: z.object({ primaria: hexSchema, secundaria: hexSchema, destaque: hexSchema, fundo: hexSchema, texto: hexSchema,
    todas: z.array(z.object({ hex: hexSchema, fonte: z.enum(["css", "theme-color", "og-image", "logo", "instagram-print", "fallback"]), peso: z.number().finite() }).strict()).max(50) }).strict(),
  fontes: z.object({ titulo: text(200), corpo: text(200), encontradas: z.array(text(200)).max(50), sugeridas: z.boolean() }).strict(),
  avisos: z.array(text(500)).max(30), lidoEm: text(100),
  nicho_informado: z.enum(["saas-b2b", "fintech", "healthtech", "edtech", "ecommerce-dtc"]).optional(), sem_site: z.boolean().optional(),
}).strict();
export const personalizacaoSchema = z.object({
  cor: hexSchema.nullable().optional(),
  template: z.enum(["capa-gancho", "lista", "citacao", "dado-impacto", "print-x", "bastidor", "antes-depois", "checklist"]).nullable().optional(),
  foto: text(2048).nullable().optional(),
  edicao: z.object({ gancho: text(300).optional(), slides: z.array(z.object({ titulo: text(300), texto: text(700) }).strict()).max(30).optional(),
    legendas: z.object({ instagram: text(5000).optional(), linkedin: text(5000).optional(), x: text(5000).optional(), facebook: text(5000).optional() }).strict().optional(),
  }).strict().nullable().optional(),
}).strict();
export const draftBodySchema = z.object({
  brand: brandProfileSchema.nullable(), preferencias: preferenciasSchema.strict(), contexto: contextoConfirmadoSchema.nullable(),
  personalizacoes: z.record(z.string().min(1).max(100), personalizacaoSchema),
}).strict();
export class WorkspaceError extends PrivateHttpError {}
export const uuidSchema = z.uuid();

function validScope(scope: Scope) {
  if (!uuidSchema.safeParse(scope.userId).success || !uuidSchema.safeParse(scope.workspaceId).success)
    throw new WorkspaceError(503, "dependency_unavailable", "Workspace temporariamente indisponível.");
}

export function createDraftService(repository: DraftRepository) {
  return {
    async save(scope: Scope, input: { id?: string; expectedVersion: number; body: DraftBody }): Promise<Draft> {
      validScope(scope);
      if ((input.id && !uuidSchema.safeParse(input.id).success) || !Number.isSafeInteger(input.expectedVersion) || input.expectedVersion < 0 || (input.id ? input.expectedVersion === 0 : input.expectedVersion !== 0))
        throw new WorkspaceError(400, "invalid_draft", "Rascunho ou versão inválidos.");
      const parsed = draftBodySchema.safeParse(input.body);
      if (!parsed.success) throw new WorkspaceError(400, "invalid_draft", "Revise os dados do rascunho.");
      const parsedBody = parsed.data;
      const duplicate = parsedBody.preferencias.contexto_empresa;
      if (duplicate && !isDeepStrictEqual(duplicate, parsedBody.contexto))
        throw new WorkspaceError(400, "invalid_draft", "O contexto da empresa deve ser único.");
      const preferencias = { ...parsedBody.preferencias };
      delete preferencias.contexto_empresa;
      const body = { ...parsedBody, preferencias } as DraftBody;
      if (Buffer.byteLength(JSON.stringify(body), "utf8") > 150_000) throw new WorkspaceError(413, "body_too_large", "Rascunho grande demais.");
      const result = await repository.save(scope, { id: input.id, expectedVersion: input.expectedVersion, body });
      if (result.kind === "missing") throw new WorkspaceError(404, "not_found", "Rascunho não encontrado.");
      if (result.kind === "conflict") throw new WorkspaceError(409, "version_conflict", "Rascunho alterado. Recarregue antes de salvar.");
      if (result.kind === "revoked") throw new WorkspaceError(409, "source_revoked", "Um material foi removido. Revise o contexto antes de continuar.");
      return result.draft;
    },
    async load(scope: Scope, id: string): Promise<Draft> {
      validScope(scope);
      if (!uuidSchema.safeParse(id).success) throw new WorkspaceError(404, "not_found", "Rascunho não encontrado.");
      const draft = await repository.load(scope, id);
      if (!draft) throw new WorkspaceError(404, "not_found", "Rascunho não encontrado.");
      return draft;
    },
    async remove(scope: Scope, id: string): Promise<void> {
      validScope(scope);
      if (!uuidSchema.safeParse(id).success || !await repository.delete(scope, id)) throw new WorkspaceError(404, "not_found", "Rascunho não encontrado.");
    },
  };
}

const service = createDraftService(supabaseDraftRepository);
export const saveDraft = service.save;
export const loadDraft = service.load;
export const deleteDraft = service.remove;
