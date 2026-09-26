"use client";

/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import { totalSlides, urlArte, type Personalizacao } from "@/lib/client/artes";
import { OBJETIVOS } from "@/lib/motor/constantes";
import type { ExtrasPost } from "@/lib/motor/contrato";
import type { Analise, PostGerado, Rede, TemplateId } from "@/lib/types";

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

const NOMES_REDE: Record<Rede, string> = { instagram: "Instagram", linkedin: "LinkedIn", x: "X", facebook: "Facebook" };
const ORDEM_REDES: Rede[] = ["instagram", "linkedin", "x", "facebook"];

function nomeObjetivo(id: string | undefined) {
  return OBJETIVOS.find((o) => o.id === id)?.nome;
}

/** Faixa curta "para quem é este post": aparece só quando o motor mandou o endereçamento. */
function FaixaEnderecamento({ e }: { e: NonNullable<ExtrasPost["enderecamento"]> }) {
  const objetivo = nomeObjetivo(e.objetivo);
  return (
    <div className="space-y-1 border-b border-tinta/10 bg-papel px-4 py-2.5 text-xs leading-snug text-tinta-2">
      <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="min-w-0 flex-1 text-sm">
          <span className="text-tinta-3">Para:</span> <strong className="font-semibold text-tinta">{e.publico}</strong>
        </span>
        {objetivo && <span className="shrink-0 rounded-full bg-tinta px-2 py-0.5 text-[11px] font-semibold text-papel">{objetivo}</span>}
      </p>
      {e.gatilho_identificacao && (
        <p>
          <span className="text-tinta-3">Vai se reconhecer em:</span> {e.gatilho_identificacao}
        </p>
      )}
      {e.acao_esperada && (
        <p>
          <span className="text-tinta-3">Ação esperada:</span> {e.acao_esperada}
        </p>
      )}
    </div>
  );
}

/** Destaca os [PREENCHER: ...] na legenda, para a pessoa ver onde falta um dado dela. */
function comLacunas(texto: string) {
  return texto.split(/(\[PREENCHER:[^\]]*\])/g).map((parte, i) =>
    /^\[PREENCHER:/.test(parte) ? (
      <mark key={i} className="rounded bg-limao/70 px-0.5 text-tinta">
        {parte}
      </mark>
    ) : (
      parte
    ),
  );
}

export function PostCard({
  analise,
  post,
  indice,
  pers,
  onPers,
  onBaixar,
  agenda,
}: {
  analise: Analise;
  post: PostGerado;
  indice: number;
  pers: Personalizacao;
  onPers: (p: Personalizacao) => void;
  onBaixar: (url: string, nome: string) => void;
  agenda?: { data: string; dia_semana: string; horario: string };
}) {
  const template = pers.template ?? post.template;
  const total = totalSlides(post, template);
  const [slide, setSlide] = useState(0);
  const [rede, setRede] = useState<Rede>(post.rede_principal);
  const [copiado, setCopiado] = useState(false);
  const [carregandoArte, setCarregandoArte] = useState(true);
  const [erroArte, setErroArte] = useState(false);
  const [tentativa, setTentativa] = useState(0);
  const s = Math.min(slide, total - 1);
  const base = urlArte(analise, post, { ...pers, slide: s, tamanho: "feed" });
  const src = tentativa ? `${base}&r=${tentativa}` : base;
  const pal = analise.brand.paleta;
  const cores = [...new Set([pal.primaria, pal.secundaria, pal.destaque].map((c) => c.toLowerCase()))];
  const corAtual = (pers.cor ?? pal.primaria).toLowerCase();
  const extra = post as PostGerado & ExtrasPost;
  const revisar = extra.precisa_revisao ?? [];

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

  return (
    <article className="group flex flex-col overflow-hidden rounded-3xl border border-tinta/10 bg-white transition hover:shadow-[0_30px_60px_-40px_rgba(22,19,15,.35)]" style={{ animation: `subir .6s ${Math.min(indice, 8) * 0.06}s both` }}>
      <header className="flex items-center justify-between gap-3 border-b border-tinta/10 px-4 py-2.5">
        <p className="text-xs text-tinta-3">
          <span className="font-semibold text-tinta">Post {indice + 1}</span> · {NOMES_REDE[post.rede_principal]} · {NOMES_TEMPLATE[template]}
          {extra.trilho && (
            <span className={`ml-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${extra.trilho === "founder" ? "bg-salvia/10 text-salvia" : "bg-papel-2 text-tinta-2"}`}>
              {extra.trilho === "founder" ? "Founder" : "Empresa"}
            </span>
          )}
        </p>
        {agenda && (
          <p className="shrink-0 rounded-full bg-papel px-2.5 py-1 text-xs font-medium tabular-nums text-tinta-2">
            {agenda.data.slice(8, 10)}/{agenda.data.slice(5, 7)} · {agenda.horario}
          </p>
        )}
      </header>

      {extra.enderecamento?.publico && <FaixaEnderecamento e={extra.enderecamento} />}

      <div className="relative aspect-[4/5] overflow-hidden bg-papel-2">
        {carregandoArte && <div className="absolute inset-0 animate-pulse bg-papel-3/60" />}
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

      <div className="flex flex-wrap items-center gap-3 border-b border-tinta/10 px-4 py-3">
        <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Cor principal">
          {cores.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={corAtual === c}
              aria-label={`Usar a cor ${c}`}
              onClick={() => {
                setCarregandoArte(true);
                onPers({ ...pers, cor: c });
              }}
              className={`h-7 w-7 rounded-full border-2 transition ${corAtual === c ? "border-tinta scale-110" : "border-white shadow-[0_0_0_1px_rgba(0,0,0,.15)]"} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pauta`}
              style={{ background: c }}
            />
          ))}
          <label className="relative h-7 w-7 cursor-pointer overflow-hidden rounded-full border border-dashed border-tinta/40 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-pauta" title="Outra cor">
            <span className="absolute inset-0 flex items-center justify-center text-xs text-tinta-2">+</span>
            <input
              type="color"
              value={corAtual}
              onChange={(e) => {
                setCarregandoArte(true);
                onPers({ ...pers, cor: e.target.value });
              }}
              aria-label="Escolher outra cor"
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </label>
        </div>
        <select
          value={template}
          onChange={(e) => {
            setSlide(0);
            setCarregandoArte(true);
            onPers({ ...pers, template: e.target.value as TemplateId });
          }}
          aria-label="Modelo da arte"
          className="ml-auto h-9 rounded-full border border-tinta/15 bg-papel px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pauta"
        >
          {(Object.keys(NOMES_TEMPLATE) as TemplateId[]).map((t) => (
            <option key={t} value={t}>
              {NOMES_TEMPLATE[t]}
            </option>
          ))}
        </select>
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
        <p className="mt-3 max-h-40 flex-1 overflow-y-auto whitespace-pre-line text-sm leading-relaxed text-tinta-2">{comLacunas(post.legendas[rede])}</p>
        {revisar.length > 0 && (
          <div className="mt-3 rounded-2xl border border-pauta/40 bg-pauta/5 px-3 py-2 text-xs leading-relaxed text-tinta-2">
            <p className="font-semibold text-pauta-escura">Precisa revisar antes de postar</p>
            <ul className="mt-1 space-y-0.5">
              {revisar.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
        )}
        <p className="mt-3 rounded-2xl bg-papel px-3 py-2 text-xs leading-relaxed text-tinta-2">
          <strong className="text-tinta">Por que funciona:</strong> {post.por_que}
          {extra.padrao_referencia?.nome && (
            <span className="mt-1 block">
              Padrão de referência:{" "}
              {/^https?:\/\//.test(extra.padrao_referencia.fonte_url) ? (
                <a
                  href={extra.padrao_referencia.fonte_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-tinta underline decoration-tinta/30 underline-offset-2 hover:decoration-tinta"
                >
                  {extra.padrao_referencia.nome}
                </a>
              ) : (
                <span className="font-medium text-tinta">{extra.padrao_referencia.nome}</span>
              )}
            </span>
          )}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" onClick={copiar} className="h-10 rounded-full border border-tinta/20 text-sm font-semibold transition hover:border-tinta/40 hover:bg-papel focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pauta">
            {copiado ? <span className="text-aprovado">Copiado ✓</span> : "Copiar legenda"}
          </button>
          <button
            type="button"
            onClick={() => onBaixar(base, `${post.id}${total > 1 ? `-slide-${s + 1}` : ""}.png`)}
            className="h-10 rounded-full bg-tinta text-sm font-semibold text-papel transition hover:bg-tinta-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pauta"
          >
            Baixar arte
          </button>
        </div>
      </div>
    </article>
  );
}
