import type { Metadata } from "next";
import { FormularioEspera } from "@/components/landing/FormularioEspera";
import { ComoFuncionaEspera } from "@/components/landing/ComoFuncionaEspera";
import { VideoDemo } from "@/components/landing/VideoDemo";
import { VideoFalaAoPost } from "@/components/landing/VideoFalaAoPost";

export const metadata: Metadata = {
  title: "social.Ai | Lista de espera",
  description: "Seu negócio está na sua cabeça. Seu marketing não deveria estar. Entre na lista de espera do social.Ai e seja um dos primeiros a testar.",
};
const container = "mx-auto w-full max-w-6xl px-5 sm:px-8";
const heading = "font-display text-[2.2rem] font-semibold leading-[1.08] tracking-[-0.035em] sm:text-5xl";
const perguntas = [
  ["É para a minha empresa?", "Estamos começando por founders de startups que ainda cuidam do conteúdo entre uma reunião de vendas e outra. Se essa rotina parece com a sua, queremos ouvir você."],
  ["Já posso usar?", "Ainda não. Estamos desenvolvendo o produto. Entre na lista e avisaremos por e-mail quando o acesso abrir. Ainda não há uma data confirmada."],
  ["Preciso pagar para entrar?", "Não. A lista é gratuita, sem cartão e sem compromisso de contratação."],
  ["Por que não usar só o ChatGPT?", "Porque ele não conhece a sua empresa. Você teria que explicar tudo de novo a cada post. O social.Ai parte do seu site e do que você conta, e entrega o post pronto na sua marca."],
  ["Vai publicar por mim?", "Não. Você aprova cada post e decide o que vai para as redes."],
];

export default function ListaDeEspera() {
  return <div className="waitlist-page">
    <a href="#conteudo" className="sr-only focus:not-sr-only focus:p-4">Pular para o conteúdo</a>
    <header className="sticky top-0 z-40 border-b border-tinta/[0.06] bg-papel/95 backdrop-blur-md">
      <div className={`${container} flex h-16 items-center justify-between gap-4 sm:h-18`}>
        <a href="#topo" aria-label="social.Ai início" className="inline-flex min-h-11 items-center font-display text-xl font-semibold tracking-tight">social.Ai</a>
        <nav aria-label="Seções" className="hidden gap-7 text-sm text-tinta-2 md:flex">{[["#como-funciona", "Como funciona"], ["#exemplo", "Exemplo"], ["#perguntas", "Perguntas"]].map(([href, texto]) => <a key={href} href={href} className="inline-flex min-h-11 items-center transition-colors hover:text-tinta">{texto}</a>)}</nav>
        <a href="#inscricao" className="inline-flex min-h-11 items-center rounded-full bg-tinta px-4 text-sm font-medium text-papel transition-colors hover:bg-tinta-2 sm:px-5">Quero testar primeiro</a>
      </div>
    </header>
    <main id="conteudo">
      <section id="topo" className={`${container} pb-12 pt-6 sm:pb-20 sm:pt-16 sm:text-center lg:pt-20`}>
        <p className="mb-3 flex items-center gap-2 text-sm text-tinta-2 sm:mb-5 sm:justify-center"><span aria-hidden className="h-2 w-2 rounded-full bg-salvia" />Vem aí. Entre na lista de espera.</p>
        <h1 className="mx-auto max-w-4xl font-display text-[2.25rem] font-semibold leading-[1.04] tracking-[-0.045em] sm:text-[3.6rem] lg:text-[4.25rem]">Seu negócio está na sua cabeça.<em className="mt-1 block font-serif text-[1.1em] font-normal tracking-[-0.025em] text-pauta sm:mt-2">Seu marketing não deveria estar.</em></h1>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-tinta-2 sm:mt-6 sm:text-balance sm:text-lg">Transforme o que você sabe sobre o seu mercado, produto e cliente em <span className="sublinhado-pauta">marketing que gera resultado.</span> Sem passar horas pesquisando, criando, revisando ou ensinando uma IA sobre a sua própria empresa.</p>
        <div className="mx-auto max-w-xl sm:text-left"><FormularioEspera /></div>
      </section>
      <section className={`${container} border-t border-tinta/10 py-14 sm:py-20`}>
        <div className="mb-9 grid gap-5 lg:grid-cols-2 lg:gap-16">
          <h2 className={heading}>Falta tempo.<br /><span className="font-serif font-normal italic text-pauta">Não falta assunto.</span></h2>
          <p className="max-w-lg text-lg leading-relaxed text-tinta-2">A pergunta que chegou no WhatsApp. A objeção na reunião de vendas. A história de um cliente. <strong className="font-semibold text-tinta">O próximo post pode estar numa conversa de hoje.</strong></p>
        </div>
        <figure><div className="overflow-hidden rounded-2xl border border-tinta/10 bg-white sm:rounded-[28px]"><VideoDemo /></div><figcaption className="mt-4 text-sm leading-relaxed text-tinta-3">Uma prévia do fluxo em 12 segundos. O produto ainda está em desenvolvimento.</figcaption></figure>
      </section>
      <section id="como-funciona" className="scroll-mt-20 bg-white">
        <div className={`${container} py-14 sm:py-20 lg:py-24`}>
          <ComoFuncionaEspera cabecalho={<>
            <p className="retranca mb-4 text-pauta-escura">Como funciona</p>
            <h2 className={`${heading} max-w-xl`}>Você conhece o seu negócio.<br /><span className="font-serif font-normal italic text-pauta">A gente transforma isso em conteúdo.</span></h2>
            <p className="mt-5 max-w-md text-base leading-relaxed text-tinta-2 sm:text-lg">Quatro etapas entre o que você sabe e o post pronto para aprovar.</p>
          </>} />
        </div>
      </section>
      <section id="exemplo" className={`${container} grid scroll-mt-20 items-center gap-8 py-14 sm:py-20 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-16`}>
        <div>
          <p className="retranca mb-4 text-pauta-escura">Um exemplo</p>
          <h2 className={`${heading} max-w-xl`}>Da sua fala<br /><span className="font-serif font-normal italic text-pauta">ao post pronto.</span></h2>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-tinta-2">Você conta a dúvida que mais ouve dos clientes. O social.Ai transforma em post, <strong className="font-semibold text-tinta">com a cara da sua marca.</strong></p>
        </div>
        <figure className="w-full">
          <VideoFalaAoPost />
          <figcaption className="mt-3 text-sm leading-relaxed text-tinta-3">Prévia ilustrativa. A Rota ERP é uma marca fictícia.</figcaption>
        </figure>
      </section>
      <section id="perguntas" className={`${container} grid scroll-mt-20 gap-6 border-t border-tinta/10 py-14 sm:py-20 lg:grid-cols-[0.8fr_1.2fr]`}>
        <h2 className={heading}>Ficou alguma dúvida?</h2>
        <div className="divide-y divide-tinta/15 border-y border-tinta/15 lg:border-t-0">{perguntas.map(([pergunta, resposta]) => <details key={pergunta} className="group"><summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 text-lg font-medium [&::-webkit-details-marker]:hidden">{pergunta}<span aria-hidden className="relative h-4 w-4 shrink-0 before:absolute before:left-0 before:top-1/2 before:h-0.5 before:w-4 before:-translate-y-1/2 before:bg-tinta after:absolute after:left-1/2 after:top-0 after:h-4 after:w-0.5 after:-translate-x-1/2 after:bg-tinta group-open:after:hidden" /></summary><p className="max-w-[65ch] pb-5 leading-relaxed text-tinta-2">{resposta}</p></details>)}</div>
      </section>
      <section className={`${container} pb-14 sm:pb-20`}><div className="rounded-[28px] bg-papel-2 p-5 sm:p-12"><h2 className={`${heading} max-w-2xl`}>Seu próximo post já está na sua cabeça.</h2><p className="mt-4 max-w-xl text-base leading-relaxed text-tinta-2 sm:text-lg">A gente ajuda a tirar do papel. Entre na lista e esteja entre os primeiros a testar o social.Ai.</p><a href="#inscricao" className="mt-6 inline-flex min-h-13 w-full items-center justify-center text-balance rounded-full bg-pauta px-5 py-2 text-center text-base font-bold leading-tight text-white transition-colors hover:bg-pauta-escura min-[380px]:text-[1.0625rem] sm:mt-7 sm:w-auto sm:px-7 sm:text-[1.1875rem]">Quero ser um dos primeiros a testar</a></div></section>
    </main>
    <footer className={`${container} flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border-t border-tinta/10 py-5 text-sm text-tinta-3 sm:py-7`}><span className="font-display font-semibold text-tinta">social.Ai</span><span>Feito para quem está construindo um negócio.</span><a href="#topo" className="inline-flex min-h-11 items-center underline-offset-4 hover:text-tinta hover:underline">Voltar ao topo</a></footer>
  </div>;
}
