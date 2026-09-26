"use client";

/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import { totalSlides, urlArte, type Personalizacao } from "@/lib/client/artes";
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
  const s = Math.min(slide, total - 1);
  const src = urlArte(analise, post, { ...pers, slide: s, tamanho: "feed" });
  const pal = analise.brand.paleta;
  const cores = [...new Set([pal.primaria, pal.secundaria, pal.destaque].map((c) => c.toLowerCase()))];
  const corAtual = (pers.cor ?? pal.primaria).toLowerCase();

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
    <article className="group flex flex-col border border-tinta/15 bg-white transition hover:border-tinta/40 hover:shadow-[6px_6px_0_var(--color-tinta)]" style={{ animation: `subir .6s ${Math.min(indice, 8) * 0.06}s both` }}>
      <header className="flex items-center justify-between gap-3 border-b border-tinta/10 px-4 py-2.5">
        <p className="retranca text-tinta-3">
          <span className="text-tinta">#{String(indice + 1).padStart(2, "0")}</span> · {NOMES_REDE[post.rede_principal]} · {NOMES_TEMPLATE[template]}
        </p>
        {agenda && (
          <p className="retranca text-pauta">
            {agenda.data.slice(8, 10)}/{agenda.data.slice(5, 7)} · {agenda.horario}
          </p>
        )}
      </header>

      <div className="relative aspect-[4/5] overflow-hidden bg-papel-2">
        {carregandoArte && <div className="absolute inset-0 animate-pulse bg-papel-3/60" />}
        <img
          key={src}
          src={src}
          alt={`Arte do post: ${post.gancho}`}
          loading="lazy"
          onLoad={() => setCarregandoArte(false)}
          className="h-full w-full object-cover"
        />
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
              className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-lg shadow disabled:opacity-0"
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
              className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-lg shadow disabled:opacity-0"
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
              className={`h-7 w-7 rounded-full border-2 transition ${corAtual === c ? "border-tinta scale-110" : "border-white shadow-[0_0_0_1px_rgba(0,0,0,.15)]"}`}
              style={{ background: c }}
            />
          ))}
          <label className="relative h-7 w-7 cursor-pointer overflow-hidden rounded-full border border-dashed border-tinta/50" title="Outra cor">
            <span className="absolute inset-0 flex items-center justify-center text-xs text-tinta-2">+</span>
            <input
              type="color"
              value={corAtual}
              onChange={(e) => {
                setCarregandoArte(true);
                onPers({ ...pers, cor: e.target.value });
              }}
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
          className="ml-auto h-8 border border-tinta/20 bg-papel px-2 text-sm"
        >
          {(Object.keys(NOMES_TEMPLATE) as TemplateId[]).map((t) => (
            <option key={t} value={t}>
              {NOMES_TEMPLATE[t]}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-1 flex-col px-4 pb-4 pt-3">
        <h3 className="font-serif text-xl leading-snug">{post.gancho}</h3>
        <div className="mt-3 flex gap-1 border-b border-tinta/10" role="tablist" aria-label="Legenda por rede">
          {ORDEM_REDES.map((r) => (
            <button
              key={r}
              type="button"
              role="tab"
              aria-selected={rede === r}
              onClick={() => setRede(r)}
              className={`-mb-px border-b-2 px-2 py-1.5 text-xs font-semibold transition ${rede === r ? "border-pauta text-tinta" : "border-transparent text-tinta-3 hover:text-tinta"}`}
            >
              {NOMES_REDE[r]}
            </button>
          ))}
        </div>
        <p className="mt-3 max-h-40 flex-1 overflow-y-auto whitespace-pre-line text-sm leading-relaxed text-tinta-2">{post.legendas[rede]}</p>
        <p className="mt-3 border-l-2 border-limao bg-limao/15 px-2 py-1.5 text-xs leading-relaxed text-tinta-2">
          <strong className="text-tinta">Por que funciona:</strong> {post.por_que}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" onClick={copiar} className="h-10 border border-tinta text-sm font-semibold transition hover:bg-tinta hover:text-papel">
            {copiado ? "Copiado ✓" : "Copiar legenda"}
          </button>
          <button
            type="button"
            onClick={() => onBaixar(src, `${post.id}${total > 1 ? `-slide-${s + 1}` : ""}.png`)}
            className="h-10 bg-tinta text-sm font-semibold text-papel transition hover:bg-pauta"
          >
            Baixar arte
          </button>
        </div>
      </div>
    </article>
  );
}
