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

const DIA_MS = 86_400_000;

/** Data de hoje em São Paulo, representada como meia-noite UTC (o servidor da Vercel roda em UTC). */
export function hojeEmSaoPaulo(agora = new Date()): Date {
  const [a, m, d] = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" })
    .format(agora)
    .split("-")
    .map(Number);
  return new Date(Date.UTC(a, m - 1, d));
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Segunda-feira da semana da data (mesma regra que o painel usa para agrupar). */
function segundaDa(d: Date): string {
  return iso(new Date(d.getTime() - ((d.getUTCDay() + 6) % 7) * DIA_MS));
}

/**
 * Distribui os posts nas próximas semanas, a partir de amanhã (horário de Brasília),
 * respeitando a frequência semanal de cada rede e no máximo um post por dia.
 */
export function montarCalendario(posts: PostGerado[], estrategia: EstrategiaRede[], agora = new Date()): CalendarioItem[] {
  const freq = new Map<Rede, number>(estrategia.map((e) => [e.rede, Math.max(1, Math.round(e.frequencia_semanal))]));
  const usadosPorSemana = new Map<string, number>();
  const ocupados = new Set<string>();
  const itens: CalendarioItem[] = [];
  const amanha = new Date(hojeEmSaoPaulo(agora).getTime() + DIA_MS);

  for (const post of posts) {
    const rede = post.rede_principal;
    const limite = freq.get(rede) ?? 2;
    const janelas = JANELAS[rede] ?? JANELAS.instagram;
    for (let offset = 0; offset < 180; offset++) {
      const dia = new Date(amanha.getTime() + offset * DIA_MS);
      const chave = iso(dia);
      const semana = `${rede}:${segundaDa(dia)}`;
      if ((usadosPorSemana.get(semana) ?? 0) >= limite || ocupados.has(chave)) continue;
      const janela = janelas.find((j) => j.dias.includes(dia.getUTCDay()));
      if (!janela) continue;
      ocupados.add(chave);
      usadosPorSemana.set(semana, (usadosPorSemana.get(semana) ?? 0) + 1);
      itens.push({ data: chave, dia_semana: DIAS[dia.getUTCDay()], horario: janela.horario, rede, post_id: post.id });
      break;
    }
  }
  return itens.sort((a, b) => (a.data + a.horario).localeCompare(b.data + b.horario));
}
