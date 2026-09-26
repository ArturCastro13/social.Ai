"use client";

import { useState } from "react";
import { baixarZip, type Personalizacao } from "@/lib/client/artes";
import type { ExtrasPost } from "@/lib/motor/contrato";
import type { Analise } from "@/lib/types";
import { PostCard } from "./PostCard";
import { RoteiroCard } from "./RoteiroCard";
import { SeusResultados } from "./SeusResultados";
import { SuaSemana, montarSemana } from "./SuaSemana";
import { useFeedback } from "./useFeedback";

/**
 * Âncoras do resultado, na ordem em que aparecem. "videos" só existe quando a análise trouxe roteiros:
 * use `secoesResultado(analise)` para a lista já filtrada.
 */
export const SECOES_RESULTADO: { id: string; nome: string }[] = [
  { id: "semana", nome: "Semana" },
  { id: "posts", nome: "Posts" },
  { id: "videos", nome: "Vídeos" },
  { id: "resultados", nome: "Resultados" },
];

export function secoesResultado(analise: Analise): { id: string; nome: string }[] {
  const temVideos = (analise.roteiros?.length ?? 0) > 0;
  const temSemana = analise.calendario.length > 0 || (analise.roteiros ?? []).some((r) => r.agenda?.data);
  return SECOES_RESULTADO.filter((s) => (s.id === "videos" ? temVideos : s.id === "semana" ? temSemana : true));
}

const ORIGEM: Record<Analise["origem"], { rotulo: string; classe: string }> = {
  ia: { rotulo: "Escrito pela IA agora", classe: "bg-tinta text-papel" },
  cache: { rotulo: "Pauta salva desta marca", classe: "bg-tinta/85 text-papel" },
  demo: { rotulo: "Exemplo pronto", classe: "bg-pauta/10 text-pauta-escura" },
  local: { rotulo: "Motor local, sem IA", classe: "bg-papel-2 text-tinta" },
};

const TITULO_SECAO = "font-display text-3xl font-semibold tracking-[-0.02em] sm:text-4xl";
const CHIP = "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium";

function plural(n: number, um: string, varios: string) {
  return `${n} ${n === 1 ? um : varios}`;
}

/** "5 posts e 2 vídeos", "1 post", "2 vídeos". */
function contagem(posts: number, videos: number) {
  const partes = [posts ? plural(posts, "post", "posts") : "", videos ? plural(videos, "vídeo", "vídeos") : ""].filter(Boolean);
  return partes.join(" e ");
}

export function Painel({ analise, onNova }: { analise: Analise; onNova?: () => void }) {
  const [pers, setPers] = useState<Record<string, Personalizacao>>({});
  const [zip, setZip] = useState<{ feito: number; total: number } | null>(null);
  const [aviso, setAviso] = useState("");
  const fb = useFeedback(analise);
  const b = analise.brand;
  const roteiros = analise.roteiros ?? [];
  const paraRevisar =
    analise.posts.filter((p) => ((p as ExtrasPost).precisa_revisao ?? []).length > 0).length + roteiros.filter((r) => (r.precisa_revisao ?? []).length > 0).length;
  const doFounder = analise.posts.filter((p) => p.origem_tema === "founder").length + roteiros.filter((r) => r.origem_tema === "founder").length;

  // "Esta semana: 5 posts e 2 vídeos." Conta só o que cai nos sete dias da agenda; o resto vira "depois".
  const { dias, depois } = montarSemana(analise);
  const naSemana = dias.flatMap((d) => d.itens);
  const resumoSemana = naSemana.length
    ? `Esta semana: ${contagem(naSemana.filter((s) => s.tipo === "postar").length, naSemana.filter((s) => s.tipo === "gravar").length)}.` +
      (depois.length ? ` Depois, mais ${contagem(depois.filter((s) => s.tipo === "postar").length, depois.filter((s) => s.tipo === "gravar").length)}.` : "")
    : `Na pauta: ${contagem(analise.posts.length, roteiros.length)}.`;
  const totalItens = analise.posts.length + roteiros.length;

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
      {/* Cabeçalho: de quem é a pauta e o que fazer nesta semana. */}
      <div className="mx-auto w-full max-w-6xl px-4 pb-10 pt-10 sm:pt-14">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`${CHIP} ${ORIGEM[analise.origem].classe}`}>{ORIGEM[analise.origem].rotulo}</span>
          {doFounder > 0 && (
            <a
              href="#posts"
              className={`${CHIP} bg-salvia text-papel hover:bg-salvia/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pauta`}
            >
              {doFounder} do que você contou
            </a>
          )}
          {paraRevisar > 0 && (
            <a
              href="#posts"
              className={`${CHIP} border border-pauta/40 bg-pauta/5 text-pauta-escura hover:border-pauta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pauta`}
            >
              {paraRevisar} {paraRevisar === 1 ? "pede" : "pedem"} um dado seu
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
          <p className="text-sm font-medium text-tinta-3">Pauta de</p>
          <h2 className="mt-1 text-balance font-display text-3xl font-semibold leading-[1.1] tracking-[-0.02em] sm:text-[2.5rem]">{b.nome}</h2>
          <p className="mt-3 text-lg text-tinta-2">
            {resumoSemana}
            {fb.aprovados > 0 && (
              <span className="ml-2 inline-flex translate-y-[-2px] rounded-full bg-aprovado/10 px-2.5 py-0.5 text-sm font-semibold tabular-nums text-aprovado">
                {fb.aprovados} de {totalItens} aprovados
              </span>
            )}
          </p>
        </div>
        {analise.avisos.length > 0 && (
          <ul className="mt-6 space-y-1 rounded-2xl border border-pauta/25 bg-pauta/5 px-4 py-3 text-sm text-tinta-2">
            {analise.avisos.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        )}
        <div className="mt-10">
          <SuaSemana analise={analise} />
        </div>
      </div>

      {/* Posts */}
      <div id="posts" className="scroll-mt-28 border-t border-tinta/10">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h3 className={TITULO_SECAO}>Posts prontos</h3>
              <p className="mt-2 text-tinta-2">Aprove o que é a sua cara. Ajuste o texto se quiser e poste no dia marcado.</p>
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
              <div key={p.id} id={`post-${p.id}`} className="scroll-mt-28">
                <PostCard
                  analise={analise}
                  post={p}
                  indice={i}
                  pers={pers[p.id] ?? {}}
                  onPers={(x) => setPers((old) => ({ ...old, [p.id]: x }))}
                  onBaixar={baixarUma}
                  agenda={analise.calendario.find((c) => c.post_id === p.id)}
                  decisao={fb.decisoes[p.id]}
                  onDecidir={(d) => fb.decidir(p, d)}
                  resultado={fb.resultados[p.id]}
                  onResultado={(v) => fb.salvarResultado(p, v)}
                />
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-tinta-2">
            <span className="text-tinta-3">Sua marca nas artes</span>
            <span className="flex gap-1">
              {[b.paleta.primaria, b.paleta.secundaria, b.paleta.destaque, b.paleta.fundo, b.paleta.texto].map((c, i) => (
                <span key={c + i} title={c} className="h-5 w-5 rounded-full border border-tinta/10" style={{ background: c }} />
              ))}
            </span>
            <span>
              <span className="font-semibold text-tinta">{b.fontes.titulo}</span>
              {b.fontes.corpo !== b.fontes.titulo && <> e {b.fontes.corpo}</>}
            </span>
          </div>
        </div>
      </div>

      {/* Vídeos: só aparece quando o motor mandou roteiros. */}
      {roteiros.length > 0 && (
        <div id="videos" className="scroll-mt-28 border-t border-tinta/10">
          <div className="mx-auto max-w-6xl px-4 py-14">
            <h3 className={TITULO_SECAO}>Vídeos para gravar</h3>
            <p className="mt-2 text-tinta-2">Grave com o celular na vertical. Leia a cena, olhe para a câmera, fale.</p>
            <div className="mt-8 grid gap-6 md:grid-cols-2">
              {roteiros.map((r, i) => (
                <div key={r.id} id={`video-${r.id}`} className="scroll-mt-28">
                  <RoteiroCard
                    roteiro={r}
                    indice={i}
                    decisao={fb.videos[r.id]?.decisao}
                    onDecidir={(d) => fb.decidirVideo(r, d)}
                    resultado={fb.videos[r.id]?.resultado}
                    onResultado={(v) => fb.salvarVideo(r, v)}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <SeusResultados analise={analise} fb={fb} />
    </section>
  );
}
