import type { Analise } from "@/lib/types";
import cora from "../../../data/demo/cora.json";
import pipefy from "../../../data/demo/pipefy.json";
import sallve from "../../../data/demo/sallve.json";

// Análises pré-processadas: o palco funciona sem internet, sem chave e sem crédito.
export const DEMOS: Analise[] = [cora, pipefy, sallve] as unknown as Analise[];

export function demoPorDominio(dominio: string): Analise | null {
  const d = dominio.replace(/^www\./, "").toLowerCase();
  return DEMOS.find((a) => a.brand.dominio === d) ?? null;
}

export function demoPorId(id: string): Analise | null {
  const slug = id.replace(/^demo-/, "");
  return DEMOS.find((a) => a.id === slug) ?? null;
}
