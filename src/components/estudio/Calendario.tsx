"use client";

import { useState } from "react";
import type { Personalizacao } from "@/lib/client/artes";
import type { ExtrasPost } from "@/lib/motor/contrato";
import type { Analise } from "@/lib/types";
import { BOTAO_SECUNDARIO } from "./Partes";
import { PostCard } from "./PostCard";
import { RoteiroCard } from "./RoteiroCard";
import { SuaSemana, montarSemana } from "./SuaSemana";
import type { Feedback } from "./useFeedback";

const ORIGEM: Record<Analise["origem"], { rotulo: string; classe: string }> = {
  ia: { rotulo: "Escrito pela IA agora", classe: "bg-tinta text-papel" },
  cache: { rotulo: "Pauta salva desta marca", classe: "bg-tinta/85 text-papel" },
  demo: { rotulo: "Exemplo pronto", classe: "bg-pauta/10 text-pauta-escura" },
  local: { rotulo: "Motor local, sem IA", classe: "bg-papel-2 text-tinta" },
};

const TITULO_SECAO = "font-display text-2xl font-semibold tracking-[-0.02em] sm:text-3xl";
const CHIP = "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium";

function plural(n: number, um: string, varios: string) {
  return `${n} ${n === 1 ? um : varios}`;
}

/** "5 posts e 2 vídeos", "1 post", "2 vídeos". */
function contagem(posts: number, videos: number) {
  const partes = [posts ? plural(posts, "post", "posts") : "", videos ? plural(videos, "vídeo", "vídeos") : ""].filter(Boolean);
  return partes.join(" e ");
}

/** Chave de seleção: "p:" para post e "v:" para vídeo, porque os ids dos dois podem coincidir. */
type Chave = `p:${string}` | `v:${string}`;

/**
 * Aba "Calendário": a semana, todos os posts e vídeos, o ZIP e a aprovação em massa
 * (todos os pendentes de uma vez ou só os selecionados).
 */
export function Calendario({
  analise,
  fb,
  pers,
  onPers,
  onBaixar,
  onZip,
  zip,
  aviso,
  onNova,
}: {
  analise: Analise;
  fb: Feedback;
  pers: Record<string, Personalizacao>;
  onPers: (id: string, p: Personalizacao) => void;
  onBaixar: (url: string, nome: string) => void | Promise<void>;
  onZip: () => void;
  zip: { feito: number; total: number } | null;
  aviso: string;
  onNova?: () => void;
}) {
  const [selecionando, setSelecionando] = useState(false);
  const [marcados, setMarcados] = useState<Set<Chave>>(new Set());
  const [feito, setFeito] = useState<{ posts: string[]; videos: string[] } | null>(null);

  const b = analise.brand;
  const roteiros = analise.roteiros ?? [];
  const paraRevisar =
    analise.posts.filter((p) => ((p as ExtrasPost).precisa_revisao ?? []).length > 0).length + roteiros.filter((r) => (r.precisa_revisao ?? []).length > 0).length;
  const doFounder = analise.posts.filter((p) => p.origem_tema === "founder").length + roteiros.filter((r) => r.origem_tema === "founder").length;

  const { dias, depois } = montarSemana(analise);
  const naSemana = dias.flatMap((d) => d.itens);
  const resumoSemana = naSemana.length
    ? `Esta semana: ${contagem(naSemana.filter((s) => s.tipo === "postar").length, naSemana.filter((s) => s.tipo === "gravar").length)}.` +
      (depois.length ? ` Depois, mais ${contagem(depois.filter((s) => s.tipo === "postar").length, depois.filter((s) => s.tipo === "gravar").length)}.` : "")
    : `Na pauta: ${contagem(analise.posts.length, roteiros.length)}.`;
  const totalItens = analise.posts.length + roteiros.length;

  const postsPendentes = analise.posts.filter((p) => !fb.decisoes[p.id]);
  const videosPendentes = roteiros.filter((r) => !fb.videos[r.id]?.decisao);
  const pendentes = postsPendentes.length + videosPendentes.length;

  function marcar(k: Chave, v: boolean) {
    setMarcados((m) => {
      const n = new Set(m);
      if (v) n.add(k);
      else n.delete(k);
      return n;
    });
  }

  function aprovar(posts: typeof analise.posts, videos: typeof roteiros) {
    if (!posts.length && !videos.length) return;
    fb.decidirVarios(posts, videos, "aprovado");
    setFeito({ posts: posts.map((p) => p.id), videos: videos.map((r) => r.id) });
  }

  function aprovarSelecionados() {
    aprovar(
      analise.posts.filter((p) => marcados.has(`p:${p.id}`)),
      roteiros.filter((r) => marcados.has(`v:${r.id}`)),
    );
    setMarcados(new Set());
    setSelecionando(false);
  }

  function sairDaSelecao() {
    setMarcados(new Set());
    setSelecionando(false);
  }

  // Aprovado não entra na seleção: já está decidido.
  const selecao = (k: Chave, aprovado: boolean) => (selecionando && !aprovado ? { marcado: marcados.has(k), onMarcar: (v: boolean) => marcar(k, v) } : undefined);
  const nFeito = feito ? feito.posts.length + feito.videos.length : 0;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-6 sm:pt-10">
      {/* Cabeçalho: de quem é a pauta e o que fazer nesta semana. */}
      <div className="flex flex-wrap items-center gap-2">
        <span className={`${CHIP} ${ORIGEM[analise.origem].classe}`}>{ORIGEM[analise.origem].rotulo}</span>
        {doFounder > 0 && <span className={`${CHIP} bg-salvia text-papel`}>{doFounder} do que você contou</span>}
        {paraRevisar > 0 && (
          <span className={`${CHIP} border border-pauta/40 bg-pauta/5 text-pauta-escura`}>
            {paraRevisar} {paraRevisar === 1 ? "pede" : "pedem"} um dado seu
          </span>
        )}
        {onNova && (
          <button type="button" onClick={onNova} className={`${BOTAO_SECUNDARIO} ml-auto h-9 bg-white`}>
            Analisar outro site
          </button>
        )}
      </div>
      <div className="mt-5">
        <p className="text-sm font-medium text-tinta-3">Pauta de</p>
        <h2 className="mt-1 text-balance font-display text-3xl font-semibold leading-[1.1] tracking-[-0.02em] sm:text-[2.5rem]">{b.nome}</h2>
        <p className="mt-2 text-tinta-2 sm:text-lg">
          {resumoSemana}
          {fb.aprovados > 0 && (
            <span className="ml-2 inline-flex translate-y-[-2px] rounded-full bg-aprovado/10 px-2.5 py-0.5 text-sm font-semibold tabular-nums text-aprovado">
              {fb.aprovados} de {totalItens} aprovados
            </span>
          )}
        </p>
      </div>

      {/* Ações da pauta inteira. */}
      <div className="mt-6 flex flex-wrap gap-2">
        {pendentes > 0 && !selecionando && (
          <button
            type="button"
            onClick={() => aprovar(postsPendentes, videosPendentes)}
            className="tocavel inline-flex h-11 items-center rounded-full bg-tinta px-5 text-sm font-semibold text-papel hover:bg-tinta-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pauta"
          >
            Aprovar todos os pendentes ({pendentes})
          </button>
        )}
        {pendentes > 0 && (
          <button
            type="button"
            aria-pressed={selecionando}
            onClick={() => (selecionando ? sairDaSelecao() : setSelecionando(true))}
            className={`${BOTAO_SECUNDARIO} h-11 bg-white px-5`}
          >
            {selecionando ? "Cancelar seleção" : "Selecionar"}
          </button>
        )}
        <button type="button" onClick={onZip} disabled={!!zip} className={`${BOTAO_SECUNDARIO} h-11 bg-white px-5`}>
          {zip ? `Montando o ZIP ${Math.round((zip.feito / Math.max(zip.total, 1)) * 100)}%` : "Baixar tudo em ZIP"}
        </button>
      </div>
      {feito && nFeito > 0 && (
        <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-tinta-2" role="status">
          <span className="font-semibold text-aprovado">{nFeito === 1 ? "1 aprovado." : `${nFeito} aprovados.`}</span>
          <button
            type="button"
            onClick={() => {
              fb.desfazerVarios(feito.posts, feito.videos);
              setFeito(null);
            }}
            className="font-semibold text-tinta underline decoration-tinta/30 underline-offset-2 hover:decoration-tinta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pauta"
          >
            desfazer
          </button>
        </p>
      )}
      {selecionando && <p className="mt-3 text-sm text-tinta-2">Marque os posts e vídeos que você quer aprovar.</p>}
      {aviso && (
        <p className="mt-4 rounded-2xl border border-pauta/25 bg-pauta/5 px-4 py-3 text-sm" role="alert">
          {aviso}
        </p>
      )}
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

      {/* Posts */}
      <div id="posts" className="mt-14 scroll-mt-24 border-t border-tinta/10 pt-10">
        <h3 className={TITULO_SECAO}>Posts prontos</h3>
        <p className="mt-2 text-tinta-2">Aprove o que é a sua cara. Ajuste o texto se quiser e poste no dia marcado.</p>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {analise.posts.map((p, i) => (
            <div key={p.id} id={`post-${p.id}`} className="scroll-mt-24">
              <PostCard
                analise={analise}
                post={p}
                indice={i}
                pers={pers[p.id] ?? {}}
                onPers={(x) => onPers(p.id, x)}
                onBaixar={onBaixar}
                agenda={analise.calendario.find((c) => c.post_id === p.id)}
                decisao={fb.decisoes[p.id]}
                onDecidir={(d) => fb.decidir(p, d)}
                resultado={fb.resultados[p.id]}
                onResultado={(v) => fb.salvarResultado(p, v)}
                selecao={selecao(`p:${p.id}`, fb.decisoes[p.id] === "aprovado")}
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

      {/* Vídeos: só aparece quando o motor mandou roteiros. */}
      {roteiros.length > 0 && (
        <div id="videos" className="mt-14 scroll-mt-24 border-t border-tinta/10 pt-10">
          <h3 className={TITULO_SECAO}>Vídeos para gravar</h3>
          <p className="mt-2 text-tinta-2">Grave com o celular na vertical. Leia a cena, olhe para a câmera, fale.</p>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {roteiros.map((r, i) => (
              <div key={r.id} id={`video-${r.id}`} className="scroll-mt-24">
                <RoteiroCard
                  roteiro={r}
                  indice={i}
                  decisao={fb.videos[r.id]?.decisao}
                  onDecidir={(d) => fb.decidirVideo(r, d)}
                  resultado={fb.videos[r.id]?.resultado}
                  onResultado={(v) => fb.salvarVideo(r, v)}
                  selecao={selecao(`v:${r.id}`, fb.videos[r.id]?.decisao === "aprovado")}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Barra da seleção: fica acima das abas no celular. */}
      {selecionando && (
        <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 px-4 pb-3 md:bottom-0 md:pb-6">
          <div className="mx-auto flex max-w-md items-center gap-2 rounded-full border border-tinta/10 bg-white p-1.5 shadow-[0_20px_50px_-20px_rgba(22,19,15,.45)] animate-[aparecer_.3s_cubic-bezier(.2,.7,.1,1)_both]">
            <button type="button" onClick={sairDaSelecao} className="h-11 shrink-0 rounded-full px-4 text-sm font-semibold text-tinta-2 hover:text-tinta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pauta">
              Cancelar
            </button>
            <button
              type="button"
              disabled={marcados.size === 0}
              onClick={aprovarSelecionados}
              className="tocavel h-11 flex-1 rounded-full bg-tinta px-4 text-sm font-semibold text-papel hover:bg-tinta-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pauta disabled:bg-tinta/30"
            >
              Aprovar selecionados ({marcados.size})
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
