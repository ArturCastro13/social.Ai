"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** Sobe e aparece quando entra na tela. Sem JavaScript, ou com movimento reduzido, já nasce visível. */
export function Revelar({ children, className = "", atraso = 0 }: { children: ReactNode; className?: string; atraso?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visivel, setVisivel] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisivel(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} data-visivel={visivel} className={`revelar ${className}`} style={{ transitionDelay: `${atraso}ms` }}>
      {children}
    </div>
  );
}
