export interface LinhaBarra {
  rotulo: string;
  /** De 0 a 1. */
  valor: number;
  detalhe: string;
}

/** Barras horizontais de uma série só (taxa de aprovação). Rótulos em tinta, cor só na barra. */
export function BarrasAprovacao({ linhas, titulo }: { linhas: LinhaBarra[]; titulo: string }) {
  return (
    <figure>
      <figcaption className="text-sm text-tinta-3">{titulo}</figcaption>
      <ul className="mt-4 space-y-3">
        {linhas.map((l) => (
          <li key={l.rotulo} className="group relative grid grid-cols-[7.5rem_1fr_3rem] items-center gap-3 text-sm sm:grid-cols-[9rem_1fr_3rem]">
            <span className="truncate text-tinta-2">{l.rotulo}</span>
            <span className="relative h-3 border-l border-tinta/25">
              <span
                className="absolute inset-y-0 left-0 rounded-r-[4px] bg-aprovado transition-[width] duration-500"
                style={{ width: `${Math.max(l.valor * 100, l.valor > 0 ? 2 : 0)}%` }}
              />
            </span>
            <span className="text-right font-medium tabular-nums">{Math.round(l.valor * 100)}%</span>
            <span
              role="tooltip"
              className="pointer-events-none absolute -top-9 left-[7.5rem] z-10 whitespace-nowrap rounded-md bg-tinta px-2.5 py-1.5 text-xs text-papel opacity-0 transition-opacity group-hover:opacity-100 sm:left-[9rem]"
            >
              {l.detalhe}
            </span>
          </li>
        ))}
      </ul>
    </figure>
  );
}
