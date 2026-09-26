"use client";

import { useState } from "react";
import type { Personalizacao } from "@/lib/client/artes";
import type { Analise, PostGerado } from "@/lib/types";
import type { Aba } from "./abas";
import { PostCard } from "./PostCard";
import { NOMES_REDE, NOMES_REDE_VIDEO, diaCurto } from "./rotulos";
import type { Escolha, Feedback } from "./useFeedback";

function hojeIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Posts na ordem do calendário (data e horário). Post sem data vai para o fim, na ordem da pauta. */
export function filaDePosts(analise: Analise): PostGerado[] {
  const quando = new Map(analise.calendario.map((c) => [c.post_id, c.data + " " + c.horario]));
  return analise.posts
    .map((p, i) => ({ p, i, q: quando.get(p.id) ?? "￿" }))
    .sort((a, b) => a.q.localeCompare(b.q) || a.i - b.i)
    .map((x) => x.p);
}

/**
 * Aba "Hoje": só o post do dia, o próximo pendente pela data do calendário.
 * Aprovar ou recusar passa para o seguinte. Quando não sobra nenhum, aponta para o calendário.
 */
export function Hoje({
  analise,
  fb,
  pers,
  onPers,
  onBaixar,
  onAba,
}: {
  analise: Analise;
  fb: Feedback;
  pers: Record<string, Personalizacao>;
  onPers: (id: string, p: Personalizacao) => void;
  onBaixar: (url: string, nome: string) => void | Promise<void>;
  onAba: (aba: Aba, ancora?: string) => void;
}) {
  const [ultimo, setUltimo] = useState<{ post: PostGerado; escolha: Escolha } | null>(null);
  const fila = filaDePosts(analise);
  const decididos = fila.filter((p) => fb.decisoes[p.id]).length;
  const atual = fila.find((p) => !fb.decisoes[p.id]);
  const indice = atual ? analise.posts.indexOf(atual) : -1;
  const agenda = atual ? analise.calendario.find((c) => c.post_id === atual.id) : undefined;
  const roteiros = analise.roteiros ?? [];
  const videosPendentes = roteiros.filter((r) => !fb.videos[r.id]?.decisao).length;

  // Vídeo marcado para hoje ou, se não houver, para o mesmo dia do post em foco.
  const hoje = hojeIso();
  const videoHoje = roteiros.find((r) => r.agenda?.data === hoje);
  const video = videoHoje ?? (agenda ? roteiros.find((r) => r.agenda?.data === agenda.data) : undefined);

  function decidir(p: PostGerado, escolha: Escolha) {
    fb.decidir(p, escolha);
    setUltimo({ post: p, escolha });
  }

  function desfazer() {
    if (!ultimo) return;
    fb.decidir(ultimo.post, null);
    setUltimo(null);
  }

  const progresso = fila.length > 0 && (
    <div className="flex items-center gap-3">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-tinta/10" aria-hidden="true">
        <div className="h-full rounded-full bg-aprovado transition-[width] duration-500 ease-out" style={{ width: `${(decididos / fila.length) * 100}%` }} />
      </div>
      <p className="shrink-0 text-xs font-medium tabular-nums text-tinta-2" aria-live="polite">
        {decididos} de {fila.length} decididos
      </p>
    </div>
  );

  const aviso = ultimo && (
    <p className="mt-3 flex items-center justify-center gap-2 text-sm text-tinta-2" role="status">
      <span className={ultimo.escolha === "aprovado" ? "font-semibold text-aprovado" : ""}>{ultimo.escolha === "aprovado" ? "Aprovado" : "Recusado"}.</span>
      <span className="line-clamp-1 max-w-[14rem] text-tinta-3">{ultimo.post.gancho}</span>
      <button
        type="button"
        onClick={desfazer}
        className="shrink-0 font-semibold text-tinta underline decoration-tinta/30 underline-offset-2 hover:decoration-tinta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pauta"
      >
        desfazer
      </button>
    </p>
  );

  if (!fb.carregado) {
    return (
      <div className="mx-auto w-full max-w-lg px-4 pt-6">
        <div className="aspect-[4/5] w-full animate-pulse rounded-3xl bg-papel-2" role="status" aria-label="Carregando o post do dia" />
      </div>
    );
  }

  if (!atual) {
    return (
      <div className="mx-auto w-full max-w-lg px-4 pt-8">
        {progresso}
        <div className="mt-8 rounded-3xl border border-tinta/10 bg-white px-6 py-10 text-center" style={{ animation: "subir .6s both" }}>
          <p className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-aprovado/10 text-xl text-aprovado" aria-hidden="true">
            ✓
          </p>
          <h2 className="mt-4 font-display text-2xl font-semibold tracking-[-0.02em]">{fila.length ? "Tudo decidido por hoje" : "Esta pauta só tem vídeos"}</h2>
          <p className="mx-auto mt-2 max-w-xs text-tinta-2">
            {fila.length
              ? `${Object.values(fb.decisoes).filter((d) => d === "aprovado").length} de ${fila.length} posts aprovados. Veja quando postar cada um no calendário.`
              : "Os roteiros estão no calendário."}
            {videosPendentes > 0 && ` Falta decidir ${videosPendentes === 1 ? "1 vídeo" : `${videosPendentes} vídeos`}.`}
          </p>
          <button
            type="button"
            onClick={() => onAba("calendario")}
            className="tocavel mt-6 inline-flex h-12 items-center rounded-full bg-tinta px-6 font-semibold text-papel hover:bg-tinta-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pauta"
          >
            Ver o calendário
          </button>
        </div>
        {aviso}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-lg px-4 pb-20 pt-6">
      {progresso}
      <div className="mt-5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="font-display text-2xl font-semibold tracking-[-0.02em]">Post do dia</h2>
        <p className="text-sm tabular-nums text-tinta-2">
          {agenda ? (
            <>
              {agenda.data === hoje ? "hoje" : diaCurto(agenda.data)} às {agenda.horario} · {NOMES_REDE[agenda.rede] ?? agenda.rede}
            </>
          ) : (
            NOMES_REDE[atual.rede_principal]
          )}
        </p>
      </div>
      {video && (
        <button
          type="button"
          onClick={() => onAba("calendario", `video-${video.id}`)}
          className="tocavel mt-3 flex w-full items-center gap-2 rounded-2xl border border-pauta/30 bg-pauta/5 px-3 py-2 text-left text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pauta"
        >
          <span className="shrink-0 font-semibold text-pauta-escura">{video === videoHoje ? "Hoje também:" : "No mesmo dia:"}</span>
          <span className="min-w-0 flex-1 truncate text-tinta">
            gravar {video.titulo}
            <span className="text-tinta-3">
              {" "}
              · {NOMES_REDE_VIDEO[video.rede] ?? video.rede} · {video.agenda!.horario}
            </span>
          </span>
          <span aria-hidden="true" className="shrink-0 text-tinta-3">
            ›
          </span>
        </button>
      )}
      {aviso}
      <div className="mt-4">
        <PostCard
          key={atual.id}
          foco
          analise={analise}
          post={atual}
          indice={indice}
          pers={pers[atual.id] ?? {}}
          onPers={(x) => onPers(atual.id, x)}
          onBaixar={onBaixar}
          agenda={agenda}
        />
      </div>

      {/* Aprovar e Recusar fixos embaixo (no celular, logo acima das abas), para decidir sem rolar até o fim do card. */}
      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t border-tinta/10 bg-papel/95 px-4 py-2.5 backdrop-blur-md md:bottom-0 md:py-3">
        <div className="mx-auto grid max-w-lg grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => decidir(atual, "pulado")}
            className="tocavel h-12 rounded-full border border-tinta/20 bg-white text-base font-semibold text-tinta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pauta"
          >
            Recusar
          </button>
          <button
            type="button"
            onClick={() => decidir(atual, "aprovado")}
            className="tocavel h-12 rounded-full bg-tinta text-base font-semibold text-papel focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pauta"
          >
            Aprovar
          </button>
        </div>
      </div>
    </div>
  );
}
