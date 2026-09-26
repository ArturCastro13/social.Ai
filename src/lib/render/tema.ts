import { bestTextOn, contrastRatio, ensureContrast, luminance, mix, parseColor } from "@/lib/color";
import type { BrandProfile, Rede } from "@/lib/types";

export const TAMANHOS = {
  feed: { w: 1080, h: 1350, nome: "Instagram e Facebook (1080x1350)" },
  quadrado: { w: 1080, h: 1080, nome: "Quadrado (1080x1080)" },
  linkedin: { w: 1200, h: 627, nome: "LinkedIn (1200x627)" },
  x: { w: 1600, h: 900, nome: "X (1600x900)" },
} as const;

export type Tamanho = keyof typeof TAMANHOS;

export function tamanhoPadrao(rede: Rede, carrossel: boolean): Tamanho {
  if (carrossel) return "feed"; // carrossel de LinkedIn também é vertical (documento)
  if (rede === "linkedin") return "linkedin";
  if (rede === "x") return "x";
  return "feed";
}

export interface Tema {
  primaria: string;
  naPrimaria: string; // texto sobre a primária
  destaqueNaPrimaria: string;
  claro: string; // fundo claro levemente tingido
  tintaNoClaro: string; // texto principal no fundo claro
  mutedNoClaro: string;
  primariaNoClaro: string; // primária legível sobre o claro
  escuro: string;
  naEscuro: string;
  destaqueNoEscuro: string;
  secundaria: string;
  naSecundaria: string;
}

/** Deriva um tema legível da paleta da marca. Todo par texto/fundo passa por checagem de contraste. */
export function temaDaMarca(brand: BrandProfile, corOverride?: string | null): Tema {
  const pal = brand.paleta;
  const primaria = (corOverride && parseColor(corOverride)) || pal.primaria;
  const secundaria = pal.secundaria;
  const destaque = pal.destaque;
  const tinta = luminance(pal.texto) < 0.08 ? pal.texto : "#121212";

  const claroBase = luminance(pal.fundo) > 0.85 ? pal.fundo : "#ffffff";
  const claro = mix(claroBase, primaria, 0.05);
  const escuro = luminance(tinta) < 0.03 ? mix(tinta, primaria, 0.12) : "#111014";

  const naPrimaria = bestTextOn(primaria, ["#ffffff", tinta]);
  const destaqueNaPrimaria = [secundaria, destaque].find((c) => contrastRatio(c, primaria) >= 3) ?? naPrimaria;

  return {
    primaria,
    naPrimaria,
    destaqueNaPrimaria,
    claro,
    tintaNoClaro: ensureContrast(tinta, claro, 7),
    mutedNoClaro: ensureContrast(mix(tinta, claro, 0.35), claro, 4.5),
    primariaNoClaro: ensureContrast(primaria, claro, 3),
    escuro,
    naEscuro: "#ffffff",
    destaqueNoEscuro: [primaria, destaque, secundaria].find((c) => contrastRatio(c, escuro) >= 3.2) ?? ensureContrast(primaria, escuro, 3.2),
    secundaria,
    naSecundaria: bestTextOn(secundaria, ["#ffffff", tinta]),
  };
}
