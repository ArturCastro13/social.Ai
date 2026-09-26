import { z } from "zod";
import type { Formato, TemplateId } from "@/lib/types";
import { formatoSchema, nichoSchema, redeSchema } from "@/lib/virais/schema";
import { templateDoFormato } from "@/lib/virais/catalogo";
import { ORIGENS_TEMA } from "@/lib/motor/contrato";

export const TEMPLATES: TemplateId[] = [
  "capa-gancho", "lista", "citacao", "dado-impacto", "print-x", "bastidor", "antes-depois", "checklist",
];

/** O que cada template espera em `slides`. Vai no prompt e guia o renderizador. */
export const GUIA_TEMPLATES: Record<TemplateId, string> = {
  "capa-gancho":
    "carrossel. slides[0] é a capa: titulo = gancho com no máximo 9 palavras, texto = subtítulo curto. Depois de 3 a 6 slides com titulo curto e texto de até 220 caracteres. Último slide é o fechamento com chamada para ação.",
  lista: "imagem única. slides[0].titulo = título da lista. slides[1..5] = itens, titulo com até 6 palavras e texto opcional de até 90 caracteres.",
  citacao: "imagem única. slides[0].texto = a frase, até 160 caracteres. slides[0].titulo = quem diz (nome e cargo, ou nome da marca).",
  "dado-impacto":
    "imagem única. slides[0].titulo = só o número ou percentual (ex.: 3x, 72%, 10 mil). slides[0].texto = uma linha de contexto de até 120 caracteres. Use apenas números que aparecem no texto do site.",
  "print-x": "imagem única com cara de post do X. slides[0].texto = o post, até 260 caracteres, tom de conversa.",
  bastidor: "imagem única. slides[0].titulo = frase grande em primeira pessoa, até 12 palavras. slides[0].texto = relato de até 200 caracteres.",
  "antes-depois": "imagem única dividida. slides[0] = antes (titulo curto, texto até 110 caracteres). slides[1] = depois (mesmo formato).",
  checklist: "imagem única. slides[0].titulo = título. slides[1..6] = itens de checklist, titulo com até 8 palavras, texto vazio.",
};

const texto = (max: number) => z.string().trim().min(1).max(max);

const slideSchema = z.object({
  titulo: z.string().trim().max(200).default(""),
  texto: z.string().trim().max(600).default(""),
});

/** Texto tolerante: número vira texto, o resto vira "". */
const textoLivre = (max: number) =>
  z.preprocess((v) => (typeof v === "string" ? v : typeof v === "number" ? String(v) : ""), z.string()).transform((s) => s.trim().slice(0, max));

/**
 * Objetivo endereçado do post, como o modelo mandou. Nunca derruba a validação: campo ausente ou inválido
 * vira texto vazio e é completado depois (garantirEnderecamento), com o post marcado para revisão.
 */
export const enderecamentoIASchema = z
  .object({
    objetivo: textoLivre(60).default(""),
    publico: textoLivre(300).default(""),
    gatilho_identificacao: textoLivre(300).default(""),
    acao_esperada: textoLivre(200).default(""),
  })
  .catch({ objetivo: "", publico: "", gatilho_identificacao: "", acao_esperada: "" });

export const postIASchema = z.object({
  rede_principal: redeSchema,
  formato: formatoSchema,
  template: z.string().optional(),
  gancho: texto(220),
  slides: z.array(slideSchema).min(1).max(8),
  legendas: z.object({
    instagram: texto(2200),
    linkedin: texto(3000),
    x: texto(280),
    facebook: texto(2200),
  }),
  hashtags: z.array(z.string().trim().max(40)).max(12).default([]),
  padrao_inspirador: z.string().trim().max(80).default(""),
  por_que: z.string().trim().max(400).default(""),
  enderecamento: enderecamentoIASchema.optional(),
  /** De onde veio o assunto. Valor desconhecido vira undefined, nunca derruba a validação. */
  origem_tema: z.enum(ORIGENS_TEMA).optional().catch(undefined),
});

export const analiseIASchema = z.object({
  nicho: nichoSchema,
  resumo_negocio: texto(600),
  publico: texto(500),
  tom_de_voz: texto(300),
  posicionamento: texto(240),
  pilares: z.array(z.object({ nome: texto(60), descricao: texto(300) })).min(3).max(4),
  diagnostico: z.array(z.object({ titulo: texto(120), texto: texto(600) })).min(3).max(5),
  estrategia: z
    .array(z.object({ rede: redeSchema, frequencia_semanal: z.coerce.number().min(0).max(14), foco: texto(300) }))
    .min(1)
    .max(4),
  posts: z.array(postIASchema).min(1).max(12),
});

export type AnaliseIA = z.infer<typeof analiseIASchema>;

export function templateValido(t: string | undefined, formato: Formato): TemplateId {
  return TEMPLATES.includes(t as TemplateId) ? (t as TemplateId) : templateDoFormato(formato);
}

/** A copy não pode ter travessão. Troca por vírgula e limpa espaços duplos, recursivamente. */
export function semTravessao<T>(v: T): T {
  if (typeof v === "string") {
    return v
      .replace(/\s*—\s*/g, ", ")
      .replace(/,\s*,/g, ",")
      .replace(/ {2,}/g, " ")
      .trim() as T;
  }
  if (Array.isArray(v)) return v.map(semTravessao) as T;
  if (v && typeof v === "object") {
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, semTravessao(x)])) as T;
  }
  return v;
}

/** Extrai o primeiro objeto JSON de uma resposta (tolera cercas ```json). */
export function extrairJson(txt: string): unknown {
  const limpo = txt.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  try {
    return JSON.parse(limpo);
  } catch {
    const i = limpo.indexOf("{");
    const j = limpo.lastIndexOf("}");
    if (i >= 0 && j > i) return JSON.parse(limpo.slice(i, j + 1));
    throw new Error("Resposta sem JSON");
  }
}
