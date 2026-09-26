"use client";

import { Baralho, type Carta } from "@/components/baralho/Baralho";

export function BaralhoHero({ cartas }: { cartas: Carta[] }) {
  // No celular a carta fica um pouco menor para o baralho e os botões caberem juntos na tela.
  return (
    <div className="mx-auto w-full max-w-[280px] sm:max-w-[340px]">
      <Baralho cartas={cartas} repetir />
    </div>
  );
}
