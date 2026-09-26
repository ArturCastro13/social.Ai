"use client";

import { useEffect, useRef, useState } from "react";

/** Frase que vai escurecendo palavra a palavra conforme a pessoa rola a página. */
export function TextoRevelado({ texto, className = "", como: Tag = "p" }: { texto: string; className?: string; como?: "p" | "h2" }) {
  const ref = useRef<HTMLHeadingElement & HTMLParagraphElement>(null);
  const palavras = texto.split(" ");
  const [acesas, setAcesas] = useState(palavras.length);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let quadro = 0;
    const medir = () => {
      quadro = 0;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // Começa quando o topo passa de 85% da tela e termina quando o fim chega a 45%.
      const p = (vh * 0.85 - r.top) / (vh * 0.85 - vh * 0.45 + r.height);
      setAcesas(Math.round(Math.max(0, Math.min(1, p)) * palavras.length));
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
  }, [palavras.length]);

  return (
    <Tag ref={ref} className={className} aria-label={texto}>
      {palavras.map((p, i) => (
        <span key={i} aria-hidden className={`transition-colors duration-300 ${i < acesas ? "text-tinta" : "text-tinta/20"}`}>
          {p}{" "}
        </span>
      ))}
    </Tag>
  );
}
