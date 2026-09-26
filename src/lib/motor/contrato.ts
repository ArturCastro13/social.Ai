// Contrato entre o onboarding em camadas (interface) e o motor de posts (/api).
// Fonte: PROMPT_MOTOR_POSTS.md. Tudo aqui é opcional para o motor: ele funciona só com a leitura do site.
import { z } from "zod";

import { FORMATOS_MOTOR, OBJETIVOS, type FormatoMotor, type Frequencia, type ObjetivoId } from "./constantes";

export * from "./constantes";

const regua = z.coerce.number().min(0).max(1);
const respostaFounder = z.string().trim().max(600, "Cada resposta pode ter até 600 caracteres.").optional();

/** "O que só você sabe": três respostas curtas do founder, por texto ou áudio. Vira a primeira fonte de tema. */
export const conhecimentoFounderSchema = z.object({
  /** A objeção ou dúvida que o founder mais ouve do cliente. */
  objecao_cliente: respostaFounder,
  /** O que o mercado acredita e o founder acha errado. */
  crenca_contraria: respostaFounder,
  /** Um momento da empresa que mudou como o founder enxerga o problema. */
  historia: respostaFounder,
});
export type ConhecimentoFounder = z.infer<typeof conhecimentoFounderSchema>;

/** De onde saiu o assunto do post. */
export const ORIGENS_TEMA = ["founder", "site", "noticia", "nicho"] as const;
export type OrigemTema = (typeof ORIGENS_TEMA)[number];
const arroba = z.string().trim().max(200).optional();

export const tomDeVozSchema = z.object({
  formal_descontraido: regua.default(0.5),
  tecnico_simples: regua.default(0.5),
  serio_humor: regua.default(0.3),
  cauteloso_provocador: regua.default(0.4),
});
export type TomDeVoz = z.infer<typeof tomDeVozSchema>;

/** O que a interface manda em POST /api/analyze no campo `preferencias` (telas 1, 2 e 3). */
export const preferenciasSchema = z.object({
  perfil_alvo: z.enum(["founder", "empresa", "ambos"]).default("empresa"),
  /** Quem o founder/empresa quer atingir, em texto livre (vem pré-preenchido pela inferência e é editável). */
  publico_alvo: z.string().trim().max(300).optional(),
  founder: z
    .object({
      nome: z.string().trim().max(120).optional(),
      instagram: arroba,
      linkedin: arroba,
      x: arroba,
      /** Texto do "Fale 1 minuto" (transcrito no navegador) ou digitado. */
      transcricao_audio: z.string().trim().max(6000).optional(),
    })
    .default({}),
  objetivos: z.array(z.enum(OBJETIVOS.map((o) => o.id) as [ObjetivoId, ...ObjetivoId[]])).max(2).default([]),
  tom_de_voz: tomDeVozSchema.optional(),
  formatos_permitidos: z.array(z.enum(FORMATOS_MOTOR.map((f) => f.id) as [FormatoMotor, ...FormatoMotor[]])).default([]),
  frequencia_escolhida: z.enum(["leve", "constante", "intenso"]).optional(),
  proibicoes: z.array(z.string().trim().min(1).max(200)).max(10).default([]),
  inspiracoes: z
    .array(z.object({ url: z.string().trim().url().max(500), tipo: z.enum(["post", "perfil", "video"]).default("post") }))
    .max(3)
    .default([]),
  conhecimento_founder: conhecimentoFounderSchema.optional(),
  /** Para onde mandar quem gostar do post (agendamento, WhatsApp, cadastro). Posts de gerar_clientes terminam com esse link e UTM. */
  link_destino: z.string().trim().max(500).url("O link de destino precisa ser um endereço completo, com https://.").optional(),
  /** Texto extraído do brand book (PDF lido no navegador) ou colado. */
  brand_book_texto: z.string().trim().max(20000).optional(),
  noticias: z
    .array(z.object({ titulo: z.string().trim().max(300), resumo: z.string().trim().max(1000).default(""), url: z.string().trim().url(), data: z.string().trim().max(40) }))
    .max(10)
    .default([]),
});
export type Preferencias = z.infer<typeof preferenciasSchema>;

/** Resposta de POST /api/inferir: o que a tela 2 mostra já preenchido, inferido do site sem IA. */
export interface SugestoesOnboarding {
  nicho: string;
  /** Público-alvo inferido do site, em uma frase editável. */
  publico_alvo: string;
  objetivos: ObjetivoId[];
  tom_de_voz: TomDeVoz;
  /** Frase de exemplo escrita no tom inferido (a interface também pode gerar a própria ao mexer nas réguas). */
  exemplo_tom: string;
  formatos: FormatoMotor[];
  frequencia: Frequencia;
  porque_frequencia: string;
}

/** Objetivo endereçado: todo post existe para fazer um público específico se reconhecer e agir. */
export interface Enderecamento {
  /** Id de OBJETIVOS que este post serve. */
  objetivo: ObjetivoId;
  /** Recorte concreto do público-alvo (ex.: "gestor comercial de PME que perde lead no WhatsApp"). */
  publico: string;
  /** A dor, desejo ou situação que faz esse público pensar "isso sou eu". */
  gatilho_identificacao: string;
  /** O que o post quer que essa pessoa faça depois de ler. */
  acao_esperada: string;
}

/** Campos extras que o motor novo adiciona a cada post (todos opcionais para não quebrar demo e cache antigos). */
export interface ExtrasPost {
  trilho?: "founder" | "empresa";
  objetivo?: string;
  /** Quem deve se reconhecer neste post e por quê. Obrigatório em todo post gerado (IA, local ou demo normalizado). */
  enderecamento?: Enderecamento;
  formato_motor?: FormatoMotor;
  /** De onde veio o assunto. Ausente em demo e cache antigos: a interface trata como "site". */
  origem_tema?: OrigemTema;
  padrao_referencia?: { nome: string; fonte_url: string };
  chamada_final?: string;
  precisa_revisao?: string[];
}

/** Campos extras que o motor novo adiciona à análise. */
export interface ExtrasAnalise {
  contexto_inferido?: { nicho: string; publico: string; tom_resumo: string; objetivos: string[]; confianca: "alta" | "media" | "baixa" };
  por_rede?: { rede: string; papel: string }[];
  comentario_frequencia?: string;
  o_que_aprendi?: string;
  perfil_alvo?: Preferencias["perfil_alvo"];
}

/** Só as respostas preenchidas; null quando o founder pulou as três. */
export function conhecimentoPreenchido(c?: ConhecimentoFounder | null): ConhecimentoFounder | null {
  if (!c) return null;
  const out: ConhecimentoFounder = {};
  for (const k of ["objecao_cliente", "crenca_contraria", "historia"] as const) {
    const v = c[k]?.trim();
    if (v) out[k] = v;
  }
  return Object.keys(out).length ? out : null;
}
