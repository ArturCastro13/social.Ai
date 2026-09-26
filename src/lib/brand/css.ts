import { isNeutral, parseColor } from "@/lib/color";

/** CSS enorme (de propósito ou não) não pode travar o servidor. */
const LIMITE_CSS = 400_000;

const COLOR_RE =
  /#[0-9a-fA-F]{3,8}\b|(?:rgba?|hsla?|oklch|oklab)\([^()]*\)/g;

// Paletas completas de frameworks aparecem inteiras no CSS e não dizem nada sobre a marca.
const FRAMEWORK_VAR =
  /^--(?:tw-|color-(?:red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone)-\d+|bs-(?:blue|indigo|purple|pink|red|orange|yellow|green|teal|cyan|gray)|wp--preset--color--(?:black|cyan-bluish-gray|white|pale-pink|vivid-red|luminous-vivid-orange|luminous-vivid-amber|light-green-cyan|vivid-green-cyan|pale-cyan-blue|vivid-cyan-blue|vivid-purple))/i;

const BRAND_VAR = /(primary|brand|accent|main|theme|highlight|cta|marca|principal)/i;

export interface CssColorCount {
  hex: string;
  count: number;
}

/** Conta cores de um CSS, dando peso extra a variáveis com nome de marca. */
export function extractColorsFromCss(cssBruto: string): Map<string, number> {
  const css = cssBruto.slice(0, LIMITE_CSS);
  const counts = new Map<string, number>();
  const add = (hex: string | null, w: number) => {
    if (!hex) return;
    counts.set(hex, (counts.get(hex) ?? 0) + w);
  };

  // Declarações de variáveis: --nome: valor;
  const varRe = /(--[\w-]{1,80})\s*:\s*([^;}{]{1,300})/g;
  let m: RegExpExecArray | null;
  const seenInVars = new Set<number>();
  while ((m = varRe.exec(css))) {
    const [, name, raw] = m;
    seenInVars.add(m.index);
    if (FRAMEWORK_VAR.test(name)) continue;
    const value = raw.trim();
    const weight = BRAND_VAR.test(name) ? 12 : 1;
    const direct = parseColor(value);
    if (direct) {
      add(direct, weight);
      continue;
    }
    for (const c of value.match(COLOR_RE) ?? []) add(parseColor(c), weight);
  }

  // Uso real em propriedades (color, background, border, fill...)
  const propRe = /(?:^|[;{\s])((?:background(?:-color)?|color|border(?:-[a-z]+)?-?color?|fill|stroke|outline-color|box-shadow))\s*:\s*([^;}{]{1,300})/g;
  while ((m = propRe.exec(css))) {
    const [, prop, value] = m;
    const w = prop.startsWith("background") ? 3 : prop === "color" ? 2 : 1;
    for (const c of value.match(COLOR_RE) ?? []) add(parseColor(c), w);
  }
  return counts;
}

export function mergeCounts(target: Map<string, number>, src: Map<string, number>, factor = 1) {
  for (const [k, v] of src) target.set(k, (target.get(k) ?? 0) + v * factor);
}

/** Ordena cores por frequência. `neutral` controla se entram pretos, brancos e cinzas. */
export function rankColors(counts: Map<string, number>, neutral: boolean): CssColorCount[] {
  return [...counts.entries()]
    .filter(([hex]) => isNeutral(hex) === neutral)
    .map(([hex, count]) => ({ hex, count }))
    .sort((a, b) => b.count - a.count);
}

const GENERIC_FONTS = new Set([
  "sans-serif", "serif", "monospace", "cursive", "fantasy", "system-ui", "ui-sans-serif",
  "ui-serif", "ui-monospace", "ui-rounded", "-apple-system", "blinkmacsystemfont", "segoe ui",
  "roboto", "helvetica neue", "helvetica", "arial", "noto sans", "liberation sans",
  "apple color emoji", "segoe ui emoji", "segoe ui symbol", "noto color emoji", "inherit",
  "initial", "unset", "courier new", "courier", "menlo", "monaco", "consolas", "sfmono-regular",
  "liberation mono", "times new roman", "times", "georgia", "verdana", "tahoma", "emoji",
  "math", "fangsong", "revert", "var", "oxygen", "ubuntu", "cantarell", "fira sans", "droid sans",
]);

const ICON_FONT = /(awesome|icon|glyph|material symbols|material icons|swiper|slick|eicons|dashicons|feather|fontello|revicons|ionicons|bootstrap-icons|remixicon|lucide|star|social)/i;

export function isUsefulFont(name: string): boolean {
  const n = name.trim().toLowerCase();
  if (!n || n.length > 40) return false;
  // Valores que não são nome de família: tamanhos, pesos, funções, declarações coladas
  if (!/^[a-z]/.test(n) || /[:(){};]/.test(n) || /^\d|\d(px|rem|em|%)$/.test(n)) return false;
  if (/^(normal|bold|bolder|lighter|italic|oblique|none|auto|light|regular|medium)$/.test(n)) return false;
  if (GENERIC_FONTS.has(n)) return false;
  if (ICON_FONT.test(n)) return false;
  if (n.startsWith("var(") || n.startsWith("__") || /fallback/i.test(n)) return false;
  return true;
}

/** Fontes declaradas no CSS, contadas por uso. Nomes do next/font (__Inter_abc) são limpos. */
export function extractFontsFromCss(cssBruto: string): Map<string, number> {
  const css = cssBruto.slice(0, LIMITE_CSS);
  const counts = new Map<string, number>();
  const add = (raw: string, w: number) => {
    let name = raw.trim().replace(/^['"]|['"]$/g, "").trim();
    const nextFont = name.match(/^__([A-Za-z0-9_]+?)_[a-f0-9]{5,}$/);
    if (nextFont) name = nextFont[1].replace(/_/g, " ");
    if (!isUsefulFont(name)) return;
    counts.set(name, (counts.get(name) ?? 0) + w);
  };
  const faceRe = /@font-face\s*{[^}]{0,2000}?font-family\s*:\s*([^;}]{1,200})/g;
  let m: RegExpExecArray | null;
  while ((m = faceRe.exec(css))) add(m[1], 1);
  const famRe = /font-family\s*:\s*([^;}]{1,300})/g;
  while ((m = famRe.exec(css))) {
    const first = m[1].split(",")[0];
    add(first, 3);
  }
  // Variáveis de fonte comuns: --font-sans: "Inter", ...
  const varRe = /--[\w-]*font(?:-family|-sans|-serif|-heading|-body|-display|-title|-primary|-secondary)?\s*:\s*([^;}]{1,300})/g;
  while ((m = varRe.exec(css))) add(m[1].split(",")[0], 2);
  return counts;
}

/** Famílias pedidas em links do Google Fonts (css e css2). */
export function fontsFromGoogleUrl(href: string): string[] {
  try {
    const u = new URL(href, "https://fonts.googleapis.com");
    if (!/fonts\.googleapis\.com$/.test(u.hostname)) return [];
    const fams = u.searchParams.getAll("family");
    return fams
      .flatMap((f) => f.split("|"))
      .map((f) => f.split(":")[0].replace(/\+/g, " ").trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}
