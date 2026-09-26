import type { Metadata } from "next";
import { BaralhoHero } from "@/components/landing/BaralhoHero";
import { Exemplos, PainelHero, Rodape, arteEstatica } from "@/components/landing/Secoes";
import { FormularioEspera } from "@/components/landing/FormularioEspera";
import { DEMOS } from "@/lib/engine/demo";

export const metadata: Metadata = {
  title: "social.Ai | Entre na lista de espera",
  description: "Transforme o que você sabe sobre mercado, produto e cliente em conteúdo para sua startup. Entre na lista e receba novidades sobre o acesso.",
};

const container = "mx-auto w-full max-w-6xl px-5 sm:px-6";
const heading = "font-display text-3xl font-semibold leading-[1.1] tracking-[-0.03em] sm:text-5xl";
const perguntas = [
  ["Para quem é o social.Ai?", "Para founders de startups que participam da criação de conteúdo e precisam dividir esse trabalho com produto, vendas e operação."],
  ["O que acontece depois da inscrição?", "Seu e-mail entra na lista de interessados. Vamos avisar por e-mail sobre a abertura do acesso e os próximos passos. A inscrição não libera o produto imediatamente."],
  ["Preciso pagar para entrar na lista?", "Não. A inscrição é gratuita e não exige cartão nem compromisso de contratação."],
  ["Por que usar além do ChatGPT?", "Estamos desenvolvendo um fluxo que reúne o contexto da startup, referências do mercado e planejamento de conteúdo. A proposta é reduzir o trabalho de explicar sua marca de novo a cada conversa."],
  ["Quando o acesso será liberado?", "O produto está em desenvolvimento. Ainda não temos uma data de lançamento confirmada; as novidades serão enviadas à lista."],
];

export default function ListaDeEspera() {
  const cartas = ["cora-p1", "pipefy-p1", "sallve-p4", "cora-p5", "pipefy-p6"].flatMap((id) => {
    const demo = DEMOS.find((d) => d.posts.some((p) => p.id === id));
    const post = demo?.posts.find((p) => p.id === id);
    return demo && post ? [{ id, src: arteEstatica(id), alt: `Exemplo para ${demo.brand.nome}: ${post.gancho}`, estatica: true }] : [];
  });
  return (
    <>
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:p-4">Pular para o conteúdo</a>
      <header className="sticky top-0 z-40 border-b border-tinta/[0.06] bg-papel/95 backdrop-blur-md">
        <div className={`${container} flex h-18 items-center justify-between gap-4`}>
          <a href="#topo" aria-label="social.Ai início" className="font-display text-xl font-semibold tracking-tight">social.Ai</a>
          <nav aria-label="Seções" className="hidden gap-7 text-sm text-tinta-2 md:flex"><a href="#como-funciona">Como funciona</a><a href="#exemplos-espera">Exemplos</a><a href="#perguntas">Perguntas</a></nav>
          <a href="#inscricao" className="rounded-full bg-tinta px-4 py-3 text-sm font-medium text-papel">Entrar na lista</a>
        </div>
      </header>
      <main id="conteudo">
        <section id="topo" className={`${container} grid items-center gap-12 pb-16 pt-10 sm:py-12 lg:grid-cols-2 lg:gap-14`}>
          <div>
            <p className="mb-5 inline-flex items-center gap-2 text-sm text-tinta-2"><span aria-hidden className="h-2 w-2 rounded-full bg-pauta" />Em desenvolvimento · Lista de espera aberta</p>
            <h1 className="font-display text-[2.5rem] font-semibold leading-[1.04] tracking-[-0.04em] sm:text-[3.2rem]">Você sabe o que o seu cliente precisa ouvir. Falta tempo para postar.</h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-tinta-2">Estamos criando o social.Ai para transformar seu conhecimento em conteúdo com a identidade da sua startup.</p>
            <p className="mt-3 text-sm text-tinta-2">Entre na lista para saber quando você poderá experimentar.</p>
            <FormularioEspera />
          </div>
          <PainelHero><BaralhoHero cartas={cartas} /></PainelHero>
        </section>
        <section className={`${container} border-t border-tinta/10 py-16 sm:py-24`}>
          <div className="grid gap-6 lg:grid-cols-2 lg:gap-14">
            <h2 className={heading}>Seu conhecimento não precisa ficar só nas calls.</h2>
            <div className="space-y-4 text-lg leading-relaxed text-tinta-2"><p>As objeções que você responde, as histórias dos clientes e o que aprendeu construindo o produto já são matéria-prima para conteúdo.</p><p>A proposta é ajudar a transformar esse repertório em uma rotina de publicação, enquanto você cuida do negócio.</p></div>
          </div>
        </section>
        <section id="como-funciona" className="scroll-mt-20 bg-white">
          <div className={`${container} py-16 sm:py-24`}>
            <h2 className={`${heading} max-w-2xl`}>Do que você sabe ao que sua startup publica.</h2>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-tinta-2">Este é o fluxo que estamos construindo.</p>
            <ol className="mt-12 grid gap-10 md:grid-cols-3">
              {[
                ["Compartilhe seu contexto", "O site apresenta sua marca. Você acrescenta o que só quem está no negócio sabe sobre clientes, produto e mercado."],
                ["Encontre assuntos relevantes", "Esse contexto se junta a referências do seu nicho para orientar pautas e um planejamento de conteúdo."],
                ["Revise conteúdo com a sua cara", "Receba sugestões de posts e legendas alinhadas à marca. Você revisa e decide o que faz sentido publicar."],
              ].map(([titulo, texto], index) => <li key={titulo} className="border-t border-tinta/15 pt-5"><span className="text-sm text-tinta-3">Passo {index + 1}</span><h3 className="mt-4 font-display text-2xl font-semibold leading-tight">{titulo}</h3><p className="mt-3 leading-relaxed text-tinta-2">{texto}</p></li>)}
            </ol>
          </div>
        </section>
        <div id="exemplos-espera" className="scroll-mt-20"><Exemplos demos={DEMOS} /></div>
        <section id="perguntas" className={`${container} grid scroll-mt-20 gap-10 py-16 sm:py-24 lg:grid-cols-[0.8fr_1.2fr]`}>
          <h2 className={heading}>Antes de entrar na lista.</h2>
          <div className="divide-y divide-tinta/15 border-y border-tinta/15">{perguntas.map(([pergunta, resposta]) => <details key={pergunta} className="py-5"><summary className="cursor-pointer text-lg font-medium">{pergunta}</summary><p className="mt-3 leading-relaxed text-tinta-2">{resposta}</p></details>)}</div>
        </section>
        <section className={`${container} pb-16 sm:pb-24`}>
          <div className="flex flex-col items-start justify-between gap-8 rounded-[28px] bg-tinta p-8 text-papel sm:p-14 md:flex-row md:items-center">
            <div><h2 className={`${heading} max-w-xl`}>Leve sua experiência para além das conversas.</h2><p className="mt-4 max-w-lg text-papel/75">Receba novidades sobre o acesso ao social.Ai.</p></div>
            <a href="#inscricao" className="shrink-0 rounded-full bg-pauta px-6 py-4 font-semibold text-white hover:bg-pauta-escura">Entrar na lista de espera</a>
          </div>
        </section>
      </main>
      <Rodape />
    </>
  );
}
