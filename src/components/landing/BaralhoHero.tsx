"use client";

import { Baralho, type Carta } from "@/components/baralho/Baralho";

export function BaralhoHero({ cartas }: { cartas: Carta[] }) {
  return <Baralho cartas={cartas} repetir />;
}
