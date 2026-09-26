"use client";
import Image from "next/image";
import { useState } from "react";

// Artes reais que o motor gerou a partir do site público de cada marca (as mesmas da página inicial, em public/exemplos).
const marcas = [
  {
    nome: "Cora",
    id: "cora",
    texto: "Conta PJ: cobrança, taxas e o dia a dia de quem empreende, sem economês.",
    posts: [
      { id: "cora-p1", alt: "Carrossel da Cora: como cobrar cliente atrasado sem virar o chato" },
      { id: "cora-p2", alt: "Antes e depois da Cora: seu banco cobra para você usar o seu dinheiro" },
      { id: "cora-p5", alt: "Lista da Cora: 5 coisas que sua conta PJ deveria fazer sozinha" },
    ],
  },
  {
    nome: "Pipefy",
    id: "pipefy",
    texto: "Automação de processos explicada com situações que todo time conhece.",
    posts: [
      { id: "pipefy-p1", alt: "Carrossel da Pipefy: seu processo mais caro é o que ninguém desenhou" },
      { id: "pipefy-p6", alt: "Lista da Pipefy: 5 sinais de que seu processo pede automação" },
      { id: "pipefy-p3", alt: "Print de post da Pipefy: IA sem controle é só um estagiário muito rápido" },
    ],
  },
  {
    nome: "Sallve",
    id: "sallve",
    texto: "Cuidado com a pele numa conversa leve, sem promessa milagrosa.",
    posts: [
      { id: "sallve-p1", alt: "Carrossel da Sallve: sua pele não precisa de 10 passos" },
      { id: "sallve-p4", alt: "Lista da Sallve: o que a sua pele precisa hoje?" },
      { id: "sallve-p2", alt: "Citação de cliente da Sallve sobre o creme noturno" },
    ],
  },
];

export function ExemplosEspera() {
  const [ativa, setAtiva] = useState(0);
  const marca = marcas[ativa];
  return (
    <div>
      <div role="group" aria-label="Escolha uma marca de exemplo" className="mb-5 flex flex-wrap gap-2">
        {marcas.map((m, i) => (
          <button
            type="button"
            key={m.id}
            aria-pressed={ativa === i}
            onClick={() => setAtiva(i)}
            className={`min-h-11 rounded-full px-5 text-sm font-semibold transition-colors ${ativa === i ? "bg-tinta text-white" : "bg-white text-tinta ring-1 ring-tinta/15"}`}
          >
            {m.nome}
          </button>
        ))}
      </div>
      <p className="max-w-md text-lg leading-relaxed text-tinta-2">{marca.texto}</p>
      {/* Celular: arrasta para o lado, um post por vez com o próximo aparecendo. Desktop: os três lado a lado. */}
      <ul
        key={marca.id}
        aria-label={`Posts gerados para ${marca.nome}`}
        className="-mx-5 mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 [scrollbar-width:none] motion-safe:animate-[aparecer_.4s_ease-out] sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-6 sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden"
      >
        {marca.posts.map((p) => (
          <li key={p.id} className="relative aspect-[4/5] w-[78%] shrink-0 snap-center overflow-hidden rounded-2xl bg-papel-2 shadow-[0_24px_50px_-30px_rgba(22,19,15,.45)] sm:w-auto">
            <Image src={`/exemplos/${p.id}.png`} alt={p.alt} fill sizes="(max-width: 640px) 78vw, 360px" className="object-cover" />
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm text-tinta-3 sm:hidden" aria-hidden>
        Arraste para o lado
      </p>
      <p className="mt-6 max-w-md leading-relaxed text-tinta-2">A ideia é partir da sua marca e do que você sabe. Você revisa antes de publicar.</p>
      <a href="#inscricao" className="mt-4 inline-flex min-h-11 items-center font-semibold underline decoration-pauta decoration-2 underline-offset-[6px] hover:text-pauta-escura">
        Quero ver com a minha empresa
      </a>
      <p className="mt-4 max-w-xl text-[0.8125rem] leading-relaxed text-tinta-3">
        Posts gerados pelo social.Ai a partir do site público de cada empresa. As marcas não têm vínculo com o social.Ai.
      </p>
    </div>
  );
}
