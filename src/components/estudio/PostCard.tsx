"use client";

/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import { LIMITES_EDICAO, TEMPLATES_COM_FOTO, criarImagemIA, postEditado, temEdicao, totalSlides, urlArte, type Personalizacao } from "@/lib/client/artes";
import type { Analise, PostGerado, Rede, TemplateId } from "@/lib/types";
import { urlCanva } from "./canva";
import { AprovarRecusar, JaPostei, Recusado } from "./JaPostei";
import { BOTAO_SECUNDARIO, CaixaRevisar, SeloFounder, TresLinhas, comLacunas } from "./Partes";
import { NOMES_REDE, diaCurto, nomeDoPadrao } from "./rotulos";
import type { Escolha, Postado } from "./useFeedback";

export const NOMES_TEMPLATE: Record<TemplateId, string> = {
  "capa-gancho": "Carrossel com capa",
  lista: "Lista numerada",
  citacao: "Citação",
  "dado-impacto": "Dado de impacto",
  "print-x": "Print de post",
  bastidor: "Bastidor",
  "antes-depois": "Antes e depois",
  checklist: "Checklist",
};

const ORDEM_REDES: Rede[] = ["instagram", "linkedin", "x", "facebook"];
const CAMPO =
  "w-full rounded-xl border border-tinta/15 bg-white px-3 py-2 text-sm leading-snug text-tinta focus-visible:border-tinta/40 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-pauta";

const ACAO_PEQUENA =
  "inline-flex h-9 items-center rounded-full px-2.5 text-xs font-semibold text-tinta-2 transition-colors hover:bg-tinta/5 hover:text-tinta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pauta";

/** Caixa de seleção redonda do modo "selecionar" do calendário. Usada no post e no roteiro. */
export function CaixaSelecao({ marcado, onMarcar, rotulo }: { marcado: boolean; onMarcar: (v: boolean) => void; rotulo: string }) {
  return (
    <label className="-my-1 -ml-1 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full focus-within:outline-2 focus-within:outline-offset-1 focus-within:outline-pauta">
      <input type="checkbox" checked={marcado} onChange={(e) => onMarcar(e.target.checked)} aria-label={rotulo} className="peer sr-only" />
      <span
        aria-hidden="true"
        className={`flex h-5 w-5 items-center justify-center rounded-md border-2 text-[12px] font-bold leading-none transition-colors ${marcado ? "border-aprovado bg-aprovado text-white" : "border-tinta/30 bg-white text-transparent"}`}
      >
        ✓
      </span>
    </label>
  );
}

interface Rascunho {
  gancho: string;
  slides: { titulo: string; texto: string }[];
  legendas: Partial<Record<Rede, string>>;
}

export function PostCard({
  analise,
  post: original,
  indice,
  pers,
  onPers,
  onBaixar,
  agenda,
  decisao,
  onDecidir,
  resultado,
  onResultado,
  foco = false,
  selecao,
}: {
  analise: Analise;
  post: PostGerado;
  indice: number;
  pers: Personalizacao;
  onPers: (p: Personalizacao) => void;
  onBaixar: (url: string, nome: string) => void | Promise<void>;
  agenda?: { data: string; dia_semana: string; horario: string };
  decisao?: Escolha;
  onDecidir?: (escolha: Escolha | null) => void;
  resultado?: Postado;
  onResultado?: (v: Postado) => void;
  /** Aba "Hoje": sem as três linhas e sem Aprovar e Recusar (a aba tem os seus), com as outras ações pequenas. */
  foco?: boolean;
  /** Modo de seleção do calendário: uma caixa no topo do card. */
  selecao?: { marcado: boolean; onMarcar: (v: boolean) => void };
}) {
  const post = postEditado(original, pers);
  const editado = temEdicao(pers);
  const template = pers.template ?? post.template;
  const total = totalSlides(post, template);
  const [slide, setSlide] = useState(0);
  const [rede, setRede] = useState<Rede>(post.rede_principal);
  const [copiado, setCopiado] = useState(false);
  const [carregandoArte, setCarregandoArte] = useState(true);
  const [erroArte, setErroArte] = useState(false);
  const [tentativa, setTentativa] = useState(0);
  const [rascunho, setRascunho] = useState<Rascunho | null>(null);
  const [avisoCanva, setAvisoCanva] = useState(false);
  const [criandoImagem, setCriandoImagem] = useState(false);
  const [erroImagem, setErroImagem] = useState("");
  const s = Math.min(slide, total - 1);
  const base = urlArte(analise, original, { ...pers, slide: s, tamanho: "feed" });
  const src = tentativa ? `${base}&r=${tentativa}` : base;
  const pal = analise.brand.paleta;
  const cores = [...new Set([pal.primaria, pal.secundaria, pal.destaque].map((c) => c.toLowerCase()))];
  const corAtual = (pers.cor ?? pal.primaria).toLowerCase();
  const revisar = post.precisa_revisao ?? [];
  const aprovado = decisao === "aprovado";
  const personalizado = editado || !!pers.cor || !!pers.template;
  const aceitaFoto = TEMPLATES_COM_FOTO.includes(template);

  function novaArte(p: Personalizacao) {
    setCarregandoArte(true);
    onPers(p);
  }

  async function criarImagem() {
    setErroImagem("");
    setCriandoImagem(true);
    try {
      // "Gerar outra" pede uma cena diferente; a primeira usa a variação 0, que acha a imagem já criada se houver.
      const { url } = await criarImagemIA(analise, original, pers, pers.foto ? 1 + Math.floor(Math.random() * 50) : 0);
      setSlide(0); // no carrossel, a imagem vai na capa
      if (url !== pers.foto) novaArte({ ...pers, foto: url });
    } catch (e) {
      setErroImagem((e as Error).message);
    } finally {
      setCriandoImagem(false);
    }
  }

  async function copiar() {
    const texto = post.legendas[rede] + (rede !== "linkedin" && post.hashtags.length && !post.legendas[rede].includes("#") ? "\n\n" + post.hashtags.map((h) => "#" + h).join(" ") : "");
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1600);
    } catch {
      /* sem permissão de área de transferência */
    }
  }

  async function paraCanva() {
    // Abre a aba antes do download: depois de um await o navegador bloquearia a janela nova.
    window.open(urlCanva(post.rede_principal), "_blank", "noopener,noreferrer");
    setAvisoCanva(true);
    for (let k = 0; k < total; k++) {
      await onBaixar(urlArte(analise, original, { ...pers, slide: k, tamanho: "feed" }), `${post.id}${total > 1 ? `-slide-${k + 1}` : ""}.png`);
    }
  }

  function salvarEdicao() {
    if (!rascunho) return;
    const legendas = { ...pers.edicao?.legendas };
    for (const [r, t] of Object.entries(rascunho.legendas) as [Rede, string][]) {
      if (t === original.legendas[r]) delete legendas[r];
      else legendas[r] = t;
    }
    const mudouGancho = rascunho.gancho !== original.gancho;
    const mudouSlides = JSON.stringify(rascunho.slides) !== JSON.stringify(original.slides);
    const edicao = {
      ...(mudouGancho ? { gancho: rascunho.gancho } : {}),
      ...(mudouSlides ? { slides: rascunho.slides } : {}),
      ...(Object.keys(legendas).length ? { legendas } : {}),
    };
    const novo = { ...pers, edicao: Object.keys(edicao).length ? edicao : null };
    // Só mostra o carregando quando a URL da arte muda (legenda não entra na arte).
    if (urlArte(analise, original, { ...novo, slide: s, tamanho: "feed" }) !== base) setCarregandoArte(true);
    onPers(novo);
    setRascunho(null);
  }

  const cabecalho = (
    <header className="flex items-center justify-between gap-3 border-b border-tinta/10 px-4 py-2.5">
      {selecao && <CaixaSelecao {...selecao} rotulo={`Selecionar o post ${indice + 1}`} />}
      <p className="min-w-0 flex-1 text-xs text-tinta-3">
        <span className="font-semibold text-tinta">Post {indice + 1}</span> · {NOMES_REDE[post.rede_principal]} · {NOMES_TEMPLATE[template]}
        {post.trilho && (
          <span className={`ml-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${post.trilho === "founder" ? "bg-salvia/10 text-salvia" : "bg-papel-2 text-tinta-2"}`}>
            {post.trilho === "founder" ? "Founder" : "Empresa"}
          </span>
        )}
        {post.origem_tema === "founder" && <SeloFounder className="ml-1.5" />}
        {editado && <span className="ml-1.5 inline-flex rounded-full bg-limao/60 px-2 py-0.5 text-[11px] font-semibold text-tinta">editado</span>}
      </p>
      {agenda && (
        <p className="shrink-0 rounded-full bg-tinta px-2.5 py-1 text-xs font-semibold tabular-nums text-papel">
          Postar {diaCurto(agenda.data)} · {agenda.horario}
        </p>
      )}
    </header>
  );

  if (decisao === "pulado") {
    return (
      <article className="flex flex-col overflow-hidden rounded-3xl border border-dashed border-tinta/20 bg-papel/60">
        {cabecalho}
        <Recusado titulo={post.gancho} onDesfazer={() => onDecidir?.(null)} />
      </article>
    );
  }

  return (
    <article
      className={`group flex flex-col overflow-hidden rounded-3xl border bg-white transition hover:shadow-[0_30px_60px_-40px_rgba(22,19,15,.35)] ${aprovado ? "border-aprovado ring-2 ring-aprovado/60" : selecao?.marcado ? "border-tinta ring-2 ring-tinta/40" : "border-tinta/10"}`}
      style={{ animation: `subir .6s ${foco ? 0 : Math.min(indice, 8) * 0.06}s both` }}
    >
      {cabecalho}

      {!foco && (
        <TresLinhas
          enderecamento={post.enderecamento}
          padrao={post.padrao_referencia?.nome?.trim() || nomeDoPadrao(post.padrao_inspirador)}
          fonte={post.padrao_referencia?.fonte_url}
          origem={post.origem_tema}
        />
      )}

      <div className="relative aspect-[4/5] overflow-hidden bg-papel-2">
        {carregandoArte && <div className="absolute inset-0 animate-pulse bg-papel-3/60" />}
        {criandoImagem && (
          <div className="absolute inset-x-3 bottom-3 z-10 rounded-2xl bg-tinta/85 px-4 py-3 text-papel backdrop-blur-sm" role="status">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <span aria-hidden="true" className="h-2 w-2 animate-pulse rounded-full bg-limao" />
              Criando a imagem com IA
            </p>
            <p className="mt-0.5 text-xs leading-snug text-papel/80">Leva uns 20 a 40 segundos. O texto do post entra por cima, com as cores da sua marca.</p>
          </div>
        )}
        <img
          key={src}
          src={src}
          alt={`Arte do post: ${post.gancho}`}
          loading="lazy"
          onLoad={() => {
            setCarregandoArte(false);
            setErroArte(false);
          }}
          onError={() => {
            setCarregandoArte(false);
            setErroArte(true);
          }}
          className="h-full w-full object-cover"
        />
        {erroArte && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-papel-2 p-6 text-center">
            <p className="text-sm text-tinta-2">Não deu para desenhar esta arte agora.</p>
            <button
              type="button"
              onClick={() => {
                setErroArte(false);
                setCarregandoArte(true);
                setTentativa((t) => t + 1);
              }}
              className="rounded-full border border-tinta/20 bg-white px-4 py-1.5 text-sm font-semibold transition hover:border-tinta/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pauta"
            >
              Tentar de novo
            </button>
          </div>
        )}
        {total > 1 && (
          <>
            <button
              type="button"
              aria-label="Slide anterior"
              onClick={() => {
                setCarregandoArte(true);
                setSlide((x) => Math.max(0, x - 1));
              }}
              disabled={s === 0}
              className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-lg shadow-sm transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pauta disabled:opacity-0"
            >
              ←
            </button>
            <button
              type="button"
              aria-label="Próximo slide"
              onClick={() => {
                setCarregandoArte(true);
                setSlide((x) => Math.min(total - 1, x + 1));
              }}
              disabled={s === total - 1}
              className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-lg shadow-sm transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pauta disabled:opacity-0"
            >
              →
            </button>
            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
              {Array.from({ length: total }).map((_, k) => (
                <span key={k} className={`h-1.5 rounded-full transition-all ${k === s ? "w-5 bg-white" : "w-1.5 bg-white/50"}`} />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="flex flex-1 flex-col px-4 pb-4 pt-3">
        <h3 className="font-display text-xl font-semibold leading-snug tracking-[-0.01em]">{post.gancho}</h3>
        <div className="mt-3 flex gap-1 border-b border-tinta/10" role="tablist" aria-label="Legenda por rede">
          {ORDEM_REDES.map((r) => (
            <button
              key={r}
              type="button"
              role="tab"
              aria-selected={rede === r}
              onClick={() => setRede(r)}
              className={`-mb-px border-b-2 px-2 py-1.5 text-xs font-semibold transition ${rede === r ? "border-tinta text-tinta" : "border-transparent text-tinta-3 hover:text-tinta"} focus-visible:outline-2 focus-visible:outline-pauta`}
            >
              {NOMES_REDE[r]}
            </button>
          ))}
        </div>

        {rascunho ? (
          <div className="mt-3 space-y-3 rounded-2xl bg-papel p-3" role="group" aria-label="Customizar post">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Cor principal">
                {cores.map((c) => (
                  <button
                    key={c}
                    type="button"
                    role="radio"
                    aria-checked={corAtual === c}
                    aria-label={`Usar a cor ${c}`}
                    onClick={() => novaArte({ ...pers, cor: c })}
                    className={`h-7 w-7 rounded-full border-2 transition ${corAtual === c ? "scale-110 border-tinta" : "border-white shadow-[0_0_0_1px_rgba(0,0,0,.15)]"} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pauta`}
                    style={{ background: c }}
                  />
                ))}
                <label className="relative h-7 w-7 cursor-pointer overflow-hidden rounded-full border border-dashed border-tinta/40 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-pauta" title="Outra cor">
                  <span className="absolute inset-0 flex items-center justify-center text-xs text-tinta-2">+</span>
                  <input
                    type="color"
                    value={corAtual}
                    onChange={(e) => novaArte({ ...pers, cor: e.target.value })}
                    aria-label="Escolher outra cor"
                    className="absolute inset-0 cursor-pointer opacity-0"
                  />
                </label>
              </div>
              <select
                value={template}
                onChange={(e) => {
                  setSlide(0);
                  novaArte({ ...pers, template: e.target.value as TemplateId });
                }}
                aria-label="Modelo da arte"
                className="ml-auto h-9 rounded-full border border-tinta/15 bg-white px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pauta"
              >
                {(Object.keys(NOMES_TEMPLATE) as TemplateId[]).map((t) => (
                  <option key={t} value={t}>
                    {NOMES_TEMPLATE[t]}
                  </option>
                ))}
              </select>
            </div>
            <label className="block text-xs font-medium text-tinta-3">
              Gancho
              <input value={rascunho.gancho} maxLength={LIMITES_EDICAO.gancho} onChange={(e) => setRascunho({ ...rascunho, gancho: e.target.value })} className={`${CAMPO} mt-1`} />
            </label>
            {rascunho.slides.map((sl, k) => (
              <fieldset key={k} className="space-y-1.5">
                <legend className="text-xs font-medium text-tinta-3">{rascunho.slides.length > 1 ? `Slide ${k + 1}` : "Texto da arte"}</legend>
                <input
                  aria-label={`Título do slide ${k + 1}`}
                  value={sl.titulo}
                  maxLength={LIMITES_EDICAO.titulo}
                  onChange={(e) => setRascunho({ ...rascunho, slides: rascunho.slides.map((x, j) => (j === k ? { ...x, titulo: e.target.value } : x)) })}
                  className={CAMPO}
                />
                <textarea
                  aria-label={`Texto do slide ${k + 1}`}
                  value={sl.texto}
                  rows={2}
                  maxLength={LIMITES_EDICAO.texto}
                  onChange={(e) => setRascunho({ ...rascunho, slides: rascunho.slides.map((x, j) => (j === k ? { ...x, texto: e.target.value } : x)) })}
                  className={CAMPO}
                />
              </fieldset>
            ))}
            <label className="block text-xs font-medium text-tinta-3">
              Legenda do {NOMES_REDE[rede]}
              <textarea
                value={rascunho.legendas[rede] ?? post.legendas[rede]}
                rows={6}
                onChange={(e) => setRascunho({ ...rascunho, legendas: { ...rascunho.legendas, [rede]: e.target.value } })}
                className={`${CAMPO} mt-1`}
              />
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={salvarEdicao}
                className="h-10 rounded-full bg-tinta px-4 text-sm font-semibold text-papel transition hover:bg-tinta-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pauta"
              >
                Salvar
              </button>
              <button type="button" onClick={() => setRascunho(null)} className={BOTAO_SECUNDARIO}>
                Cancelar
              </button>
              {personalizado && (
                <button
                  type="button"
                  onClick={() => {
                    setSlide(0);
                    setCarregandoArte(true);
                    // A imagem criada com IA fica: ela foi paga e tem botão próprio para tirar.
                    onPers(pers.foto ? { foto: pers.foto } : {});
                    setRascunho(null);
                  }}
                  className="ml-auto text-xs font-semibold text-tinta-2 underline decoration-tinta/30 underline-offset-2 hover:text-tinta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pauta"
                >
                  Voltar ao original
                </button>
              )}
            </div>
          </div>
        ) : (
          <p className="mt-3 max-h-40 flex-1 overflow-y-auto whitespace-pre-line text-sm leading-relaxed text-tinta-2">{comLacunas(post.legendas[rede])}</p>
        )}

        <CaixaRevisar itens={revisar} />
        {post.por_que && (
          <details className="group/porque mt-3 rounded-2xl bg-papel px-3 py-2 text-xs leading-relaxed text-tinta-2">
            <summary className="cursor-pointer list-none font-semibold text-tinta [&::-webkit-details-marker]:hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pauta">
              Mais sobre esta ideia <span aria-hidden="true" className="inline-block transition group-open/porque:rotate-90">›</span>
            </summary>
            <p className="mt-1">{post.por_que}</p>
          </details>
        )}

        {aceitaFoto && (
          <div className="mt-3">
            <button
              type="button"
              onClick={criarImagem}
              disabled={criandoImagem}
              aria-busy={criandoImagem}
              className={`${foco ? ACAO_PEQUENA : BOTAO_SECUNDARIO} w-full gap-2`}
              title="O Claude escreve a direção de arte, a OpenAI cria a imagem sem texto e o seu post entra por cima"
            >
              <span aria-hidden="true" className="h-2 w-2 rounded-full bg-pauta" />
              {criandoImagem ? "Criando a imagem…" : pers.foto ? "Gerar outra imagem" : "Criar imagem com IA"}
            </button>
            {erroImagem && (
              <p className="mt-2 rounded-xl bg-pauta/10 px-3 py-2 text-xs leading-snug text-pauta-escura" role="alert">
                {erroImagem}
              </p>
            )}
            {pers.foto && !criandoImagem && !erroImagem && (
              <p className="mt-1.5 flex flex-wrap items-center justify-center gap-x-2 text-xs text-tinta-3">
                Imagem criada com IA, texto do seu post.
                <button
                  type="button"
                  onClick={() => novaArte({ ...pers, foto: null })}
                  className="font-semibold text-tinta-2 underline decoration-tinta/30 underline-offset-2 hover:text-tinta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pauta"
                >
                  Tirar imagem
                </button>
              </p>
            )}
          </div>
        )}

        {/* Na aba "Hoje", Aprovar e Recusar ficam numa barra fixa da própria aba, sempre à vista. */}
        {!foco && onDecidir && <AprovarRecusar decisao={decisao} onDecidir={onDecidir} />}
        {!foco && aprovado && onResultado && <JaPostei atual={resultado} onSalvar={onResultado} />}
        <div className={foco ? "mt-3 flex flex-wrap justify-center" : "mt-2 grid grid-cols-2 gap-2"}>
          <button
            type="button"
            aria-expanded={!!rascunho}
            onClick={() => setRascunho(rascunho ? null : { gancho: post.gancho, slides: post.slides.map((x) => ({ ...x })), legendas: {} })}
            className={foco ? ACAO_PEQUENA : BOTAO_SECUNDARIO}
          >
            Customizar
          </button>
          <button type="button" onClick={paraCanva} className={foco ? ACAO_PEQUENA : BOTAO_SECUNDARIO} title="Baixa a arte e abre o Canva em outra aba">
            {foco ? "Canva" : "Editar no Canva"}
          </button>
          <button type="button" onClick={copiar} className={foco ? ACAO_PEQUENA : BOTAO_SECUNDARIO}>
            {copiado ? <span className="text-aprovado">Copiado ✓</span> : "Copiar legenda"}
          </button>
          <button type="button" onClick={() => onBaixar(base, `${post.id}${total > 1 ? `-slide-${s + 1}` : ""}.png`)} className={foco ? ACAO_PEQUENA : BOTAO_SECUNDARIO}>
            Baixar arte
          </button>
        </div>
        {avisoCanva && (
          <p className="mt-2 text-xs leading-snug text-tinta-2" role="status">
            A arte foi baixada. No Canva, arraste o arquivo para editar.
          </p>
        )}
      </div>
    </article>
  );
}
