import type { Formato, Nicho, Rede } from "@/lib/types";

/** Decisão do founder ao passar uma ideia de post para o lado. */
export interface Decisao {
  analise_id: string;
  post_id: string;
  dominio: string;
  nicho: Nicho;
  formato: Formato;
  template: string;
  padrao: string;
  rede: Rede;
  decisao: "aprovado" | "pulado";
}

/** Resultado de um post publicado, informado pelo founder. Campo sem dado fica null. */
export interface ResultadoPost {
  analise_id: string;
  post_id: string;
  dominio: string;
  formato: Formato;
  curtidas: number | null;
  comentarios: number | null;
  salvamentos: number | null;
  alcance: number | null;
}

export interface LinhaFormato {
  formato: Formato;
  aprovados: number;
  pulados: number;
  /** aprovados / (aprovados + pulados), de 0 a 1. */
  taxa: number;
  /** Interações por alcance, de 0 a 1, só quando algum post do formato informou alcance. */
  engajamento: number | null;
  publicados: number;
}

export interface ResumoPreferencias {
  total: number;
  aprovados: number;
  formatos: LinhaFormato[];
}

export const NOMES_FORMATO: Record<Formato, string> = {
  carrossel: "Carrossel",
  "imagem-unica": "Imagem única",
  "print-tweet": "Print de post",
  citacao: "Citação",
  lista: "Lista",
  "antes-depois": "Antes e depois",
  "dado-impacto": "Dado de impacto",
  "bastidor-founder": "Bastidor",
};

/**
 * Guarda só o registro mais recente de cada post (mudar de ideia não conta duas vezes),
 * na ordem em que a última versão de cada um chegou.
 */
export function ultimaPorPost<T extends { post_id: string }>(itens: T[]): T[] {
  const m = new Map<string, T>();
  for (const i of itens) {
    m.delete(i.post_id);
    m.set(i.post_id, i);
  }
  return [...m.values()];
}

export function resumirPreferencias(decisoes: Decisao[], resultados: ResultadoPost[] = []): ResumoPreferencias {
  const ds = ultimaPorPost(decisoes);
  const rs = ultimaPorPost(resultados);
  const porFormato = new Map<Formato, LinhaFormato & { interacoes: number; alcanceTotal: number }>();
  const linha = (f: Formato) => {
    let l = porFormato.get(f);
    if (!l) {
      l = { formato: f, aprovados: 0, pulados: 0, taxa: 0, engajamento: null, publicados: 0, interacoes: 0, alcanceTotal: 0 };
      porFormato.set(f, l);
    }
    return l;
  };
  for (const d of ds) {
    const l = linha(d.formato);
    if (d.decisao === "aprovado") l.aprovados++;
    else l.pulados++;
  }
  for (const r of rs) {
    const l = linha(r.formato);
    l.publicados++;
    if (r.alcance && r.alcance > 0) {
      l.interacoes += (r.curtidas ?? 0) + (r.comentarios ?? 0) + (r.salvamentos ?? 0);
      l.alcanceTotal += r.alcance;
    }
  }
  const formatos = [...porFormato.values()]
    .map(({ interacoes, alcanceTotal, ...l }) => ({
      ...l,
      taxa: l.aprovados + l.pulados ? l.aprovados / (l.aprovados + l.pulados) : 0,
      engajamento: alcanceTotal > 0 ? interacoes / alcanceTotal : null,
    }))
    .sort((a, b) => b.taxa - a.taxa || b.aprovados - a.aprovados);
  return { total: ds.length, aprovados: ds.filter((d) => d.decisao === "aprovado").length, formatos };
}

/** Trecho do prompt com o gosto do founder. Vazio enquanto houver poucas decisões para tirar conclusão. */
export function textoPreferencias(r: ResumoPreferencias, minimo = 4): string {
  if (r.total < minimo) return "";
  const pct = (x: number) => `${Math.round(x * 100)}%`;
  const linhas = r.formatos
    .filter((f) => f.aprovados + f.pulados > 0)
    .map((f) => {
      const eng = f.engajamento !== null ? `, engajamento informado ${pct(f.engajamento)} do alcance` : "";
      return `- ${f.formato}: aprovou ${f.aprovados} de ${f.aprovados + f.pulados} (${pct(f.taxa)})${eng}`;
    });
  return `O founder já avaliou ${r.total} ideias desta marca (aprovou ${r.aprovados}). Por formato:\n${linhas.join("\n")}\nDê mais espaço aos formatos com mais aprovação e engajamento, sem abandonar a variedade.`;
}
