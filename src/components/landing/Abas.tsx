"use client";

import { useId, useState, type ReactNode } from "react";

export interface Aba {
  titulo: string;
  texto?: string;
  painel: ReactNode;
}

/** Lista de passos à esquerda e o visual do passo escolhido à direita. No celular vira abas em cima do visual. */
export function Passos({ abas }: { abas: Aba[] }) {
  const [ativa, setAtiva] = useState(0);
  const id = useId();
  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
      <div role="tablist" aria-orientation="vertical" className="flex flex-col">
        {abas.map((a, i) => (
          <button
            key={a.titulo}
            id={`${id}-t${i}`}
            role="tab"
            type="button"
            aria-selected={ativa === i}
            aria-controls={`${id}-p${i}`}
            onClick={() => setAtiva(i)}
            className="group border-t border-tinta/10 py-5 text-left last:border-b"
          >
            <span className="relative block">
              <span
                className={`absolute -top-5 left-0 h-0.5 bg-pauta transition-[width] duration-500 ${ativa === i ? "w-16" : "w-0"}`}
                aria-hidden
              />
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
      <div className="relative">
        {abas.map((a, i) => (
          <div
            key={a.titulo}
            id={`${id}-p${i}`}
            role="tabpanel"
            aria-labelledby={`${id}-t${i}`}
            hidden={ativa !== i}
            className="animate-[aparecer_.5s_cubic-bezier(.16,1,.3,1)]"
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
            className={`h-10 rounded-full px-4 text-sm font-medium transition-colors ${ativa === i ? "bg-tinta text-papel" : "bg-papel-2 text-tinta-2 hover:text-tinta"}`}
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
