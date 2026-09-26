import Link from "next/link";
import type { CSSProperties } from "react";
import { BotaoComecar } from "./BotaoComecar";
import { CenaVideo } from "./CenaVideo";
import { ComoFuncionaEspera } from "./ComoFuncionaEspera";
import { Revelar } from "./Revelar";
import { TextoRevelado } from "./TextoRevelado";
import { VideoDemo } from "./VideoDemo";
import { VideoFalaAoPost } from "./VideoFalaAoPost";

const CONTEUDO = "mx-auto w-full max-w-6xl px-4 sm:px-6";
// Respiro vertical das seções: menor no celular, onde 96px por lado viravam telas vazias.
const SECAO = "py-16 sm:py-24 lg:py-32";
const H2 = "font-display text-[2rem] font-semibold leading-[1.08] tracking-[-0.03em] sm:text-5xl";
const BOTAO_PRINCIPAL = "tocavel inline-flex h-12 items-center justify-center rounded-full bg-pauta px-6 font-semibold text-white transition-colors hover:bg-pauta-escura";
const BOTAO_CLARO = "tocavel inline-flex h-11 items-center justify-center rounded-full border border-tinta/15 bg-white px-5 font-medium transition-colors hover:border-tinta";


export function Topo() {
  return (
    <header className="sticky top-0 z-40 border-b border-tinta/[0.06] bg-papel/85 backdrop-blur-md">
      <div className={`${CONTEUDO} flex h-14 items-center justify-between gap-6 sm:h-16`}>
        <Link href="/" className="inline-flex h-11 items-center font-display text-xl font-semibold tracking-[-0.02em]">
          social.Ai
        </Link>
        <nav className="hidden items-center gap-7 text-sm text-tinta-2 md:flex" aria-label="Seções">
          <a href="#como-funciona" className="hover:text-tinta">
            Como funciona
          </a>
          <a href="#exemplo" className="hover:text-tinta">
            Exemplo
          </a>
          <a href="#preco" className="hover:text-tinta">
            Preço
          </a>
        </nav>
        <BotaoComecar className="inline-flex h-11 items-center rounded-full bg-tinta px-4 sm:h-10 text-sm font-medium text-papel transition-colors hover:bg-tinta-2" />
      </div>
    </header>
  );
}

export function Cabecalho() {
  return (
    <>
      <h1
        style={{ "--atraso": "60ms" } as CSSProperties}
        className="entrada max-w-4xl font-display text-[2.25rem] font-semibold leading-[1.04] tracking-[-0.045em] sm:mx-auto sm:text-[3.6rem] lg:text-[4.25rem]"
      >
        Seu negócio está na sua cabeça.
        <em className="mt-1 block font-serif text-[1.1em] font-normal tracking-[-0.025em] text-pauta sm:mt-2">Seu marketing não deveria estar.</em>
      </h1>
      <p style={{ "--atraso": "200ms" } as CSSProperties} className="entrada mt-4 max-w-xl text-base leading-relaxed text-tinta-2 sm:mx-auto sm:mt-6 sm:text-balance sm:text-lg">
        Transforme o que você sabe sobre o seu mercado, produto e cliente em <span className="sublinhado-pauta">marketing que gera resultado.</span> Sem passar horas
        pesquisando, criando, revisando ou ensinando uma IA sobre a sua própria empresa.
      </p>
    </>
  );
}

export function Dor() {
  return (
    <section className={`${CONTEUDO} ${SECAO}`}>
      <TextoRevelado como="h2" className={`${H2} max-w-3xl`} texto="O que você sabe do seu cliente não vira post." />
      <Revelar>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-tinta-2">
          Está na sua cabeça, nas calls de venda e nas objeções que você responde toda semana. Falta tempo, não assunto.
        </p>
      </Revelar>
    </section>
  );
}

export function Video() {
  return (
    <section aria-label="O produto em vídeo" className={`${CONTEUDO} pb-16 sm:pb-24 lg:pb-32`}>
      <CenaVideo>
        <VideoDemo />
      </CenaVideo>
      <Revelar>
        <p className="mt-4 text-sm text-tinta-3">O produto em doze segundos: cora.com.br entra, a marca é lida e os posts chegam prontos para aprovar.</p>
      </Revelar>
    </section>
  );
}

/** Os 4 passos que acendem conforme a rolagem (mesmo componente da lista de espera). */
export function ComoFunciona() {
  return (
    <section id="como-funciona" className="scroll-mt-20 bg-white">
      <div className={`${CONTEUDO} py-14 sm:py-20 lg:py-24`}>
        <ComoFuncionaEspera
          cabecalho={
            <>
              <p className="retranca mb-4 text-pauta-escura">Como funciona</p>
              <h2 className={`${H2} max-w-xl`}>
                Você conhece o seu negócio.
                <br />
                <span className="font-serif font-normal italic text-pauta">A gente transforma isso em conteúdo.</span>
              </h2>
              <p className="mt-5 max-w-md text-base leading-relaxed text-tinta-2 sm:text-lg">Quatro etapas entre o que você sabe e o post pronto para aprovar.</p>
            </>
          }
        />
      </div>
    </section>
  );
}

/** Um exemplo específico no lugar das artes genéricas: a fala do founder vira o post. */
export function Exemplo() {
  return (
    <section id="exemplo" className={`${CONTEUDO} grid scroll-mt-20 items-center gap-8 py-14 sm:py-20 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-16`}>
      <Revelar>
        <p className="retranca mb-4 text-pauta-escura">Um exemplo</p>
        <h2 className={`${H2} max-w-xl`}>
          Da sua fala
          <br />
          <span className="font-serif font-normal italic text-pauta">ao post pronto.</span>
        </h2>
        <p className="mt-5 max-w-md text-base leading-relaxed text-tinta-2 sm:text-lg">
          Você conta a dúvida que mais ouve dos clientes. O social.Ai transforma em post, <strong className="font-semibold text-tinta">com a cara da sua marca.</strong>
        </p>
      </Revelar>
      <figure className="w-full">
        <VideoFalaAoPost />
        <figcaption className="mt-3 text-sm leading-relaxed text-tinta-3">Exemplo ilustrativo. A Rota ERP é uma marca fictícia.</figcaption>
      </figure>
    </section>
  );
}

export function Planos() {
  const planos = [
    { nome: "Solo", preco: "49", itens: ["A pauta da semana pronta", "1 marca", "Radar do nicho"] },
    { nome: "Tração", preco: "129", itens: ["Mais posts por semana", "Até 3 marcas", "Legendas para LinkedIn, Instagram e X"] },
    { nome: "Time", preco: "290", itens: ["Posts sem limite", "Até 10 marcas", "Aprovação em equipe"] },
  ];
  return (
    <section id="preco" className="scroll-mt-20">
      <div className={`${CONTEUDO} ${SECAO}`}>
        <Revelar>
          <h2 className={H2}>Preço de ferramenta.</h2>
          <p className="mt-3 text-tinta-3">Preços em teste. Durante o teste, você não paga nada.</p>
        </Revelar>
        <div className="mt-8 grid gap-4 sm:mt-12 md:grid-cols-3">
          {planos.map((p, i) => (
            <Revelar key={p.nome} atraso={i * 90} className="h-full">
              <div className="erguer flex h-full flex-col rounded-3xl bg-white p-6 sm:p-7">
                <h3 className="text-lg font-semibold">{p.nome}</h3>
                <p className="mt-3 sm:mt-4">
                  <span className="font-display text-[2.5rem] leading-none sm:text-5xl font-semibold tabular-nums tracking-[-0.03em]">R$ {p.preco}</span>
                  <span className="text-tinta-3"> por mês</span>
                </p>
                <ul className="mt-5 flex-1 space-y-1.5 text-tinta-2 sm:mt-6 sm:space-y-2">
                  {p.itens.map((it) => (
                    <li key={it}>{it}</li>
                  ))}
                </ul>
                <BotaoComecar className={`${BOTAO_CLARO} mt-6 w-full sm:mt-8`} />
              </div>
            </Revelar>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Perguntas() {
  const perguntas = [
    ["Por que não usar o ChatGPT?", "Ele não sabe o que você sabe, não conhece os padrões que viralizaram no seu nicho e não entrega a arte na sua marca."],
    ["A IA inventa coisas sobre a minha empresa?", "Não. Ela usa o seu site e o que você contou nas três perguntas. Você aprova cada post antes de publicar."],
    ["De onde vêm os posts de referência?", "De uma base curada pelo time, com link para cada fonte e métrica só quando dá para conferir."],
  ];
  return (
    <section className="bg-white">
      <div className={`${CONTEUDO} grid gap-6 ${SECAO} lg:gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]`}>
        <h2 className={H2}>Perguntas</h2>
        <div className="divide-y divide-tinta/10 border-y border-tinta/10">
          {perguntas.map(([q, r]) => (
            <details key={q} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-lg font-medium leading-snug">
                {q}
                <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 transition-transform group-open:rotate-45" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </summary>
              <p className="-mt-1 max-w-xl pb-5 leading-relaxed text-tinta-2">{r}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Chamada() {
  return (
    <section className={`${CONTEUDO} ${SECAO}`}>
      <Revelar>
        <div className="relative overflow-hidden rounded-[28px] bg-tinta px-6 py-12 text-papel sm:px-14 sm:py-20">
          <div
            aria-hidden
            className="absolute inset-0"
            style={{ background: "radial-gradient(55% 80% at 90% 0%, rgba(255,74,28,.5), transparent 70%), radial-gradient(40% 60% at 0% 100%, rgba(254,62,109,.28), transparent 70%)" }}
          />
          <div className="relative flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="max-w-xl font-display text-[2rem] font-semibold leading-[1.08] tracking-[-0.03em] sm:text-5xl">A pauta da semana que vem já pode estar pronta.</h2>
            <BotaoComecar className={BOTAO_PRINCIPAL} />
          </div>
        </div>
      </Revelar>
    </section>
  );
}

export function Rodape() {
  return (
    <footer className="border-t border-tinta/10">
      <div className={`${CONTEUDO} flex flex-col gap-2 py-8 text-sm text-tinta-3 sm:flex-row sm:justify-between`}>
        <p>social.Ai</p>
        <p>Exemplos gerados a partir de sites públicos, sem vínculo com as marcas.</p>
      </div>
    </footer>
  );
}
