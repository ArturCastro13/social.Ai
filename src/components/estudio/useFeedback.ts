"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { resumirPreferencias, type Decisao, type ResultadoPost } from "@/lib/feedback";
import type { RoteiroVideo } from "@/lib/motor/contrato";
import type { Analise, PostGerado } from "@/lib/types";

/** "Recusar" vira "pulado" no registro, como no baralho antigo. */
export type Escolha = Decisao["decisao"];

/** Números que o founder informa depois de postar. Campo sem dado fica null. */
export type Numeros = Pick<ResultadoPost, "alcance" | "curtidas" | "comentarios" | "salvamentos" | "compartilhamentos">;
export interface Postado extends Numeros {
  link?: string;
}

/** Resultado de post guardado no navegador: o registro da API mais o link, que só fica aqui. */
export type ResultadoLocal = ResultadoPost & { link?: string };

/**
 * Vídeo não tem formato no registro da API (/api/feedback só aceita formatos de post estático),
 * então decisão e números dos roteiros ficam só no navegador.
 */
export interface VideoLocal {
  analise_id: string;
  roteiro_id: string;
  titulo: string;
  rede: RoteiroVideo["rede"];
  decisao?: Escolha;
  resultado?: Postado;
}

interface Historico {
  decisoes: Decisao[];
  resultados: ResultadoLocal[];
  videos: VideoLocal[];
}

// Mesma chave que o baralho usava: o histórico sobrevive a uma nova análise do mesmo site.
function chave(dominio: string) {
  return `socialai:historico:${dominio}`;
}
const VAZIO: Historico = { decisoes: [], resultados: [], videos: [] };

function lerHistorico(dominio: string): Historico {
  try {
    const h = JSON.parse(localStorage.getItem(chave(dominio)) ?? "null") as Partial<Historico> | null;
    return {
      decisoes: Array.isArray(h?.decisoes) ? h.decisoes : [],
      resultados: Array.isArray(h?.resultados) ? h.resultados : [],
      videos: Array.isArray(h?.videos) ? h.videos : [],
    };
  } catch {
    return VAZIO;
  }
}
function gravarHistorico(dominio: string, h: Historico) {
  try {
    localStorage.setItem(
      chave(dominio),
      JSON.stringify({ decisoes: h.decisoes.slice(-500), resultados: h.resultados.slice(-500), videos: h.videos.slice(-200) }),
    );
  } catch {
    /* navegador sem armazenamento: segue só em memória */
  }
}
function enviar(corpo: object) {
  return fetch("/api/feedback", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(corpo) }).catch(() => undefined);
}

// Fila única de envios: aprovar vários de uma vez manda um registro por vez, sem travar a tela nem disparar dezenas de pedidos juntos.
let fila: Promise<unknown> = Promise.resolve();
function enviarEmFila(corpos: object[]) {
  for (const c of corpos) fila = fila.then(() => enviar(c));
}

/** (curtidas + comentários + salvos + compartilhamentos) / alcance, a mesma conta de resumirPreferencias. Sem alcance, null. */
export function engajamento(n: Partial<Numeros> | undefined): number | null {
  if (!n?.alcance || n.alcance <= 0) return null;
  return ((n.curtidas ?? 0) + (n.comentarios ?? 0) + (n.salvamentos ?? 0) + (n.compartilhamentos ?? 0)) / n.alcance;
}

/**
 * Aprovar, recusar e "já postei" de cada post e roteiro. Grava no histórico local da marca e,
 * para posts, manda para POST /api/feedback, que é o que ensina o motor.
 * Desfazer só apaga o registro local: a API guarda a última decisão e não tem rota para apagar.
 */
export function useFeedback(analise: Analise) {
  const dominio = analise.brand.dominio;
  const [hist, setHist] = useState<Historico>(VAZIO);
  // Domínio cujo histórico já foi lido: até lá, a aba "Hoje" não sabe qual post ainda está pendente.
  const [lido, setLido] = useState("");

  // Lê depois de montar, para o HTML do servidor e o do navegador baterem.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHist(lerHistorico(dominio));
    setLido(dominio);
  }, [dominio]);

  const mudar = useCallback(
    (f: (h: Historico) => Historico) => {
      setHist((h) => {
        const novo = f(h);
        gravarHistorico(dominio, novo);
        return novo;
      });
    },
    [dominio],
  );

  const decidir = useCallback(
    (post: PostGerado, escolha: Escolha | null) => {
      const mesmo = (x: { post_id: string; analise_id: string }) => x.post_id === post.id && x.analise_id === analise.id;
      if (!escolha) {
        mudar((h) => ({ ...h, decisoes: h.decisoes.filter((x) => !mesmo(x)) }));
        return;
      }
      const d: Decisao = {
        analise_id: analise.id,
        post_id: post.id,
        dominio,
        nicho: analise.nicho,
        formato: post.formato,
        template: post.template,
        padrao: (post.padrao_inspirador ?? "").slice(0, 80),
        rede: post.rede_principal,
        decisao: escolha,
      };
      mudar((h) => ({ ...h, decisoes: [...h.decisoes.filter((x) => !mesmo(x)), d] }));
      enviar({ tipo: "decisao", ...d });
    },
    [analise.id, analise.nicho, dominio, mudar],
  );

  /**
   * Mesma decisão para vários posts e roteiros de uma vez (aprovar todos, aprovar selecionados).
   * Grava tudo no histórico numa só atualização e manda os posts para a API em fila, um de cada vez.
   */
  const decidirVarios = useCallback(
    (posts: PostGerado[], roteiros: RoteiroVideo[], escolha: Escolha) => {
      if (!posts.length && !roteiros.length) return;
      const novas: Decisao[] = posts.map((post) => ({
        analise_id: analise.id,
        post_id: post.id,
        dominio,
        nicho: analise.nicho,
        formato: post.formato,
        template: post.template,
        padrao: (post.padrao_inspirador ?? "").slice(0, 80),
        rede: post.rede_principal,
        decisao: escolha,
      }));
      const ids = new Set(posts.map((p) => p.id));
      const rids = new Set(roteiros.map((r) => r.id));
      mudar((h) => {
        const videos = [...h.videos];
        for (const rot of roteiros) {
          const k = videos.findIndex((x) => x.roteiro_id === rot.id && x.analise_id === analise.id);
          const atual = k >= 0 ? videos[k] : { analise_id: analise.id, roteiro_id: rot.id, titulo: rot.titulo, rede: rot.rede };
          if (k >= 0) videos.splice(k, 1);
          videos.push({ ...atual, decisao: escolha });
        }
        return {
          ...h,
          decisoes: [...h.decisoes.filter((x) => !(x.analise_id === analise.id && ids.has(x.post_id))), ...novas],
          videos: rids.size ? videos : h.videos,
        };
      });
      enviarEmFila(novas.map((d) => ({ tipo: "decisao", ...d })));
    },
    [analise.id, analise.nicho, dominio, mudar],
  );

  /** Desfaz decisões locais (o "desfazer" depois de aprovar vários). A API guarda a última decisão, como no desfazer de um card. */
  const desfazerVarios = useCallback(
    (postIds: string[], roteiroIds: string[]) => {
      const ids = new Set(postIds);
      const rids = new Set(roteiroIds);
      mudar((h) => ({
        ...h,
        decisoes: h.decisoes.filter((x) => !(x.analise_id === analise.id && ids.has(x.post_id))),
        videos: h.videos.map((v) => (v.analise_id === analise.id && rids.has(v.roteiro_id) ? { ...v, decisao: undefined } : v)),
      }));
    },
    [analise.id, mudar],
  );

  const salvarResultado = useCallback(
    (post: PostGerado, v: Postado) => {
      const { link, ...numeros } = v;
      const r: ResultadoPost = { analise_id: analise.id, post_id: post.id, dominio, formato: post.formato, ...numeros };
      mudar((h) => ({
        ...h,
        resultados: [...h.resultados.filter((x) => !(x.post_id === r.post_id && x.analise_id === r.analise_id)), { ...r, ...(link ? { link } : {}) }],
      }));
      enviar({ tipo: "resultado", ...r });
    },
    [analise.id, dominio, mudar],
  );

  const mudarVideo = useCallback(
    (rot: RoteiroVideo, f: (v: VideoLocal) => VideoLocal) => {
      mudar((h) => {
        const atual = h.videos.find((x) => x.roteiro_id === rot.id && x.analise_id === analise.id) ?? {
          analise_id: analise.id,
          roteiro_id: rot.id,
          titulo: rot.titulo,
          rede: rot.rede,
        };
        const outros = h.videos.filter((x) => x !== atual);
        return { ...h, videos: [...outros, f(atual)] };
      });
    },
    [analise.id, mudar],
  );
  const decidirVideo = useCallback((rot: RoteiroVideo, escolha: Escolha | null) => mudarVideo(rot, (v) => ({ ...v, decisao: escolha ?? undefined })), [mudarVideo]);
  const salvarVideo = useCallback((rot: RoteiroVideo, resultado: Postado) => mudarVideo(rot, (v) => ({ ...v, resultado })), [mudarVideo]);

  const daAnalise = useMemo(() => {
    const decisoes: Record<string, Escolha> = {};
    const resultados: Record<string, ResultadoLocal> = {};
    const videos: Record<string, VideoLocal> = {};
    for (const d of hist.decisoes) if (d.analise_id === analise.id) decisoes[d.post_id] = d.decisao;
    for (const r of hist.resultados) if (r.analise_id === analise.id) resultados[r.post_id] = r;
    for (const v of hist.videos) if (v.analise_id === analise.id) videos[v.roteiro_id] = v;
    return { decisoes, resultados, videos };
  }, [hist, analise.id]);

  const resumo = useMemo(() => resumirPreferencias(hist.decisoes, hist.resultados), [hist]);
  const aprovados =
    Object.values(daAnalise.decisoes).filter((d) => d === "aprovado").length + Object.values(daAnalise.videos).filter((v) => v.decisao === "aprovado").length;

  return { ...daAnalise, carregado: lido === dominio, resumo, aprovados, decidir, decidirVarios, desfazerVarios, salvarResultado, decidirVideo, salvarVideo };
}

export type Feedback = ReturnType<typeof useFeedback>;
