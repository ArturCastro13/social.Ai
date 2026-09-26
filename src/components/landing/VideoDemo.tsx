"use client";

import { useEffect, useRef } from "react";

/** Vídeo curto do produto. Só baixa e toca quando aparece na tela; pausa quando sai. */
export function VideoDemo() {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const reduzir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !reduzir) v.play().catch(() => undefined);
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
      src="/video/demo.mp4"
      poster="/video/demo-poster.jpg"
      muted
      loop
      playsInline
      preload="none"
      width={1280}
      height={720}
      aria-label="Demonstração: o site cora.com.br é lido, a paleta, a fonte e o tom aparecem, e as ideias de post são aprovadas ou puladas."
      className="block h-auto w-full"
    />
  );
}
