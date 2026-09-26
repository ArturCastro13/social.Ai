import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { BarrasAprovacao } from "@/components/graficos/BarrasAprovacao";
import { NOMES_FORMATO } from "@/lib/feedback";
import type { Oportunidade, Outlier } from "@/lib/oportunidade";
import type { Analise, PostGerado } from "@/lib/types";
import { AbasHorizontais, Passos } from "./Abas";
import { BotaoComecar } from "./BotaoComecar";
import { Revelar } from "./Revelar";
import { TextoRevelado } from "./TextoRevelado";
import { VideoDemo } from "./VideoDemo";

const CONTEUDO = "mx-auto w-full max-w-6xl px-4 sm:px-6";
const H2 = "font-display text-[2rem] font-semibold leading-[1.08] tracking-[-0.03em] sm:text-5xl";
const CARTAO = "rounded-3xl bg-white shadow-[0_30px_60px_-40px_rgba(22,19,15,.35)]";
const BOTAO_PRINCIPAL = "inline-flex h-12 items-center justify-center rounded-full bg-pauta px-6 font-semibold text-white transition-colors hover:bg-pauta-escura";
const BOTAO_CLARO = "inline-flex h-11 items-center justify-center rounded-full border border-tinta/15 bg-white px-5 font-medium transition-colors hover:border-tinta";

export const arteEstatica = (id: string) => `/exemplos/${id}.png`;
const NOME_REDE = { instagram: "Instagram", linkedin: "LinkedIn", x: "X", facebook: "Facebook" } as const;
const vezes = (x: number) => `${x.toFixed(1).replace(".", ",")}x a mediana`;
const encurtar = (s: string, n: number) => (s.length > n ? `${s.slice(0, n).trimEnd()}...` : s);

export function Topo() {
  return (
    <header className="sticky top-0 z-40 border-b border-tinta/[0.06] bg-papel/85 backdrop-blur-md">
      <div className={`${CONTEUDO} flex h-16 items-center justify-between gap-6`}>
        <Link href="/" className="font-display text-xl font-semibold tracking-[-0.02em]">
          social.Ai
        </Link>
        <nav className="hidden items-center gap-7 text-sm text-tinta-2 md:flex" aria-label="Seções">
          <a href="#como-funciona" className="hover:text-tinta">
            Como funciona
          </a>
          <a href="#metricas-exemplo" className="hover:text-tinta">
            Métricas
          </a>
          <a href="#preco" className="hover:text-tinta">
            Preço
          </a>
        </nav>
        <BotaoComecar className="inline-flex h-10 items-center rounded-full bg-tinta px-4 text-sm font-medium text-papel transition-colors hover:bg-tinta-2" />
      </div>
    </header>
  );
}

export function Cabecalho() {
  return (
    <>
      <h1 className="max-w-[13ch] text-balance font-display text-[2.7rem] font-semibold leading-[1.02] tracking-[-0.04em] sm:text-6xl lg:text-[4.4rem]">
        Todo dia, um post pronto para a sua marca.
      </h1>
      <p className="mt-6 max-w-md text-lg leading-relaxed text-tinta-2">
        O social.Ai lê o seu site, acompanha o que funciona no seu nicho e sugere o post do dia. Você só arrasta para aprovar.
      </p>
    </>
  );
}

/** Painel do hero: fundo em degradê suave com o baralho de posts reais por cima. */
export function PainelHero({ children }: { children: ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-[28px] bg-papel-2 px-6 pb-8 pt-10 sm:px-10">
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
  const frases = [
    "Você sabe que precisa aparecer, mas a semana acaba antes do post.",
    "Designer e agência custam mais do que a startup pode pagar agora.",
    "Sem saber o que funciona no seu nicho, cada post é um chute.",
  ];
  return (
    <section className={`${CONTEUDO} py-24 sm:py-32`}>
      <Revelar>
        <h2 className={`${H2} max-w-3xl`}>Autoridade traz cliente, investidor e talento. Conteúdo toma o tempo que o founder não tem.</h2>
      </Revelar>
      <div className="mt-12 grid gap-4 md:grid-cols-3">
        {frases.map((f, i) => (
          <Revelar key={f} atraso={i * 90} className="h-full">
            <p className="flex h-full min-h-40 items-end rounded-3xl bg-papel-2 p-7 text-lg leading-snug">{f}</p>
          </Revelar>
        ))}
      </div>
    </section>
  );
}

export function Manifesto() {
  return (
    <section className={`${CONTEUDO} pb-24 sm:pb-32`}>
      <TextoRevelado
        className="max-w-4xl font-display text-[1.9rem] font-semibold leading-[1.15] tracking-[-0.03em] sm:text-5xl"
        texto="O social.Ai faz o trabalho de um time de conteúdo. Entende a sua marca, acompanha o nicho, escreve, desenha e aprende com cada escolha sua."
      />
    </section>
  );
}

export function Video() {
  return (
    <section className={`${CONTEUDO} pb-24 sm:pb-32`}>
      <Revelar>
        <div className="overflow-hidden rounded-[28px] border border-tinta/[0.06] bg-white">
          <VideoDemo />
        </div>
        <p className="mt-4 text-sm text-tinta-3">O produto em doze segundos: cora.com.br entra, a marca é lida e as ideias do dia chegam para aprovar.</p>
      </Revelar>
    </section>
  );
}

function CartaoMarca({ a }: { a: Analise }) {
  const b = a.brand;
  return (
    <div className={`${CARTAO} p-7 sm:p-9`}>
      <p className="text-sm text-tinta-3">Marca lida em {b.dominio}</p>
      <div className="mt-6 flex gap-2.5">
        {[b.paleta.primaria, b.paleta.destaque, b.paleta.secundaria, b.paleta.texto].map((c) => (
          <span key={c} className="h-12 w-12 rounded-xl border border-tinta/[0.08]" style={{ background: c }} />
        ))}
      </div>
      <dl className="mt-7 space-y-5">
        <div className="border-t border-tinta/10 pt-4">
          <dt className="text-sm text-tinta-3">Fonte</dt>
          <dd className="mt-1 font-medium">{b.fontes.titulo}</dd>
        </div>
        <div className="border-t border-tinta/10 pt-4">
          <dt className="text-sm text-tinta-3">Tom de voz</dt>
          <dd className="mt-1 leading-relaxed">{a.tom_de_voz}</dd>
        </div>
        <div className="border-t border-tinta/10 pt-4">
          <dt className="text-sm text-tinta-3">Posicionamento</dt>
          <dd className="mt-1 leading-relaxed">{a.posicionamento}</dd>
        </div>
      </dl>
    </div>
  );
}

function CartaoRadar({ outliers, nicho }: { outliers: Outlier[]; nicho: string }) {
  return (
    <div className={`${CARTAO} p-7 sm:p-9`}>
      <p className="text-sm text-tinta-3">Fora da curva em {nicho}, na base curada</p>
      <ul className="mt-5 divide-y divide-tinta/10">
        {outliers.slice(0, 3).map((o) => (
          <li key={o.id} className="py-4 first:pt-0 last:pb-0">
            <div className="flex items-baseline justify-between gap-4 text-sm">
              <span className="truncate text-tinta-3">{o.autor}</span>
              <span className="shrink-0 font-semibold tabular-nums">{vezes(o.multiplo)}</span>
            </div>
            <p className="mt-1.5 leading-snug">{encurtar(o.gancho, 120)}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CartaoIdeia({ a, post, op }: { a: Analise; post: PostGerado; op: Oportunidade }) {
  return (
    <div className={`${CARTAO} grid gap-6 p-6 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)] sm:p-8`}>
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-papel-2">
        <Image src={arteEstatica(post.id)} alt={`Post do dia para ${a.brand.nome}: ${post.gancho}`} fill sizes="(max-width: 640px) 90vw, 280px" className="object-cover" />
      </div>
      <div>
        <p className="text-sm text-tinta-3">Hoje você deveria postar isso</p>
        <p className="mt-3 flex items-baseline gap-2">
          <span className="font-display text-5xl font-semibold tabular-nums tracking-[-0.03em]">{op.score}</span>
          <span className="text-sm text-tinta-3">de 100 em oportunidade</span>
        </p>
        <p className="mt-1 text-sm text-tinta-2">
          {NOMES_FORMATO[post.formato]} para {NOME_REDE[post.rede_principal]}
        </p>
        <p className="mt-5 text-sm font-semibold">Por que</p>
        <ul className="mt-1.5 space-y-1.5 text-sm leading-relaxed text-tinta-2">
          {op.motivos.slice(0, 2).map((m) => (
            <li key={m}>{m}</li>
          ))}
          {post.por_que && <li>{post.por_que}</li>}
        </ul>
      </div>
    </div>
  );
}

export function ComoFunciona({
  demo,
  outliers,
  nichoRadar,
  ideia,
}: {
  demo: Analise;
  outliers: Outlier[];
  nichoRadar: string;
  ideia: { post: PostGerado; op: Oportunidade };
}) {
  return (
    <section id="como-funciona" className="scroll-mt-20 bg-white">
      <div className={`${CONTEUDO} py-24 sm:py-32`}>
        <Revelar>
          <h2 className={`${H2} max-w-2xl`}>Do site ao post do dia, sem reunião de pauta.</h2>
        </Revelar>
        <div className="mt-14">
          <Passos
            abas={[
              {
                titulo: "Entende a sua marca",
                texto: "Lê o site e as redes para tirar tom de voz, posicionamento, público, cores e fontes. Você não preenche briefing.",
                painel: <CartaoMarca a={demo} />,
              },
              {
                titulo: "Acompanha o seu nicho",
                texto: "Compara a sua marca com uma base curada de posts fortes de founders e startups e mostra os que foram muito acima da média.",
                painel: <CartaoRadar outliers={outliers} nicho={nichoRadar} />,
              },
              {
                titulo: "Sugere o post do dia",
                texto: "Cada ideia chega com uma nota de oportunidade, o motivo da escolha e a legenda pronta para LinkedIn, Instagram e X.",
                painel: <CartaoIdeia a={demo} post={ideia.post} op={ideia.op} />,
              },
            ]}
          />
        </div>
      </div>
    </section>
  );
}

export function Metricas() {
  // Números de exemplo, só para mostrar a tela. No produto, vêm das escolhas e dos resultados de cada founder.
  const linhas = [
    { rotulo: "Carrossel", valor: 0.8, detalhe: "4 de 5 aprovadas · engajamento 6%" },
    { rotulo: "Lista", valor: 0.67, detalhe: "2 de 3 aprovadas" },
    { rotulo: "Bastidor", valor: 0.5, detalhe: "1 de 2 aprovadas · engajamento 9%" },
    { rotulo: "Citação", valor: 0.25, detalhe: "1 de 4 aprovadas" },
  ];
  return (
    <section id="metricas-exemplo" className="scroll-mt-20">
      <div className={`${CONTEUDO} grid gap-12 py-24 sm:py-32 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center lg:gap-16`}>
        <Revelar>
          <h2 className={H2}>Métricas que dizem o que funciona para você.</h2>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-tinta-2">
            Cada aprovação, cada ideia pulada e o resultado de cada post publicado viram números. A próxima sugestão já leva tudo isso em conta.
          </p>
        </Revelar>
        <Revelar atraso={120}>
          <div className={`${CARTAO} p-7 sm:p-9`}>
            <div className="flex items-baseline justify-between">
              <p className="font-semibold">Seu mês</p>
              <p className="text-sm text-tinta-3">Dados de exemplo</p>
            </div>
            <dl className="mt-6 grid grid-cols-3 gap-4 border-y border-tinta/10 py-5">
              <div>
                <dt className="text-sm text-tinta-3">Ideias vistas</dt>
                <dd className="mt-1 font-display text-3xl font-semibold tabular-nums">14</dd>
              </div>
              <div>
                <dt className="text-sm text-tinta-3">Publicadas</dt>
                <dd className="mt-1 font-display text-3xl font-semibold tabular-nums">8</dd>
              </div>
              <div>
                <dt className="text-sm text-tinta-3">Engajamento</dt>
                <dd className="mt-1 font-display text-3xl font-semibold tabular-nums">6,8%</dd>
              </div>
            </dl>
            <div className="mt-8">
              <BarrasAprovacao titulo="Aprovação por formato" linhas={linhas} />
            </div>
          </div>
        </Revelar>
      </div>
    </section>
  );
}

export function Exemplos({ demos }: { demos: Analise[] }) {
  return (
    <section aria-labelledby="exemplos" className="bg-white">
      <div className={`${CONTEUDO} py-24 sm:py-32`}>
        <Revelar>
          <h2 id="exemplos" className={H2}>
            Na identidade de cada marca.
          </h2>
          <p className="mt-4 max-w-lg text-lg leading-relaxed text-tinta-2">Posts gerados só com o site público de cada empresa. Nenhuma delas tem relação com o social.Ai.</p>
        </Revelar>
        <div className="mt-10">
          <AbasHorizontais
            abas={demos.map((d) => ({
              titulo: d.brand.nome,
              painel: (
                <ul className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
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
    { nome: "Solo", preco: "49", itens: ["Uma ideia pronta por dia", "1 marca", "Métricas e radar do nicho"] },
    { nome: "Tração", preco: "129", itens: ["Três ideias por dia", "Até 3 marcas", "Legendas para LinkedIn, Instagram e X"] },
    { nome: "Time", preco: "290", itens: ["Ideias sem limite", "Até 10 marcas", "Aprovação em equipe"] },
  ];
  return (
    <section id="preco" className="scroll-mt-20">
      <div className={`${CONTEUDO} py-24 sm:py-32`}>
        <Revelar>
          <h2 className={H2}>Preço de ferramenta.</h2>
          <p className="mt-3 text-tinta-3">Preços em teste. Durante o teste, você não paga nada.</p>
        </Revelar>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {planos.map((p, i) => (
            <Revelar key={p.nome} atraso={i * 90} className="h-full">
              <div className="flex h-full flex-col rounded-3xl bg-white p-7">
                <h3 className="text-lg font-semibold">{p.nome}</h3>
                <p className="mt-4">
                  <span className="font-display text-5xl font-semibold tabular-nums tracking-[-0.03em]">R$ {p.preco}</span>
                  <span className="text-tinta-3"> por mês</span>
                </p>
                <ul className="mt-6 flex-1 space-y-2 text-tinta-2">
                  {p.itens.map((it) => (
                    <li key={it}>{it}</li>
                  ))}
                </ul>
                <BotaoComecar className={`${BOTAO_CLARO} mt-8 w-full`} />
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
    ["A IA inventa coisas sobre a minha empresa?", "Não. Ela usa só o que está no seu site, e você aprova cada post antes de publicar."],
    ["Preciso aparecer em vídeo?", "Não. O social.Ai faz carrossel, post estático e legenda para LinkedIn, Instagram e X."],
    ["De onde vêm os posts de referência?", "De uma base curada pelo time, com link para cada fonte e métrica só quando dá para conferir."],
  ];
  return (
    <section className="bg-white">
      <div className={`${CONTEUDO} grid gap-10 py-24 sm:py-32 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]`}>
        <h2 className={H2}>Perguntas</h2>
        <div className="divide-y divide-tinta/10 border-y border-tinta/10">
          {perguntas.map(([q, r]) => (
            <details key={q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-lg font-medium">
                {q}
                <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 transition-transform group-open:rotate-45" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </summary>
              <p className="mt-3 max-w-xl leading-relaxed text-tinta-2">{r}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Chamada() {
  return (
    <section className={`${CONTEUDO} py-24 sm:py-32`}>
      <Revelar>
        <div className="relative overflow-hidden rounded-[28px] bg-tinta px-7 py-14 text-papel sm:px-14 sm:py-20">
          <div
            aria-hidden
            className="absolute inset-0"
            style={{ background: "radial-gradient(55% 80% at 90% 0%, rgba(255,74,28,.5), transparent 70%), radial-gradient(40% 60% at 0% 100%, rgba(254,62,109,.28), transparent 70%)" }}
          />
          <div className="relative flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="max-w-xl font-display text-[2rem] font-semibold leading-[1.08] tracking-[-0.03em] sm:text-5xl">O post de amanhã já pode estar pronto.</h2>
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
