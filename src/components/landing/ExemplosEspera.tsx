"use client";
import Image from "next/image";
import { useState } from "react";

const marcas = [
  { nome: "Cora", id: "cora", cor: "#f7b7cb", titulo: "Seu negócio cresce. O caixa precisa acompanhar.", texto: "Uma pauta sobre o dia a dia de quem empreende. Sem economês.", alt: "Mãos organizando recibos em um balcão de padaria, ao lado de um cafezinho" },
  { nome: "Pipefy", id: "pipefy", cor: "#b9d6ff", titulo: "Menos tarefa repetida. Mais trabalho que importa.", texto: "Automação explicada com uma situação que todo time conhece.", alt: "Canais de papel azul organizados com uma esfera laranja" },
  { nome: "Sallve", id: "sallve", cor: "#e2ee92", titulo: "Sua pele não precisa de uma rotina complicada.", texto: "Uma conversa sobre cuidado, com leveza e sem receita milagrosa.", alt: "Composição de skincare verde com gotas de água e textura de creme" },
];
export function ExemplosEspera() {
  const [ativa, setAtiva] = useState(0);
  const marca = marcas[ativa];
  return <div>
    <div role="group" aria-label="Escolha uma marca de exemplo" className="mb-5 flex flex-wrap gap-2">{marcas.map((m, i) => <button type="button" key={m.id} aria-pressed={ativa === i} onClick={() => setAtiva(i)} className={`min-h-11 rounded-full px-5 text-sm font-semibold transition-colors ${ativa === i ? "bg-tinta text-white" : "bg-white text-tinta ring-1 ring-tinta/15"}`}>{m.nome}</button>)}</div>
    <div className="grid items-center gap-8 md:grid-cols-2 md:gap-16">
      <article key={marca.id} className="overflow-hidden rounded-[26px] shadow-xl motion-safe:animate-[aparecer_.4s_ease-out]" style={{ background: marca.cor }}>
        <div className="px-7 pb-6 pt-7"><p className="text-sm font-semibold">{marca.nome} / estudo visual</p><h3 className="mt-5 max-w-sm font-display text-[2rem] font-semibold leading-[1.05] tracking-tight sm:text-[2.5rem]">{marca.titulo}</h3></div>
        <div className="relative aspect-[5/3]"><Image src={`/waitlist/${marca.id}.webp`} alt={marca.alt} fill sizes="(max-width: 768px) 90vw, 500px" className="object-cover" /></div>
      </article>
      <div><p className="font-serif text-[2rem] italic leading-tight sm:text-5xl">Cada marca tem seu jeito de falar.</p><p className="mt-5 max-w-md text-lg leading-relaxed text-tinta-2">{marca.texto}</p><p className="mt-5 max-w-md leading-relaxed text-tinta-2">A ideia é partir da sua marca e do que você sabe. Você revisa antes de publicar.</p><a href="#inscricao" className="mt-5 inline-flex min-h-11 items-center font-semibold underline decoration-pauta decoration-2 underline-offset-[6px] hover:text-pauta-escura">Quero experimentar com a minha empresa</a></div>
    </div>
    <p className="mt-4 max-w-xl text-[0.8125rem] leading-relaxed text-tinta-3">Conceitos ilustrativos criados com IA para esta página, não resultados do produto. As marcas citadas não têm vínculo com o social.Ai.</p>
  </div>;
}
