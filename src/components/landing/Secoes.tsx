import Image from "next/image";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import type { Outlier } from "@/lib/oportunidade";
import type { Analise } from "@/lib/types";
import { AbasHorizontais, Passos } from "./Abas";
import { BotaoComecar } from "./BotaoComecar";
import { CenaVideo } from "./CenaVideo";
import { Revelar } from "./Revelar";
import { TextoRevelado } from "./TextoRevelado";
import { VideoDemo } from "./VideoDemo";

const CONTEUDO = "mx-auto w-full max-w-6xl px-4 sm:px-6";
// Respiro vertical das seções: menor no celular, onde 96px por lado viravam telas vazias.
const SECAO = "py-16 sm:py-24 lg:py-32";
const H2 = "font-display text-[2rem] font-semibold leading-[1.08] tracking-[-0.03em] sm:text-5xl";
const CARTAO = "rounded-3xl bg-white p-5 shadow-[0_30px_60px_-40px_rgba(22,19,15,.35)] sm:p-9";
const BOTAO_PRINCIPAL = "tocavel inline-flex h-12 items-center justify-center rounded-full bg-pauta px-6 font-semibold text-white transition-colors hover:bg-pauta-escura";
const BOTAO_CLARO = "tocavel inline-flex h-11 items-center justify-center rounded-full border border-tinta/15 bg-white px-5 font-medium transition-colors hover:border-tinta";

export const arteEstatica = (id: string) => `/exemplos/${id}.png`;
const NOME_REDE = { instagram: "Instagram", linkedin: "LinkedIn", x: "X", facebook: "Facebook" } as const;
const vezes = (x: number) => `${x.toFixed(1).replace(".", ",")}x a mediana`;
const encurtar = (s: string, n: number) => (s.length > n ? `${s.slice(0, n).trimEnd()}...` : s);

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
          <a href="#exemplos-marcas" className="hover:text-tinta">
            Exemplos
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
      <h1 style={{ "--atraso": "60ms" } as CSSProperties} className="entrada max-w-[17ch] text-balance font-display text-[2.5rem] font-semibold leading-[1.04] tracking-[-0.04em] sm:text-[3.4rem] lg:text-[3.9rem]">
        Você sabe o que o seu cliente precisa ouvir.{" "}
        <em className="font-serif font-normal italic tracking-[-0.02em] text-pauta">Falta tempo para postar.</em>
      </h1>
      <p style={{ "--atraso": "200ms" } as CSSProperties} className="entrada mt-6 max-w-lg text-lg leading-relaxed text-tinta-2">
        O social.Ai transforma o que você sabe sobre mercado, produto e cliente em posts de autoridade para o cliente certo, com a pauta da semana pronta e o melhor horário para cada um.
      </p>
    </>
  );
}

/** Painel do hero: fundo em degradê suave com o baralho de posts reais por cima. */
export function PainelHero({ children }: { children: ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-[28px] bg-papel-2 px-4 pb-6 pt-8 sm:px-10 sm:pb-8 sm:pt-10">
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 55% at 85% 10%, rgba(255,74,28,.28), transparent 70%), radial-gradient(55% 50% at 10% 95%, rgba(254,62,109,.18), transparent 70%)",
        }}
      />
      <div className="relative">{children}</div>
      <p className="relative mt-5 text-center text-sm text-tinta-2">Arraste para o lado. Posts gerados a partir de sites públicos.</p>
    </div>
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

const PERGUNTAS_FOUNDER = [
  "Qual problema você resolve para o seu cliente?",
  "Qual dúvida mais aparece antes de alguém comprar?",
  "Por que o cliente escolhe vocês e não outra opção?",
];

function CartaoPerguntas() {
  return (
    <div className={CARTAO}>
      <p className="text-sm text-tinta-3">Três perguntas sobre o seu negócio</p>
      <ol className="mt-5 divide-y divide-tinta/10">
        {PERGUNTAS_FOUNDER.map((q, i) => (
          <li key={q} style={{ "--atraso": `${i * 110}ms` } as CSSProperties} className="entrada py-4 first:pt-0 last:pb-0">
            <p className="font-medium leading-snug">
              <span className="mr-2 tabular-nums text-tinta-3">{i + 1}</span>
              {q}
            </p>
            {i === 0 && (
              <div className="mt-3 rounded-2xl bg-papel-2 px-4 py-3">
                <p className="text-xs text-tinta-2">Exemplo de resposta</p>
                <p className="mt-1 font-serif text-lg italic leading-snug">&ldquo;A clínica perde paciente porque ninguém responde o WhatsApp depois das seis da tarde.&rdquo;</p>
              </div>
            )}
          </li>
        ))}
      </ol>
      <p className="mt-6 text-sm text-tinta-2">Uma ou duas linhas por resposta. Ou grave um áudio.</p>
    </div>
  );
}

function CartaoRadar({ outliers, nicho }: { outliers: Outlier[]; nicho: string }) {
  return (
    <div className={CARTAO}>
      <p className="text-sm text-tinta-3">Fora da curva em {nicho}, na base curada</p>
      <ul className="mt-5 divide-y divide-tinta/10">
        {outliers.slice(0, 3).map((o, i) => (
          <li key={o.id} style={{ "--atraso": `${i * 110}ms` } as CSSProperties} className="entrada py-4 first:pt-0 last:pb-0">
            <div className="flex items-baseline justify-between gap-4 text-sm">
              <span className="min-w-0 truncate text-tinta-3">{o.autor}</span>
              <span className="shrink-0 font-semibold tabular-nums">{vezes(o.multiplo)}</span>
            </div>
            <p className="mt-1.5 leading-snug">{encurtar(o.gancho, 120)}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CartaoSemana({ a }: { a: Analise }) {
  const semana = [...a.calendario].sort((x, y) => `${x.data}${x.horario}`.localeCompare(`${y.data}${y.horario}`)).slice(0, 5);
  return (
    <div className={CARTAO}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="font-semibold">Sua semana</p>
        <p className="text-sm text-tinta-3">Exemplo com {a.brand.dominio}</p>
      </div>
      <ul className="mt-5 divide-y divide-tinta/10">
        {semana.map((c, i) => {
          const post = a.posts.find((p) => p.id === c.post_id);
          return (
            <li key={`${c.data}-${c.post_id}`} style={{ "--atraso": `${i * 90}ms` } as CSSProperties} className="entrada grid grid-cols-[4.5rem_minmax(0,1fr)] gap-4 py-3.5 first:pt-0 last:pb-0">
              <div className="text-sm">
                <p className="font-medium capitalize">{c.dia_semana}</p>
                <p className="tabular-nums text-tinta-3">{c.horario}</p>
              </div>
              <div className="min-w-0">
                <p className="truncate leading-snug">{post ? post.gancho : c.post_id}</p>
                <p className="mt-1 text-xs text-tinta-3">
                  {NOME_REDE[c.rede]} · <span className="whitespace-nowrap rounded-full bg-papel-2 px-2 py-0.5 text-tinta-2">{c.fonte ?? "hipótese do nicho"}</span>
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function ComoFunciona({
  demo,
  outliers,
  nichoRadar,
}: {
  demo: Analise;
  outliers: Outlier[];
  nichoRadar: string;
}) {
  return (
    <section id="como-funciona" className="scroll-mt-20 bg-white">
      <div className={`${CONTEUDO} ${SECAO}`}>
        <Revelar>
          <h2 className={`${H2} max-w-2xl`}>Do que você sabe à semana pronta.</h2>
        </Revelar>
        <div className="mt-10 sm:mt-14">
          <Passos
            abas={[
              {
                titulo: "Cole o site e responda três perguntas",
                texto: "O site dá a marca. As perguntas dão o que o site não conta: o problema, a dúvida e o motivo da escolha. Dá para responder por áudio.",
                painel: <CartaoPerguntas />,
              },
              {
                titulo: "A gente cruza com o que já viralizou no seu nicho",
                texto: "Cada post segue um padrão de uma base curada de posts fortes de founders e startups. Você vê qual foi.",
                painel: <CartaoRadar outliers={outliers} nicho={nichoRadar} />,
              },
              {
                titulo: "Receba a semana pronta",
                texto: "Posts na sua marca, para quem é cada um e quando postar. Sem dado da sua audiência, o horário vem marcado como hipótese do nicho.",
                painel: <CartaoSemana a={demo} />,
              },
            ]}
          />
        </div>
      </div>
    </section>
  );
}

export function Exemplos({ demos }: { demos: Analise[] }) {
  return (
    <section id="exemplos-marcas" aria-labelledby="exemplos" className="scroll-mt-20">
      <div className={`${CONTEUDO} ${SECAO}`}>
        <Revelar>
          <h2 id="exemplos" className={H2}>
            Na identidade de cada marca.
          </h2>
          <p className="mt-4 max-w-lg text-lg leading-relaxed text-tinta-2">Gerados só com o site público de cada empresa, sem as três perguntas. Nenhuma delas tem relação com o social.Ai.</p>
        </Revelar>
        <div className="mt-8 sm:mt-10">
          <AbasHorizontais
            abas={demos.map((d) => ({
              titulo: d.brand.nome,
              painel: (
                <ul className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
                  {d.posts.slice(0, 4).map((p) => (
                    <li key={p.id} className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-papel-2">
                      <Image src={arteEstatica(p.id)} alt={`Post gerado para ${d.brand.nome}: ${p.gancho}`} fill sizes="(max-width: 1024px) 45vw, 270px" className="object-cover" />
                    </li>
                  ))}
                </ul>
              ),
            }))}
          />
        </div>
      </div>
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
