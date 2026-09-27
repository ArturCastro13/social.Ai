// Tela 2 do onboarding: o que o site sugere, sem IA. Tudo aqui é palpite para o founder ajustar.
import { z } from "zod";
import type { BrandProfile, Nicho } from "@/lib/types";
import { palpiteNicho, textoDaMarca } from "@/lib/engine/nicho";
import { semAcento } from "@/lib/brand/nome";
import { frasesDoSite, numerosDoSite } from "@/lib/engine/texto-local";
import { construirCatalogo, padroesDoNicho } from "@/lib/virais/catalogo";
import { itensDoArquivo } from "@/lib/virais";
import type { FormatoMotor, ObjetivoId, SugestoesOnboarding, TomDeVoz } from "./contrato";
import { MOTOR_DO_FORMATO } from "./mapa";
import { publicoAlvoDoSite } from "./enderecamento";

const conta = (t: string, re: RegExp) => (t.match(re) ?? []).length;
const arred = (x: number) => Math.round(Math.min(1, Math.max(0, x)) * 100) / 100;

/** Objetivos pelo texto do site: vagas, lançamento, B2B. Sempre 2 no máximo. */
export function objetivosDoSite(texto: string, nicho: Nicho): ObjetivoId[] {
  const t = semAcento(texto).toLowerCase();
  const out: ObjetivoId[] = [];
  if (/\b(vagas?|carreiras?|trabalhe (conosco|com a gente)|estamos contratando|junte-se ao time)\b/.test(t)) out.push("contratar");
  if (/\b(lancamento|lancamos|acabamos de lancar|novidade|beta|lista de espera|em breve|novo produto)\b/.test(t)) out.push("lancar_produto");
  if (/\b(investidores?|rodada|seed|serie a|captamos|aporte)\b/.test(t) && out.length < 2) out.push("atrair_investidor");
  if (/\b(comunidade|membros|clube)\b/.test(t) && out.length < 2) out.push("comunidade");
  const b2b = nicho === "saas-b2b" || nicho === "marketing-agencias" || nicho === "ia-dev" || /\b(b2b|empresas|pmes?|times|equipes|gestores)\b/.test(t);
  if (b2b && !out.includes("gerar_clientes")) out.push("gerar_clientes");
  for (const padrao of ["autoridade_founder", "gerar_clientes"] as ObjetivoId[]) {
    if (out.length >= 2) break;
    if (!out.includes(padrao)) out.push(padrao);
  }
  return out.slice(0, 2);
}

/** Réguas de tom pelo jeito que o site escreve: "você", gírias, exclamações e jargão técnico. */
export function tomDoSite(texto: string): TomDeVoz {
  const t = texto.toLowerCase();
  const palavras = Math.max(1, t.split(/\s+/).filter(Boolean).length);
  const por100 = (n: number) => (n / palavras) * 100;
  const voce = por100(conta(t, /(?<![\p{L}])(você|vc|seu|sua|te)(?![\p{L}])/giu));
  const informal = conta(t, /(?<![\p{L}])(a gente|tá|pra|bora|vem|olha|sem complicação|de boa|fala)(?![\p{L}])/giu);
  const senhor = conta(t, /(?<![\p{L}])(prezad[oa]s?|senhor|senhora|vossa|solicit\p{L}*)(?![\p{L}])/giu);
  const exclam = conta(texto, /!/g);
  const emoji = conta(texto, /\p{Extended_Pictographic}/gu);
  const jargao = por100(
    conta(t, /(?<![\p{L}])(api|sdk|integraç\p{L}*|compliance|kpis?|roi|erp|crm|machine learning|algoritmo\p{L}*|infraestrutura|escalabilidade|workflow|stack|dados|analytics|b2b|saas|lgpd|conformidade)(?![\p{L}])/giu),
  );
  const provoca = conta(t, /(?<![\p{L}])(chega de|pare de|esqueça|nunca mais|o fim d[oa]|cansou)(?![\p{L}])/giu);

  return {
    formal_descontraido: arred(0.4 + Math.min(0.3, voce * 0.06) + Math.min(0.2, informal * 0.05) + Math.min(0.1, (exclam + emoji) * 0.02) - Math.min(0.3, senhor * 0.1)),
    tecnico_simples: arred(0.75 - Math.min(0.55, jargao * 0.25)),
    serio_humor: arred(0.2 + Math.min(0.3, (exclam + emoji) * 0.03) + Math.min(0.15, informal * 0.03)),
    cauteloso_provocador: arred(0.35 + Math.min(0.35, provoca * 0.12) + Math.min(0.1, exclam * 0.01)),
  };
}

/** Frase curta de exemplo coerente com as réguas (a interface pode trocar ao mexer nelas). */
export function exemploDoTom(tom: TomDeVoz): string {
  const descontraido = tom.formal_descontraido >= 0.6;
  const simples = tom.tecnico_simples >= 0.5;
  const humor = tom.serio_humor >= 0.5;
  const provocador = tom.cauteloso_provocador >= 0.6;
  if (provocador && descontraido) return humor ? "Planilha não é estratégia. É só um lugar bonito para esconder o problema." : "A maioria das empresas faz isso errado, e ninguém fala sobre o custo.";
  if (provocador) return "O jeito mais comum de resolver isso é também o mais caro. Vale rever.";
  if (descontraido && humor) return "A gente testou do jeito difícil para você não precisar.";
  if (descontraido) return simples ? "Olha o que mudou quando a gente simplificou esse processo." : "A gente mediu o gargalo antes de mexer na arquitetura.";
  if (!simples) return "Três indicadores mostram onde o processo perde eficiência.";
  return "Veja em três passos como organizar isso sem complicação.";
}

/**
 * Formatos do catálogo do nicho, na ordem da base, convertidos para os ids do motor. Carrossel vem
 * primeiro (é o que o motor local faz melhor) e dado de impacto só entra se o site tiver número real.
 */
export function formatosDoNicho(nicho: Nicho, max = 4, temNumero = true): FormatoMotor[] {
  const padroes = padroesDoNicho(construirCatalogo(itensDoArquivo()), nicho, 12);
  const out: FormatoMotor[] = ["carrossel"];
  for (const p of padroes) {
    if (out.length >= max) break;
    const f = MOTOR_DO_FORMATO[p.formato];
    if (f === "dado_de_impacto" && !temNumero) continue;
    if (!out.includes(f)) out.push(f);
  }
  for (const f of ["estatico", "print_de_tweet"] as FormatoMotor[]) {
    if (out.length >= 3) break;
    if (!out.includes(f)) out.push(f);
  }
  return out;
}

export function inferirSugestoes(brand: BrandProfile): SugestoesOnboarding {
  const texto = textoDaMarca(brand);
  const { nicho } = palpiteNicho(brand);
  const objetivos = objetivosDoSite(texto, nicho);
  const tom = tomDoSite(texto);
  const formatos = formatosDoNicho(nicho, 4, numerosDoSite(frasesDoSite(brand)).length > 0);

  const palavras = texto.split(/\s+/).filter(Boolean).length;
  const siteEnxuto = palavras < 400 || brand.paragrafos.length < 6;
  const soAutoridade = objetivos.includes("autoridade_founder") && !objetivos.includes("gerar_clientes");
  const leve = soAutoridade && siteEnxuto;
  const porque = leve
    ? "Com um site enxuto e foco em autoridade, 3 posts bons por semana rendem mais do que 5 apressados para quem cuida disso sozinho."
    : objetivos.includes("lancar_produto")
      ? "Em lançamento, 5 posts por semana mantêm o assunto vivo sem esgotar quem produz sozinho."
      : "5 posts por semana dão constância para o algoritmo e ainda cabem na rotina de um founder.";

  return {
    nicho,
    publico_alvo: publicoAlvoDoSite(brand),
    objetivos,
    tom_de_voz: tom,
    exemplo_tom: exemploDoTom(tom),
    formatos,
    frequencia: leve ? "leve" : "constante",
    porque_frequencia: porque,
  };
}

// Mínimo que a inferência lê do perfil de marca (o resto do BrandProfile é opcional aqui).
const brandInferenciaSchema = z.object({
  url: z.string().url(),
  dominio: z.string().default(""),
  nome: z.string().default(""),
  title: z.string().nullable().default(null),
  description: z.string().nullable().default(null),
  og: z
    .object({ title: z.string().nullable().default(null), description: z.string().nullable().default(null), image: z.string().nullable().default(null) })
    .default({ title: null, description: null, image: null }),
  headings: z.object({ h1: z.array(z.string()).default([]), h2: z.array(z.string()).default([]) }),
  paragrafos: z.array(z.string()).default([]),
});

/** Aceita o resultado de /api/brand (inteiro ou com só os campos de texto). null se não der para usar. */
export function brandParaInferencia(v: unknown): BrandProfile | null {
  const r = brandInferenciaSchema.safeParse(v);
  if (!r.success) return null;
  return { ...(v as BrandProfile), ...r.data } as BrandProfile;
}
