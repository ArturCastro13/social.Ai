"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useState } from "react";
import { Baralho, type Carta, type Escolha } from "@/components/baralho/Baralho";
import { BarrasAprovacao } from "@/components/graficos/BarrasAprovacao";
import { urlArte } from "@/lib/client/artes";
import { NOMES_FORMATO, resumirPreferencias, type Decisao, type ResultadoPost } from "@/lib/feedback";
import { ordenarPorOportunidade, type Oportunidade, type SinaisNicho } from "@/lib/oportunidade";
import type { Analise, Rede } from "@/lib/types";

const NOMES_REDE = { instagram: "Instagram", linkedin: "LinkedIn", x: "X", facebook: "Facebook" } as const;

// O histórico fica no navegador por marca, para as métricas sobreviverem a uma nova análise do mesmo site.
function chave(dominio: string) {
  return `socialai:historico:${dominio}`;
}
interface Historico {
  decisoes: Decisao[];
  resultados: ResultadoPost[];
}
function lerHistorico(dominio: string): Historico {
  try {
    const h = JSON.parse(localStorage.getItem(chave(dominio)) ?? "null") as Partial<Historico> | null;
    return {
      decisoes: Array.isArray(h?.decisoes) ? h.decisoes : [],
      resultados: Array.isArray(h?.resultados) ? h.resultados : [],
    };
  } catch {
    return { decisoes: [], resultados: [] };
  }
}
function gravarHistorico(dominio: string, h: Historico) {
  try {
    localStorage.setItem(chave(dominio), JSON.stringify({ decisoes: h.decisoes.slice(-500), resultados: h.resultados.slice(-500) }));
  } catch {
    /* navegador sem armazenamento: segue só em memória */
  }
}
function enviar(corpo: object) {
  fetch("/api/feedback", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(corpo) }).catch(() => undefined);
}

const pct = (x: number) => `${Math.round(x * 100)}%`;

export function IdeiasEMetricas({ analise }: { analise: Analise }) {
  const dominio = analise.brand.dominio;
  const [hist, setHist] = useState<Historico>({ decisoes: [], resultados: [] });
  // Guardam para qual nicho/domínio foram lidos: trocar de análise invalida sem precisar zerar estado.
  const [radar, setRadar] = useState<{ nicho: string; sinais: SinaisNicho | null } | null>(null);
  const [inicial, setInicial] = useState<{ dominio: string; h: Historico } | null>(null);
  const [topo, setTopo] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    const nicho = analise.nicho;
    // Com erro ou demora, o baralho segue sem os sinais do nicho (sinais null) em vez de ficar travado.
    fetch(`/api/radar?nicho=${encodeURIComponent(nicho)}`, { signal: AbortSignal.timeout(5000) })
      .then((r) => (r.ok ? (r.json() as Promise<SinaisNicho>) : null))
      .catch(() => null)
      .then((sinais) => {
        if (vivo) setRadar({ nicho, sinais });
      });
    return () => {
      vivo = false;
    };
  }, [analise.nicho]);
  // Lê o histórico depois de montar, para o HTML do servidor e o do navegador baterem.
  useEffect(() => {
    const h = lerHistorico(dominio);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHist(h);
    setInicial({ dominio, h });
  }, [dominio]);

  const sinais = radar?.nicho === analise.nicho ? radar.sinais : null;
  const radarPronto = radar?.nicho === analise.nicho;
  const historicoInicial = inicial?.dominio === dominio ? inicial.h : null;
  // O baralho só monta quando o histórico e o radar chegaram. Se montasse antes, a chegada do radar
  // mudaria a ordem (e a key), remontaria o baralho do início e as cartas já decididas voltariam.
  const pronto = radarPronto && historicoInicial !== null;

  // A pilha é ordenada pelo Opportunity Score uma vez, com o histórico de quando a análise abriu:
  // decidir uma carta não pode reembaralhar as outras.
  const ordem = useMemo(() => {
    const h = historicoInicial ?? { decisoes: [], resultados: [] };
    const decididos = new Set(h.decisoes.filter((d) => d.analise_id === analise.id).map((d) => d.post_id));
    return ordenarPorOportunidade(
      analise.posts.filter((p) => !decididos.has(p.id)),
      sinais,
      h.decisoes,
      h.resultados,
    );
  }, [analise, sinais, historicoInicial]);
  const cartas: Carta[] = useMemo(
    () => ordem.map(({ post: p }) => ({ id: p.id, src: urlArte(analise, p, { tamanho: "feed" }), alt: `Ideia de post: ${p.gancho}`, para: p.enderecamento?.publico || undefined })),
    [ordem, analise],
  );
  const opTopo = ordem.find((o) => o.post.id === topo);
  const resumo = useMemo(() => resumirPreferencias(hist.decisoes, hist.resultados), [hist]);
  const aprovados = analise.posts.filter((p) => hist.decisoes.some((d) => d.post_id === p.id && d.analise_id === analise.id && d.decisao === "aprovado"));

  function escolher(carta: Carta, escolha: Escolha) {
    const p = analise.posts.find((x) => x.id === carta.id);
    if (!p) return;
    const d: Decisao = {
      analise_id: analise.id,
      post_id: p.id,
      dominio,
      nicho: analise.nicho,
      formato: p.formato,
      template: p.template,
      padrao: p.padrao_inspirador ?? "",
      rede: p.rede_principal,
      decisao: escolha,
    };
    setHist((h) => {
      const novo = { ...h, decisoes: [...h.decisoes.filter((x) => !(x.post_id === d.post_id && x.analise_id === d.analise_id)), d] };
      gravarHistorico(dominio, novo);
      return novo;
    });
    enviar({ tipo: "decisao", ...d });
  }

  function salvarResultado(r: ResultadoPost) {
    setHist((h) => {
      const novo = { ...h, resultados: [...h.resultados.filter((x) => x.post_id !== r.post_id), r] };
      gravarHistorico(dominio, novo);
      return novo;
    });
    enviar({ tipo: "resultado", ...r });
  }

  return (
    <div className="border-t border-tinta/15 bg-white">
      <div id="ideias" className="mx-auto grid max-w-6xl scroll-mt-28 gap-12 px-4 py-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-20">
        <div>
          <h3 className="font-display text-3xl font-semibold tracking-[-0.02em]">Ideias de hoje</h3>
          <p className="mt-2 max-w-md text-tinta-2">
            A primeira é a que tem mais chance hoje. Arraste para a direita o que você postaria e para a esquerda o que não é a sua cara.
          </p>
          <div className="mt-8">
            {!pronto ? (
              <div className="mx-auto aspect-[4/5] w-full max-w-[340px] animate-pulse rounded-2xl bg-papel-2" role="status" aria-label="Carregando ideias" />
            ) : (
              <Baralho
                key={`${analise.id}:${ordem.map((o) => o.post.id).join()}`}
                cartas={cartas}
                onEscolha={escolher}
                onTopo={(c) => setTopo(c?.id ?? null)}
                vazio={
                  <div>
                    <p className="font-display text-xl font-semibold">Você viu todas as ideias.</p>
                    <p className="mt-2 text-sm text-tinta-2">
                      {aprovados.length} aprovada{aprovados.length === 1 ? "" : "s"}. As próximas análises desta marca já levam suas escolhas em conta.
                    </p>
                  </div>
                }
              />
            )}
          </div>
        </div>

        {/* key: legenda e "Copiada" são da carta, não podem passar para a próxima. */}
        <div className="lg:pt-24">{pronto && opTopo ? <PorQue key={opTopo.post.id} post={opTopo.post} op={opTopo.op} /> : null}</div>
      </div>

      <div className="border-t border-tinta/10">
        <div className="mx-auto grid max-w-6xl gap-14 px-4 py-14 lg:grid-cols-2 lg:gap-20">
          <div id="metricas" className="scroll-mt-28">
            <h3 className="font-display text-3xl font-semibold tracking-[-0.02em]">Métricas</h3>
            {resumo.total === 0 ? (
              <p className="mt-2 max-w-md text-tinta-2">Aprove ou pule algumas ideias e aqui aparece o que mais combina com a sua marca.</p>
            ) : (
              <>
                <dl className="mt-6 grid grid-cols-3 gap-4 border-y border-tinta/10 py-5">
                  <div>
                    <dt className="text-sm text-tinta-3">Avaliadas</dt>
                    <dd className="mt-1 font-display text-3xl font-semibold tabular-nums">{resumo.total}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-tinta-3">Aprovadas</dt>
                    <dd className="mt-1 font-display text-3xl font-semibold tabular-nums">{resumo.aprovados}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-tinta-3">Aprovação</dt>
                    <dd className="mt-1 font-display text-3xl font-semibold tabular-nums">{pct(resumo.aprovados / resumo.total)}</dd>
                  </div>
                </dl>
                <div className="mt-8">
                  <BarrasAprovacao
                    titulo="Aprovação por formato"
                    linhas={resumo.formatos.map((f) => ({
                      rotulo: NOMES_FORMATO[f.formato],
                      valor: f.taxa,
                      detalhe: `${f.aprovados} de ${f.aprovados + f.pulados} aprovadas${f.engajamento !== null ? ` · engajamento ${pct(f.engajamento)}` : ""}`,
                    }))}
                  />
                </div>
              </>
            )}

            {aprovados.length > 0 && (
              <div className="mt-10">
                <h4 className="font-semibold">Depois de publicar, conte como foi</h4>
                <p className="mt-1 text-sm text-tinta-2">Com os números de cada post, o painel calcula o engajamento por formato. Preencha só o que tiver.</p>
                <ul className="mt-5 space-y-3">
                  {aprovados.map((p) => (
                    <ResultadoLinha
                      key={p.id}
                      miniatura={urlArte(analise, p, { tamanho: "feed" })}
                      titulo={p.gancho}
                      atual={hist.resultados.find((r) => r.post_id === p.id)}
                      onSalvar={(v) => salvarResultado({ analise_id: analise.id, post_id: p.id, dominio, formato: p.formato, ...v })}
                    />
                  ))}
                </ul>
              </div>
            )}
          </div>

          <Radar sinais={sinais} pronto={radarPronto} />
        </div>
      </div>
    </div>
  );
}

const REDES_LEGENDA: Rede[] = ["linkedin", "instagram", "x"];

function PorQue({ post, op }: { post: Analise["posts"][number]; op: Oportunidade }) {
  const [rede, setRede] = useState<Rede>(REDES_LEGENDA.includes(post.rede_principal) ? post.rede_principal : "linkedin");
  const [copiado, setCopiado] = useState(false);
  const legenda = post.legendas[rede] ?? "";
  return (
    <div>
      <div className="flex items-baseline gap-3">
        <p className="font-display text-5xl font-semibold tabular-nums tracking-[-0.03em]">{op.score}</p>
        <p className="text-sm text-tinta-3">de 100 no Opportunity Score</p>
      </div>
      <p className="mt-1 text-sm text-tinta-2">
        {NOMES_FORMATO[post.formato]} · feito para {NOMES_REDE[post.rede_principal]}
      </p>
      <h4 className="mt-6 font-semibold">Por que esta ideia</h4>
      <ul className="mt-2 space-y-2 text-tinta-2">
        {(op.motivos.length ? op.motivos : ["Segue um padrão da base de posts fortes do seu nicho."]).map((m) => (
          <li key={m} className="leading-relaxed">
            {m}
          </li>
        ))}
        {post.por_que && <li className="leading-relaxed">{post.por_que}</li>}
      </ul>

      <div className="mt-8 rounded-2xl border border-tinta/10 bg-papel/60 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-1" role="tablist" aria-label="Legenda por rede">
            {REDES_LEGENDA.map((r) => (
              <button
                key={r}
                type="button"
                role="tab"
                aria-selected={rede === r}
                onClick={() => {
                  setRede(r);
                  setCopiado(false);
                }}
                className={`h-8 rounded-full px-3 text-sm transition-colors ${rede === r ? "bg-tinta text-papel" : "text-tinta-2 hover:bg-tinta/5"}`}
              >
                {NOMES_REDE[r]}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(legenda).then(() => setCopiado(true), () => undefined);
            }}
            className="text-sm underline decoration-tinta/30 underline-offset-4 hover:decoration-tinta"
          >
            {copiado ? "Copiada" : "Copiar legenda"}
          </button>
        </div>
        <p className="mt-3 max-h-48 overflow-y-auto whitespace-pre-line text-sm leading-relaxed">{legenda}</p>
      </div>
    </div>
  );
}

function Radar({ sinais, pronto }: { sinais: SinaisNicho | null; pronto: boolean }) {
  return (
    <div id="bombando" className="scroll-mt-28">
      <h3 className="font-display text-3xl font-semibold tracking-[-0.02em]">Bombando no seu nicho</h3>
      <p className="mt-2 max-w-md text-tinta-2">Posts da base curada que performaram bem acima da mediana do seu nicho. Servem de referência, nunca de cópia.</p>
      {!pronto ? (
        <p className="mt-6 text-sm text-tinta-3">Carregando.</p>
      ) : !sinais ? (
        <p className="mt-6 text-sm text-tinta-3">Não conseguimos carregar o radar agora.</p>
      ) : sinais.outliers.length === 0 ? (
        <p className="mt-6 text-sm text-tinta-3">Ainda não há posts com métrica verificada suficiente neste nicho.</p>
      ) : (
        <ul className="mt-6 divide-y divide-tinta/10 border-y border-tinta/10">
          {sinais.outliers.slice(0, 4).map((o) => (
            <li key={o.id} className="py-4">
              <div className="flex items-baseline justify-between gap-4">
                <p className="text-sm text-tinta-3">
                  {o.autor ?? "Autor não informado"} · {NOMES_FORMATO[o.formato]}
                </p>
                <p className="shrink-0 font-medium tabular-nums">{o.multiplo.toFixed(1).replace(".", ",")}x a mediana</p>
              </div>
              <p className="mt-1.5 leading-snug">{o.gancho.length > 140 ? `${o.gancho.slice(0, 140).trimEnd()}...` : o.gancho}</p>
              {o.link && (
                <a href={o.link} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm underline decoration-tinta/30 underline-offset-4 hover:decoration-tinta">
                  Ver o post original
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type Numeros = Pick<ResultadoPost, "curtidas" | "comentarios" | "salvamentos" | "alcance">;
const CAMPOS: { k: keyof Numeros; rotulo: string }[] = [
  { k: "alcance", rotulo: "Alcance" },
  { k: "curtidas", rotulo: "Curtidas" },
  { k: "comentarios", rotulo: "Comentários" },
  { k: "salvamentos", rotulo: "Salvos" },
];

function ResultadoLinha({
  miniatura,
  titulo,
  atual,
  onSalvar,
}: {
  miniatura: string;
  titulo: string;
  atual?: ResultadoPost;
  onSalvar: (v: Numeros) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [v, setV] = useState<Record<keyof Numeros, string>>({
    alcance: atual?.alcance?.toString() ?? "",
    curtidas: atual?.curtidas?.toString() ?? "",
    comentarios: atual?.comentarios?.toString() ?? "",
    salvamentos: atual?.salvamentos?.toString() ?? "",
  });
  // Só dígitos contam ("1.234" vira 1234). Campo sem dígito fica sem dado, e o teto é o mesmo da API.
  const num = (s: string) => {
    const digitos = s.replace(/\D/g, "");
    return digitos === "" ? null : Math.min(1e9, Number(digitos));
  };
  const eng =
    atual?.alcance && atual.alcance > 0 ? ((atual.curtidas ?? 0) + (atual.comentarios ?? 0) + (atual.salvamentos ?? 0)) / atual.alcance : null;

  return (
    <li className="rounded-xl border border-tinta/10 bg-papel/60 p-3">
      <div className="flex items-center gap-3">
        <img src={miniatura} alt="" loading="lazy" className="h-14 w-11 shrink-0 rounded-md object-cover" />
        <p className="min-w-0 flex-1 truncate text-sm font-medium">{titulo}</p>
        {eng !== null && <span className="shrink-0 text-sm tabular-nums text-tinta-2">{pct(eng)} de engajamento</span>}
        <button
          type="button"
          onClick={() => setAberto((a) => !a)}
          aria-expanded={aberto}
          className="shrink-0 text-sm underline decoration-tinta/30 underline-offset-4 hover:decoration-tinta"
        >
          {atual ? "Editar" : "Informar"}
        </button>
      </div>
      {aberto && (
        <form
          className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-[repeat(4,minmax(0,1fr))_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            onSalvar({ alcance: num(v.alcance), curtidas: num(v.curtidas), comentarios: num(v.comentarios), salvamentos: num(v.salvamentos) });
            setAberto(false);
          }}
        >
          {CAMPOS.map((c) => (
            <label key={c.k} className="block">
              <span className="text-xs text-tinta-3">{c.rotulo}</span>
              <input
                inputMode="numeric"
                value={v[c.k]}
                onChange={(e) => setV({ ...v, [c.k]: e.target.value })}
                className="mt-1 h-10 w-full rounded-md border border-tinta/15 bg-white px-2.5 text-sm tabular-nums outline-none focus:border-tinta focus-visible:outline-none"
              />
            </label>
          ))}
          <button className="col-span-2 h-10 self-end rounded-md bg-tinta px-4 text-sm font-medium text-papel transition-colors hover:bg-tinta-2 sm:col-span-1">
            Salvar
          </button>
        </form>
      )}
    </li>
  );
}
