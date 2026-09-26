import type { BrandProfile } from "@/lib/types";
import { semAcento } from "@/lib/brand/nome";

// Limpeza do texto do site para o motor local: separa o que é promessa de produto do que é
// navegação, rodapé, promoção, depoimento ou jargão de anúncio.

/** Regex de palavra inteira que funciona com acentos (o \b do JavaScript só entende ASCII). */
function palavras(lista: string): RegExp {
  return new RegExp(`(?<![\\p{L}\\p{N}])(?:${lista})(?![\\p{L}\\p{N}])`, "iu");
}

/** Palavras e expressões proibidas pelas regras de escrita (mesmas do prompt da IA). */
export const PROIBIDAS = palavras(
  [
    "descubr\\p{L}*",
    "descobr\\p{L}*",
    "revolucion\\p{L}*",
    "potencializ\\p{L}*",
    "transform\\p{L}*",
    "elev(?:e|a|ar|am|ando|ou|em)",
    "alavanc\\p{L}*",
    "jornadas?",
    "sinergias?",
    "incr[íi]ve(?:l|is)",
    "no mundo de hoje",
    "o segredo [ée]",
  ].join("|"),
);

const NAVEGACAO = palavras(
  [
    "d[úu]vidas?",
    "perguntas frequentes",
    "faq",
    "depoimentos?",
    "blog",
    "login",
    "entrar",
    "cadastre\\p{L}*",
    "cadastro",
    "saiba mais",
    "leia mais",
    "veja mais",
    "ver mais",
    "cookies?",
    "privacidade",
    "termos de uso",
    "fale conosco",
    "contato",
    "carrinho",
    "newsletter",
    "baixe",
    "download",
    "pdf",
    "radar",
    "marcas que crescem",
    "clientes e parceiros",
    "onde encontrar",
    "avalia[çc](?:ão|ões)",
    "direitos reservados",
    "conhe[çc]a os produtos",
    "noss[oa]s?",
    "escolhid[oa] por",
    "reconhecid[oa]s?",
    "teste gr[áa]tis",
    "experimente",
    "comece agora",
    "comece mais",
    "fale com",
    "agende",
    "solicite",
    "assine",
    "clique",
    "inscreva\\p{L}*",
    "tour",
    "lan[çc]amentos?",
    "tend[êe]ncias",
    "webinars?",
    "e-?books?",
    "manual de",
    "reforma tribut[áa]ria",
    "estamos",
    "somos",
    "quem somos",
    "trabalhe conosco",
    "vagas",
    "imprensa",
    "como come[çc]ar",
    "explore a",
  ].join("|"),
);

const PROMOCAO_PALAVRAS = palavras(
  ["off", "cupom", "cupons", "frete gr[áa]tis", "compre", "primeira compra", "black friday", "descontos?", "promo[çc](?:ão|ões)", "acima de", "gr[áa]tis", "contrate"].join("|"),
);
const PROMOCAO_SIMBOLOS = /r\$\s?\d|\d\s?%\s?off|1ª compra/i;

/** Superlativos e selos que não viram post (não dá para provar e soam como anúncio). */
const SUPERLATIVO = palavras(
  ["melhor(?:es)?", "n[ºo°] ?1", "n[úu]mero 1", "l[íi]der(?:es)?", "definitiv[oa]", "indiscutivelmente", "mais respeitad[oa]s?", "gartner"].join("|"),
);

/** Primeira pessoa típica de depoimento de cliente. */
const PRIMEIRA_PESSOA = palavras(
  ["eu", "meu", "minha", "meus", "minhas", "percebi", "gast[áa]vamos", "viciada", "viciado", "recomendo", "comprei", "usei", "passei", "preciso", "fa[çc]o"].join("|"),
);

/** Verbos comuns em frases de produto. Frase sem verbo costuma ser título de seção. */
const VERBO = palavras(
  [
    "venda", "vender", "vende", "vendem", "vendendo", "crie", "criar", "cria", "controle", "controlar", "controla", "gerencie", "gerenciar", "gerencia",
    "integre", "integra", "integrar", "automatiz\\p{L}+", "receba", "receber", "recebe", "pague", "pagar", "paga", "cobre",
    "cobrar", "acompanhe", "acompanhar", "conect\\p{L}+", "recupere", "fidelize", "converta", "reduza", "reduzir", "reduz",
    "aumente", "aumentar", "organiz\\p{L}+", "emita", "emitir", "fa[çc]a", "fazer", "faz", "tenha", "ter", "ganhe", "use",
    "usar", "escute", "encontre", "monte", "montar", "atenda", "atender", "estruture", "qualifique", "explore", "simplifica",
    "simplifique", "descomplica", "é", "são", "tem", "têm", "dá", "une", "ajuda", "ajudam", "permite",
    "oferece", "cresce", "crescem", "crescendo", "analisam", "otimizam", "evoluem", "entenda", "migre", "fature",
    "combina", "acredita", "valoriza", "configure", "melhore", "compare", "escolha", "escolher", "cuide", "cuidar",
    "comece", "come[çc]a", "guarde", "envie", "calcule", "resolva", "economize", "centralize", "abra", "abrir", "tire",
    "construir", "orquestr\\p{L}+", "digitaliz\\p{L}+", "precisa", "viva", "cuida",
  ].join("|"),
);

// Frase que começa com conectivo (ou artigo em minúscula) é pedaço de outra frase.
const CONECTIVO_INICIAL = /^(do|de|da|dos|das|e|que|ou|com|para|por|no|na|em)\s/i;
const ARTIGO_MINUSCULO = /^(uma|um)\s/;

/** Tira emoji, símbolos de marca registrada, travessões e barras de título. */
export function limparTrecho(s: string): string {
  return s
    .replace(/[\p{Extended_Pictographic}\p{Regional_Indicator}️‍]/gu, "")
    .replace(/[®™©]/g, "")
    .replace(/\s*[|]\s*$/g, "")
    .replace(/\s+[—–]\s+|\s*[—–]\s*/g, ", ")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.!?;:])/g, "$1")
    .replace(/^[,;:\s]+|[,;:\s]+$/g, "")
    .trim();
}

/** Quebra um texto em frases e em partes de título ("A | B", "A - B"). */
export function frasesDe(s: string): string[] {
  return s
    .split(/(?<=[.!?])\s+|\s[|•·]\s|\s[—–-]\s|\s\|$/)
    .map(limparTrecho)
    .filter(Boolean);
}

export const temProibida = (s: string) => PROIBIDAS.test(s) || /[—–]/.test(s);
export const ehNavegacao = (s: string) => NAVEGACAO.test(s);
export const ehPromocao = (s: string) => PROMOCAO_PALAVRAS.test(s) || PROMOCAO_SIMBOLOS.test(s);
export const ehDepoimento = (s: string) => PRIMEIRA_PESSOA.test(s);

const semPontoFinal = (s: string) => s.replace(/[.!;:,]+$/, "").trim();
const nPalavras = (s: string) => s.split(/\s+/).filter(Boolean).length;

/** Todas as frases do site, na ordem de confiança (descrição e h1 primeiro), sem repetição. */
export function frasesDoSite(b: BrandProfile): string[] {
  // Parágrafo de depoimento sai inteiro: as frases soltas dele pareceriam fala da marca.
  const paragrafos = b.paragrafos.filter((p) => !ehDepoimento(p));
  const fontes = [b.description ?? "", b.og?.description ?? "", ...b.headings.h1, ...paragrafos, ...b.headings.h2];
  const vistas = new Set<string>();
  const out: string[] = [];
  for (const f of fontes.flatMap(frasesDe)) {
    const k = semAcento(f).toLowerCase().replace(/[^a-z0-9]/g, "");
    if (k.length < 8 || vistas.has(k)) continue;
    vistas.add(k);
    out.push(f);
  }
  return out;
}

/**
 * Frases que dá para usar como promessa de produto em post: têm verbo, não são navegação,
 * pergunta, promoção, depoimento, superlativo nem jargão proibido.
 */
export function frasesDeProduto(frases: string[]): string[] {
  return frases
    .filter((f) => {
      const n = nPalavras(f);
      return (
        n >= 4 &&
        n <= 18 &&
        f.length <= 130 &&
        !f.endsWith("?") &&
        !CONECTIVO_INICIAL.test(f) &&
        !ARTIGO_MINUSCULO.test(f) &&
        !RE_NUMERO.test(f) &&
        VERBO.test(f) &&
        !temProibida(f) &&
        !ehNavegacao(f) &&
        !ehPromocao(f) &&
        !ehDepoimento(f) &&
        !SUPERLATIVO.test(f)
      );
    })
    .map(semPontoFinal);
}

/** Depoimentos em primeira pessoa (servem para diagnóstico e antes e depois com a fala do cliente). */
export function depoimentosDoSite(b: BrandProfile): string[] {
  return b.paragrafos.map(limparTrecho).filter((p) => p.length > 60 && ehDepoimento(p) && !ehPromocao(p));
}

export interface NumeroSite {
  /** Só o número, pronto para o slide: "+180 mil", "20x". */
  valor: string;
  /** Linha de contexto sem o número do começo. */
  contexto: string;
  /** Frase completa como está no site. */
  frase: string;
}

const RE_NUMERO =
  /(?:(\+)\s?|(mais de|até)\s)?(\d{1,3}(?:[.,]\d{1,3})*|\d+)\s?(%|x|mil|milh(?:ão|ões)|bi|bilh(?:ão|ões))(?![\p{L}\p{N}])/iu;

/** Números reais do site (com unidade), sem promoções, depoimentos ou frases de navegação. */
export function numerosDoSite(frases: string[]): NumeroSite[] {
  const out: NumeroSite[] = [];
  for (const f of frases) {
    if (ehPromocao(f) || ehDepoimento(f) || ehNavegacao(f) || temProibida(f) || f.endsWith("?") || f.length > 140) continue;
    const m = f.match(RE_NUMERO);
    if (!m || m.index === undefined) continue;
    const [inteiro, mais, prefixo, num, unidade] = m;
    const u = unidade.toLowerCase();
    const valor = `${mais || prefixo?.toLowerCase() === "mais de" ? "+" : ""}${num}${u === "%" || u === "x" ? u : ` ${u}`}`;
    const frase = semPontoFinal(f);
    let contexto = frase;
    if (m.index === 0) {
      contexto = frase.slice(inteiro.length).replace(/^\s*(de|do|da)\s+/i, "").trim();
      contexto = contexto.charAt(0).toUpperCase() + contexto.slice(1);
    }
    if (nPalavras(contexto) < 2) continue;
    out.push({ valor, contexto: contexto.slice(0, 120), frase });
  }
  return out;
}

/** Hashtag só com [a-z0-9]: normaliza, tira acentos e o resto. "Solução" vira "solucao". */
export function paraHashtag(s: string): string {
  return semAcento(s).toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Corta no limite sem quebrar palavra. */
export function corte(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1).replace(/[\s,;:.]+\S*$/, "") + "…";
}

export const maiuscula = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
/** Maiúscula no começo de cada frase: "a. b" vira "A. B". */
export const frasesMaiusculas = (s: string) => maiuscula(s).replace(/([.!?]\s+)(\p{Ll})/gu, (_, p: string, l: string) => p + l.toUpperCase());
export const minuscula = (s: string) => (s && !/^\p{Lu}{2}/u.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s);

/** Artigo da marca pelo jeito que o site escreve ("a Omie", "o Pipefy"). Empate vira feminino (a empresa). */
export function generoDaMarca(texto: string, marca: string): "a" | "o" {
  const nome = marca.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const conta = (arts: string) =>
    (texto.match(new RegExp(`(?<![\\p{L}])(?:${arts})\\s+${nome}(?![\\p{L}])`, "giu")) ?? []).length;
  return conta("o|do|no|pelo|ao") > conta("a|da|na|pela|à") ? "o" : "a";
}

/** Hash estável (FNV-1a) para variar escolhas por marca sem aleatoriedade. */
export function hashTexto(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
