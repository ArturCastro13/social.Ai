import { promises as fs } from "node:fs";
import path from "node:path";

export interface FonteCarregada {
  name: string;
  data: ArrayBuffer;
  weight: 400 | 500 | 600 | 700 | 800 | 900;
  style: "normal";
}

// Fontes embutidas no repositório: garantem arte bonita sem internet (modo demo).
export const FONTES_EMBUTIDAS: Record<string, Partial<Record<400 | 700 | 800, string>>> = {
  Inter: { 400: "Inter-400.ttf", 800: "Inter-800.ttf" },
  "Plus Jakarta Sans": { 400: "PlusJakartaSans-400.ttf", 800: "PlusJakartaSans-800.ttf" },
  "Space Grotesk": { 400: "SpaceGrotesk-400.ttf", 700: "SpaceGrotesk-700.ttf" },
  "DM Serif Display": { 400: "DMSerifDisplay-400.ttf" },
  "Bricolage Grotesque": { 800: "BricolageGrotesque-800.ttf" },
  Fraunces: { 800: "Fraunces-800.ttf" },
};

const DIR = path.join(process.cwd(), "assets", "fonts");
const cache = new Map<string, Promise<ArrayBuffer | null>>();

const toAB = (b: Buffer): ArrayBuffer => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;

async function daPasta(familia: string, peso: number): Promise<ArrayBuffer | null> {
  const arq = FONTES_EMBUTIDAS[familia]?.[peso as 400 | 700 | 800];
  if (!arq) return null;
  try {
    return toAB(await fs.readFile(path.join(DIR, arq)));
  } catch {
    return null;
  }
}

/** Baixa o TTF de uma família do Google Fonts. Sem user-agent moderno, o Google devolve truetype. */
export async function baixarGoogleFont(familia: string, peso: number): Promise<ArrayBuffer | null> {
  const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(familia).replace(/%20/g, "+")}:wght@${peso}`;
  try {
    const css = await (await fetch(url, { signal: AbortSignal.timeout(4000) })).text();
    const src = css.match(/src:\s*url\(([^)]+)\)\s*format\('(?:truetype|opentype)'\)/)?.[1];
    if (!src) return null;
    const res = await fetch(src, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}

function carregar(familia: string, peso: number): Promise<ArrayBuffer | null> {
  const k = `${familia}@${peso}`;
  if (!cache.has(k)) {
    cache.set(
      k,
      (async () => (await daPasta(familia, peso)) ?? (await baixarGoogleFont(familia, peso)))().then((r) => {
        if (!r) cache.delete(k); // tenta de novo na próxima arte
        return r;
      }),
    );
  }
  return cache.get(k)!;
}

async function primeiroQueCarrega(familia: string, pesos: number[]) {
  for (const p of pesos) {
    const data = await carregar(familia, p);
    if (data) return { data, peso: p };
  }
  return null;
}

// Fontes genéricas deixam o post com cara de template. No título, elas dão lugar a uma display com personalidade
// escolhida pelo tom de voz; o corpo continua na fonte da marca.
const GENERICAS = /^(inter|roboto|arial|helvetica( neue)?|system-ui|sans-serif|open sans|lato|montserrat|poppins|segoe ui|-apple-system|noto sans)$/i;
const TOM_EDITORIAL = /sofistic|elegan|premium|luxo|acolhed|cuidad|delicad|sens[ií]vel|institucional|s[ée]ri[oa]|editorial|cl[aá]ssic/i;

export function familiaDoTitulo(fonteDaMarca: string, tom = ""): string {
  if (!GENERICAS.test(fonteDaMarca.trim())) return fonteDaMarca;
  return TOM_EDITORIAL.test(tom) ? "Fraunces" : "Bricolage Grotesque";
}

/**
 * Monta a lista de fontes para o Satori com os nomes "Titulo" e "Corpo".
 * Se a fonte da marca não carregar, cai para Inter embutida.
 */
export async function fontesDaMarca(titulo: string, corpo: string, tom = ""): Promise<FonteCarregada[]> {
  const [t, c, fbTitulo, fbCorpo] = await Promise.all([
    primeiroQueCarrega(familiaDoTitulo(titulo, tom), [800, 700, 900, 600, 400]),
    primeiroQueCarrega(corpo, [400, 500]),
    carregar("Inter", 800),
    carregar("Inter", 400),
  ]);
  const out: FonteCarregada[] = [];
  const tituloData = t?.data ?? fbTitulo;
  const corpoData = c?.data ?? fbCorpo;
  if (tituloData) out.push({ name: "Titulo", data: tituloData, weight: 800, style: "normal" });
  if (corpoData) out.push({ name: "Corpo", data: corpoData, weight: 400, style: "normal" });
  // Corpo em negrito (nome, rótulos): usa o peso forte do título se não houver outro.
  if (tituloData) out.push({ name: "Corpo", data: tituloData, weight: 700, style: "normal" });
  return out;
}
