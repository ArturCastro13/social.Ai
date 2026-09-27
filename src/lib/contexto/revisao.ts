import type { BrandProfile } from "@/lib/types";
import type { Preferencias } from "@/lib/motor/contrato";
import { validarOrcamento, type ContextoConfirmado } from "./contrato";

export function aplicarContextoMarca(brand: BrandProfile, contexto?: ContextoConfirmado): BrandProfile {
  if (!contexto) return brand;
  const c = validarOrcamento(contexto);
  if (c.empresa !== brand.dominio) throw new Error("O contexto pertence a outra empresa. Revise os dados.");
  return c.paleta ? { ...brand, paleta: { ...brand.paleta, ...c.paleta } } : brand;
}

/** Documentos e evidências só vivem durante o onboarding/chamada de geração. */
export function semContextoPrivado(p: Preferencias): Preferencias {
  const copy = { ...p };
  delete copy.contexto_empresa;
  return copy;
}
