/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { Analise, PadraoViral, ViralItem } from "@/lib/types";
import { NICHOS } from "@/lib/types";
import { BotaoPlano, ListaEspera } from "./ListaEspera";

export function Topo() {
  return (
    <header className="sticky top-0 z-40 border-b border-tinta/10 bg-papel/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="font-serif text-[1.7rem] italic leading-none tracking-tight">
          social<span className="text-pauta">.</span>Ai
        </Link>
        <nav className="flex items-center gap-5 text-sm">
          <a href="#como-funciona" className="hidden text-tinta-2 hover:text-tinta sm:inline">Como funciona</a>
          <a href="#metodo" className="hidden text-tinta-2 hover:text-tinta md:inline">O método</a>
          <a href="#planos" className="hidden text-tinta-2 hover:text-tinta sm:inline">Planos</a>
          <a href="#planos" className="border border-tinta px-3 py-1.5 font-semibold transition hover:bg-tinta hover:text-papel">
            Lista de espera
          </a>
        </nav>
      </div>
    </header>
  );
}

export function Cabecalho() {
  return (
    <div className="animate-subir">
      <p className="retranca flex items-center gap-2 text-tinta-2">
        <span className="inline-block h-2 w-2 bg-pauta" /> Para o founder que cuida de tudo sozinho
      </p>
      <h1 className="mt-4 font-serif text-[2.7rem] leading-[0.98] tracking-tight sm:text-6xl lg:text-[4.1rem] xl:text-[4.5rem]">
        Você fundou uma startup, não uma <em className="text-pauta">agência de marketing.</em>
      </h1>
      <p className="mt-5 max-w-xl text-[1.05rem] leading-relaxed text-tinta-2 sm:text-lg">
        Cole o site da sua empresa. Em um minuto o social.Ai lê sua marca, compara com o que viraliza no seu nicho e te entrega o
        que um CMO entregaria: diagnóstico, estratégia e posts prontos, na sua identidade visual.
      </p>
    </div>
  );
}

/** Três "provas de impressão" com artes reais geradas pelo motor. */
export function Vitrine({ demos }: { demos: Analise[] }) {
  const escolhas: { a: Analise; post: string; rot: string; pos: string }[] = [];
  const cora = demos.find((d) => d.id === "cora");
  const sallve = demos.find((d) => d.id === "sallve");
  const pipefy = demos.find((d) => d.id === "pipefy");
  if (pipefy) escolhas.push({ a: pipefy, post: "pipefy-p1", rot: "-rotate-[5deg]", pos: "left-0 top-6 w-[58%]" });
  if (sallve) escolhas.push({ a: sallve, post: "sallve-p4", rot: "rotate-[4deg]", pos: "right-0 top-0 w-[54%]" });
  if (cora) escolhas.push({ a: cora, post: "cora-p1", rot: "-rotate-[1.5deg]", pos: "left-[20%] top-[34%] w-[60%]" });
  return (
    <div className="relative mx-auto aspect-[5/6] w-full max-w-[520px] lg:mt-6">
      {escolhas.map((e, i) => (
        <figure
          key={e.post}
          className={`prova absolute ${e.pos} ${e.rot} bg-white p-2 shadow-[0_20px_50px_-20px_rgba(22,19,15,.45)] transition duration-500 hover:z-30 hover:rotate-0 hover:scale-[1.03]`}
          style={{ animation: `subir .9s ${0.25 + i * 0.18}s both` }}
        >
          <img src={`/api/render/${e.post}?tamanho=feed`} alt={`Post gerado para ${e.a.brand.nome}`} width={1080} height={1350} className="block h-auto w-full" />
          <figcaption className="retranca mt-2 flex justify-between px-0.5 text-[0.6rem] text-tinta-3">
            <span>de {e.a.brand.dominio}</span>
            <span>{e.a.posts.find((p) => p.id === e.post)?.rede_principal}</span>
          </figcaption>
        </figure>
      ))}
      <div className="absolute -bottom-2 right-2 z-40 max-w-[12rem] rotate-[-3deg] bg-limao px-3 py-2 font-serif text-lg italic leading-tight shadow-md sm:-right-4">
        Feito pelo motor a partir do site público. Sem designer.
      </div>
    </div>
  );
}

export function Ticker({ total, verificados, padroes }: { total: number; verificados: number; padroes: number }) {
  const itens = [
    "lendo o site",
    "achando a paleta",
    `${total} posts de referência na base`,
    `${verificados} com fonte verificada`,
    `${padroes} padrões de gancho e formato`,
    "5 nichos de startup",
    "legenda para Instagram, LinkedIn, X e Facebook",
    "calendário pronto",
  ];
  const linha = [...itens, ...itens];
  return (
    <div className="overflow-hidden border-y-2 border-tinta bg-pauta py-3 text-white" aria-hidden>
      <div className="flex w-max animate-ticker gap-10 whitespace-nowrap font-mono text-sm uppercase tracking-[0.15em]">
        {linha.map((t, i) => (
          <span key={i} className="flex items-center gap-10">
            {t} <span className="text-tinta">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function ComoFunciona() {
  const passos = [
    {
      n: "01",
      t: "Cola o site",
      d: "Sem cadastro, sem briefing de 40 perguntas. O social.Ai lê o seu site como um estrategista leria: o que você vende, para quem, com que cara e com que voz.",
    },
    {
      n: "02",
      t: "A gente cruza com o que viraliza",
      d: "Seu nicho é comparado com uma base curada de posts de founders e startups que performaram, com gancho, formato e estrutura de cada um.",
    },
    {
      n: "03",
      t: "Você recebe a pauta pronta",
      d: "Diagnóstico honesto, estratégia por rede, calendário e os posts com arte e legenda. Troca a cor, troca o modelo, baixa e posta.",
    },
  ];
  return (
    <section id="como-funciona" className="scroll-mt-16 border-b border-tinta/15">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:py-28">
        <p className="retranca text-pauta">Como funciona</p>
        <h2 className="mt-3 max-w-3xl font-serif text-4xl leading-[1.05] sm:text-6xl">
          Um CMO que trabalha em um minuto e não pede reunião de alinhamento.
        </h2>
        <div className="mt-14 grid gap-10 md:grid-cols-3 md:gap-0 md:divide-x md:divide-tinta/15">
          {passos.map((p) => (
            <div key={p.n} className="md:px-8 md:first:pl-0 md:last:pr-0">
              <p className="font-serif text-7xl italic leading-none text-pauta">{p.n}</p>
              <h3 className="mt-5 text-2xl font-semibold tracking-tight">{p.t}</h3>
              <p className="mt-3 leading-relaxed text-tinta-2">{p.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Metodo({
  catalogo,
  porNicho,
  exemplos,
}: {
  catalogo: PadraoViral[];
  porNicho: { id: string; nome: string; total: number; verificados: number }[];
  exemplos: ViralItem[];
}) {
  const max = Math.max(...catalogo.map((p) => p.frequencia));
  return (
    <section id="metodo" className="scroll-mt-16 border-b border-tinta/15 bg-tinta text-papel">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:py-28">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <p className="retranca text-limao">O método</p>
            <h2 className="mt-3 font-serif text-4xl leading-[1.05] sm:text-6xl">
              Nada de post genérico. <em className="text-limao">Padrão que já funcionou</em> no seu nicho.
            </h2>
            <p className="mt-6 max-w-lg leading-relaxed text-papel/75">
              O time mantém uma base de posts de alto desempenho de founders e startups. Cada item tem gancho, estrutura slide a slide,
              padrão visual e o link da fonte. Métrica só entra quando dá para conferir no post. O motor agrupa tudo em padrões e usa
              os do seu nicho como referência para escrever os seus.
            </p>
            <div className="mt-10 space-y-3">
              {porNicho.map((n) => (
                <div key={n.id} className="grid grid-cols-[8.5rem_1fr_auto] items-center gap-3 text-sm">
                  <span>{n.nome}</span>
                  <span className="flex h-2 overflow-hidden bg-papel/10">
                    <span className="bg-limao" style={{ width: `${(n.verificados / 15) * 100}%` }} />
                    <span className="bg-papel/35" style={{ width: `${((n.total - n.verificados) / 15) * 100}%` }} />
                  </span>
                  <span className="font-mono text-xs text-papel/60">
                    {n.verificados}/{n.total}
                  </span>
                </div>
              ))}
              <p className="retranca pt-2 text-[0.62rem] text-papel/50">
                <span className="mr-1 inline-block h-2 w-2 bg-limao" /> com fonte verificada ·{" "}
                <span className="mx-1 inline-block h-2 w-2 bg-papel/35" /> em verificação pelo time
              </p>
            </div>
          </div>
          <div>
            <p className="retranca text-papel/60">Padrões que mais se repetem na base</p>
            <ol className="mt-4 divide-y divide-papel/10 border-y border-papel/10">
              {catalogo.slice(0, 7).map((p) => (
                <li key={p.id} className="grid grid-cols-[1fr_auto] gap-4 py-3.5">
                  <div>
                    <p className="font-semibold">{p.nome}</p>
                    <p className="mt-0.5 font-serif text-lg italic text-papel/70">{p.modelo_gancho}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 bg-pauta" style={{ width: `${(p.frequencia / max) * 64}px` }} />
                    <span className="font-mono text-xs text-papel/60">{p.frequencia}×</span>
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {exemplos.slice(0, 2).map((e) => (
                <a
                  key={e.id}
                  href={e.link_fonte ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="group block border border-papel/20 p-4 transition hover:border-limao"
                >
                  <p className="retranca text-[0.6rem] text-papel/50">
                    {NICHOS.find((n) => n.id === e.nicho)?.nome} · {e.rede} · {e.autor_ou_marca}
                  </p>
                  <p className="mt-2 font-serif text-lg italic leading-snug">“{e.texto_gancho}”</p>
                  <p className="retranca mt-3 text-[0.6rem] text-limao group-hover:underline">ver fonte ↗</p>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function AntesDepois({ demos }: { demos: Analise[] }) {
  return (
    <section className="border-b border-tinta/15">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:py-28">
        <p className="retranca text-pauta">Antes e depois</p>
        <h2 className="mt-3 max-w-3xl font-serif text-4xl leading-[1.05] sm:text-6xl">Do site parado ao feed com cara de marca.</h2>
        <p className="mt-4 max-w-2xl text-tinta-2">
          Três exemplos que o próprio motor gerou lendo só o site público de cada empresa. Nenhuma delas tem relação com o social.Ai; estão
          aqui para mostrar o que sai do outro lado.
        </p>
        <div className="mt-14 space-y-14">
          {demos.map((d) => {
            const posts = d.posts.slice(0, 3);
            return (
              <div key={d.id} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,2fr)] lg:items-center">
                <div className="border-2 border-tinta bg-white p-5">
                  <p className="retranca text-tinta-3">O site hoje · {d.brand.dominio}</p>
                  <p className="mt-3 font-serif text-2xl leading-snug">“{d.brand.headings.h1[0]?.replace(/\s*—\s*/g, ", ")}”</p>
                  <div className="mt-4 flex items-center gap-3">
                    <div className="flex">
                      {[d.brand.paleta.primaria, d.brand.paleta.secundaria, d.brand.paleta.destaque].map((c) => (
                        <span key={c} className="-ml-1.5 h-7 w-7 rounded-full border-2 border-white first:ml-0" style={{ background: c }} />
                      ))}
                    </div>
                    <span className="text-sm text-tinta-2">{d.brand.fontes.titulo}</span>
                  </div>
                </div>
                <div className="hidden text-center font-serif text-5xl italic text-pauta lg:block">→</div>
                <div className="grid grid-cols-3 gap-3">
                  {posts.map((p) => (
                    <img
                      key={p.id}
                      src={`/api/render/${p.id}?tamanho=feed`}
                      alt={`Post para ${d.brand.nome}: ${p.gancho}`}
                      loading="lazy"
                      width={1080}
                      height={1350}
                      className="h-auto w-full border border-tinta/10 shadow-[0_14px_30px_-18px_rgba(22,19,15,.6)]"
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function Comparacao() {
  const linhas: [string, string, string, string][] = [
    ["Primeira entrega", "Em um minuto", "Depois do briefing e da contratação", "Depois do onboarding"],
    ["Estratégia de CMO", "Inclusa em toda análise", "Depende da experiência da pessoa", "Inclusa, com fee à parte"],
    ["Referência do que viraliza no nicho", "Base curada com fonte", "Repertório pessoal", "Repertório da equipe"],
    ["Identidade visual aplicada", "Automática, lida do seu site", "Manual", "Manual"],
    ["Forma de pagamento", "Assinatura de ferramenta", "Salário ou contrato mensal", "Fee mensal de serviço"],
  ];
  return (
    <section className="border-b border-tinta/15 bg-papel-2">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:py-28">
        <p className="retranca text-pauta">Comparação</p>
        <h2 className="mt-3 max-w-3xl font-serif text-4xl leading-[1.05] sm:text-6xl">Para quando contratar alguém ainda não cabe.</h2>
        <p className="mt-4 max-w-2xl text-tinta-2">
          Social media e agência fazem coisas que uma ferramenta não faz, como gravar, responder comunidade e fazer parceria. O social.Ai
          cobre o começo: saber o que postar e ter o post pronto.
        </p>
        <div className="mt-10 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b-2 border-tinta">
                <th className="py-3 pr-4 font-normal text-tinta-3" />
                <th className="bg-tinta px-4 py-3 font-serif text-xl font-normal italic text-papel">social.Ai</th>
                <th className="px-4 py-3 font-semibold">Social media</th>
                <th className="px-4 py-3 font-semibold">Agência</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map(([rotulo, nos, sm, ag]) => (
                <tr key={rotulo} className="border-b border-tinta/15">
                  <th scope="row" className="py-4 pr-4 font-medium text-tinta-2">{rotulo}</th>
                  <td className="bg-white px-4 py-4 font-semibold">{nos}</td>
                  <td className="px-4 py-4 text-tinta-2">{sm}</td>
                  <td className="px-4 py-4 text-tinta-2">{ag}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export function Planos() {
  const planos = [
    { nome: "Solo", preco: "49", desc: "Para o founder que quer parar de postar no improviso.", itens: ["12 posts por mês", "1 marca", "Estratégia e calendário mensais"], destaque: false },
    { nome: "Tração", preco: "129", desc: "Para quem já tem cliente e quer presença toda semana.", itens: ["40 posts por mês", "Até 3 marcas", "Nova análise de nicho todo mês"], destaque: true },
    { nome: "Time", preco: "290", desc: "Para o time pequeno que divide o marketing.", itens: ["Posts ilimitados", "Até 10 marcas", "Aprovação em equipe"], destaque: false },
  ];
  return (
    <section id="planos" className="scroll-mt-16 border-b border-tinta/15">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:py-28">
        <p className="retranca text-pauta">Planos</p>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="mt-3 max-w-2xl font-serif text-4xl leading-[1.05] sm:text-6xl">Preço de ferramenta, não de serviço.</h2>
          <p className="retranca max-w-xs text-tinta-3">Valores de lançamento em teste. Ainda não cobramos ninguém.</p>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {planos.map((p) => (
            <div
              key={p.nome}
              className={`flex flex-col border-2 border-tinta p-6 ${p.destaque ? "bg-tinta text-papel shadow-[8px_8px_0_var(--color-pauta)]" : "bg-white"}`}
            >
              <div className="flex items-center justify-between">
                <p className="font-serif text-3xl italic">{p.nome}</p>
                {p.destaque && <span className="retranca bg-pauta px-2 py-1 text-white">recomendado</span>}
              </div>
              <p className={`mt-2 text-sm ${p.destaque ? "text-papel/70" : "text-tinta-2"}`}>{p.desc}</p>
              <p className="mt-6 flex items-baseline gap-1">
                <span className="text-lg">R$</span>
                <span className="font-serif text-6xl leading-none">{p.preco}</span>
                <span className={`text-sm ${p.destaque ? "text-papel/60" : "text-tinta-3"}`}>/mês</span>
              </p>
              <ul className={`mt-6 flex-1 space-y-2 text-sm ${p.destaque ? "text-papel/85" : "text-tinta-2"}`}>
                {p.itens.map((i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-pauta">✦</span> {i}
                  </li>
                ))}
              </ul>
              <BotaoPlano
                plano={p.nome}
                className={`mt-8 block py-3 text-center font-bold transition ${p.destaque ? "bg-pauta text-white hover:bg-pauta-escura" : "border-2 border-tinta hover:bg-tinta hover:text-papel"}`}
              >
                Entrar na lista de espera
              </BotaoPlano>
            </div>
          ))}
        </div>
        <div id="lista-espera" className="mt-12 scroll-mt-24">
          <ListaEspera planos={planos.map((p) => p.nome)} />
        </div>
      </div>
    </section>
  );
}

export function Faq() {
  const perguntas = [
    [
      "Preciso gravar vídeo ou aparecer?",
      "Não. O social.Ai faz post estático: carrossel, citação, lista, dado, antes e depois. Vídeo com avatar é outro produto, e não é o nosso começo.",
    ],
    [
      "A IA vai inventar coisas sobre a minha empresa?",
      "Ela é instruída a usar só o que está no seu site. Número, cliente ou prêmio que não aparece lá não entra no post. Mesmo assim, leia antes de postar, como leria o texto de qualquer pessoa do time.",
    ],
    [
      "De onde vêm os posts virais que vocês usam como referência?",
      "De uma base curada pelo time, com link para cada fonte. Quando um item ainda não foi conferido, ele aparece como em verificação. Métrica de engajamento só entra quando dá para ver no post original.",
    ],
    [
      "E se meu site for todo em JavaScript ou bloquear robôs?",
      "O leitor usa o que conseguir e avisa o que faltou. Você pode ajustar a cor principal e o modelo de cada post no painel, e subir um print do seu Instagram para puxar as cores de lá.",
    ],
    [
      "Posso usar os posts comercialmente?",
      "Sim, o conteúdo é seu. As artes usam fontes livres do Google Fonts e as cores e o logo que já são da sua marca.",
    ],
    [
      "Quanto custa?",
      "Durante o teste, nada. Os planos acima são a nossa hipótese de preço e você pode entrar na lista de espera para ser avisado quando abrir.",
    ],
  ];
  return (
    <section className="border-b border-tinta/15">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:py-28 lg:grid-cols-[1fr_1.6fr]">
        <div>
          <p className="retranca text-pauta">Perguntas</p>
          <h2 className="mt-3 font-serif text-4xl leading-[1.05] sm:text-6xl">O que os founders perguntam.</h2>
        </div>
        <div className="divide-y divide-tinta/15 border-y border-tinta/15">
          {perguntas.map(([q, r]) => (
            <details key={q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-6 text-lg font-semibold">
                {q}
                <span className="mt-1 font-mono text-pauta transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 max-w-2xl leading-relaxed text-tinta-2">{r}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Rodape() {
  return (
    <footer className="bg-tinta text-papel">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-14 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-serif text-5xl italic leading-none">
            social<span className="text-pauta">.</span>Ai
          </p>
          <p className="mt-3 max-w-sm text-sm text-papel/60">O CMO de IA do founder que faz tudo sozinho. Feito no Hackathon Adapta.</p>
        </div>
        <p className="retranca text-papel/40">Exemplos gerados a partir de sites públicos, sem vínculo com as marcas.</p>
      </div>
    </footer>
  );
}
