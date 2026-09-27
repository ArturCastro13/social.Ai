// Checagem de números depois da geração com IA. Modelo pequeno inventa dado ("analisamos 3.847 PMEs",
// "queda de 40% em afastamentos") mesmo proibido no prompt. Aqui, todo número com unidade (%, R$, horas, mil...)
// ou maior que 10 só fica no post se aparecer nas fontes: site, respostas do founder, materiais, notícias ou a
// pesquisa de mercado. O que não aparece vira [PREENCHER: número real] e o post vai para revisão.
import type { BrandProfile, PostGerado } from "@/lib/types";
import type { Preferencias, RoteiroVideo } from "./contrato";

export const AVISO_NUMEROS = "Tirei números que não estavam nas fontes (e onde não dava, deixei [PREENCHER: número real]). Confira se as frases ainda dizem o que você quer antes de publicar.";

const UNIDADE = String.raw`%|x\b|k\b|mil\b|milh(?:ão|ões|oes|ao)\b|bilh(?:ão|ões|oes|ao)\b|h\b|horas?\b|dias?\b|minutos?\b|min\b|segundos?\b|semanas?\b|meses\b|m[eê]s\b|anos?\b|vez(?:es)?\b`;
// Número solto (não colado em letra, @, #, / ou outro número), com R$ antes ou unidade depois, opcionais.
const RE_NUMERO = new RegExp(String.raw`(R\$\s*)?(?<![\p{L}\d.,/#@_-])(\d+(?:[.,]\d+)*)(\s*(?:${UNIDADE}))?`, "giu");
const RE_URL = /https?:\/\/\S+/g;

/** "1.900.000" e "1900000" são o mesmo número; "1,5" vira "1.5"; "50,00" vira "50". */
export function normalizarNumero(n: string): string {
  const v = /^\d{1,3}([.,]\d{3})+$/.test(n) ? n.replace(/[.,]/g, "") : n.replace(",", ".");
  return v.replace(/\.0+$/, "");
}

/** Valor por extenso: "1,9 milhão" e "1.900.000" são o mesmo; "81K" e "81 mil" também. */
function valorCanonico(n: string, unidade?: string): string {
  const base = normalizarNumero(n);
  const u = unidade?.trim().toLowerCase() ?? "";
  const mult = /^milh/.test(u) ? 1e6 : /^bilh/.test(u) ? 1e9 : u === "mil" || u === "k" ? 1e3 : 1;
  return mult === 1 ? base : String(Math.round(Number(base) * mult));
}

/** Todos os números que aparecem nas fontes, normalizados, também na forma por extenso. */
export function numerosDasFontes(textos: (string | null | undefined)[]): Set<string> {
  const out = new Set<string>();
  for (const t of textos) {
    for (const m of (t ?? "").matchAll(RE_NUMERO)) {
      out.add(normalizarNumero(m[2]));
      out.add(valorCanonico(m[2], m[3]));
    }
  }
  return out;
}

// Tempo sem número continua natural: "Passei 3 semanas" vira "Passei semanas", "em 30 segundos" vira "em segundos".
const PLURAL_TEMPO: Record<string, string> = {
  h: "horas", hora: "horas", horas: "horas", dia: "dias", dias: "dias", minuto: "minutos", minutos: "minutos", min: "minutos",
  segundo: "segundos", segundos: "segundos", semana: "semanas", semanas: "semanas", "mês": "meses", mes: "meses", meses: "meses",
  ano: "anos", anos: "anos",
};

/**
 * Troca no texto os números sem fonte. Tempo e contagem perdem o número e a frase segue ("Ouvimos 47 founders"
 * vira "Ouvimos founders"); porcentagem, dinheiro e multiplicador, que não se leem sem número, viram
 * [PREENCHER: número real]. Devolve o texto novo e quantos números mexeu.
 */
export function trocarNumerosSemFonte(texto: string, fontes: Set<string>): { texto: string; trocados: number } {
  if (!texto) return { texto, trocados: 0 };
  let trocados = 0;
  // Links (com UTM, ids) ficam como estão.
  const partes = texto.split(RE_URL);
  const links = texto.match(RE_URL) ?? [];
  const novas = partes.map((parte) => {
    const trocada = parte.replace(RE_NUMERO, (inteiro, reais: string | undefined, numero: string, unidade: string | undefined, offset: number) => {
        // Já é um placeholder, ou está dentro de um.
        if (parte.slice(Math.max(0, offset - 12), offset).includes("[PREENCHER")) return inteiro;
        const n = normalizarNumero(numero);
        const valor = Number(n);
        const extenso = valorCanonico(numero, unidade);
        const ano = !reais && !unidade && /^\d{4}$/.test(n) && valor >= 1990 && valor <= 2040;
        // "3 passos", "5 erros": número pequeno sem unidade é estrutura do post, não dado.
        const estrutura = !reais && !unidade && valor <= 10;
        if (ano || estrutura || fontes.has(n) || fontes.has(extenso)) return inteiro;
        trocados++;
        const u = unidade?.trim().toLowerCase();
        // Só tira o número quando a frase continua de pé: "Passei 3 semanas" vira "Passei semanas", mas
        // "em menos de 30 segundos" e "além de 15." pedem o número, e viram [PREENCHER].
        const antes = parte.slice(Math.max(0, offset - 16), offset).toLowerCase();
        const depois = parte.slice(offset + (inteiro as string).length);
        // Contagem solta no fim da frase ("além de 15.") também pede o número; com unidade, a palavra segura a frase.
        const pedeNumero = /\b(menos de|mais de|até|ate|cerca de|apenas|só|uns|umas|entre|de|a|e|ou|x)\s*$/.test(antes) || (!u && /^\s*([.,;:!?)=+x]|$)/.test(depois));
        // O espaço antes do número já separa a palavra: "Passei 3 semanas" vira "Passei semanas".
        if (!reais && !pedeNumero && u && PLURAL_TEMPO[u]) return PLURAL_TEMPO[u];
        if (!reais && !pedeNumero && !u) return "\u0000"; // contagem: sai, e o espaço que sobrar é limpo abaixo
        return `${reais ?? ""}[PREENCHER: número real]${unidade ?? ""}`;
      });
    if (!trocada.includes("\u0000")) return trocada;
    // Só onde um número saiu: junta os espaços que sobraram.
    return trocada
      .replace(/ ?\u0000 ?/g, " ")
      .replace(/(^|\n) (\S)/g, "$1$2")
      .replace(/ {2,}/g, " ")
      .replace(/ ([.,;:!?])/g, "$1");
  });
  return { texto: novas.reduce((acc, p, i) => acc + p + (links[i] ?? ""), ""), trocados };
}

function marcar(revisar: string[] | undefined, trocou: boolean): string[] | undefined {
  if (!trocou) return revisar;
  return [...new Set([...(revisar ?? []), AVISO_NUMEROS])];
}

/** Posts e roteiros com os números sem fonte trocados e marcados para revisão. */
export function checarNumeros<P extends PostGerado & { precisa_revisao?: string[] }>(
  posts: P[],
  roteiros: RoteiroVideo[] | undefined,
  fontes: Set<string>,
): { posts: P[]; roteiros: RoteiroVideo[] | undefined; trocados: number } {
  let total = 0;
  const t = (s: string) => {
    const r = trocarNumerosSemFonte(s, fontes);
    total += r.trocados;
    return r.texto;
  };
  const novosPosts = posts.map((p) => {
    const antes = total;
    const post = {
      ...p,
      gancho: t(p.gancho),
      slides: p.slides.map((s) => ({ titulo: t(s.titulo), texto: t(s.texto) })),
      legendas: Object.fromEntries(Object.entries(p.legendas).map(([rede, l]) => [rede, t(l)])) as P["legendas"],
    };
    return { ...post, precisa_revisao: marcar(p.precisa_revisao, total > antes) };
  });
  const novosRoteiros = roteiros?.map((r) => {
    const antes = total;
    const roteiro = {
      ...r,
      gancho: t(r.gancho),
      cenas: r.cenas.map((c) => ({ ...c, fala: t(c.fala), ...(c.tela ? { tela: t(c.tela) } : {}) })),
      chamada_final: t(r.chamada_final),
      legenda: t(r.legenda),
    };
    return { ...roteiro, precisa_revisao: marcar(r.precisa_revisao, total > antes) };
  });
  return { posts: novosPosts, roteiros: novosRoteiros, trocados: total };
}

/**
 * Travas de formato que o prompt não garante: markdown vira texto puro (LinkedIn e Instagram mostram os
 * asteriscos), "link na bio" só no Instagram, "founder" como origem só quando o founder contou algo, e nome de
 * campo interno escrito no texto vai para revisão.
 */
export function limparFormato<T extends { legendas?: Record<string, string>; legenda?: string; origem_tema?: string }>(itens: T[], temFounder: boolean): T[] {
  const semMarkdown = (t: string) => t.replace(/\*\*(.+?)\*\*/g, "$1").replace(/__(.+?)__/g, "$1").replace(/^#{1,6}\s+/gm, "");
  const semBio = (t: string) => t.replace(/\b(link|clique|clica|toque)( aqui)? na bio\b/gi, (m) => m.replace(/na bio/i, "no perfil"));
  return itens.map((i) => {
    const rede = (i as { rede?: string }).rede;
    const legendas = i.legendas
      ? Object.fromEntries(Object.entries(i.legendas).map(([r, l]) => [r, r === "instagram" ? semMarkdown(l) : semBio(semMarkdown(l))]))
      : undefined;
    const legenda = typeof i.legenda === "string" ? (rede && rede !== "instagram" ? semBio(semMarkdown(i.legenda)) : semMarkdown(i.legenda)) : undefined;
    const texto = JSON.stringify([legendas, legenda, (i as { gancho?: string }).gancho, (i as { slides?: unknown }).slides, (i as { cenas?: unknown }).cenas]);
    const revisar = (i as { precisa_revisao?: string[] }).precisa_revisao;
    return {
      ...i,
      ...(legendas ? { legendas } : {}),
      ...(legenda !== undefined ? { legenda } : {}),
      ...(!temFounder && i.origem_tema === "founder" ? { origem_tema: "site" } : {}),
      ...(RE_CAMPO_INTERNO.test(texto) ? { precisa_revisao: [...new Set([...(revisar ?? []), AVISO_CAMPO_INTERNO])] } : {}),
    };
  });
}

/** Nomes de campo do CONTEXTO que o modelo às vezes escreve no texto ("Em_alta_no_nicho mostra que..."). */
const RE_CAMPO_INTERNO =
  /\b(em_alta_no_nicho|site_extraido|conhecimento_founder|referencias_nicho|transcricao_audio|brand_book_extraido|publico_alvo|mercado_pesquisado|formatos_permitidos|precisa_revisao|origem_tema)\b/i;
export const AVISO_CAMPO_INTERNO = "O texto cita um nome técnico do sistema (como em_alta_no_nicho). Reescreva essa frase antes de publicar.";

// Nome técnico que escapou para diagnóstico, avisos ou estratégia vira a palavra que o founder entende.
const NOMES_HUMANOS: [RegExp, string][] = [
  [/\bsite_extraido(\.\w+)*\b/gi, "o seu site"],
  [/\bconhecimento_founder\b/gi, "as suas respostas"],
  [/\btranscricao_audio\b/gi, "o seu áudio"],
  [/\bem_alta_no_nicho\b/gi, "a pesquisa do que está em alta"],
  [/\bmercado_pesquisado\b/gi, "a pesquisa de mercado"],
  [/\breferencias_nicho\b/gi, "as referências do nicho"],
  [/\bdesempenho_proprio\b/gi, "os números dos seus posts"],
  [/\binsights_audiencia(\.\w+)*\b/gi, "os dados da sua audiência"],
  [/\bhistorico_preferencias\b/gi, "o que você aprovou antes"],
  [/\bformatos_permitidos\b/gi, "os formatos escolhidos"],
  [/\bbrand_book_extraido\b/gi, "o seu brand book"],
  [/\bpublico_alvo\b/gi, "o seu público"],
  [/\bnoticias\b(?=\s+(veio|vazio|está|esta))/gi, "a lista de notícias"],
  [/\bnoticia_comentada\b/gi, "notícia comentada"],
];

/** Troca nomes de campo do CONTEXTO por palavras do founder, em qualquer texto. */
export function humanizarCampos(t: string): string {
  return NOMES_HUMANOS.reduce((acc, [re, nome]) => acc.replace(re, nome), t);
}

/** Aplica humanizarCampos em todas as strings de um objeto (diagnóstico, estratégia, avisos). */
export function humanizarTudo<T>(v: T): T {
  if (typeof v === "string") return humanizarCampos(v) as T;
  if (Array.isArray(v)) return v.map(humanizarTudo) as T;
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, humanizarTudo(x)])) as T;
  return v;
}

/** Tudo o que a IA recebeu como fato: o que o site diz, o que o founder contou, materiais, notícias e a pesquisa. */
export function textosDasFontes(brand: BrandProfile, pref: Preferencias | null): (string | null | undefined)[] {
  return [
    brand.nome,
    brand.title,
    brand.description,
    brand.og?.description,
    ...brand.headings.h1,
    ...brand.headings.h2,
    ...brand.paragrafos,
    ...(brand.provas ?? []),
    JSON.stringify(pref?.conhecimento_founder ?? {}),
    pref?.founder?.transcricao_audio,
    pref?.brand_book_texto,
    pref?.objetivo_livre,
    pref?.publico_alvo,
    JSON.stringify(pref?.noticias ?? []),
    JSON.stringify(pref?.pesquisa_mercado ?? {}),
    JSON.stringify(pref?.contexto_empresa ?? {}),
  ];
}
