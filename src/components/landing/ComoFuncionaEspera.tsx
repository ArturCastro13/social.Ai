"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

const passos = [
  {
    titulo: "Entendemos a sua empresa",
    texto: "Conecte o seu site, as redes, os materiais e o que você sabe do negócio. A plataforma entende quem você é, o que vende, para quem vende e o que torna você diferente.",
  },
  {
    titulo: "Entendemos o mercado",
    texto: "Acompanhamos concorrentes, tendências, sinais de interesse do seu público e os vídeos que viralizam no seu nicho. Não para copiar. Para entender o que está funcionando e como isso faz sentido para você.",
  },
  {
    titulo: "Transformamos insight em estratégia",
    texto: "O sistema cruza tudo com o objetivo do seu negócio e define o que comunicar, para quem, onde, como e por quê.",
  },
  {
    titulo: "Entregamos pronto",
    texto: "Copy, roteiro, criativo na sua identidade visual, legenda, chamada para ação e o formato certo para cada rede. Você só aprova e posta.",
  },
];

// "feito" ficou para trás, "ativo" está no centro da tela, "proximo" ainda vem. "fixo" é o estado sem animação.
type Estado = "feito" | "ativo" | "proximo" | "fixo";
const numero = (i: number) => String(i + 1).padStart(2, "0");

/**
 * Linha do tempo que avança sozinha enquanto a pessoa rola.
 * O passo cujo marcador cruzou 55% da altura da tela fica ativo; cada trecho da linha enche com scaleY.
 * O observador só liga a escuta de rolagem quando a seção está perto da tela. Com movimento reduzido, tudo fica visível.
 */
export function ComoFuncionaEspera({ cabecalho }: { cabecalho: ReactNode }) {
  const secao = useRef<HTMLDivElement>(null);
  const itens = useRef<(HTMLLIElement | null)[]>([]);
  const linhas = useRef<(HTMLSpanElement | null)[]>([]);
  // null = ainda sem JavaScript ou movimento reduzido: todos os passos aparecem inteiros.
  const [ativo, setAtivo] = useState<number | null>(null);

  useEffect(() => {
    const el = secao.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let quadro = 0;
    let ouvindo = false;
    const ultimos: string[] = [];
    const medir = () => {
      quadro = 0;
      const linha = window.innerHeight * 0.55;
      // Primeiro só lê as posições, depois só escreve transform: nada de forçar layout no meio do quadro.
      const caixas = itens.current.map((li) => li?.getBoundingClientRect());
      let atual = -1;
      caixas.forEach((r, i) => {
        if (!r) return;
        if (r.top <= linha) atual = i;
        const trecho = linhas.current[i];
        if (!trecho) return;
        // O trecho começa embaixo do marcador (44px) e termina no marcador do próximo passo.
        const inicio = r.top + 44;
        const p = Math.max(0, Math.min(1, (linha - inicio) / Math.max(1, r.bottom - inicio))).toFixed(3);
        if (ultimos[i] !== p) {
          ultimos[i] = p;
          trecho.style.transform = `scaleY(${p})`;
        }
      });
      setAtivo(atual);
    };
    const agendar = () => {
      if (!quadro) quadro = requestAnimationFrame(medir);
    };
    const ligar = (sim: boolean) => {
      if (sim === ouvindo) return;
      ouvindo = sim;
      if (sim) {
        window.addEventListener("scroll", agendar, { passive: true });
        window.addEventListener("resize", agendar, { passive: true });
        agendar();
      } else {
        window.removeEventListener("scroll", agendar);
        window.removeEventListener("resize", agendar);
      }
    };
    const io = new IntersectionObserver(([e]) => {
      ligar(e.isIntersecting);
      // Ao sair, mede uma última vez para os passos ficarem no estado certo (todos feitos ou todos por vir).
      if (!e.isIntersecting) agendar();
    }, { rootMargin: "25% 0px 25% 0px" });
    io.observe(el);
    medir();
    return () => {
      io.disconnect();
      ligar(false);
      cancelAnimationFrame(quadro);
    };
  }, []);

  const estado = (i: number): Estado => (ativo === null ? "fixo" : i < ativo ? "feito" : i === ativo ? "ativo" : "proximo");
  const destaque = ativo === null ? 0 : Math.max(0, ativo);

  return (
    <div ref={secao} className="grid gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-16">
      <div className="lg:sticky lg:top-24 lg:self-start">
        {cabecalho}
        {/* No computador, o visual do passo ativo fica parado ao lado enquanto os textos rolam. */}
        <div aria-hidden className="mt-10 hidden rounded-[28px] bg-papel p-8 lg:block">
          <div className="grid">
            {passos.map((p, i) => (
              <div key={p.titulo} data-estado={ativo === null ? (i === 0 ? "fixo" : "proximo") : i === destaque ? "ativo" : "proximo"} className="painel-passo [grid-area:1/1]">
                <p className="retranca text-tinta-3">Etapa {numero(i)} de 04</p>
                <p className="mt-1 font-serif text-[5.5rem] italic leading-none text-pauta">{numero(i)}</p>
                <p className="mb-6 mt-2 font-display text-xl font-semibold tracking-tight">{p.titulo}</p>
                <Visual i={i} />
              </div>
            ))}
          </div>
        </div>
      </div>
      <ol className="lg:pt-2">
        {passos.map((p, i) => (
          <li
            key={p.titulo}
            ref={(li) => {
              itens.current[i] = li;
            }}
            data-estado={estado(i)}
            className="passo relative grid grid-cols-[2.75rem_minmax(0,1fr)] gap-x-4 pb-12 last:pb-0 sm:gap-x-6 lg:min-h-[46vh] lg:pb-16"
          >
            {i < passos.length - 1 && (
              <span aria-hidden className="absolute bottom-0 left-[1.3125rem] top-11 w-0.5 overflow-hidden bg-tinta/10">
                <span
                  ref={(el) => {
                    linhas.current[i] = el;
                  }}
                  className="passo-linha block h-full w-full origin-top bg-pauta"
                />
              </span>
            )}
            <span aria-hidden className="passo-numero relative z-10 flex h-11 w-11 items-center justify-center rounded-full border text-sm font-semibold tabular-nums">{numero(i)}</span>
            <div className="min-w-0 pt-2">
              <h3 className="passo-titulo font-display text-2xl font-semibold leading-tight tracking-[-0.02em] sm:text-[1.75rem]">
                <span className="sr-only">Etapa {i + 1}. </span>
                {p.titulo}
              </h3>
              <p className="passo-texto mt-3 max-w-[34rem] text-base leading-relaxed text-tinta-2 sm:text-lg">{p.texto}</p>
              <div aria-hidden className="mt-6 lg:hidden">
                <Visual i={i} />
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Cartão pequeno de cada passo, só com formas em CSS. As peças com --i entram em sequência quando o passo fica ativo. */
function Visual({ i }: { i: number }) {
  const cartao = "visual-passo relative min-h-44 overflow-hidden rounded-2xl border border-tinta/10 bg-white p-4 sm:p-5";
  if (i === 0)
    return (
      <div className={cartao}>
        <div className="peca flex items-center gap-2 rounded-full bg-papel px-3 py-2 text-sm text-tinta-2" style={{ "--i": 0 } as CSSProperties}>
          <span className="h-2 w-2 shrink-0 rounded-full bg-salvia" />
          <span className="truncate">suaempresa.com.br</span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {["Site", "Redes", "Materiais", "O que você sabe"].map((t, n) => (
            <span key={t} className="peca rounded-full border border-tinta/15 px-3 py-1.5 text-sm" style={{ "--i": n + 1 } as CSSProperties}>{t}</span>
          ))}
        </div>
        <div className="peca mt-4 flex items-center gap-2 text-sm font-medium text-pauta-escura" style={{ "--i": 5 } as CSSProperties}>
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-pauta text-[0.7rem] text-white">✓</span>
          Quem você é e para quem vende
        </div>
      </div>
    );
  if (i === 1)
    return (
      <div className={`${cartao} flex h-44 flex-col`}>
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">No seu nicho</span>
          <span className="peca rounded-full bg-pauta/10 px-2.5 py-1 text-xs font-semibold text-pauta-escura" style={{ "--i": 5 } as CSSProperties}>em alta ↗</span>
        </div>
        <div className="mt-3 flex flex-1 items-end gap-2.5">
          {[38, 55, 46, 72, 100].map((h, n) => (
            <span key={n} className={`barra flex-1 origin-bottom rounded-t-md ${n === 4 ? "bg-pauta" : "bg-tinta/15"}`} style={{ height: `${h}%`, "--i": n } as CSSProperties} />
          ))}
        </div>
        <div className="mt-2 flex justify-between gap-2 text-[0.72rem] text-tinta-3">
          <span>Concorrentes</span>
          <span>Tendências</span>
          <span>Vídeos</span>
        </div>
      </div>
    );
  if (i === 2)
    return (
      <div className={cartao}>
        {[["O quê", "82%"], ["Para quem", "64%"], ["Onde", "48%"], ["Como", "72%"], ["Por quê", "90%"]].map(([t, w], n) => (
          <div key={t} className="flex items-center gap-3 py-[0.3rem]">
            <span className="w-[4.5rem] shrink-0 text-xs font-medium text-tinta-2">{t}</span>
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-papel">
              <span className="traco block h-full origin-left rounded-full bg-tinta" style={{ width: w, "--i": n } as CSSProperties} />
            </span>
          </div>
        ))}
      </div>
    );
  return (
    <div className={`${cartao} flex gap-4`}>
      <div className="peca flex aspect-[4/5] w-28 shrink-0 flex-col justify-between self-start rounded-xl bg-pauta p-3 text-white" style={{ "--i": 0 } as CSSProperties}>
        <span className="text-[0.6rem] font-semibold uppercase tracking-wider opacity-80">Sua marca</span>
        <span className="space-y-1.5">
          <span className="block h-2 w-full rounded-full bg-white/90" />
          <span className="block h-2 w-3/4 rounded-full bg-white/90" />
          <span className="block h-1.5 w-1/2 rounded-full bg-white/50" />
        </span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {["Copy", "Criativo", "Feed e Reels"].map((t, n) => (
            <span key={t} className="peca rounded-full border border-tinta/15 px-2.5 py-1 text-xs" style={{ "--i": n + 1 } as CSSProperties}>{t}</span>
          ))}
        </div>
        <span className="peca flex items-center justify-center gap-2 rounded-full bg-tinta px-3 py-2.5 text-sm font-medium text-papel" style={{ "--i": 4 } as CSSProperties}>
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-aprovado text-[0.6rem]">✓</span>
          Aprovar
        </span>
      </div>
    </div>
  );
}
