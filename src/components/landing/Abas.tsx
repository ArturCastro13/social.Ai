"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

export interface Aba {
  titulo: string;
  texto?: string;
  painel: ReactNode;
}

/** Lista de passos à esquerda e o visual do passo escolhido à direita. No celular vira abas em cima do visual. */
const TEMPO_PASSO_MS = 5200;

export function Passos({ abas }: { abas: Aba[] }) {
  const [ativa, setAtiva] = useState(0);
  // Avança sozinho enquanto está na tela; para de vez quando a pessoa escolhe um passo.
  const [automatico, setAutomatico] = useState(true);
  const [naTela, setNaTela] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAutomatico(false);
      return;
    }
    const io = new IntersectionObserver(([e]) => setNaTela(e.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!automatico || !naTela) return;
    const t = setTimeout(() => setAtiva((a) => (a + 1) % abas.length), TEMPO_PASSO_MS);
    return () => clearTimeout(t);
  }, [automatico, naTela, ativa, abas.length]);

  const rodando = automatico && naTela;
  return (
    <div ref={ref} className="grid grid-cols-[minmax(0,1fr)] gap-8 sm:gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
      <div role="tablist" aria-orientation="vertical" className="flex flex-col">
        {abas.map((a, i) => (
          <button
            key={a.titulo}
            id={`${id}-t${i}`}
            role="tab"
            type="button"
            aria-selected={ativa === i}
            aria-controls={`${id}-p${i}`}
            onClick={() => {
              setAutomatico(false);
              setAtiva(i);
            }}
            className="group border-t border-tinta/10 py-5 text-left last:border-b"
          >
            <span className="relative block">
              <span
                className={`absolute -top-5 left-0 h-0.5 bg-pauta transition-[width] duration-500 ${ativa === i ? "w-16" : "w-0"}`}
                aria-hidden
              />
              {rodando && ativa === i && (
                <span
                  key={`barra-${ativa}`}
                  className="absolute -top-5 left-16 h-0.5 w-[calc(100%-4rem)] origin-left bg-tinta/15"
                  style={{ animation: `encher ${TEMPO_PASSO_MS}ms linear both` }}
                  aria-hidden
                />
              )}
              <span className={`block text-xl font-semibold tracking-[-0.01em] transition-colors ${ativa === i ? "text-tinta" : "text-tinta-3 group-hover:text-tinta-2"}`}>
                {a.titulo}
              </span>
              {a.texto && (
                <span
                  className={`grid transition-[grid-template-rows,opacity] duration-500 ${ativa === i ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
                >
                  <span className="overflow-hidden">
                    <span className="block max-w-md pt-2 leading-relaxed text-tinta-2">{a.texto}</span>
                  </span>
                </span>
              )}
            </span>
          </button>
        ))}
      </div>
      {/* Os painéis ficam empilhados na mesma célula: a altura é a do maior e a página não pula quando o passo troca.
          A chave muda ao ativar para a entrada do painel tocar de novo. */}
      <div className="relative grid grid-cols-[minmax(0,1fr)]">
        {abas.map((a, i) => (
          <div
            key={`${a.titulo}-${ativa === i}`}
            id={`${id}-p${i}`}
            role="tabpanel"
            aria-labelledby={`${id}-t${i}`}
            className={`[grid-area:1/1] ${ativa === i ? "animate-[aparecer_.5s_cubic-bezier(.16,1,.3,1)]" : "invisible"}`}
          >
            {a.painel}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Abas horizontais simples (usadas nos exemplos por marca). */
export function AbasHorizontais({ abas }: { abas: Aba[] }) {
  const [ativa, setAtiva] = useState(0);
  const id = useId();
  return (
    <div>
      <div role="tablist" className="flex flex-wrap gap-2">
        {abas.map((a, i) => (
          <button
            key={a.titulo}
            id={`${id}-t${i}`}
            role="tab"
            type="button"
            aria-selected={ativa === i}
            aria-controls={`${id}-p${i}`}
            onClick={() => setAtiva(i)}
            className={`h-11 rounded-full px-4 text-sm font-medium transition-colors ${ativa === i ? "bg-tinta text-papel" : "bg-papel-2 text-tinta-2 hover:text-tinta"}`}
          >
            {a.titulo}
          </button>
        ))}
      </div>
      {abas.map((a, i) => (
        <div key={a.titulo} id={`${id}-p${i}`} role="tabpanel" aria-labelledby={`${id}-t${i}`} hidden={ativa !== i} className="mt-8">
          {a.painel}
        </div>
      ))}
    </div>
  );
}
