"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import type { Aba } from "./Abas";

/** A versão da lista de espera mantém a demonstração original sem alterar o MVP. */
export function PassosEspera({ abas }: { abas: Aba[] }) {
  const [ativa, setAtiva] = useState(0);
  const botoes = useRef<Array<HTMLButtonElement | null>>([]);
  const id = useId();

  function navegar(evento: KeyboardEvent<HTMLButtonElement>, atual: number) {
    let proxima: number;
    switch (evento.key) {
      case "ArrowDown":
        proxima = (atual + 1) % abas.length;
        break;
      case "ArrowUp":
        proxima = (atual - 1 + abas.length) % abas.length;
        break;
      case "Home":
        proxima = 0;
        break;
      case "End":
        proxima = abas.length - 1;
        break;
      default:
        return;
    }
    evento.preventDefault();
    setAtiva(proxima);
    botoes.current[proxima]?.focus();
  }

  if (abas.length === 0) return null;

  return (
    <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
      <div
        role="tablist"
        aria-label="Como funciona o social.Ai"
        aria-orientation="vertical"
        className="flex min-w-0 flex-col"
      >
        {abas.map((aba, indice) => {
          const selecionada = ativa === indice;
          return (
            <button
              key={aba.titulo}
              ref={(botao) => { botoes.current[indice] = botao; }}
              id={`${id}-etapa-${indice}`}
              type="button"
              role="tab"
              aria-selected={selecionada}
              aria-controls={`${id}-painel-${indice}`}
              tabIndex={selecionada ? 0 : -1}
              onClick={() => setAtiva(indice)}
              onKeyDown={(evento) => navegar(evento, indice)}
              className="group relative min-h-16 border-t border-tinta/15 py-5 text-left last:border-b focus-visible:z-10 focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-tinta"
            >
              <span
                aria-hidden="true"
                className={`absolute -top-px left-0 h-[3px] origin-left bg-pauta transition-[width] duration-500 motion-reduce:transition-none ${selecionada ? "w-20" : "w-0"}`}
              />
              <span className={`block font-display text-xl leading-snug font-semibold tracking-[-0.02em] transition-colors duration-200 motion-reduce:transition-none sm:text-2xl ${selecionada ? "text-tinta" : "text-tinta-3 group-hover:text-tinta"}`}>
                {aba.titulo}
              </span>
              {aba.texto && (
                <span
                  aria-hidden={!selecionada}
                  className={`grid transition-[grid-template-rows,opacity] duration-300 motion-reduce:transition-none ${selecionada ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
                >
                  <span className="overflow-hidden">
                    <span className="block max-w-md pt-3 text-base leading-relaxed text-tinta-2">
                      {aba.texto}
                    </span>
                  </span>
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="min-w-0">
        {abas.map((aba, indice) => (
          <div
            key={aba.titulo}
            id={`${id}-painel-${indice}`}
            role="tabpanel"
            aria-labelledby={`${id}-etapa-${indice}`}
            tabIndex={0}
            hidden={ativa !== indice}
            className="min-w-0 rounded-2xl motion-safe:animate-[aparecer_.35s_ease-out] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-tinta"
          >
            {aba.painel}
          </div>
        ))}
      </div>
    </div>
  );
}
