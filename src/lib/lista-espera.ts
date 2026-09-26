export interface InscricaoEspera {
  empresa: string;
  email: string;
  criado_em: string;
}

export const COLUNAS_CSV = ["empresa", "email", "criado_em"] as const;

const DIA = 24 * 3600e3;

/** Números do topo do painel. "Hoje" usa o dia do relógio de quem está vendo. */
export function resumirEspera(itens: readonly InscricaoEspera[], agora = new Date()) {
  const inicioHoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate()).getTime();
  const seteDias = agora.getTime() - 7 * DIA;
  const porEmail = new Map<string, number>();
  let hoje = 0;
  let semana = 0;
  for (const i of itens) {
    const t = Date.parse(i.criado_em);
    if (t >= inicioHoje) hoje++;
    if (t >= seteDias) semana++;
    const e = i.email.trim().toLowerCase();
    porEmail.set(e, (porEmail.get(e) ?? 0) + 1);
  }
  // Duplicadas: linhas a mais do mesmo e-mail (quem se inscreveu 3 vezes conta 2).
  const duplicadas = [...porEmail.values()].reduce((s, n) => s + n - 1, 0);
  return { total: itens.length, hoje, semana, emailsUnicos: porEmail.size, duplicadas, repetidos: new Set([...porEmail].filter(([, n]) => n > 1).map(([e]) => e)) };
}

/** Busca simples por empresa ou e-mail, sem diferenciar maiúsculas e acentos. */
export function filtrarEspera<T extends InscricaoEspera>(itens: readonly T[], busca: string): T[] {
  const norm = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  const q = norm(busca.trim());
  if (!q) return [...itens];
  return itens.filter((i) => norm(i.empresa).includes(q) || norm(i.email).includes(q));
}
