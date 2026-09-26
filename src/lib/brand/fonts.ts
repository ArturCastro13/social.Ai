import { hexToRgb, rgbToHsl } from "@/lib/color";

// Pares do Google Fonts que funcionam bem em post estático (títulos pesados, corpo legível).
export const PARES_FONTES = [
  { titulo: "Space Grotesk", corpo: "Inter", estilo: "tech" },
  { titulo: "Sora", corpo: "Inter", estilo: "moderno" },
  { titulo: "Plus Jakarta Sans", corpo: "Plus Jakarta Sans", estilo: "amigavel" },
  { titulo: "DM Serif Display", corpo: "DM Sans", estilo: "editorial" },
  { titulo: "Archivo Black", corpo: "Archivo", estilo: "impacto" },
  { titulo: "Fraunces", corpo: "Manrope", estilo: "acolhedor" },
] as const;

/** Fontes que o renderizador sabe baixar do Google Fonts (nome exato da família). */
export const FONTES_SUPORTADAS = new Set([
  "Inter", "Space Grotesk", "Sora", "Plus Jakarta Sans", "DM Serif Display", "DM Sans",
  "Archivo", "Archivo Black", "Fraunces", "Manrope", "Poppins", "Montserrat", "Roboto",
  "Open Sans", "Lato", "Nunito", "Nunito Sans", "Raleway", "Work Sans", "Rubik", "Outfit",
  "Urbanist", "Figtree", "Lexend", "Epilogue", "Syne", "Bricolage Grotesque", "Playfair Display",
  "Merriweather", "Lora", "Source Sans 3", "IBM Plex Sans", "Barlow", "Kanit", "Oswald",
  "Mulish", "Quicksand", "Red Hat Display", "Instrument Sans", "Instrument Serif", "Onest",
  "Geist", "Josefin Sans", "Karla", "Libre Franklin", "Heebo", "Hanken Grotesk", "Unbounded",
]);

/**
 * Sugere um par quando o site não declara fontes úteis. A escolha usa a cor principal:
 * cores frias e saturadas pedem algo mais tech, quentes pedem algo mais acolhedor.
 */
export function sugerirPar(corPrimaria: string) {
  const rgb = hexToRgb(corPrimaria);
  if (!rgb) return PARES_FONTES[1];
  const { h, s, l } = rgbToHsl(rgb);
  if (s < 0.2) return PARES_FONTES[3];
  if (l < 0.3) return PARES_FONTES[4];
  if (h >= 180 && h < 280) return PARES_FONTES[0];
  if (h >= 280 || h < 20) return PARES_FONTES[2];
  if (h < 70) return PARES_FONTES[5];
  return PARES_FONTES[1];
}

/** Casa um nome de fonte achado no site com uma família conhecida (ignora pesos e sufixos). */
export function normalizarFonte(nome: string): string | null {
  const limpo = nome
    .replace(/['"]/g, "")
    .replace(/\b(variable|var|vf|regular|bold|medium|semibold|light|black|web|pro|display)\b/gi, (m) =>
      /display/i.test(m) ? m : "",
    )
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  for (const f of FONTES_SUPORTADAS) {
    if (f.toLowerCase() === limpo.toLowerCase()) return f;
  }
  for (const f of FONTES_SUPORTADAS) {
    if (limpo.toLowerCase().startsWith(f.toLowerCase())) return f;
  }
  return null;
}
