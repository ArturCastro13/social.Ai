"use client";

/* eslint-disable @next/next/no-img-element */
import Image from "next/image";
import { useEffect, useEffectEvent, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";

export type Escolha = "aprovado" | "pulado";

export interface Carta {
  id: string;
  src: string;
  alt: string;
  /** Imagens estáticas de /public passam pelo otimizador do Next; artes geradas na hora, não. */
  estatica?: boolean;
}

const LIMIAR = 90;
const SAIDA_MS = 260;

function Figura({ carta, prioridade }: { carta: Carta; prioridade?: boolean }) {
  if (carta.estatica) {
    return (
      <Image
        src={carta.src}
        alt={carta.alt}
        fill
        sizes="(max-width: 640px) 80vw, 340px"
        priority={prioridade}
        draggable={false}
        className="pointer-events-none select-none object-cover"
      />
    );
  }
  return <img src={carta.src} alt={carta.alt} draggable={false} className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover" />;
}

function Icone({ tipo }: { tipo: Escolha }) {
  return tipo === "aprovado" ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="h-6 w-6" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

/**
 * Pilha de ideias de post: arraste para a direita para aprovar e para a esquerda para pular.
 * Também funciona pelos botões e pelas setas do teclado.
 */
export function Baralho({
  cartas,
  onEscolha,
  repetir = false,
  vazio,
  rodape,
  onTopo,
}: {
  cartas: Carta[];
  onEscolha?: (carta: Carta, escolha: Escolha) => void;
  /** Na landing o baralho recomeça quando acaba. */
  repetir?: boolean;
  vazio?: ReactNode;
  rodape?: (carta: Carta) => ReactNode;
  /** Avisa qual carta está no topo (null quando o baralho acaba). */
  onTopo?: (carta: Carta | null) => void;
}) {
  const [indice, setIndice] = useState(0);
  const [dx, setDx] = useState(0);
  const [arrastando, setArrastando] = useState(false);
  const [saindo, setSaindo] = useState<Escolha | null>(null);
  const [anuncio, setAnuncio] = useState("");
  const inicio = useRef<number | null>(null);
  // Trava síncrona: dois cliques ou teclas no mesmo quadro não podem decidir a mesma carta duas vezes.
  const ocupado = useRef(false);
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  const total = cartas.length;
  const acabou = !repetir && indice >= total;
  const visiveis = acabou || total === 0 ? [] : [0, 1, 2].map((k) => cartas[(indice + k) % total]).slice(0, Math.min(3, repetir ? total : total - indice));

  function escolher(e: Escolha) {
    if (ocupado.current || acabou || !total) return;
    ocupado.current = true;
    const carta = cartas[indice % total];
    // Encerra qualquer arraste em curso: a próxima carta não herda o ponteiro da que saiu.
    inicio.current = null;
    setArrastando(false);
    setSaindo(e);
    setAnuncio(e === "aprovado" ? "Ideia aprovada" : "Ideia pulada");
    // A decisão é registrada na hora; só a troca de carta espera a animação de saída.
    onEscolha?.(carta, e);
    timer.current = window.setTimeout(() => {
      timer.current = null;
      ocupado.current = false;
      setIndice((i) => i + 1);
      setDx(0);
      setSaindo(null);
    }, SAIDA_MS);
  }

  function baixo(ev: PointerEvent<HTMLDivElement>) {
    if (ocupado.current || (ev.pointerType === "mouse" && ev.button !== 0)) return;
    ev.currentTarget.setPointerCapture(ev.pointerId);
    inicio.current = ev.clientX;
    setArrastando(true);
  }
  function move(ev: PointerEvent<HTMLDivElement>) {
    if (inicio.current === null) return;
    setDx(ev.clientX - inicio.current);
  }
  function cima(ev: PointerEvent<HTMLDivElement>) {
    if (inicio.current === null) return;
    // Distância lida do próprio evento: o estado dx pode ainda não ter sido renderizado.
    const d = ev.clientX - inicio.current;
    inicio.current = null;
    setArrastando(false);
    if (d > LIMIAR) escolher("aprovado");
    else if (d < -LIMIAR) escolher("pulado");
    else setDx(0);
  }
  function cancelar() {
    if (inicio.current === null) return;
    inicio.current = null;
    setArrastando(false);
    setDx(0);
  }
  function tecla(ev: KeyboardEvent<HTMLDivElement>) {
    if (ev.key === "ArrowRight") {
      ev.preventDefault();
      escolher("aprovado");
    } else if (ev.key === "ArrowLeft") {
      ev.preventDefault();
      escolher("pulado");
    }
  }

  const cartaTopo = visiveis[0] ?? null;
  const topoId = cartaTopo?.id ?? null;
  const avisarTopo = useEffectEvent(() => onTopo?.(cartaTopo));
  // Só quando a carta do topo muda: onTopo e cartas podem ser objetos novos a cada render do pai
  // sem disparar de novo (evita laço quando o pai guarda o topo em estado).
  useEffect(() => {
    avisarTopo();
  }, [topoId]);

  const deslocamento = saindo ? (saindo === "aprovado" ? 1 : -1) * 640 : dx;
  const forcaSim = saindo === "aprovado" ? 1 : Math.max(0, Math.min(1, dx / LIMIAR));
  const forcaNao = saindo === "pulado" ? 1 : Math.max(0, Math.min(1, -dx / LIMIAR));

  return (
    <div className="flex flex-col items-center">
      <div
        className="relative aspect-[4/5] w-full max-w-[340px] touch-pan-y outline-none"
        tabIndex={0}
        role="group"
        aria-roledescription="baralho de ideias"
        aria-label="Ideias de post. Seta para a direita aprova, seta para a esquerda pula."
        onKeyDown={tecla}
      >
        {acabou && <div className="absolute inset-0 flex items-center justify-center rounded-2xl border border-dashed border-tinta/20 p-8 text-center">{vazio}</div>}
        {visiveis
          .map((carta, k) => ({ carta, k }))
          .reverse()
          .map(({ carta, k }) => {
            const topo = k === 0;
            const style = topo
              ? {
                  transform: `translateX(${deslocamento}px) rotate(${deslocamento / 22}deg)`,
                  transition: arrastando ? "none" : `transform ${SAIDA_MS}ms cubic-bezier(.2,.7,.2,1)`,
                }
              : {
                  transform: `translateY(${k * 14}px) scale(${1 - k * 0.05})`,
                  transition: "transform 300ms cubic-bezier(.2,.7,.2,1)",
                };
            return (
              <div
                key={`${carta.id}-${indice + k}`}
                className={`absolute inset-0 overflow-hidden rounded-2xl bg-papel-2 shadow-[0_24px_48px_-28px_rgba(22,19,15,.55)] ${topo ? "cursor-grab active:cursor-grabbing" : ""}`}
                style={style}
                onPointerDown={topo ? baixo : undefined}
                onPointerMove={topo ? move : undefined}
                onPointerUp={topo ? cima : undefined}
                onPointerCancel={topo ? cancelar : undefined}
                aria-hidden={!topo}
              >
                <Figura carta={carta} prioridade={topo && indice === 0} />
                {topo && (
                  <>
                    <span className="absolute left-4 top-4 rounded-full bg-aprovado px-3 py-1 text-sm font-semibold text-white" style={{ opacity: forcaSim }}>
                      Aprovar
                    </span>
                    <span className="absolute right-4 top-4 rounded-full bg-tinta px-3 py-1 text-sm font-semibold text-white" style={{ opacity: forcaNao }}>
                      Pular
                    </span>
                  </>
                )}
              </div>
            );
          })}
      </div>

      {!acabou && visiveis[0] && rodape && <div className="mt-6 w-full max-w-[340px]">{rodape(visiveis[0])}</div>}

      <div className="mt-6 flex items-center gap-6">
        <button
          type="button"
          onClick={() => escolher("pulado")}
          disabled={acabou}
          aria-label="Pular ideia"
          className="flex h-14 w-14 items-center justify-center rounded-full border border-tinta/15 bg-white text-tinta transition-[transform,border-color] hover:scale-105 hover:border-tinta disabled:opacity-40"
        >
          <Icone tipo="pulado" />
        </button>
        <button
          type="button"
          onClick={() => escolher("aprovado")}
          disabled={acabou}
          aria-label="Aprovar ideia"
          className="flex h-14 w-14 items-center justify-center rounded-full border border-aprovado/30 bg-white text-aprovado transition-[transform,border-color] hover:scale-105 hover:border-aprovado disabled:opacity-40"
        >
          <Icone tipo="aprovado" />
        </button>
      </div>
      <p className="sr-only" aria-live="polite">
        {anuncio}
      </p>
    </div>
  );
}
