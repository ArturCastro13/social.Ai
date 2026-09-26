import type { Metadata } from "next";
import { FormularioEspera } from "@/components/landing/FormularioEspera";
import { ExemplosEspera } from "@/components/landing/ExemplosEspera";
import { PassosEspera } from "@/components/landing/PassosEspera";

export const metadata: Metadata = {
  title: "social.Ai | Lista de espera",
  description: "Você conhece seu cliente. A gente ajuda a tirar os posts do papel. Cadastre sua empresa na lista de espera do social.Ai.",
};
const container = "mx-auto w-full max-w-6xl px-5 sm:px-8";
const heading = "font-display text-[2.2rem] font-semibold leading-[1.08] tracking-[-0.035em] sm:text-5xl";
const perguntas = [
  ["É para a minha empresa?", "Estamos começando por founders de startups que ainda cuidam do conteúdo entre uma reunião de vendas e outra. Se essa rotina parece com a sua, queremos ouvir você."],
  ["Já posso usar?", "Ainda não. Estamos desenvolvendo o produto. Entre na lista e avisaremos por e-mail quando o acesso abrir. Ainda não há uma data confirmada."],
  ["Preciso pagar para entrar?", "Não. A lista é gratuita, sem cartão e sem compromisso de contratação."],
  ["Por que não usar só o ChatGPT?", "A proposta é juntar sua marca, o que você sabe sobre o cliente e as pautas em um só fluxo. Para você não precisar começar do zero a cada post."],
  ["Vai publicar por mim?", "A proposta é você revisar e aprovar o conteúdo. Você conhece seu negócio e continua decidindo o que vai para as redes."],
];

export default function ListaDeEspera() {
  return <div className="waitlist-page">
    <a href="#conteudo" className="sr-only focus:not-sr-only focus:p-4">Pular para o conteúdo</a>
    <header className="sticky top-0 z-40 border-b border-tinta/[0.06] bg-papel/95 backdrop-blur-md">
      <div className={`${container} flex h-18 items-center justify-between gap-4`}>
        <a href="#topo" aria-label="social.Ai início" className="font-display text-xl font-semibold tracking-tight">social.Ai</a>
        <nav aria-label="Seções" className="hidden gap-7 text-sm text-tinta-2 md:flex"><a href="#como-funciona">Como funciona</a><a href="#exemplos-espera">Exemplos</a><a href="#perguntas">Perguntas</a></nav>
        <a href="#inscricao" className="rounded-full bg-tinta px-4 py-3 text-sm font-medium text-papel">Entrar na lista</a>
      </div>
    </header>
    <main id="conteudo">
      <section id="topo" className={`${container} grid items-center gap-10 pb-14 pt-9 sm:py-16 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16`}>
        <div>
          <p className="mb-5 flex items-center gap-2 text-sm text-tinta-2"><span aria-hidden className="h-2 w-2 rounded-full bg-salvia" />Vem aí. Entre na lista de espera.</p>
          <h1 className="font-display text-[2.6rem] font-semibold leading-[1.03] tracking-[-0.045em] sm:text-[3.6rem]">Você sabe o que o seu cliente precisa ouvir.<em className="mt-2 block font-serif text-[1.13em] font-normal tracking-[-0.025em] text-pauta">Falta tempo para postar.</em></h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-tinta-2">As dúvidas dos clientes já rendem bons posts. Estamos criando o social.Ai para ajudar você a colocar essas ideias nas redes, <span className="sublinhado-pauta">com a cara da sua empresa.</span></p>
          <FormularioEspera />
        </div>
        <div className="min-w-0 lg:rotate-2"><ExemplosEspera compacto /></div>
      </section>
      <section className={`${container} border-t border-tinta/10 py-14 sm:py-20`}>
        <div className="mb-9 grid gap-5 lg:grid-cols-2 lg:gap-16">
          <h2 className={heading}>Falta tempo.<br /><span className="font-serif font-normal italic text-pauta">Não falta assunto.</span></h2>
          <p className="max-w-lg text-lg leading-relaxed text-tinta-2">A pergunta que chegou no WhatsApp. A objeção na reunião de vendas. A história de um cliente. <strong className="font-semibold text-tinta">O próximo post pode estar numa conversa de hoje.</strong></p>
        </div>
        <figure><video src="/video/demo.mp4" poster="/video/demo-poster.jpg" controls playsInline muted preload="none" width={1280} height={720} aria-label="Demonstração do fluxo: leitura da marca e aprovação de sugestões de posts" className="w-full rounded-2xl border border-tinta/10 bg-white sm:rounded-[28px]" /><figcaption className="mt-4 text-sm leading-relaxed text-tinta-3">Dê o play: uma prévia do fluxo em 12 segundos. O produto ainda está em desenvolvimento.</figcaption></figure>
      </section>
      <section id="como-funciona" className="scroll-mt-20 bg-white">
        <div className={`${container} py-14 sm:py-20`}>
          <h2 className={`${heading} max-w-2xl`}>Do que você sabe<br />à semana pronta.</h2>
          <p className="mb-9 mt-5 text-tinta-2">É assim que estamos desenhando a experiência. Toque nas etapas para explorar.</p>
          <PassosEspera abas={[
            { titulo: "Cole o site. Conte o que só você sabe.", texto: "O site apresenta sua marca. Você conta o que escuta dos clientes, sem preencher um briefing enorme.", painel: <div className="rounded-3xl bg-papel p-6 sm:p-9"><p className="text-sm text-tinta-3">Por exemplo, numa conversa rápida:</p><h3 className="mt-6 text-xl font-semibold">Qual dúvida seu cliente sempre traz?</h3><blockquote className="mt-5 rounded-2xl bg-papel-2 p-6 font-serif text-3xl italic">“Todo mundo acha que trocar de sistema vai parar a operação.”</blockquote><p className="mt-5 text-sm text-tinta-2">Pronto. Aqui já tem assunto para um post.</p></div> },
            { titulo: "Encontre uma boa pauta.", texto: "Seu conhecimento se junta a referências do seu nicho. O objetivo é encontrar assuntos que façam sentido para o seu cliente.", painel: <div className="rounded-3xl bg-[#eaf0fb] p-6 sm:p-9"><p className="text-sm text-tinta-3">Da dúvida para a pauta</p><h3 className="mt-7 font-display text-3xl font-semibold leading-tight">Como trocar de sistema sem parar o time?</h3><p className="mt-6 leading-relaxed">Conte como a migração acontece na prática. Mostre os cuidados, os passos e o que o cliente precisa preparar.</p><p className="mt-6 border-t border-tinta/15 pt-4 text-sm">Um exemplo de pauta, não uma promessa de resultado.</p></div> },
            { titulo: "Revise os posts. Siga com o seu dia.", texto: "A proposta é entregar sugestões de texto e imagem organizadas para a semana. Você ajusta, aprova e decide o que publicar.", painel: <div className="rounded-3xl bg-papel p-6 sm:p-9"><p className="text-sm text-tinta-3">Uma semana possível</p>{[["Segunda", "Responda uma dúvida recorrente"],["Quarta", "Mostre um bastidor do produto"],["Sexta", "Compartilhe um aprendizado"]].map(([dia, pauta]) => <div key={dia} className="border-b border-tinta/10 py-5"><p className="text-sm font-semibold text-pauta-escura">{dia}</p><p className="mt-1 text-lg">{pauta}</p></div>)}<p className="mt-5 text-sm">A palavra final continua sendo sua.</p></div> },
          ]} />
        </div>
      </section>
      <section id="exemplos-espera" className={`${container} scroll-mt-20 py-14 sm:py-20`}>
        <h2 className={`${heading} mb-8 max-w-2xl`}>Seu post não precisa<br />ter cara de qualquer marca.</h2>
        <ExemplosEspera />
      </section>
      <section id="perguntas" className={`${container} grid scroll-mt-20 gap-8 border-t border-tinta/10 py-14 sm:py-20 lg:grid-cols-[0.8fr_1.2fr]`}>
        <h2 className={heading}>Ficou alguma dúvida?</h2>
        <div className="divide-y divide-tinta/15">{perguntas.map(([pergunta, resposta]) => <details key={pergunta} className="py-5 first:pt-0"><summary className="cursor-pointer text-lg font-medium">{pergunta}</summary><p className="mt-3 leading-relaxed text-tinta-2">{resposta}</p></details>)}</div>
      </section>
      <section className={`${container} pb-14 sm:pb-20`}><div className="rounded-[28px] bg-[#ebe4d6] p-7 sm:p-12"><h2 className={`${heading} max-w-2xl`}>Seu próximo post já está na sua cabeça.</h2><p className="mt-4 text-lg text-tinta-2">Vamos ajudar a tirar do papel. Entre na lista para saber quando começar.</p><a href="#inscricao" className="mt-7 inline-flex min-h-13 items-center rounded-full bg-pauta px-7 font-semibold text-tinta hover:bg-pauta-escura hover:text-white">Quero entrar na lista</a></div></section>
    </main>
    <footer className={`${container} flex flex-wrap justify-between gap-3 border-t border-tinta/10 py-7 text-sm text-tinta-3`}><span className="font-display font-semibold text-tinta">social.Ai</span><span>Feito para quem está construindo um negócio.</span><a href="#topo">Voltar ao topo</a></footer>
  </div>;
}
