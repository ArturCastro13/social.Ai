"use client";

import { useEffect, useRef } from "react";

/**
 * Loop curto 4:5: a frase do founder vira post. Só baixa e toca quando aparece, pausa quando sai.
 * Com movimento reduzido, fica no pôster.
 */
export function VideoFalaAoPost() {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) v.play().catch(() => undefined);
        else v.pause();
      },
      { threshold: 0.35 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);

  return (
    <video
      ref={ref}
      src="/video/fala-ao-post.mp4"
      poster="/video/fala-ao-post-poster.jpg"
      muted
      loop
      playsInline
      preload="none"
      width={720}
      height={900}
      aria-label="Exemplo: a frase de um founder sobre uma objeção real de cliente vira um post pronto, na identidade da marca."
      // A caixa já nasce em 4:5 para a página não pular quando o vídeo carrega.
      className="block aspect-[4/5] h-auto w-full rounded-2xl border border-tinta/10 bg-papel-2 object-cover sm:rounded-[28px]"
    />
  );
}
