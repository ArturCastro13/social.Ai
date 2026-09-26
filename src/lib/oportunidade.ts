import { NOMES_FORMATO, ultimaPorPost, type Decisao, type ResultadoPost } from "@/lib/feedback";
import type { Formato, Nicho, PostGerado, ViralItem } from "@/lib/types";

/** O que a base curada diz sobre o nicho: quantas vezes cada padrão aparece e quais posts fugiram da curva. */
export interface SinaisNicho {
  nicho: Nicho;
  totalBase: number;
  /** Chave: id do padrão (`formato--tipo_gancho`). */
  frequencias: Record<string, number>;
  outliers: Outlier[];
}

export interface Outlier {
  id: string;
  gancho: string;
  autor: string | null;
  rede: string;
  formato: Formato;
  link: string | null;
  curtidas: number;
  /** Quantas vezes as curtidas deste post superam a mediana do nicho na base. */
  multiplo: number;
}

function mediana(xs: number[]) {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Monta os sinais do nicho a partir da base. Outlier só entra com métrica lida no post e fonte verificada. */
export function sinaisDoNicho(itens: ViralItem[], nicho: Nicho, minimoMultiplo = 1.5): SinaisNicho {
  const doNicho = itens.filter((i) => i.nicho === nicho);
  const frequencias: Record<string, number> = {};
  for (const i of doNicho) {
    const k = `${i.formato}--${i.tipo_gancho}`;
    frequencias[k] = (frequencias[k] ?? 0) + 1;
  }
  const comMetrica = doNicho.filter((i) => i.status === "verificado" && i.metricas.curtidas !== null && i.link_fonte);
  const med = mediana(comMetrica.map((i) => i.metricas.curtidas as number));
  const outliers = med
    ? comMetrica
        .map((i) => ({
          id: i.id,
          gancho: i.texto_gancho,
          autor: i.autor_ou_marca,
          rede: i.rede,
          formato: i.formato,
          link: i.link_fonte,
          curtidas: i.metricas.curtidas as number,
          multiplo: (i.metricas.curtidas as number) / med,
        }))
        .filter((o) => o.multiplo >= minimoMultiplo)
        .sort((a, b) => b.multiplo - a.multiplo)
    : [];
  return { nicho, totalBase: doNicho.length, frequencias, outliers };
}

export interface Oportunidade {
  post_id: string;
  /** De 0 a 100. */
  score: number;
  partes: { forca: number; aderencia: number; frescor: number };
  motivos: string[];
}

const fmt = (f: Formato) => NOMES_FORMATO[f].toLowerCase();

/**
 * Opportunity Score de uma ideia, com três sinais que o produto consegue medir hoje:
 * força do padrão no nicho (base curada), aderência à marca (aprovações e engajamento informados)
 * e frescor (o founder ainda não aprovou muito desse formato). Velocidade de tendência fica de fora
 * até existir série temporal das redes; nada aqui inventa crescimento.
 */
export function pontuar(post: PostGerado, sinais: SinaisNicho | null, todasDecisoes: Decisao[], todosResultados: ResultadoPost[]): Oportunidade {
  const motivos: string[] = [];
  // Mesma regra do resumo: vale a última decisão e o último resultado de cada post.
  const decisoes = ultimaPorPost(todasDecisoes);
  const resultados = ultimaPorPost(todosResultados);

  // hasOwn: um padrão com nome de propriedade de Object ("constructor") não pode virar número.
  const f = sinais?.frequencias;
  const freq = f && Object.hasOwn(f, post.padrao_inspirador ?? "") && typeof f[post.padrao_inspirador] === "number" ? f[post.padrao_inspirador] : 0;
  const maxFreq = sinais ? Math.max(1, ...Object.values(sinais.frequencias)) : 1;
  const forca = sinais ? 0.25 + 0.75 * (freq / maxFreq) : 0.5;
  if (sinais && freq > 0) motivos.push(`Esse padrão aparece ${freq} ${freq === 1 ? "vez" : "vezes"} entre os ${sinais.totalBase} posts fortes do nicho na base.`);

  const doFormato = decisoes.filter((d) => d.formato === post.formato);
  const aprov = doFormato.filter((d) => d.decisao === "aprovado").length;
  // Suavização: sem histórico, a aderência fica neutra em 50%.
  let aderencia = (aprov + 1) / (doFormato.length + 2);
  if (doFormato.length >= 2) motivos.push(`Você aprovou ${aprov} de ${doFormato.length} ideias em ${fmt(post.formato)}.`);
  const comAlcance = resultados.filter((r) => r.formato === post.formato && r.alcance && r.alcance > 0);
  if (comAlcance.length) {
    const inter = comAlcance.reduce((s, r) => s + (r.curtidas ?? 0) + (r.comentarios ?? 0) + (r.salvamentos ?? 0), 0);
    const alc = comAlcance.reduce((s, r) => s + (r.alcance ?? 0), 0);
    const eng = inter / alc;
    aderencia = 0.7 * aderencia + 0.3 * Math.min(1, eng / 0.05);
    motivos.push(`Seus posts em ${fmt(post.formato)} tiveram ${Math.round(eng * 1000) / 10}% de engajamento sobre o alcance.`);
  }

  const recentes = decisoes.slice(-10).filter((d) => d.decisao === "aprovado" && d.formato === post.formato).length;
  const frescor = 1 / (1 + recentes * 0.5);
  if (recentes === 0 && decisoes.length > 0) motivos.push(`Você ainda não aprovou ${fmt(post.formato)} nas últimas escolhas, o feed ganha variedade.`);
  if (recentes >= 2) motivos.push(`Você já aprovou ${recentes} ideias em ${fmt(post.formato)} há pouco, então pesa menos hoje.`);

  const score = Math.round(100 * (0.4 * forca + 0.4 * aderencia + 0.2 * frescor));
  return { post_id: post.id, score, partes: { forca, aderencia, frescor }, motivos };
}

/** Ideias ordenadas da maior para a menor oportunidade. */
export function ordenarPorOportunidade(posts: PostGerado[], sinais: SinaisNicho | null, decisoes: Decisao[], resultados: ResultadoPost[]) {
  return posts
    .map((p) => ({ post: p, op: pontuar(p, sinais, decisoes, resultados) }))
    .sort((a, b) => b.op.score - a.op.score || a.post.id.localeCompare(b.post.id));
}
