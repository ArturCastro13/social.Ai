import type { CalendarioItem, EstrategiaRede, PostGerado, Rede } from "@/lib/types";

const DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

// Janelas que costumam render bem para cada rede no Brasil (horário de Brasília).
// São pontos de partida: o time deve ajustar com os dados do próprio perfil.
const JANELAS: Record<Rede, { dias: number[]; horario: string }[]> = {
  linkedin: [
    { dias: [2, 3, 4], horario: "08:30" },
    { dias: [2, 4], horario: "12:15" },
  ],
  instagram: [
    { dias: [1, 3, 5], horario: "19:00" },
    { dias: [6], horario: "11:00" },
  ],
  x: [
    { dias: [1, 2, 3, 4, 5], horario: "09:00" },
    { dias: [1, 3], horario: "17:30" },
  ],
  facebook: [
    { dias: [3, 6], horario: "20:00" },
    { dias: [0], horario: "10:00" },
  ],
};

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/**
 * Distribui os posts nas próximas semanas, começando no próximo dia útil,
 * respeitando a frequência semanal da estratégia de cada rede.
 */
export function montarCalendario(posts: PostGerado[], estrategia: EstrategiaRede[], inicio = new Date()): CalendarioItem[] {
  const freq = new Map<Rede, number>(estrategia.map((e) => [e.rede, Math.max(1, Math.round(e.frequencia_semanal))]));
  const usadosPorSemana = new Map<string, number>();
  const ocupados = new Set<string>();
  const itens: CalendarioItem[] = [];

  const base = new Date(inicio);
  base.setHours(12, 0, 0, 0);
  base.setDate(base.getDate() + 1);

  for (const post of posts) {
    const rede = post.rede_principal;
    const limite = freq.get(rede) ?? 2;
    const janelas = JANELAS[rede];
    let achou = false;
    for (let offset = 0; offset < 120 && !achou; offset++) {
      const dia = new Date(base);
      dia.setDate(base.getDate() + offset);
      const semana = `${rede}:${Math.floor(offset / 7)}`;
      if ((usadosPorSemana.get(semana) ?? 0) >= limite) continue;
      const janela = janelas.find((j) => j.dias.includes(dia.getDay()));
      if (!janela) continue;
      const chave = iso(dia);
      // No máximo um post por dia no total, para não canibalizar alcance.
      if (ocupados.has(chave)) continue;
      ocupados.add(chave);
      usadosPorSemana.set(semana, (usadosPorSemana.get(semana) ?? 0) + 1);
      itens.push({ data: chave, dia_semana: DIAS[dia.getDay()], horario: janela.horario, rede, post_id: post.id });
      achou = true;
    }
  }
  return itens.sort((a, b) => (a.data + a.horario).localeCompare(b.data + b.horario));
}
