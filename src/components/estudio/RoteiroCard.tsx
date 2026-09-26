"use client";

import { useState } from "react";
import type { RoteiroVideo } from "@/lib/motor/contrato";
import { AprovarRecusar, JaPostei, Recusado } from "./JaPostei";
import { BOTAO_SECUNDARIO, CaixaRevisar, SeloFounder, TresLinhas, comLacunas } from "./Partes";
import { NOMES_REDE_VIDEO, diaCurto, duracaoVideo } from "./rotulos";
import type { Escolha, Postado } from "./useFeedback";

/** Roteiro de vídeo curto: o que falar nos primeiros 3 segundos, cena por cena, e a legenda para publicar. */
export function RoteiroCard({
  roteiro: r,
  indice,
  decisao,
  onDecidir,
  resultado,
  onResultado,
}: {
  roteiro: RoteiroVideo;
  indice: number;
  decisao?: Escolha;
  onDecidir?: (escolha: Escolha | null) => void;
  resultado?: Postado;
  onResultado?: (v: Postado) => void;
}) {
  const [copiado, setCopiado] = useState(false);
  const rede = NOMES_REDE_VIDEO[r.rede] ?? r.rede;
  const duracao = duracaoVideo(r.duracao_seg);
  const cenas = r.cenas ?? [];
  const aprovado = decisao === "aprovado";

  async function copiar() {
    try {
      await navigator.clipboard.writeText(r.legenda);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1600);
    } catch {
      /* sem permissão de área de transferência */
    }
  }

  const cabecalho = (
    <header className="flex items-center justify-between gap-3 border-b border-tinta/10 px-4 py-2.5">
      <p className="min-w-0 text-xs text-tinta-3">
        <span className="font-semibold text-tinta">Vídeo {indice + 1}</span> · {rede}
        {duracao && <> · {duracao}</>}
        {r.origem_tema === "founder" && <SeloFounder className="ml-1.5" />}
      </p>
      {r.agenda && (
        <p className="shrink-0 rounded-full bg-pauta px-2.5 py-1 text-xs font-semibold tabular-nums text-white">
          Gravar {diaCurto(r.agenda.data)} · {r.agenda.horario}
        </p>
      )}
    </header>
  );

  if (decisao === "pulado") {
    return (
      <article className="flex flex-col overflow-hidden rounded-3xl border border-dashed border-tinta/20 bg-papel/60">
        {cabecalho}
        <Recusado titulo={r.titulo} onDesfazer={() => onDecidir?.(null)} />
      </article>
    );
  }

  return (
    <article
      className={`flex flex-col overflow-hidden rounded-3xl border bg-white ${aprovado ? "border-aprovado ring-2 ring-aprovado/60" : "border-tinta/10"}`}
      style={{ animation: `subir .6s ${Math.min(indice, 8) * 0.06}s both` }}
    >
      {cabecalho}
      <TresLinhas
        enderecamento={r.enderecamento}
        padrao={r.padrao_referencia?.nome?.trim()}
        fonte={r.padrao_referencia?.fonte_url}
        origem={r.origem_tema}
        depois="depois de assistir"
      />

      <div className="flex flex-1 flex-col px-4 pb-4 pt-4">
        <h3 className="font-display text-xl font-semibold leading-snug tracking-[-0.01em]">{r.titulo}</h3>

        <div className="mt-4 rounded-2xl bg-limao/50 px-4 py-3">
          <p className="text-xs font-semibold text-tinta">Primeiros 3 segundos, olhando para a câmera</p>
          <p className="mt-1 font-display text-lg font-semibold leading-snug text-tinta">{comLacunas(r.gancho)}</p>
        </div>

        {cenas.length > 0 && (
          <ol className="mt-4 space-y-3">
            {cenas.map((c, k) => (
              <li key={k} className="grid grid-cols-[1.75rem_1fr] gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-papel-2 text-xs font-semibold tabular-nums text-tinta">{k + 1}</span>
                <div className="min-w-0 text-sm leading-relaxed">
                  <p className="text-tinta">{comLacunas(c.fala)}</p>
                  {c.tela && (
                    <p className="mt-0.5 text-xs text-tinta-2">
                      <span className="font-semibold text-tinta-3">Na tela:</span> {c.tela}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}

        {r.chamada_final && (
          <div className="mt-4 border-t border-tinta/10 pt-3 text-sm">
            <p className="text-xs font-semibold text-tinta-3">Para fechar</p>
            <p className="mt-0.5 leading-relaxed text-tinta">{comLacunas(r.chamada_final)}</p>
          </div>
        )}

        {r.dica_gravacao && (
          <p className="mt-3 rounded-2xl bg-papel px-3 py-2 text-xs leading-relaxed text-tinta-2">
            <span className="font-semibold text-tinta">Dica de gravação:</span> {r.dica_gravacao}
          </p>
        )}

        {r.legenda && (
          <details className="group/legenda mt-3 rounded-2xl border border-tinta/10 px-3 py-2 text-sm">
            <summary className="cursor-pointer list-none text-xs font-semibold text-tinta [&::-webkit-details-marker]:hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pauta">
              Legenda para publicar <span aria-hidden="true" className="inline-block transition group-open/legenda:rotate-90">›</span>
            </summary>
            <p className="mt-2 max-h-40 overflow-y-auto whitespace-pre-line leading-relaxed text-tinta-2">{comLacunas(r.legenda)}</p>
          </details>
        )}

        <CaixaRevisar itens={r.precisa_revisao ?? []} titulo="Precisa revisar antes de gravar" />

        {onDecidir && <AprovarRecusar decisao={decisao} onDecidir={onDecidir} />}
        {aprovado && onResultado && <JaPostei atual={resultado} onSalvar={onResultado} />}
        {r.legenda && (
          <button type="button" onClick={copiar} className={`${BOTAO_SECUNDARIO} mt-2 w-full`}>
            {copiado ? <span className="text-aprovado">Copiado ✓</span> : "Copiar legenda"}
          </button>
        )}
      </div>
    </article>
  );
}
