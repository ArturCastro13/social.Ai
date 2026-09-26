import type { Analise } from "@/lib/types";
import { NOMES_REDE, NOMES_REDE_VIDEO, SELO_FOUNDER, ddmm, diaCurto, duracaoVideo, rotuloFonte, type FonteHorario } from "./rotulos";

const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

const COR_FONTE: Record<FonteHorario, string> = {
  "sua audiência": "bg-salvia/10 text-salvia",
  teste: "bg-limao/60 text-tinta",
  "hipótese do nicho": "bg-papel-2 text-tinta-2",
};

/** Um compromisso da semana: postar um post pronto ou gravar um vídeo. */
export interface Slot {
  tipo: "postar" | "gravar";
  id: string;
  href: string;
  data: string;
  horario: string;
  rede: string;
  texto: string;
  fonte: FonteHorario;
  founder: boolean;
  duracao?: string;
}

function dataLocal(iso: string) {
  return new Date(iso + "T12:00:00");
}
function chaveDia(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Posts do calendário e roteiros com agenda, em ordem. A semana são os sete dias a partir do primeiro
 * compromisso (o calendário começa amanhã); o resto vai para "Depois desta semana".
 */
export function montarSemana(analise: Analise) {
  const posts = new Map(analise.posts.map((p) => [p.id, p]));
  const slots: Slot[] = [
    ...analise.calendario.map((c): Slot => {
      const p = posts.get(c.post_id);
      return {
        tipo: "postar",
        id: c.post_id,
        href: `#post-${c.post_id}`,
        data: c.data,
        horario: c.horario,
        rede: NOMES_REDE[c.rede] ?? c.rede,
        texto: p?.gancho ?? "Post da pauta",
        fonte: rotuloFonte(c.fonte),
        founder: p?.origem_tema === "founder",
      };
    }),
    ...(analise.roteiros ?? [])
      .filter((r) => r.agenda?.data)
      .map(
        (r): Slot => ({
          tipo: "gravar",
          id: r.id,
          href: `#video-${r.id}`,
          data: r.agenda!.data,
          horario: r.agenda!.horario,
          rede: NOMES_REDE_VIDEO[r.rede] ?? r.rede,
          texto: r.titulo,
          fonte: rotuloFonte(r.agenda!.fonte),
          founder: r.origem_tema === "founder",
          duracao: duracaoVideo(r.duracao_seg),
        }),
      ),
  ].sort((a, b) => (a.data + a.horario).localeCompare(b.data + b.horario));
  if (slots.length === 0) return { dias: [], depois: [], slots };

  const inicio = dataLocal(slots[0].data);
  const dias = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(inicio);
    d.setDate(inicio.getDate() + i);
    const chave = chaveDia(d);
    return { chave, rotulo: `${DIAS[d.getDay()]} ${ddmm(chave)}`, itens: slots.filter((c) => c.data === chave) };
  });
  const fimDaSemana = dias[6].chave;
  const depois = slots.filter((c) => c.data > fimDaSemana);
  return { dias, depois, slots };
}

function Selo() {
  return <span className="inline-flex shrink-0 rounded-full bg-salvia px-1.5 py-0.5 text-[10px] font-semibold leading-none text-papel">{SELO_FOUNDER}</span>;
}

function Acao({ tipo }: { tipo: Slot["tipo"] }) {
  return tipo === "gravar" ? (
    <span className="inline-flex shrink-0 rounded-full bg-pauta px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">Gravar</span>
  ) : (
    <span className="inline-flex shrink-0 rounded-full bg-tinta px-1.5 py-0.5 text-[10px] font-semibold leading-none text-papel">Postar</span>
  );
}

/** "Sua semana": em colunas no computador e em lista por dia no celular. Cada item diz se é para postar ou gravar. */
export function SuaSemana({ analise }: { analise: Analise }) {
  const { dias, depois, slots } = montarSemana(analise);
  if (slots.length === 0) return null;

  function slot(c: Slot) {
    return (
      <li key={`${c.tipo}-${c.id}`}>
        <a
          href={c.href}
          className={`block rounded-xl border bg-white p-2.5 transition hover:border-tinta/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pauta ${c.tipo === "gravar" ? "border-pauta/30" : "border-tinta/10"}`}
        >
          <span className="flex items-center justify-between gap-2 text-xs">
            <span className="flex items-center gap-1.5">
              <Acao tipo={c.tipo} />
              <span className="font-semibold tabular-nums text-tinta">{c.horario}</span>
            </span>
            <span className="truncate text-tinta-3">
              {c.rede}
              {c.duracao && <> · {c.duracao}</>}
            </span>
          </span>
          <span className="mt-1 line-clamp-3 text-sm leading-snug text-tinta">{c.texto}</span>
          <span className="mt-2 flex flex-wrap gap-1">
            <span className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none ${COR_FONTE[c.fonte]}`} title="De onde veio este horário">
              {c.fonte}
            </span>
            {c.founder && <Selo />}
          </span>
        </a>
      </li>
    );
  }

  return (
    <div id="semana" className="scroll-mt-28">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display text-2xl font-semibold tracking-[-0.02em]">Sua semana</h3>
        <p className="text-xs text-tinta-3">Horário sem dado seu é hipótese do nicho. Teste e ajuste.</p>
      </div>
      <ol className="mt-4 grid gap-3 lg:grid-cols-7 lg:gap-2">
        {dias.map((d) => (
          <li key={d.chave} className="grid grid-cols-[4.5rem_1fr] gap-3 border-t border-tinta/10 pt-3 lg:block lg:rounded-2xl lg:border-0 lg:bg-papel-2/50 lg:p-2">
            <p className="text-sm font-semibold tabular-nums text-tinta lg:mb-2 lg:px-0.5">{d.rotulo}</p>
            {d.itens.length > 0 ? <ul className="space-y-2">{d.itens.map(slot)}</ul> : <p className="text-xs text-tinta-3 lg:px-0.5">Folga</p>}
          </li>
        ))}
      </ol>
      {depois.length > 0 && (
        <div className="mt-5">
          <p className="text-sm font-medium text-tinta-3">Depois desta semana</p>
          <ul className="mt-2 divide-y divide-tinta/10 border-y border-tinta/10">
            {depois.map((c) => (
              <li key={`${c.tipo}-${c.id}`}>
                <a
                  href={c.href}
                  className="flex items-center gap-3 py-2 text-sm transition hover:bg-papel-2/40 focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-pauta"
                >
                  <span className="w-28 shrink-0 tabular-nums text-tinta-2">
                    {diaCurto(c.data)} {c.horario}
                  </span>
                  <Acao tipo={c.tipo} />
                  <span className="hidden w-20 shrink-0 text-tinta-3 sm:block">{c.rede}</span>
                  <span className="min-w-0 flex-1 truncate text-tinta">{c.texto}</span>
                  {c.founder && <Selo />}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
