import type { BrandProfile } from "@/lib/types";

// Descobre o nome da marca a partir do que o site mostra.
// Ordem de confiança: og:site_name que bate com o domínio, pedaço do title que bate com o domínio,
// palavras do texto do site que formam o domínio ("Conta Azul" em contaazul.com), og:site_name
// não genérico e, por último, o próprio domínio com inicial maiúscula.

/** Remove acentos: "solução" vira "solucao". */
export const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");

const compacto = (s: string) => semAcento(s).toLowerCase().replace(/[^a-z0-9]/g, "");

// Pedaços de title que descrevem o produto em vez de nomear a marca.
const GENERICO =
  /(?<![\p{L}])(sistema|solu[çc](?:ão|ões)|plataforma|software|home|in[íi]cio|p[áa]gina|oficial|para|empresas?|online|gest[ãa]o|loja|bem-vindo|conta digital|site)(?![\p{L}])/iu;

const limpa = (s: string) => s.replace(/[®™©]/g, "").replace(/\s+/g, " ").trim();

export interface FontesNome {
  siteName?: string | null;
  title?: string | null;
  ogTitle?: string | null;
  dominio: string;
  /** Textos do site (h1, h2, parágrafos, descrição) para achar como a marca se escreve. */
  textos?: string[];
}

function partesDoTitle(t: string): string[] {
  return t
    .split(/\s[|\-–—:·•]\s|\s[|–—·•]|:\s/)
    .map(limpa)
    .filter(Boolean);
}

export function nomeDaMarca(f: FontesNome): string {
  const rotulo = f.dominio.replace(/^www\./, "").split(".")[0];
  const base = compacto(rotulo);
  const bate = (s: string) => !!base && compacto(s) === base;

  const site = f.siteName ? limpa(f.siteName) : "";
  if (site && site.length <= 40 && bate(site)) return site;

  const partes = [f.ogTitle, f.title].filter((t): t is string => !!t).flatMap(partesDoTitle);
  const exata = partes.find(bate);
  if (exata) return exata;

  // Sequências de 1 a 3 palavras do texto que, juntas, formam o domínio.
  const contagem = new Map<string, number>();
  for (const t of [...partes, ...(f.textos ?? [])]) {
    const palavras = t.match(/[\p{L}\p{N}]+(?:['’&-][\p{L}\p{N}]+)*/gu) ?? [];
    for (let i = 0; i < palavras.length; i++) {
      for (let n = 1; n <= 3 && i + n <= palavras.length; n++) {
        const g = palavras.slice(i, i + n).join(" ");
        if (bate(g)) contagem.set(g, (contagem.get(g) ?? 0) + 1);
      }
    }
  }
  if (contagem.size) {
    const maiuscula = (s: string) => /^\p{Lu}/u.test(s);
    return [...contagem.entries()].sort(
      (a, b) => Number(maiuscula(b[0])) - Number(maiuscula(a[0])) || b[1] - a[1] || a[0].localeCompare(b[0]),
    )[0][0];
  }

  if (site && site.length <= 30 && !GENERICO.test(site)) return site;

  const comDominio = partes.find((p) => p.length <= 30 && base.length >= 3 && compacto(p).includes(base));
  if (comDominio) return comDominio;

  const curta = partes
    .filter((p) => p.length <= 30 && p.split(" ").length <= 3 && !GENERICO.test(p))
    .sort((a, b) => a.length - b.length)[0];
  if (curta && partes.length > 1) return curta;

  return rotulo.charAt(0).toUpperCase() + rotulo.slice(1);
}

/**
 * Nome da marca para um perfil já lido. Revalida o nome salvo, que em perfis antigos
 * pode ter vindo de um pedaço genérico do title (ex.: "Solução para empresas").
 */
export function nomeDoPerfil(b: BrandProfile): string {
  return nomeDaMarca({
    siteName: b.nome,
    title: b.title,
    ogTitle: b.og?.title ?? null,
    dominio: b.dominio,
    textos: [
      ...(b.headings?.h1 ?? []),
      ...(b.headings?.h2 ?? []),
      ...(b.paragrafos ?? []),
      b.description ?? "",
      b.og?.description ?? "",
    ],
  });
}
