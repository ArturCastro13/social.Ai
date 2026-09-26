"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { baixarZip, type Personalizacao } from "@/lib/client/artes";
import { OBJETIVOS } from "@/lib/motor/constantes";
import type { ExtrasAnalise, ExtrasPost } from "@/lib/motor/contrato";
import { NICHOS, type Analise, type Rede } from "@/lib/types";
import { IdeiasEMetricas } from "./IdeiasEMetricas";
import { PostCard } from "./PostCard";
import { NOMES_REDE } from "./rotulos";
import { SuaSemana } from "./SuaSemana";
const COR_REDE: Record<Rede, string> = { instagram: "#e1306c", linkedin: "#0a66c2", x: "#16130f", facebook: "#1877f2" };

const ORIGEM: Record<Analise["origem"], { rotulo: string; classe: string }> = {
  ia: { rotulo: "Escrito pela IA agora", classe: "bg-tinta text-papel" },
  cache: { rotulo: "Análise salva desta URL", classe: "bg-tinta/85 text-papel" },
  demo: { rotulo: "Exemplo pré-processado", classe: "bg-pauta/10 text-pauta-escura" },
  local: { rotulo: "Motor local, sem IA", classe: "bg-papel-2 text-tinta" },
};

const CONFIANCA: Record<NonNullable<ExtrasAnalise["contexto_inferido"]>["confianca"], string> = {
  alta: "Confiança alta na leitura do site",
  media: "Confiança média na leitura do site",
  baixa: "Confiança baixa: o site disse pouco, vale revisar",
};

const TITULO_SECAO = "font-display text-3xl font-semibold tracking-[-0.02em] sm:text-4xl";
const CHIP = "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium";
/** Âncoras que moram dentro de "Ver análise completa": ao serem chamadas, abrem o bloco. */
const DENTRO_DA_ANALISE = new Set(["analise", "diagnostico", "estrategia"]);

export function Painel({ analise, onNova }: { analise: Analise; onNova?: () => void }) {
  const [pers, setPers] = useState<Record<string, Personalizacao>>({});
  const analiseRef = useRef<HTMLDetailsElement>(null);
  const [zip, setZip] = useState<{ feito: number; total: number } | null>(null);
  const [aviso, setAviso] = useState("");
  const b = analise.brand;
  // Campos novos do motor chegam opcionais; análises antigas (demo, cache) seguem sem eles.
  const extras = analise as Analise & ExtrasAnalise;
  const paraRevisar = analise.posts.filter((p) => ((p as ExtrasPost).precisa_revisao ?? []).length > 0).length;
  const nicho = NICHOS.find((n) => n.id === analise.nicho)?.nome ?? analise.nicho;
  const publicoUsado = extras.contexto_inferido?.publico?.trim();
  // "3 posts para Gerar clientes, 2 para Autoridade do founder": só conta posts que vieram endereçados.
  const porObjetivo = useMemo(() => {
    const contagem = new Map<string, number>();
    for (const p of analise.posts) {
      const id = (p as ExtrasPost).enderecamento?.objetivo;
      if (id) contagem.set(id, (contagem.get(id) ?? 0) + 1);
    }
    return [...contagem.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([id, n]) => ({ n, nome: OBJETIVOS.find((o) => o.id === id)?.nome ?? id }));
  }, [analise]);
  const frasePorObjetivo = porObjetivo.map((o, i) => `${o.n}${i === 0 ? (o.n === 1 ? " post" : " posts") : ""} para ${o.nome}`).join(", ");

  const doFounder = analise.posts.filter((p) => p.origem_tema === "founder").length;

  // Link para #analise, #diagnostico ou #estrategia abre o bloco recolhido antes de rolar até ele.
  useEffect(() => {
    function abrirSePreciso(hash: string) {
      const id = hash.replace(/^#/, "");
      const det = analiseRef.current;
      if (!det || !DENTRO_DA_ANALISE.has(id)) return;
      if (!det.open) det.open = true;
      requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: "start" }));
    }
    function aoClicar(e: MouseEvent) {
      const a = (e.target as Element | null)?.closest?.("a[href^='#']");
      if (a) abrirSePreciso(a.getAttribute("href") ?? "");
    }
    abrirSePreciso(window.location.hash);
    document.addEventListener("click", aoClicar);
    return () => document.removeEventListener("click", aoClicar);
  }, []);

  async function baixarUma(url: string, nome: string) {
    setAviso("");
    const res = await fetch(url).catch(() => null);
    if (!res?.ok) {
      setAviso("Não deu para baixar essa arte agora. Tente de novo em instantes.");
      return;
    }
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = nome;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  async function baixarTudo() {
    setZip({ feito: 0, total: 1 });
    setAviso("");
    try {
      const r = await baixarZip(analise, pers, (feito, total) => setZip({ feito, total }));
      if (r.falhas) setAviso(`${r.falhas} de ${r.total} imagens não vieram; o ZIP foi baixado com as demais.`);
    } catch (e) {
      setAviso((e as Error).message);
    } finally {
      setZip(null);
    }
  }

  return (
    <section id="resultado" className="flex scroll-mt-4 flex-col bg-papel">
      {/* Cabeçalho do resultado */}
      <div className="mx-auto w-full max-w-6xl px-4 pb-10 pt-10 sm:pt-14">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`${CHIP} ${ORIGEM[analise.origem].classe}`}>{ORIGEM[analise.origem].rotulo}</span>
          <span className={`${CHIP} border border-tinta/10 bg-white text-tinta-2`}>Nicho: {nicho}</span>
          <span className={`${CHIP} border border-tinta/10 bg-white text-tinta-2`}>{analise.posts.length} posts</span>
          {doFounder > 0 && (
            <a
              href="#posts"
              className={`${CHIP} bg-salvia text-papel hover:bg-salvia/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pauta`}
            >
              {doFounder} {doFounder === 1 ? "post do que você contou" : "posts do que você contou"}
            </a>
          )}
          {paraRevisar > 0 && (
            <a
              href="#posts"
              className={`${CHIP} border border-pauta/40 bg-pauta/5 text-pauta-escura hover:border-pauta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pauta`}
            >
              {paraRevisar} {paraRevisar === 1 ? "post pede" : "posts pedem"} um dado seu
            </a>
          )}
          {onNova && (
          <button
            type="button"
            onClick={onNova}
            className="ml-auto inline-flex h-9 items-center rounded-full border border-tinta/15 bg-white px-4 text-sm font-medium text-tinta-2 transition hover:border-tinta/30 hover:text-tinta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pauta"
          >
            ← analisar outro site
          </button>
          )}
        </div>
        <div className="mt-8">
          <p className="text-sm font-medium text-tinta-3">Pauta de {b.nome}</p>
          <h2 className="mt-2 max-w-3xl text-balance font-display text-2xl font-semibold leading-[1.15] tracking-[-0.02em] sm:text-[2rem]">{analise.posicionamento}</h2>
        </div>
        <SuaSemana analise={analise} />
        <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-tinta-2">
          <span className="text-tinta-3">Sua marca nas artes</span>
          <span className="flex gap-1">
            {[b.paleta.primaria, b.paleta.secundaria, b.paleta.destaque, b.paleta.fundo, b.paleta.texto].map((c, i) => (
              <span key={c + i} title={c} className="h-6 w-6 rounded-full border border-tinta/10" style={{ background: c }} />
            ))}
          </span>
          <span>
            <span className="font-semibold text-tinta">{b.fontes.titulo}</span>
            {b.fontes.corpo !== b.fontes.titulo && <> e {b.fontes.corpo}</>}
          </span>
        </div>
        {analise.avisos.length > 0 && (
          <ul className="mt-6 space-y-1 rounded-2xl border border-pauta/25 bg-pauta/5 px-4 py-3 text-sm text-tinta-2">
            {analise.avisos.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        )}
      </div>

      {/* Posts */}
      <div id="posts" className="scroll-mt-28 border-t border-tinta/10">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h3 className={TITULO_SECAO}>Posts prontos</h3>
              <p className="mt-2 text-tinta-2">Troque a cor, troque o modelo, poste.</p>
            </div>
            <button
              type="button"
              onClick={baixarTudo}
              disabled={!!zip}
              className="inline-flex h-12 items-center rounded-full bg-pauta px-6 font-semibold text-white transition hover:bg-pauta-escura focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pauta disabled:opacity-70"
            >
              {zip ? `Montando o ZIP ${Math.round((zip.feito / Math.max(zip.total, 1)) * 100)}%` : "Baixar tudo em ZIP"}
            </button>
          </div>
          {aviso && (
            <p className="mt-4 rounded-2xl border border-pauta/25 bg-pauta/5 px-4 py-3 text-sm" role="alert">
              {aviso}
            </p>
          )}
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {analise.posts.map((p, i) => (
              <div key={p.id} id={`post-${p.id}`} className="scroll-mt-6">
                <PostCard
                  analise={analise}
                  post={p}
                  indice={i}
                  pers={pers[p.id] ?? {}}
                  onPers={(x) => setPers((old) => ({ ...old, [p.id]: x }))}
                  onBaixar={baixarUma}
                  agenda={analise.calendario.find((c) => c.post_id === p.id)}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
      <IdeiasEMetricas analise={analise} />

      {/* Diagnóstico e estratégia ficam recolhidos para o painel não crescer. */}
      <details id="analise" ref={analiseRef} className="group/analise scroll-mt-28 border-t border-tinta/10">
        <summary className="mx-auto flex max-w-6xl cursor-pointer list-none items-center justify-between gap-4 px-4 py-8 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-pauta [&::-webkit-details-marker]:hidden">
          <span>
            <span className="block font-display text-2xl font-semibold tracking-[-0.02em]">Ver análise completa</span>
            <span className="mt-1 block text-sm text-tinta-2">Diagnóstico do nicho, pilares e o papel de cada rede.</span>
          </span>
          <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-tinta/15 bg-white text-lg transition group-open/analise:rotate-45">
            +
          </span>
        </summary>
        {/* Diagnóstico */}
        <div id="diagnostico" className="scroll-mt-28 border-t border-tinta/10">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 lg:grid-cols-[1fr_2fr] lg:gap-16">
            <div className="space-y-6">
              <h3 className={TITULO_SECAO}>Diagnóstico</h3>
              <div>
                <h4 className="text-sm font-medium text-tinta-3">O negócio</h4>
                <p className="mt-1 leading-relaxed">{analise.resumo_negocio}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-tinta-3">Quem compra</h4>
                <p className="mt-1 leading-relaxed">{analise.publico}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-tinta-3">Tom de voz</h4>
                <p className="mt-1 leading-relaxed">{analise.tom_de_voz}</p>
              </div>
            </div>
            <div className="rounded-3xl bg-white p-6 shadow-[0_30px_60px_-40px_rgba(22,19,15,.35)] sm:p-8">
              <h4 className="font-display text-2xl font-semibold leading-tight tracking-[-0.02em] sm:text-3xl">
                O que os virais de {nicho} fazem e você ainda não
              </h4>
              <ol className="mt-6 space-y-5">
                {analise.diagnostico.map((d, i) => (
                  <li key={d.titulo} className="grid grid-cols-[2.25rem_1fr] gap-3 border-t border-tinta/10 pt-5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-papel font-display text-sm font-semibold text-tinta">{i + 1}</span>
                    <div>
                      <p className="text-lg font-semibold leading-snug">{d.titulo}</p>
                      <p className="mt-1 leading-relaxed text-tinta-2">{d.texto}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>

        {/* Estratégia */}
        <div id="estrategia" className="scroll-mt-28 border-t border-tinta/10">
          <div className="mx-auto max-w-6xl px-4 py-14">
            <h3 className={TITULO_SECAO}>Estratégia</h3>
            {extras.comentario_frequencia && <p className="mt-3 max-w-3xl text-sm leading-relaxed text-tinta-2">{extras.comentario_frequencia}</p>}
            {(extras.o_que_aprendi || extras.contexto_inferido || porObjetivo.length > 0) && (
              <div className="mt-6 max-w-3xl rounded-3xl border border-tinta/10 bg-white p-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-tinta-3">O que aprendi com você</p>
                  {extras.contexto_inferido && (
                    <span
                      className={`${CHIP} ${extras.contexto_inferido.confianca === "baixa" ? "border border-pauta/40 bg-pauta/5 text-pauta-escura" : "bg-papel text-tinta-2"}`}
                    >
                      {CONFIANCA[extras.contexto_inferido.confianca] ?? extras.contexto_inferido.confianca}
                    </span>
                  )}
                </div>
                {extras.o_que_aprendi && <p className="mt-2 leading-relaxed text-tinta">{extras.o_que_aprendi}</p>}
                {(publicoUsado || porObjetivo.length > 0) && (
                  <dl className="mt-4 space-y-3 border-t border-tinta/10 pt-4 text-sm">
                    {publicoUsado && (
                      <div>
                        <dt className="text-tinta-3">Público que os posts miram</dt>
                        <dd className="mt-0.5 font-semibold leading-snug text-tinta">{publicoUsado}</dd>
                      </div>
                    )}
                    {porObjetivo.length > 0 && (
                      <div>
                        <dt className="text-tinta-3">Objetivo de cada post</dt>
                        <dd className="mt-0.5 leading-snug text-tinta">{frasePorObjetivo}.</dd>
                      </div>
                    )}
                  </dl>
                )}
              </div>
            )}
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {analise.pilares.map((p, i) => (
                <div key={p.nome} className="rounded-3xl border border-tinta/10 bg-white p-6">
                  <p className="text-xs font-medium text-tinta-3">Pilar {i + 1}</p>
                  <p className="mt-2 font-display text-2xl font-semibold leading-tight tracking-[-0.02em]">{p.nome}</p>
                  <p className="mt-2 text-sm leading-relaxed text-tinta-2">{p.descricao}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 divide-y divide-tinta/10 rounded-3xl border border-tinta/10 bg-white px-6">
              {analise.estrategia.map((e) => (
                <div key={e.rede} className="grid gap-2 py-4 sm:grid-cols-[10rem_9rem_1fr] sm:items-baseline">
                  <p className="flex items-center gap-2 font-semibold">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: COR_REDE[e.rede] }} />
                    {NOMES_REDE[e.rede]}
                  </p>
                  <p className="text-sm tabular-nums text-tinta-2">{e.frequencia_semanal} {e.frequencia_semanal === 1 ? "vez" : "vezes"} por semana</p>
                  <p className="text-sm leading-relaxed text-tinta-2">{e.foco}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </details>
    </section>
  );
}
