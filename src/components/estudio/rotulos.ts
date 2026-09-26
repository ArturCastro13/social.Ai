import type { OrigemTema } from "@/lib/motor/contrato";
import { FORMATOS, GANCHOS } from "@/lib/virais/catalogo";
import type { Formato, Rede, TipoGancho } from "@/lib/types";

export const NOMES_REDE: Record<Rede, string> = { instagram: "Instagram", linkedin: "LinkedIn", x: "X", facebook: "Facebook" };

/** Selo dos posts que nasceram do que o founder contou. */
export const SELO_FOUNDER = "da sua cabeça";

const ORIGENS: Record<OrigemTema, string> = {
  founder: "o que você contou",
  site: "seu site",
  noticia: "notícia",
  nicho: "padrão do nicho",
};

/** "Veio de": demo e cache antigos não têm origem_tema, então contam como site. */
export function rotuloOrigem(origem: string | undefined): string {
  return ORIGENS[origem as OrigemTema] ?? ORIGENS.site;
}

export type FonteHorario = "hipótese do nicho" | "teste" | "sua audiência";

/** Fonte do horário normalizada. Sem dado real, nunca sai como "sua audiência". */
export function rotuloFonte(fonte: string | undefined): FonteHorario {
  const f = (fonte ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  if (f.includes("audiencia")) return "sua audiência";
  if (f.includes("teste")) return "teste";
  return "hipótese do nicho";
}

/** "carrossel--erro-comum" vira "Carrossel com gancho de erro comum". Id desconhecido: undefined. */
export function nomeDoPadrao(id: string | undefined): string | undefined {
  if (!id) return undefined;
  const [formato, tipo] = id.split("--") as [Formato, TipoGancho | undefined];
  const f = FORMATOS[formato];
  if (!f) return undefined;
  const g = tipo ? GANCHOS[tipo] : undefined;
  return g ? `${f.nome} com gancho de ${g.nome.toLowerCase()}` : f.nome;
}

export function ehLink(url: string | undefined): url is string {
  return !!url && /^https?:\/\//i.test(url);
}
