"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Moldura que cresce de 90% para 100% enquanto a pessoa rola até ela, e arredonda menos no fim.
 * Só mexe numa variável CSS por quadro; com movimento reduzido, fica parada no tamanho final.
 */
export function CenaVideo({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let quadro = 0;
    const medir = () => {
      quadro = 0;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // 0 quando o topo aparece embaixo da tela; 1 quando o topo chega a 20% da altura.
      const p = Math.max(0, Math.min(1, (vh - r.top) / (vh * 0.8)));
      el.style.setProperty("--p", p.toFixed(3));
    };
    const agendar = () => {
      if (!quadro) quadro = requestAnimationFrame(medir);
    };
    medir();
    window.addEventListener("scroll", agendar, { passive: true });
    window.addEventListener("resize", agendar);
    return () => {
      window.removeEventListener("scroll", agendar);
      window.removeEventListener("resize", agendar);
      cancelAnimationFrame(quadro);
    };
  }, []);
  return (
    <div ref={ref} className="cena-video overflow-hidden border border-tinta/[0.06] bg-white shadow-[0_40px_80px_-50px_rgba(22,19,15,.45)]">
      {children}
    </div>
  );
}
