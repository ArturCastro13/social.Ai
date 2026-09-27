import { z } from "zod";

export const MAX_MATERIAIS = 3;
export const MAX_CONTEXTO = 30_000;
export const hexSchema = z.string().regex(/^#[0-9a-f]{6}$/i, "Use uma cor hexadecimal, como #0055AA.");
export const origemMaterialSchema = z.enum(["arquivo", "notion", "granola", "outro"]);
export const fatosSchema = z.array(z.object({
  campo: z.enum(["negocio", "publico", "oferta", "diferencial", "tom", "regra", "proibicao", "referencia_visual", "tipografia"]),
  texto: z.string().trim().min(1).max(500),
  evidencia: z.string().trim().max(250),
})).max(24);
export const extracaoSchema = z.object({
  fatos: fatosSchema,
  cores: z.array(z.object({ hex: hexSchema, origem: z.enum(["declarada", "estimada"]), evidencia: z.string().max(250) })).max(8),
  avisos: z.array(z.string().max(250)).max(8),
});
export const materialSchema = extracaoSchema.extend({
  id: z.string().min(1).max(80), nome: z.string().trim().min(1).max(160), origem: origemMaterialSchema,
  texto_manual: z.string().trim().min(1).max(20_000).optional(),
});
export const materiaisSchema = z.array(materialSchema).max(MAX_MATERIAIS).refine(
  m => new Set(m.map(x => x.id)).size === m.length, "Há materiais repetidos.",
);
export const entendimentoSchema = z.object({
  negocio: z.string().trim().min(1).max(1200), segmento: z.string().trim().max(200), publico: z.string().trim().max(300),
  nicho: z.enum(["saas-b2b", "fintech", "healthtech", "edtech", "ecommerce-dtc", "outro"]),
  evidencias: z.array(z.object({ fonte: z.string().max(80), trecho: z.string().max(250) })).max(8),
  duvidas: z.array(z.string().max(250)).max(8), fonte: z.enum(["ia", "manual"]),
});
export const contextoConfirmadoSchema = z.object({
  versao: z.literal(1), empresa: z.string().min(1).max(300), revisao: z.number().int().nonnegative(),
  entendimento: entendimentoSchema, materiais: materiaisSchema,
  paleta: z.object({ primaria: hexSchema, secundaria: hexSchema, destaque: hexSchema }).optional(),
}).refine(c => JSON.stringify(c).length <= MAX_CONTEXTO, "Contexto extenso demais. Remova materiais ou reduza as regras antes de confirmar.");
export type Material = z.infer<typeof materialSchema>;
export type Entendimento = z.infer<typeof entendimentoSchema>;
export type ContextoConfirmado = z.infer<typeof contextoConfirmadoSchema>;
export type OrigemMaterial = z.infer<typeof origemMaterialSchema>;
export function validarOrcamento(c: unknown): ContextoConfirmado { return contextoConfirmadoSchema.parse(c); }
