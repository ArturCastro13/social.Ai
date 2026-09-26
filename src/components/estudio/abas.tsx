"use client";

import { useCallback, useSyncExternalStore } from "react";

/** As três abas do resultado. A aba fica na URL (`?aba=`): dá para compartilhar e o voltar do navegador funciona. */
export type Aba = "hoje" | "calendario" | "resultados";

export const ABAS: { id: Aba; nome: string; dica: string }[] = [
  { id: "hoje", nome: "Hoje", dica: "O post do dia" },
  { id: "calendario", nome: "Calendário", dica: "A semana e todos os posts" },
  { id: "resultados", nome: "Resultados", dica: "Seus números e os concorrentes" },
];

const EVENTO = "socialai:aba";

function lerAba(): Aba {
  const v = new URLSearchParams(window.location.search).get("aba");
  return v === "calendario" || v === "resultados" ? v : "hoje";
}

function assinar(avisar: () => void) {
  window.addEventListener("popstate", avisar);
  window.addEventListener(EVENTO, avisar);
  return () => {
    window.removeEventListener("popstate", avisar);
    window.removeEventListener(EVENTO, avisar);
  };
}

/**
 * Aba atual e como trocar. Trocar grava no histórico com `pushState`, que o Next integra ao roteador
 * sem ir ao servidor. No servidor e na primeira pintura a aba é "hoje".
 * `ancora`: id de um elemento para rolar até ele depois da troca (um post no calendário, por exemplo).
 */
export function useAba(): [Aba, (aba: Aba, ancora?: string) => void] {
  const aba = useSyncExternalStore(assinar, lerAba, () => "hoje" as Aba);
  const ir = useCallback((nova: Aba, ancora?: string) => {
    const url = new URL(window.location.href);
    if (nova === "hoje") url.searchParams.delete("aba");
    else url.searchParams.set("aba", nova);
    url.hash = "";
    if (url.href !== window.location.href) window.history.pushState(null, "", url.href);
    window.dispatchEvent(new Event(EVENTO));
    // Espera a aba nova pintar para rolar.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const alvo = ancora ? document.getElementById(ancora) : null;
        const suave = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (alvo) alvo.scrollIntoView({ behavior: suave ? "smooth" : "auto", block: "start" });
        else window.scrollTo({ top: 0 });
      }),
    );
  }, []);
  return [aba, ir];
}

function Icone({ aba }: { aba: Aba }) {
  const comum = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (aba === "hoje")
    return (
      <svg {...comum}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
      </svg>
    );
  if (aba === "calendario")
    return (
      <svg {...comum}>
        <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
        <path d="M3.5 10h17M8 3v4M16 3v4" />
      </svg>
    );
  return (
    <svg {...comum}>
      <path d="M4 20V10M10 20V4M16 20v-7M21 20H3" />
    </svg>
  );
}

/** Bolinha com o número de posts ainda sem decisão, na aba "Hoje". */
function Contador({ n, escuro }: { n: number; escuro?: boolean }) {
  if (n <= 0) return null;
  return (
    <span
      className={`inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[11px] font-semibold tabular-nums leading-none ${escuro ? "bg-papel text-tinta" : "bg-pauta text-white"}`}
    >
      {n}
    </span>
  );
}

/** Abas no cabeçalho, a partir do tablet. */
export function AbasTopo({ aba, onAba, pendentes }: { aba: Aba; onAba: (a: Aba) => void; pendentes: number }) {
  return (
    <nav aria-label="Abas do resultado" className="hidden md:block">
      <ul className="flex items-center gap-1 rounded-full bg-papel-2 p-1">
        {ABAS.map((a) => {
          const ativa = a.id === aba;
          return (
            <li key={a.id}>
              <button
                type="button"
                aria-current={ativa ? "page" : undefined}
                title={a.dica}
                onClick={() => onAba(a.id)}
                className={`tocavel inline-flex h-9 items-center gap-2 rounded-full px-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pauta ${ativa ? "bg-tinta text-papel" : "text-tinta-2 hover:text-tinta"}`}
              >
                {a.nome}
                {a.id === "hoje" && <Contador n={pendentes} escuro={ativa} />}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Barra fixa embaixo no celular, com ícone e nome. Respeita a área segura do iPhone. */
export function AbasBaixo({ aba, onAba, pendentes }: { aba: Aba; onAba: (a: Aba) => void; pendentes: number }) {
  return (
    <nav
      aria-label="Abas do resultado"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-tinta/10 bg-papel/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
    >
      <ul className="mx-auto grid h-16 max-w-md grid-cols-3">
        {ABAS.map((a) => {
          const ativa = a.id === aba;
          return (
            <li key={a.id}>
              <button
                type="button"
                aria-current={ativa ? "page" : undefined}
                onClick={() => onAba(a.id)}
                className={`relative flex h-full w-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-pauta ${ativa ? "text-tinta" : "text-tinta-3"}`}
              >
                <span aria-hidden="true" className={`absolute top-0 h-0.5 w-8 rounded-full transition-colors ${ativa ? "bg-pauta" : "bg-transparent"}`} />
                <span className="relative">
                  <Icone aba={a.id} />
                  {a.id === "hoje" && pendentes > 0 && (
                    <span className="absolute -right-3 -top-1.5">
                      <Contador n={pendentes} />
                    </span>
                  )}
                </span>
                {a.nome}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
