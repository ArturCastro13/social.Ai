"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { normalizarLink } from "@/lib/client/onboarding";

export interface Turbo {
  inspiracoes: string[];
  brandBook: string;
  fala: string;
  proibicoes: string[];
}

export const TURBO_VAZIO: Turbo = { inspiracoes: ["", "", ""], brandBook: "", fala: "", proibicoes: [] };

const LIMITE_FALA_S = 60;
const CAMPO =
  "w-full rounded-2xl border border-tinta/20 bg-white px-4 py-3 text-base leading-relaxed outline-none transition-colors placeholder:text-tinta-3/70 focus:border-tinta focus-visible:outline-none";
const LINHA = "h-11 w-full min-w-0 rounded-full border border-tinta/20 bg-white px-4 text-base outline-none transition-colors placeholder:text-tinta-3/70 focus:border-tinta focus-visible:outline-none";

// Web Speech API: o TypeScript não traz o construtor, então descrevemos só o que usamos.
interface Reconhecedor {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: { resultIndex: number; results: SpeechRecognitionResultList }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
}
type ConstrutorReconhecedor = new () => Reconhecedor;

function construtorDeVoz(): ConstrutorReconhecedor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: ConstrutorReconhecedor; webkitSpeechRecognition?: ConstrutorReconhecedor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}
const semAssinatura = () => () => {};

/** Tela 3, opcional: cada item é um gesto só. Tudo fica editável antes de gerar. */
export function TelaTurbinar({ turbo, onChange }: { turbo: Turbo; onChange: (t: Turbo) => void }) {
  const temVoz = useSyncExternalStore(semAssinatura, () => !!construtorDeVoz(), () => false);
  const [gravando, setGravando] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const [avisoVoz, setAvisoVoz] = useState("");
  const [novaProibicao, setNovaProibicao] = useState("");
  const rec = useRef<Reconhecedor | null>(null);
  const querGravar = useRef(false);
  const inicio = useRef(0);
  const turboAtual = useRef(turbo);
  useEffect(() => {
    turboAtual.current = turbo;
  }, [turbo]);

  // Relógio da gravação: para sozinho no limite de um minuto.
  useEffect(() => {
    if (!gravando) return;
    const t = setInterval(() => {
      const s = Math.floor((Date.now() - inicio.current) / 1000);
      setSegundos(s);
      if (s >= LIMITE_FALA_S) parar();
    }, 250);
    return () => clearInterval(t);
  }, [gravando]);

  useEffect(() => () => rec.current?.abort(), []);

  function parar() {
    querGravar.current = false;
    rec.current?.stop();
    setGravando(false);
  }

  function gravar() {
    const Ctor = construtorDeVoz();
    if (!Ctor) return;
    setAvisoVoz("");
    const base = turboAtual.current.fala.trim();
    let finais = "";
    const r = new Ctor();
    r.lang = "pt-BR";
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e) => {
      let parcial = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) finais += res[0].transcript.trim() + " ";
        else parcial += res[0].transcript;
      }
      const texto = [base, (finais + parcial).trim()].filter(Boolean).join(base ? "\n" : "");
      onChange({ ...turboAtual.current, fala: texto.slice(0, 6000) });
    };
    r.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") setAvisoVoz("O navegador não liberou o microfone. Dá para escrever no campo que funciona igual.");
      else if (e.error !== "no-speech" && e.error !== "aborted") setAvisoVoz("A gravação parou. Você pode gravar de novo ou completar escrevendo.");
      if (e.error !== "no-speech") querGravar.current = false;
    };
    // O Chrome encerra sozinho depois de um silêncio; se ainda cabe tempo, volta a ouvir.
    r.onend = () => {
      if (querGravar.current && Date.now() - inicio.current < LIMITE_FALA_S * 1000) {
        try {
          r.start();
          return;
        } catch {
          /* já estava ouvindo */
        }
      }
      querGravar.current = false;
      setGravando(false);
    };
    rec.current = r;
    querGravar.current = true;
    inicio.current = Date.now();
    setSegundos(0);
    try {
      r.start();
      setGravando(true);
    } catch {
      setAvisoVoz("Não deu para começar a gravar. Escreve no campo que funciona igual.");
    }
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

  const relogio = `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, "0")}`;

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
          {temVoz && (
            <button
              type="button"
              onClick={gravando ? parar : gravar}
              aria-pressed={gravando}
              className={`inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pauta ${
                gravando ? "bg-tinta text-papel" : "border border-tinta/20 bg-white hover:border-tinta"
              }`}
            >
              <span className={`h-2.5 w-2.5 rounded-full bg-pauta ${gravando ? "animate-pisca" : ""}`} aria-hidden />
              {gravando ? `Parar ${relogio}` : turbo.fala ? "Gravar mais" : "Gravar"}
            </button>
          )}
        </div>
        <p className="mt-1 text-sm text-tinta-3">
          Conta sobre a empresa como contaria num café: por que começou, para quem é, o que ninguém sabe.{" "}
          {temVoz ? "O áudio vira texto aqui mesmo e você pode corrigir." : "Seu navegador não grava por aqui, então escreve do seu jeito que funciona igual."}
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
        {avisoVoz && (
          <p className="mt-2 text-sm text-pauta-escura" role="alert">
            {avisoVoz}
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
