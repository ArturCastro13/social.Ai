// Ciclo de aprendizado: os números que o founder digitou depois de postar (alcance, curtidas, comentários,
// salvos, compartilhamentos) viram, sem IA, um resumo do que funcionou e do que não funcionou.
// Nada de benchmark externo: cada grupo é comparado só com a mediana do próprio founder.
import type { CalendarioItem, Formato, PostGerado, Rede } from "@/lib/types";
import { NOMES_FORMATO, ultimaPorPost, type ResultadoPost } from "@/lib/feedback";
import type { Aprendizados, OrigemTema } from "./contrato";
import { referenciaDoPadrao } from "./local-founder";

/** Um post publicado com o que se sabe dele e os números que o founder informou. */
export interface DesempenhoPost {
  post_id: string;
  rede: string;
  formato: Formato;
  gancho: string;
  origem_tema: OrigemTema | "";
  /** Id do padrão (ou o nome, quando o post não trouxe id). */
  padrao: string;
  objetivo: string;
  dia_semana: string;
  horario: string;
  curtidas: number | null;
  comentarios: number | null;
  compartilhamentos: number | null;
  salvamentos: number | null;
  alcance: number | null;
  /** Interações somadas sobre o alcance, em %, com uma casa. null sem alcance informado. */
  engajamento_pct: number | null;
}

export interface GrupoAprendizado {
  chave: string;
  nome: string;
  /** Quantos posts com alcance informado entram no grupo. */
  n: number;
  engajamento_medio_pct: number;
  vs_mediana: "acima" | "abaixo" | "na mediana";
  /** Menos de 3 posts: sinal fraco, só para testar de novo. */
  amostra_pequena: boolean;
}

export interface AprendizadosCalculados {
  /** Posts com alcance informado (os únicos que entram na conta). */
  n_posts: number;
  /** Mediana do engajamento por post do próprio founder, em %. null sem dado. */
  mediana_engajamento_pct: number | null;
  por_formato: GrupoAprendizado[];
  por_origem_tema: GrupoAprendizado[];
  por_padrao: GrupoAprendizado[];
  por_rede: GrupoAprendizado[];
}

const pct = (x: number) => Math.round(x * 1000) / 10;
const n0 = (v: number | null | undefined) => (typeof v === "number" && v > 0 ? v : 0);

/** Posts publicados com números, casados com o post e o slot do calendário da análise de origem. */
export function desempenhoDosPosts(resultados: ResultadoPost[], posts: PostGerado[] = [], calendario: CalendarioItem[] = []): DesempenhoPost[] {
  const porId = new Map(posts.map((p) => [p.id, p]));
  const slot = new Map(calendario.map((c) => [c.post_id, c]));
  return ultimaPorPost(resultados)
    .filter((r) => [r.curtidas, r.comentarios, r.salvamentos, r.alcance, r.compartilhamentos].some((v) => typeof v === "number"))
    .map((r) => {
      const p = porId.get(r.post_id);
      const c = slot.get(r.post_id);
      const interacoes = n0(r.curtidas) + n0(r.comentarios) + n0(r.salvamentos) + n0(r.compartilhamentos);
      return {
        post_id: r.post_id,
        rede: p?.rede_principal ?? "",
        formato: r.formato,
        gancho: p?.gancho ?? "",
        origem_tema: p ? (p.origem_tema ?? "site") : "",
        padrao: p?.padrao_inspirador || p?.padrao_referencia?.nome || "",
        objetivo: p?.enderecamento?.objetivo ?? p?.objetivo ?? "",
        dia_semana: c?.dia_semana ?? "",
        horario: c?.horario ?? "",
        curtidas: r.curtidas ?? null,
        comentarios: r.comentarios ?? null,
        compartilhamentos: r.compartilhamentos ?? null,
        salvamentos: r.salvamentos ?? null,
        alcance: r.alcance ?? null,
        engajamento_pct: r.alcance && r.alcance > 0 ? pct(interacoes / r.alcance) : null,
      };
    });
}

function mediana(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round(((s[m - 1] + s[m]) / 2) * 10) / 10;
}

/** Até 10% de diferença da mediana conta como "na mediana". */
function comparar(media: number, med: number): GrupoAprendizado["vs_mediana"] {
  const folga = Math.max(0.1, med * 0.1);
  if (media > med + folga) return "acima";
  if (media < med - folga) return "abaixo";
  return "na mediana";
}

const NOMES_ORIGEM: Record<OrigemTema, string> = {
  founder: "Posts do que você contou",
  site: "Posts tirados do site",
  noticia: "Notícias comentadas",
  nicho: "Posts do padrão do nicho",
};
const NOMES_REDE: Record<Rede, string> = { instagram: "Instagram", linkedin: "LinkedIn", x: "X", facebook: "Facebook" };

function agrupar(ds: DesempenhoPost[], chave: (d: DesempenhoPost) => string, nome: (k: string) => string, med: number): GrupoAprendizado[] {
  const grupos = new Map<string, number[]>();
  for (const d of ds) {
    const k = chave(d);
    if (!k || d.engajamento_pct === null) continue;
    grupos.set(k, [...(grupos.get(k) ?? []), d.engajamento_pct]);
  }
  return [...grupos.entries()]
    .map(([k, xs]) => {
      const media = Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10;
      return { chave: k, nome: nome(k), n: xs.length, engajamento_medio_pct: media, vs_mediana: comparar(media, med), amostra_pequena: xs.length < 3 };
    })
    .sort((a, b) => b.engajamento_medio_pct - a.engajamento_medio_pct || b.n - a.n || a.chave.localeCompare(b.chave));
}

/** Médias por formato, origem do tema, padrão e rede, cada uma comparada com a mediana do founder. Determinístico. */
export function calcularAprendizados(ds: DesempenhoPost[]): AprendizadosCalculados {
  const comDado = ds.filter((d) => d.engajamento_pct !== null);
  const med = mediana(comDado.map((d) => d.engajamento_pct!));
  if (med === null) return { n_posts: 0, mediana_engajamento_pct: null, por_formato: [], por_origem_tema: [], por_padrao: [], por_rede: [] };
  return {
    n_posts: comDado.length,
    mediana_engajamento_pct: med,
    por_formato: agrupar(comDado, (d) => d.formato, (k) => NOMES_FORMATO[k as Formato] ?? k, med),
    por_origem_tema: agrupar(comDado, (d) => d.origem_tema, (k) => NOMES_ORIGEM[k as OrigemTema] ?? k, med),
    por_padrao: agrupar(comDado, (d) => d.padrao, (k) => referenciaDoPadrao(k)?.nome ?? k, med),
    por_rede: agrupar(comDado, (d) => d.rede, (k) => NOMES_REDE[k as Rede] ?? k, med),
  };
}

export const temAprendizado = (c: AprendizadosCalculados | null | undefined): c is AprendizadosCalculados => !!c && c.n_posts > 0;

const num = (x: number) => x.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const posts = (n: number) => (n === 1 ? "1 post" : `${n} posts`);

function frase(g: GrupoAprendizado, med: number): string {
  const lado = g.vs_mediana === "acima" ? "acima" : "abaixo";
  const incerto = g.amostra_pequena ? " Amostra pequena: vale testar de novo antes de concluir." : "";
  return `${g.nome} teve ${num(g.engajamento_medio_pct)}% de engajamento médio em ${posts(g.n)}, ${lado} da sua mediana (${num(med)}%).${incerto}`;
}

/**
 * Versão sem IA do "o que aprendi": o que ficou acima e abaixo da mediana do founder, com a métrica e o tamanho
 * da amostra. null sem nenhum post com alcance informado.
 */
export function aprendizadosLocais(c: AprendizadosCalculados | null | undefined): Aprendizados | null {
  if (!temAprendizado(c)) return null;
  const med = c.mediana_engajamento_pct!;
  // Formato e origem primeiro (dizem o que fazer), depois padrão; rede só quando há mais de uma.
  const grupos = [...c.por_formato, ...c.por_origem_tema, ...c.por_padrao, ...(c.por_rede.length > 1 ? c.por_rede : [])];
  const acima = grupos.filter((g) => g.vs_mediana === "acima").sort((a, b) => Number(a.amostra_pequena) - Number(b.amostra_pequena) || b.engajamento_medio_pct - a.engajamento_medio_pct);
  const abaixo = grupos.filter((g) => g.vs_mediana === "abaixo").sort((a, b) => Number(a.amostra_pequena) - Number(b.amostra_pequena) || a.engajamento_medio_pct - b.engajamento_medio_pct);
  const funcionou = acima.slice(0, 4).map((g) => frase(g, med));
  const nao_funcionou = abaixo.slice(0, 4).map((g) => frase(g, med));
  const mais = acima.slice(0, 2).map((g) => g.nome.toLowerCase());
  const menos = abaixo.slice(0, 2).map((g) => g.nome.toLowerCase());
  const ajuste =
    mais.length || menos.length
      ? [mais.length ? `Neste lote, mais espaço para ${mais.join(" e ")}` : "", menos.length ? `menos para ${menos.join(" e ")}` : ""].filter(Boolean).join(", ") +
        `. Base: ${posts(c.n_posts)} com alcance informado${c.n_posts < 3 ? ", ainda pouco para ter certeza" : ""}.`
      : `Os ${posts(c.n_posts)} com alcance informado ficaram parecidos entre si. O lote mantém a variedade até aparecer uma diferença clara.`;
  return { funcionou, nao_funcionou, ajuste };
}

/** Peso de um grupo para reordenar candidatos: +1 acima, -1 abaixo, metade quando a amostra é pequena. */
function peso(grupos: GrupoAprendizado[], chave: string | undefined): number {
  if (!chave) return 0;
  const g = grupos.find((x) => x.chave === chave);
  if (!g || g.vs_mediana === "na mediana") return 0;
  return (g.vs_mediana === "acima" ? 1 : -1) * (g.amostra_pequena ? 0.5 : 1);
}

/** Nota de um candidato pelo que funcionou com o founder. Sem dado, sempre 0 (a ordem não muda). */
export function pontuacaoAprendida(
  c: AprendizadosCalculados | null | undefined,
): (p: { formato: string; padrao_inspirador?: string; origem_tema?: string; rede_principal?: string }) => number {
  if (!temAprendizado(c)) return () => 0;
  return (p) =>
    peso(c.por_formato, p.formato) + peso(c.por_padrao, p.padrao_inspirador) + peso(c.por_origem_tema, p.origem_tema ?? "site") + peso(c.por_rede, p.rede_principal) * 0.5;
}

/** Ordena de forma estável pela nota: o que funcionou sobe, o que ficou abaixo desce, empate mantém a ordem. */
export function ordenarPorAprendizado<T>(itens: T[], nota: (x: T) => number): T[] {
  return itens
    .map((x, i) => ({ x, i, n: nota(x) }))
    .sort((a, b) => b.n - a.n || a.i - b.i)
    .map((e) => e.x);
}
