// Utilitários de cor sem dependências: parse, conversões, neutros e contraste WCAG.

export type RGB = { r: number; g: number; b: number };

const clamp = (n: number, min = 0, max = 255) => Math.min(max, Math.max(min, n));

export function rgbToHex({ r, g, b }: RGB): string {
  return (
    "#" +
    [r, g, b]
      .map((v) => Math.round(clamp(v)).toString(16).padStart(2, "0"))
      .join("")
  );
}

export function hexToRgb(hex: string): RGB | null {
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3 || h.length === 4) h = h.slice(0, 3).split("").map((c) => c + c).join("");
  if (h.length === 8) h = h.slice(0, 6);
  if (!/^[0-9a-f]{6}$/i.test(h)) return null;
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function hslToRgb(h: number, s: number, l: number): RGB {
  h = ((h % 360) + 360) % 360;
  s = clamp(s, 0, 1);
  l = clamp(l, 0, 1);
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
}

export function rgbToHsl({ r, g, b }: RGB): { h: number; s: number; l: number } {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  return { h: h * 60, s, l };
}

function oklabToRgb(L: number, a: number, b: number): RGB {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
  const lin = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  const [r, g, bb] = lin.map((v) => {
    const c = v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(Math.max(v, 0), 1 / 2.4) - 0.055;
    return clamp(c * 255);
  });
  return { r, g, b: bb };
}

const num = (s: string, pctScale = 1) => {
  const t = s.trim();
  if (t.endsWith("%")) return (parseFloat(t) / 100) * pctScale;
  return parseFloat(t);
};

const NAMED: Record<string, string> = {
  black: "#000000", white: "#ffffff", red: "#ff0000", blue: "#0000ff", green: "#008000",
  navy: "#000080", orange: "#ffa500", purple: "#800080", teal: "#008080", gold: "#ffd700",
  crimson: "#dc143c", tomato: "#ff6347", coral: "#ff7f50", indigo: "#4b0082", royalblue: "#4169e1",
};

/** Converte qualquer cor CSS comum (hex, rgb, hsl, oklch, oklab, nomes básicos) para hex. */
export function parseColor(input: string): string | null {
  const s = input.trim().toLowerCase();
  if (s.startsWith("#")) {
    const rgb = hexToRgb(s);
    // Alfa muito baixo em #rrggbbaa: ignora
    if (rgb && s.length === 9 && parseInt(s.slice(7, 9), 16) < 80) return null;
    return rgb ? rgbToHex(rgb) : null;
  }
  const fn = s.match(/^(rgba?|hsla?|oklch|oklab)\(([^)]*)\)$/);
  if (fn) {
    const parts = fn[2].replace(/\//g, " / ").split(/[\s,]+/).filter(Boolean);
    const slash = parts.indexOf("/");
    const alphaStr = slash >= 0 ? parts[slash + 1] : parts.length === 4 ? parts[3] : undefined;
    const vals = slash >= 0 ? parts.slice(0, slash) : parts.slice(0, 3);
    if (vals.length < 3 || vals.some((v) => v.includes("var("))) return null;
    if (alphaStr !== undefined && num(alphaStr) < 0.35) return null;
    if (fn[1].startsWith("rgb")) {
      const [r, g, b] = vals.map((v) => num(v, 255));
      return [r, g, b].some(Number.isNaN) ? null : rgbToHex({ r, g, b });
    }
    if (fn[1].startsWith("hsl")) {
      const h = parseFloat(vals[0]);
      const sat = num(vals[1]) > 1 ? num(vals[1]) / 100 : num(vals[1]);
      const lig = num(vals[2]) > 1 ? num(vals[2]) / 100 : num(vals[2]);
      return [h, sat, lig].some(Number.isNaN) ? null : rgbToHex(hslToRgb(h, sat, lig));
    }
    if (fn[1] === "oklch") {
      const L = num(vals[0]) > 1 ? num(vals[0]) / 100 : num(vals[0]);
      const C = num(vals[1], 0.4);
      const H = (parseFloat(vals[2]) * Math.PI) / 180;
      if ([L, C, H].some(Number.isNaN)) return null;
      return rgbToHex(oklabToRgb(L, C * Math.cos(H), C * Math.sin(H)));
    }
    const L = num(vals[0]) > 1 ? num(vals[0]) / 100 : num(vals[0]);
    const a = num(vals[1], 0.4), b = num(vals[2], 0.4);
    return [L, a, b].some(Number.isNaN) ? null : rgbToHex(oklabToRgb(L, a, b));
  }
  // Canais HSL "soltos" usados por shadcn/ui: "222.2 47.4% 11.2%"
  const bare = s.match(/^(-?[\d.]+)(?:deg)?\s+([\d.]+)%\s+([\d.]+)%$/);
  if (bare) return rgbToHex(hslToRgb(+bare[1], +bare[2] / 100, +bare[3] / 100));
  if (NAMED[s]) return NAMED[s];
  return null;
}

/** Pretos, brancos e cinzas (saturação baixa ou luminosidade extrema). */
export function isNeutral(hex: string): boolean {
  const rgb = hexToRgb(hex);
  if (!rgb) return true;
  const { s, l } = rgbToHsl(rgb);
  return s < 0.14 || l < 0.08 || l > 0.95;
}

export function luminance(hex: string): number {
  const rgb = hexToRgb(hex) ?? { r: 0, g: 0, b: 0 };
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const la = luminance(a), lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Escolhe entre as candidatas a cor com melhor contraste sobre o fundo. */
export function bestTextOn(bg: string, candidates: string[] = ["#ffffff", "#0b0b0f"]): string {
  return candidates.reduce((best, c) => (contrastRatio(bg, c) > contrastRatio(bg, best) ? c : best));
}

/** Clareia (amount > 0) ou escurece (amount < 0) mantendo matiz. */
export function shade(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const hsl = rgbToHsl(rgb);
  return rgbToHex(hslToRgb(hsl.h, hsl.s, clamp(hsl.l + amount, 0, 1)));
}

/**
 * Garante contraste mínimo de `fg` sobre `bg`, clareando ou escurecendo `fg`
 * aos poucos. Se não chegar lá, cai para branco ou quase preto.
 */
export function ensureContrast(fg: string, bg: string, min = 4.5): string {
  if (contrastRatio(fg, bg) >= min) return fg;
  const dir = luminance(bg) > 0.4 ? -1 : 1;
  let c = fg;
  for (let i = 0; i < 20; i++) {
    c = shade(c, dir * 0.05);
    if (contrastRatio(c, bg) >= min) return c;
  }
  return bestTextOn(bg);
}

export function colorDistance(a: string, b: string): number {
  const x = hexToRgb(a), y = hexToRgb(b);
  if (!x || !y) return 999;
  return Math.sqrt((x.r - y.r) ** 2 + (x.g - y.g) ** 2 + (x.b - y.b) ** 2);
}

export function hue(hex: string): number {
  const rgb = hexToRgb(hex);
  return rgb ? rgbToHsl(rgb).h : 0;
}

export function withAlpha(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}
