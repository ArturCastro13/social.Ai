import type { Entrevista, RespostaValidacao } from "@/lib/store";

export const QUEM_CUIDA = ["Eu mesmo", "Sócio", "Alguém do time", "Freelancer", "Agência", "Ninguém"] as const;
export const JA_TENTOU = ["Nada", "Canva ou template", "ChatGPT ou IA", "Freelancer", "Agência", "Agendador de posts"] as const;

const mediana = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const media = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : null);

export interface NumerosPitch {
  total: number;
  sozinhos: number;
  pctSozinhos: number | null;
  mediaHoras: number | null;
  medianaPagaria: number | null;
  faixaPagaria: [number, number] | null;
  pagariamAlgo: number;
  dorMedia: number | null;
  querTestar: number;
  quemCuida: Record<string, number>;
  jaTentou: Record<string, number>;
  frases: { founder: string; startup: string; texto: string }[];
  formulario: {
    total: number;
    dorMedia: number | null;
    postariam: number;
    pagaria: Record<string, number>;
  };
}

/** Números para o pitch, calculados só a partir do que foi registrado. Nada estimado. */
export function calcularNumeros(entrevistas: Entrevista[], formulario: RespostaValidacao[]): NumerosPitch {
  const total = entrevistas.length;
  const sozinhos = entrevistas.filter((e) => /eu mesmo|sócio|ninguém/i.test(e.quem_cuida ?? "")).length;
  const horas = entrevistas.map((e) => e.horas_semana).filter((x): x is number => typeof x === "number" && x >= 0);
  const pagaria = entrevistas.map((e) => e.pagaria_mes).filter((x): x is number => typeof x === "number" && x >= 0);
  const dor = entrevistas.map((e) => e.dor_nota).filter((x): x is number => typeof x === "number" && x >= 1);

  const conta = (lista: string[]) =>
    lista.reduce<Record<string, number>>((acc, k) => {
      acc[k] = (acc[k] ?? 0) + 1;
      return acc;
    }, {});

  const respostasForm = formulario.map((f) => f.respostas);
  const dorForm = respostasForm.map((r) => Number(r.dor)).filter((x) => x >= 1 && x <= 5);

  return {
    total,
    sozinhos,
    pctSozinhos: pct(sozinhos, total),
    mediaHoras: media(horas),
    medianaPagaria: mediana(pagaria),
    faixaPagaria: pagaria.length ? [Math.min(...pagaria), Math.max(...pagaria)] : null,
    pagariamAlgo: pagaria.filter((x) => x > 0).length,
    dorMedia: media(dor),
    querTestar: entrevistas.filter((e) => e.quer_testar).length,
    quemCuida: conta(entrevistas.map((e) => e.quem_cuida ?? "").filter(Boolean)),
    jaTentou: conta(entrevistas.flatMap((e) => (e.ja_tentou ?? "").split(",").map((s) => s.trim()).filter(Boolean))),
    frases: entrevistas
      .filter((e) => (e.ultima_vez_sem_postar ?? "").trim().length > 10)
      .map((e) => ({ founder: e.founder ?? "Founder", startup: e.startup ?? "", texto: e.ultima_vez_sem_postar!.trim() })),
    formulario: {
      total: formulario.length,
      dorMedia: media(dorForm),
      postariam: respostasForm.filter((r) => /^Sim/.test(String(r.usaria ?? ""))).length,
      pagaria: conta(respostasForm.map((r) => String(r.pagaria ?? "")).filter((x) => x && x !== "null")),
    },
  };
}
