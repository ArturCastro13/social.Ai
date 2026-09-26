"use client";

import { useEffect, useRef, useState } from "react";

// Duas versões do mesmo loop: 4:5 para o celular (fonte em video-vertical/) e 16:9 para telas largas (fonte em video/).
const VERSOES = {
  vertical: { src: "/video/demo-vertical.mp4", poster: "/video/demo-vertical-poster.jpg", width: 720, height: 900 },
  horizontal: { src: "/video/demo.mp4", poster: "/video/demo-poster.jpg", width: 1280, height: 720 },
} as const;
const CELULAR = "(max-width: 639px)";

/** Vídeo curto do produto. Escolhe a versão pela largura da tela, só baixa e toca quando aparece e pausa quando sai. */
export function VideoDemo() {
  const ref = useRef<HTMLVideoElement>(null);
  // O HTML do servidor não sabe a largura da tela: começa sem src e decide ao montar, antes de qualquer download.
  const [versao, setVersao] = useState<keyof typeof VERSOES | null>(null);

  useEffect(() => {
    const mq = window.matchMedia(CELULAR);
    const escolher = () => setVersao(mq.matches ? "vertical" : "horizontal");
    escolher();
    mq.addEventListener("change", escolher);
    return () => mq.removeEventListener("change", escolher);
  }, []);

  useEffect(() => {
    const v = ref.current;
    if (!v || !versao) return;
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
  }, [versao]);

  const atual = versao ? VERSOES[versao] : null;
  return (
    <video
      ref={ref}
      key={versao ?? "nenhum"}
      src={atual?.src}
      poster={atual?.poster}
      muted
      loop
      playsInline
      preload="none"
      width={atual?.width ?? 720}
      height={atual?.height ?? 900}
      aria-label="Demonstração: o site cora.com.br é lido, a paleta, a fonte e o tom aparecem, e o post do dia chega pronto para aprovar."
      // A caixa já nasce na proporção certa para a página não pular quando o vídeo carrega.
      className="block aspect-[4/5] h-auto w-full bg-papel object-cover sm:aspect-video"
    />
  );
}
