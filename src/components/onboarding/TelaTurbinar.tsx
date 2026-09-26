"use client";

import { useEffect, useRef, useState } from "react";
import { normalizarLink } from "@/lib/client/onboarding";
import { BotaoGravar } from "./ui";
import { useDitado } from "./useDitado";

export interface Turbo {
  inspiracoes: string[];
  brandBook: string;
  fala: string;
  proibicoes: string[];
}

export const TURBO_VAZIO: Turbo = { inspiracoes: ["", "", ""], brandBook: "", fala: "", proibicoes: [] };

const CAMPO =
  "w-full rounded-2xl border border-tinta/20 bg-white px-4 py-3 text-base leading-relaxed outline-none transition-colors placeholder:text-tinta-3/70 focus:border-tinta focus-visible:outline-none";
const LINHA = "h-11 w-full min-w-0 rounded-full border border-tinta/20 bg-white px-4 text-base outline-none transition-colors placeholder:text-tinta-3/70 focus:border-tinta focus-visible:outline-none";

/** Tela 3, opcional: cada item é um gesto só. Tudo fica editável antes de gerar. */
export function TelaTurbinar({ turbo, onChange }: { turbo: Turbo; onChange: (t: Turbo) => void }) {
  const voz = useDitado(60);
  const gravando = voz.gravando === "fala";
  const [novaProibicao, setNovaProibicao] = useState("");
  const turboAtual = useRef(turbo);
  useEffect(() => {
    turboAtual.current = turbo;
  }, [turbo]);

  function gravar() {
    voz.gravar("fala", turboAtual.current.fala, (fala) => onChange({ ...turboAtual.current, fala }), 6000);
  }

  function adicionarProibicao() {
    const partes = novaProibicao
      .split(",")
      .map((p) => p.trim().slice(0, 200))
      .filter(Boolean);
    if (!partes.length) return;
    const lista = [...turbo.proibicoes];
    for (const p of partes) if (!lista.some((x) => x.toLowerCase() === p.toLowerCase())) lista.push(p);
    onChange({ ...turbo, proibicoes: lista.slice(0, 10) });
    setNovaProibicao("");
  }

  return (
    <div id="turbinar" className="animate-subir scroll-mt-24 space-y-8 rounded-3xl border border-tinta/10 bg-white p-5 sm:p-8">
      <div>
        <h2 className="font-display text-2xl font-semibold tracking-[-0.02em]">Quer turbinar?</h2>
        <p className="mt-1 text-sm text-tinta-2">Tudo aqui é opcional. Cada coisa que você der deixa a pauta mais sua.</p>
      </div>

      <fieldset>
        <legend className="font-semibold">Inspirações</legend>
        <p className="mt-1 text-sm text-tinta-3">Cole até 3 links de posts, perfis ou vídeos que você queria ter feito.</p>
        <div className="mt-3 space-y-2">
          {turbo.inspiracoes.map((v, i) => {
            const invalido = v.trim() !== "" && !normalizarLink(v);
            return (
              <div key={i}>
                <label htmlFor={`inspiracao-${i}`} className="sr-only">
                  Link de inspiração {i + 1}
                </label>
                <input
                  id={`inspiracao-${i}`}
                  inputMode="url"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={v}
                  placeholder={["instagram.com/p/...", "linkedin.com/in/...", "youtube.com/watch?v=..."][i]}
                  onChange={(e) => onChange({ ...turbo, inspiracoes: turbo.inspiracoes.map((x, k) => (k === i ? e.target.value : x)) })}
                  aria-invalid={invalido}
                  className={LINHA}
                />
                {invalido && <p className="mt-1 pl-4 text-xs text-pauta-escura">Esse não parece um link. Ele vai ficar de fora.</p>}
              </div>
            );
          })}
        </div>
      </fieldset>

      <div>
        <label htmlFor="brand-book" className="font-semibold">
          Brand book
        </label>
        <p className="mt-1 text-sm text-tinta-3">
          Cole os trechos que importam: tom de voz, mensagens, palavras que vocês usam e as que evitam. Se não tiver, tudo bem, a paleta e a fonte já vieram do
          site.
        </p>
        <textarea
          id="brand-book"
          rows={4}
          maxLength={20000}
          value={turbo.brandBook}
          onChange={(e) => onChange({ ...turbo, brandBook: e.target.value })}
          placeholder="Ex.: A gente fala de igual para igual. Nunca usamos 'solução' nem 'disruptivo'."
          className={`mt-3 ${CAMPO}`}
        />
      </div>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label htmlFor="fala" className="font-semibold">
            Fale 1 minuto
          </label>
          {voz.temVoz && <BotaoGravar gravando={gravando} relogio={voz.relogio} temTexto={!!turbo.fala} onClick={gravando ? voz.parar : gravar} rotulo="a fala" />}
        </div>
        <p className="mt-1 text-sm text-tinta-3">
          Conta sobre a empresa como contaria num café: por que começou, para quem é, o que ninguém sabe.{" "}
          {voz.temVoz ? "O áudio vira texto aqui mesmo e você pode corrigir." : "Seu navegador não grava por aqui, então escreve do seu jeito que funciona igual."}
        </p>
        <textarea
          id="fala"
          rows={5}
          maxLength={6000}
          value={turbo.fala}
          onChange={(e) => onChange({ ...turbo, fala: e.target.value })}
          placeholder="Comecei a empresa porque..."
          className={`mt-3 ${CAMPO}`}
        />
        <p className="sr-only" aria-live="polite">
          {gravando ? "Gravando" : ""}
        </p>
        {voz.aviso?.id === "fala" && (
          <p className="mt-2 text-sm text-pauta-escura" role="alert">
            {voz.aviso.texto}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="proibicao" className="font-semibold">
          Nunca postaria
        </label>
        <p className="mt-1 text-sm text-tinta-3">Escreva e aperte Enter. Ex.: nada de política, não falo de concorrente, sem meme.</p>
        {turbo.proibicoes.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {turbo.proibicoes.map((p) => (
              <li key={p} className="inline-flex items-center gap-1 rounded-full bg-tinta py-1 pl-3 pr-1 text-sm text-papel">
                {p}
                <button
                  type="button"
                  onClick={() => onChange({ ...turbo, proibicoes: turbo.proibicoes.filter((x) => x !== p) })}
                  aria-label={`Tirar ${p}`}
                  className="flex h-6 w-6 items-center justify-center rounded-full text-papel/70 hover:bg-papel/15 hover:text-papel focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-pauta"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
        <input
          id="proibicao"
          value={novaProibicao}
          onChange={(e) => setNovaProibicao(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              adicionarProibicao();
            }
          }}
          onBlur={adicionarProibicao}
          disabled={turbo.proibicoes.length >= 10}
          placeholder={turbo.proibicoes.length >= 10 ? "Chegou no limite de 10" : "nada de política"}
          className={`mt-3 ${LINHA}`}
        />
      </div>
    </div>
  );
}
