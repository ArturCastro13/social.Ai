"use client";

import { useEffect, useState } from "react";
import { NOMES_FORMATO } from "@/lib/feedback";
import type { SinaisNicho } from "@/lib/oportunidade";
import type { Analise } from "@/lib/types";
import { ehLink } from "./rotulos";

const FONTE = "text-xs leading-snug text-tinta-3";

function multiplo(x: number) {
  return `${x.toFixed(1).replace(".", ",")} vezes a mediana`;
}

function semProtocolo(url: string) {
  return url.replace(/^https?:\/\//i, "").replace(/\/$/, "");
}

/**
 * "Ver o que funciona nos concorrentes": painel que abre sob demanda.
 * Duas fontes, as duas opcionais: o que a IA leu na página pública dos concorrentes informados (sem números)
 * e os posts do nicho com métrica verificada na base curada (GET /api/radar).
 */
export function Concorrentes({ analise }: { analise: Analise }) {
  const [aberto, setAberto] = useState(false);
  const [radar, setRadar] = useState<{ nicho: string; sinais: SinaisNicho | null } | null>(null);
  const concorrentes = (analise.benchmark_concorrentes ?? []).filter((c) => c?.nome || c?.url);

  // Só busca o radar quando o painel abre pela primeira vez.
  useEffect(() => {
    if (!aberto || radar?.nicho === analise.nicho) return;
    let vivo = true;
    const nicho = analise.nicho;
    fetch(`/api/radar?nicho=${encodeURIComponent(nicho)}`, { signal: AbortSignal.timeout(6000) })
      .then((r) => (r.ok ? (r.json() as Promise<SinaisNicho>) : null))
      .catch(() => null)
      .then((sinais) => {
        if (vivo) setRadar({ nicho, sinais });
      });
    return () => {
      vivo = false;
    };
  }, [aberto, analise.nicho, radar?.nicho]);

  const radarPronto = radar?.nicho === analise.nicho;
  const outliers = radarPronto ? (radar.sinais?.outliers ?? []).slice(0, 5) : [];
  const vazio = radarPronto && concorrentes.length === 0 && outliers.length === 0;

  return (
    <div>
      <button
        type="button"
        aria-expanded={aberto}
        aria-controls="painel-concorrentes"
        onClick={() => setAberto((a) => !a)}
        className="tocavel flex w-full items-center justify-between gap-3 rounded-2xl border border-tinta/15 bg-white px-4 py-4 text-left hover:border-tinta/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pauta sm:px-5"
      >
        <span>
          <span className="block font-semibold text-tinta">Ver o que funciona nos concorrentes</span>
          <span className="mt-0.5 block text-sm text-tinta-2">
            {concorrentes.length ? `${concorrentes.length === 1 ? "1 concorrente lido" : `${concorrentes.length} concorrentes lidos`} e posts do seu nicho.` : "Posts do seu nicho que foram bem."}
          </span>
        </span>
        <span aria-hidden="true" className={`shrink-0 text-xl text-tinta-3 transition-transform duration-300 ${aberto ? "rotate-90" : ""}`}>
          ›
        </span>
      </button>

      {aberto && (
        <div id="painel-concorrentes" className="mt-4 space-y-8 animate-[aparecer_.4s_cubic-bezier(.2,.7,.1,1)_both]">
          {concorrentes.length > 0 && (
            <section aria-labelledby="titulo-concorrentes">
              <h4 id="titulo-concorrentes" className="font-semibold text-tinta">
                O que seus concorrentes publicam
              </h4>
              <p className={`mt-1 ${FONTE}`}>Lido da página pública deles. As redes não mostram números de concorrentes.</p>
              <ul className="mt-4 grid gap-3 lg:grid-cols-2">
                {concorrentes.map((c) => (
                  <li key={c.url || c.nome} className="rounded-2xl border border-tinta/10 bg-papel p-4">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="min-w-0 truncate font-semibold text-tinta">{c.nome || semProtocolo(c.url)}</p>
                      {ehLink(c.url) && (
                        <a
                          href={c.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 text-xs text-tinta-2 underline decoration-tinta/30 underline-offset-2 hover:decoration-tinta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pauta"
                        >
                          abrir
                        </a>
                      )}
                    </div>
                    {(c.formatos ?? []).length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-semibold text-tinta-3">Formatos</p>
                        <ul className="mt-1 flex flex-wrap gap-1.5">
                          {c.formatos.map((f) => (
                            <li key={f} className="rounded-full bg-white px-2.5 py-0.5 text-xs text-tinta">
                              {f}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {(c.angulos ?? []).length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-semibold text-tinta-3">Ângulos</p>
                        <ul className="mt-1 space-y-0.5 text-sm leading-snug text-tinta">
                          {c.angulos.map((a) => (
                            <li key={a}>{a}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {c.oportunidade && (
                      <p className="mt-3 border-t border-tinta/10 pt-3 text-sm leading-relaxed text-tinta-2">
                        <span className="font-semibold text-tinta">Brecha para você:</span> {c.oportunidade}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section aria-labelledby="titulo-nicho">
            <h4 id="titulo-nicho" className="font-semibold text-tinta">
              Posts do seu nicho que foram bem
            </h4>
            <p className={`mt-1 ${FONTE}`}>Posts do seu nicho com números verificados na nossa base. Servem de referência, não de cópia.</p>
            {!radarPronto ? (
              <p className="mt-4 text-sm text-tinta-3" role="status">
                Carregando.
              </p>
            ) : !radar.sinais ? (
              <p className="mt-4 text-sm text-tinta-3">Não deu para carregar a base agora. Tente de novo em instantes.</p>
            ) : outliers.length === 0 ? (
              <p className="mt-4 text-sm text-tinta-3">Ainda não há posts com número verificado suficiente neste nicho.</p>
            ) : (
              <ul className="mt-4 divide-y divide-tinta/10 border-y border-tinta/10">
                {outliers.map((o) => (
                  <li key={o.id} className="py-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                      <p className="text-sm text-tinta-3">
                        {o.autor ?? "Autor não informado"} · {NOMES_FORMATO[o.formato] ?? o.formato}
                      </p>
                      <p className="shrink-0 text-sm font-semibold tabular-nums text-tinta">{multiplo(o.multiplo)}</p>
                    </div>
                    <p className="mt-1.5 leading-snug text-tinta">{o.gancho.length > 140 ? `${o.gancho.slice(0, 140).trimEnd()}...` : o.gancho}</p>
                    {o.link && ehLink(o.link) && (
                      <a
                        href={o.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-block text-sm text-tinta-2 underline decoration-tinta/30 underline-offset-4 hover:decoration-tinta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pauta"
                      >
                        Ver o post original
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {vazio && (
            <p className="rounded-2xl bg-papel-2 px-4 py-3 text-sm leading-relaxed text-tinta-2">
              Ainda não temos com o que comparar. Na próxima pauta, coloque dois ou três concorrentes nos ajustes e a gente lê o que eles publicam.
            </p>
          )}
          {!vazio && concorrentes.length === 0 && radarPronto && (
            <p className="text-sm text-tinta-3">Quer ver seus concorrentes aqui? Na próxima pauta, coloque os sites deles nos ajustes.</p>
          )}
        </div>
      )}
    </div>
  );
}
