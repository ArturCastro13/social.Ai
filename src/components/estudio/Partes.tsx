import { OBJETIVOS } from "@/lib/motor/constantes";
import type { Enderecamento } from "@/lib/motor/contrato";
import { SELO_FOUNDER, ehLink, rotuloOrigem } from "./rotulos";

function nomeObjetivo(id: string | undefined) {
  return OBJETIVOS.find((o) => o.id === id)?.nome;
}

/**
 * Três linhas fixas, sempre na mesma ordem: para quem, por que funciona e de onde veio o tema.
 * Usada no post e no roteiro. Demo e cache antigos não têm os campos novos; cada linha tem fallback ou some.
 */
export function TresLinhas({
  enderecamento: e,
  padrao,
  fonte,
  origem,
  depois = "depois de ler",
}: {
  enderecamento?: Enderecamento;
  padrao?: string;
  fonte?: string;
  origem?: string;
  depois?: string;
}) {
  const objetivo = nomeObjetivo(e?.objetivo);
  return (
    <dl className="grid grid-cols-[6.5rem_1fr] gap-x-2 gap-y-1 border-b border-tinta/10 bg-papel px-4 py-2.5 text-xs leading-snug text-tinta-2">
      {e?.publico && (
        <>
          <dt className="text-tinta-3">Para quem</dt>
          <dd className="min-w-0">
            <span className="flex items-start justify-between gap-2">
              <strong className="line-clamp-2 font-semibold text-tinta">{e.publico}</strong>
              {objetivo && <span className="shrink-0 rounded-full bg-tinta px-2 py-0.5 text-[11px] font-semibold text-papel">{objetivo}</span>}
            </span>
            {e.acao_esperada && (
              <span className="mt-0.5 line-clamp-1 block" title={e.acao_esperada}>
                {depois}: {e.acao_esperada}
              </span>
            )}
          </dd>
        </>
      )}
      {padrao && (
        <>
          <dt className="text-tinta-3">Por que funciona</dt>
          <dd className="min-w-0">
            {ehLink(fonte) ? (
              <a
                href={fonte}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-tinta underline decoration-tinta/30 underline-offset-2 hover:decoration-tinta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pauta"
              >
                {padrao}
              </a>
            ) : (
              <span className="font-medium text-tinta">{padrao}</span>
            )}
          </dd>
        </>
      )}
      <dt className="text-tinta-3">Veio de</dt>
      <dd className={origem === "founder" ? "font-semibold text-salvia" : "text-tinta"}>{rotuloOrigem(origem)}</dd>
    </dl>
  );
}

/** Destaca os [PREENCHER: ...] no texto, para a pessoa ver onde falta um dado dela. */
export function comLacunas(texto: string) {
  return texto.split(/(\[PREENCHER:[^\]]*\])/g).map((parte, i) =>
    /^\[PREENCHER:/.test(parte) ? (
      <mark key={i} className="rounded bg-limao/70 px-0.5 text-tinta">
        {parte}
      </mark>
    ) : (
      parte
    ),
  );
}

export function CaixaRevisar({ itens, titulo = "Precisa revisar antes de postar" }: { itens: string[]; titulo?: string }) {
  if (!itens.length) return null;
  return (
    <div className="mt-3 rounded-2xl border border-pauta/40 bg-pauta/5 px-3 py-2 text-xs leading-relaxed text-tinta-2">
      <p className="font-semibold text-pauta-escura">{titulo}</p>
      <ul className="mt-1 space-y-0.5">
        {itens.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
    </div>
  );
}

export function SeloFounder({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex rounded-full bg-salvia px-2 py-0.5 text-[11px] font-semibold text-papel ${className}`} title="Nasceu do que você contou">
      {SELO_FOUNDER}
    </span>
  );
}

export const BOTAO_SECUNDARIO =
  "inline-flex h-10 items-center justify-center rounded-full border border-tinta/20 px-3 text-sm font-semibold transition hover:border-tinta/40 hover:bg-papel focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pauta disabled:opacity-60";
