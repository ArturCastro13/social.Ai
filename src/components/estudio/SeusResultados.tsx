"use client";

import { BarrasAprovacao } from "@/components/graficos/BarrasAprovacao";
import { NOMES_FORMATO } from "@/lib/feedback";
import type { Analise } from "@/lib/types";
import { formatarNumero, formatarPct, resumoPostado } from "./JaPostei";
import { NOMES_REDE, NOMES_REDE_VIDEO } from "./rotulos";
import type { Feedback } from "./useFeedback";

/** O que o motor aprendeu com os números informados. Opcional: demo, cache antigo e marca sem post publicado não têm. */
function lerAprendizados(analise: Analise) {
  const a = analise.aprendizados;
  if (!a) return null;
  const funcionou = (a.funcionou ?? []).filter(Boolean).slice(0, 3);
  const nao = (a.nao_funcionou ?? []).filter(Boolean).slice(0, 3);
  const ajuste = a.ajuste?.trim();
  return funcionou.length || nao.length || ajuste ? { funcionou, nao_funcionou: nao, ajuste } : null;
}

/**
 * "Seus resultados": o que foi aprovado e os números do que foi postado. É daqui que a próxima pauta aprende.
 * Totais e barras usam todo o histórico da marca neste navegador; a lista mostra só esta pauta.
 */
export function SeusResultados({ analise, fb, onAbrir }: { analise: Analise; fb: Feedback; onAbrir?: (ancora: string) => void }) {
  const aprendizados = lerAprendizados(analise);
  const { resumo } = fb;
  const postados = [
    ...analise.posts
      .filter((p) => fb.resultados[p.id])
      .map((p) => ({ id: p.id, titulo: p.gancho, rede: NOMES_REDE[p.rede_principal], r: fb.resultados[p.id] })),
    ...(analise.roteiros ?? [])
      .filter((v) => fb.videos[v.id]?.resultado)
      .map((v) => ({ id: v.id, titulo: v.titulo, rede: `Vídeo · ${NOMES_REDE_VIDEO[v.rede] ?? v.rede}`, r: fb.videos[v.id].resultado! })),
  ];
  const totalPostados = resumo.formatos.reduce((n, f) => n + f.publicados, 0) + Object.values(fb.videos).filter((v) => v.resultado).length;
  const comEngajamento = resumo.formatos.filter((f) => f.engajamento !== null);
  const vazio = resumo.total === 0 && totalPostados === 0;

  return (
    <section aria-labelledby="titulo-seus-resultados">
      <div>
        <h2 id="titulo-seus-resultados" className="font-display text-3xl font-semibold tracking-[-0.02em] sm:text-4xl">
          Seus resultados
        </h2>

        {aprendizados && (
          <div className="mt-6 max-w-3xl rounded-3xl border border-tinta/10 bg-papel p-5 sm:p-6">
            <p className="font-semibold text-tinta">O que a gente aprendeu com seus posts</p>
            <div className="mt-3 grid gap-4 text-sm sm:grid-cols-2">
              {aprendizados.funcionou!.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-aprovado">Funcionou</p>
                  <ul className="mt-1 space-y-1 leading-snug text-tinta">
                    {aprendizados.funcionou!.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                </div>
              )}
              {aprendizados.nao_funcionou!.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-pauta-escura">Não funcionou</p>
                  <ul className="mt-1 space-y-1 leading-snug text-tinta">
                    {aprendizados.nao_funcionou!.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            {aprendizados.ajuste && (
              <p className="mt-4 border-t border-tinta/10 pt-3 text-sm leading-relaxed text-tinta-2">
                <span className="font-semibold text-tinta">Nesta pauta:</span> {aprendizados.ajuste}
              </p>
            )}
          </div>
        )}

        {vazio ? (
          <p className="mt-3 max-w-xl text-tinta-2">
            Depois de postar, toque em &quot;Já postei&quot; no post aprovado, na aba Calendário, e coloque os números. A próxima pauta aprende com eles.
          </p>
        ) : (
          <div className="mt-6 grid gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <dl className="grid grid-cols-3 gap-4 border-y border-tinta/10 py-5">
                <div>
                  <dt className="text-sm text-tinta-3">Avaliados</dt>
                  <dd className="mt-1 font-display text-3xl font-semibold tabular-nums">{resumo.total}</dd>
                </div>
                <div>
                  <dt className="text-sm text-tinta-3">Aprovados</dt>
                  <dd className="mt-1 font-display text-3xl font-semibold tabular-nums">{resumo.aprovados}</dd>
                </div>
                <div>
                  <dt className="text-sm text-tinta-3">Postados</dt>
                  <dd className="mt-1 font-display text-3xl font-semibold tabular-nums">{totalPostados}</dd>
                </div>
              </dl>
              {resumo.formatos.length > 0 && (
                <div className="mt-8">
                  <BarrasAprovacao
                    titulo="Aprovação por formato"
                    linhas={resumo.formatos
                      .filter((f) => f.aprovados + f.pulados > 0)
                      .map((f) => ({
                        rotulo: NOMES_FORMATO[f.formato] ?? f.formato,
                        valor: f.taxa,
                        detalhe: `${f.aprovados} de ${f.aprovados + f.pulados} aprovados`,
                      }))}
                  />
                </div>
              )}
              {comEngajamento.length > 0 && (
                <div className="mt-8">
                  <BarrasAprovacao
                    titulo="Engajamento por formato (interações sobre alcance)"
                    linhas={comEngajamento.map((f) => ({
                      rotulo: NOMES_FORMATO[f.formato] ?? f.formato,
                      valor: f.engajamento ?? 0,
                      detalhe: `${formatarPct(f.engajamento ?? 0)} em ${f.publicados} ${f.publicados === 1 ? "post" : "posts"}`,
                    }))}
                  />
                </div>
              )}
            </div>
            <div>
              <h4 className="font-semibold">Postados desta pauta</h4>
              {postados.length === 0 ? (
                <p className="mt-2 text-sm text-tinta-2">Depois de postar, toque em &quot;Já postei&quot; no post aprovado, na aba Calendário.</p>
              ) : (
                <ul className="mt-3 divide-y divide-tinta/10 border-y border-tinta/10">
                  {postados.map((p) => (
                    <li key={p.id} className="py-3">
                      <button
                        type="button"
                        onClick={() => onAbrir?.(p.rede.startsWith("Vídeo") ? `video-${p.id}` : `post-${p.id}`)}
                        className="line-clamp-1 text-left text-sm font-medium text-tinta hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pauta"
                      >
                        {p.titulo}
                      </button>
                      <p className="mt-0.5 text-xs tabular-nums text-tinta-2">
                        {p.rede} · {resumoPostado(p.r)}
                        {p.r.curtidas != null && <> · {formatarNumero(p.r.curtidas)} curtidas</>}
                        {p.r.comentarios != null && <> · {formatarNumero(p.r.comentarios)} comentários</>}
                        {p.r.salvamentos != null && <> · {formatarNumero(p.r.salvamentos)} salvos</>}
                        {p.r.compartilhamentos != null && <> · {formatarNumero(p.r.compartilhamentos)} compartilhamentos</>}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
