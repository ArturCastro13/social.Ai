import type { BrandProfile } from "@/lib/types";
import type { ConhecimentoFounder } from "@/lib/motor/contrato";
import { palpiteNicho } from "@/lib/engine/nicho";
import type { Entendimento, Material } from "./contrato";
export interface EntradaEntendimento { brand: BrandProfile; founder: ConhecimentoFounder; materiais: Material[]; descricaoManual?: string; publico?: string }

export function resumoManual(input: EntradaEntendimento): Entendimento {
  const { brand } = input;
  const palpite = palpiteNicho(brand);
  const negocio = input.descricaoManual?.trim() || brand.description?.trim() || input.founder.problema_cliente?.trim() || "";
  const nicho = brand.nicho_informado || (palpite.pontuacao[palpite.nicho] >= 2 ? palpite.nicho : "outro");
  return {
    negocio: negocio.slice(0, 1200), segmento: "", publico: input.publico ?? "", nicho,
    evidencias: [], duvidas: ["Ponto de partida sem análise por IA. Confirme o que a empresa faz e seu mercado."], fonte: "manual",
  };
}
