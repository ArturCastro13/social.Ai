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

/** Redes dos roteiros de vídeo (o contrato inclui TikTok e YouTube, que não têm post estático). */
export const NOMES_REDE_VIDEO: Record<"instagram" | "linkedin" | "tiktok" | "youtube", string> = {
  instagram: "Instagram",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
  youtube: "YouTube",
};

/** 45 vira "45s"; 90 vira "1min30s". */
export function duracaoVideo(seg: number | undefined): string {
  const s = Math.max(0, Math.round(Number(seg) || 0));
  if (!s) return "";
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r ? `${m}min${String(r).padStart(2, "0")}s` : `${m}min`;
}

/** "2026-09-28" vira "28/09". */
export function ddmm(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}

const DIAS_CURTOS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

/** "2026-09-28" vira "seg 28/09" (dia da semana calculado da data, não do texto do motor). */
export function diaCurto(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return Number.isNaN(d.getTime()) ? iso : `${DIAS_CURTOS[d.getDay()]} ${ddmm(iso)}`;
}
