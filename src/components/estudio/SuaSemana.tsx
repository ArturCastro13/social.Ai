import type { Analise, CalendarioItem } from "@/lib/types";
import { NOMES_REDE, SELO_FOUNDER, rotuloFonte, type FonteHorario } from "./rotulos";

const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

const COR_FONTE: Record<FonteHorario, string> = {
  "sua audiência": "bg-salvia/10 text-salvia",
  teste: "bg-limao/60 text-tinta",
  "hipótese do nicho": "bg-papel-2 text-tinta-2",
};

function dataLocal(iso: string) {
  return new Date(iso + "T12:00:00");
}
function chaveDia(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function ddmm(iso: string) {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}

function Selo() {
  return <span className="inline-flex shrink-0 rounded-full bg-salvia px-1.5 py-0.5 text-[10px] font-semibold leading-none text-papel">{SELO_FOUNDER}</span>;
}

/**
 * "Sua semana": os sete dias a partir da primeira data do calendário (que começa amanhã),
 * em colunas no computador e em lista por dia no celular. O resto vai para "Depois desta semana".
 */
export function SuaSemana({ analise }: { analise: Analise }) {
  const itens = [...analise.calendario].sort((a, b) => (a.data + a.horario).localeCompare(b.data + b.horario));
  if (itens.length === 0) return null;
  const posts = new Map(analise.posts.map((p) => [p.id, p]));

  const inicio = dataLocal(itens[0].data);
  const dias = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(inicio);
    d.setDate(inicio.getDate() + i);
    const chave = chaveDia(d);
    return { chave, rotulo: `${DIAS[d.getDay()]} ${ddmm(chave)}`, itens: itens.filter((c) => c.data === chave) };
  });
  const fimDaSemana = dias[6].chave;
  const depois = itens.filter((c) => c.data > fimDaSemana);

  function slot(c: CalendarioItem) {
    const p = posts.get(c.post_id);
    const fonte = rotuloFonte(c.fonte);
    return (
      <li key={c.post_id}>
        <a
          href={`#post-${c.post_id}`}
          className="block rounded-xl border border-tinta/10 bg-white p-2.5 transition hover:border-tinta/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pauta"
        >
          <span className="flex items-baseline justify-between gap-2 text-xs">
            <span className="font-semibold tabular-nums text-tinta">{c.horario}</span>
            <span className="truncate text-tinta-3">{NOMES_REDE[c.rede]}</span>
          </span>
          <span className="mt-1 line-clamp-3 text-sm leading-snug text-tinta">{p?.gancho ?? "Post da pauta"}</span>
          <span className="mt-2 flex flex-wrap gap-1">
            <span className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none ${COR_FONTE[fonte]}`} title="De onde veio este horário">
              {fonte}
            </span>
            {p?.origem_tema === "founder" && <Selo />}
          </span>
        </a>
      </li>
    );
  }

  return (
    <div id="semana" className="mt-10 scroll-mt-28">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display text-2xl font-semibold tracking-[-0.02em]">Sua semana</h3>
        <p className="text-xs text-tinta-3">Horário sem dado seu é hipótese do nicho. Teste e ajuste.</p>
      </div>
      <ol className="mt-4 grid gap-3 lg:grid-cols-7 lg:gap-2">
        {dias.map((d) => (
          <li key={d.chave} className="grid grid-cols-[4.5rem_1fr] gap-3 border-t border-tinta/10 pt-3 lg:block lg:rounded-2xl lg:border-0 lg:bg-papel-2/50 lg:p-2">
            <p className="text-sm font-semibold tabular-nums text-tinta lg:mb-2 lg:px-0.5">{d.rotulo}</p>
            {d.itens.length > 0 ? (
              <ul className="space-y-2">{d.itens.map(slot)}</ul>
            ) : (
              <p className="text-xs text-tinta-3 lg:px-0.5">Sem post</p>
            )}
          </li>
        ))}
      </ol>
      {depois.length > 0 && (
        <div className="mt-5">
          <p className="text-sm font-medium text-tinta-3">Depois desta semana</p>
          <ul className="mt-2 divide-y divide-tinta/10 border-y border-tinta/10">
            {depois.map((c) => {
              const p = posts.get(c.post_id);
              return (
                <li key={c.post_id}>
                  <a
                    href={`#post-${c.post_id}`}
                    className="flex items-center gap-3 py-2 text-sm transition hover:bg-papel-2/40 focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-pauta"
                  >
                    <span className="w-28 shrink-0 tabular-nums text-tinta-2">
                      {DIAS[dataLocal(c.data).getDay()]} {ddmm(c.data)} {c.horario}
                    </span>
                    <span className="hidden w-20 shrink-0 text-tinta-3 sm:block">{NOMES_REDE[c.rede]}</span>
                    <span className="min-w-0 flex-1 truncate text-tinta">{p?.gancho}</span>
                    {p?.origem_tema === "founder" && <Selo />}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
