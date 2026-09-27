import * as cheerio from "cheerio";
import { parseColor } from "@/lib/color";
import { fontsFromGoogleUrl } from "./css";
import { nomeDaMarca } from "./nome";

export interface HtmlExtract {
  title: string | null;
  description: string | null;
  siteName: string | null;
  og: { title: string | null; description: string | null; image: string | null };
  favicon: string | null;
  appleTouchIcon: string | null;
  logo: string | null;
  themeColor: string | null;
  h1: string[];
  h2: string[];
  paragrafos: string[];
  /** Blocos curtos com número e rótulo ("100.000 membros ativos", "NPS 86") e depoimentos, como aparecem no site. */
  provas: string[];
  redes: Record<string, string>;
  inlineCss: string;
  stylesheets: string[];
  googleFonts: string[];
  textoVisivel: number;
}

const clean = (s: string | undefined | null) =>
  (s ?? "").replace(/\s+/g, " ").trim() || null;

function abs(href: string | undefined | null, base: string): string | null {
  if (!href) return null;
  try {
    return new URL(href.trim(), base).toString();
  } catch {
    return null;
  }
}

const SOCIAL: [string, RegExp][] = [
  ["instagram", /instagram\.com\/(?!p\/|reel\/|explore\/)[\w.]+/i],
  ["linkedin", /linkedin\.com\/(company|in|school)\/[\w-]+/i],
  ["x", /(?:twitter|x)\.com\/(?!intent|share|home)[\w]+/i],
  ["facebook", /facebook\.com\/(?!sharer|share|dialog|plugins)[\w.-]+/i],
  ["youtube", /youtube\.com\/(@|c\/|channel\/|user\/)[\w-]+/i],
  ["tiktok", /tiktok\.com\/@[\w.]+/i],
];

// Número com unidade ou contexto que costuma ser prova: %, R$, mil, milhão, horas, clientes, NPS...
const RE_PROVA =
  /(\d[\d.,]*\s*(%|x\b|mil\b|milh|bilh|h\b|horas?\b|dias?\b|minutos?\b|anos?\b|meses\b|clientes|membros|empresas|usu[aá]rios|pessoas|lojas|pa[ií]ses|cidades|estrelas|avalia)|R\$\s*\d|\b(NPS|CSAT)\b\s*:?\s*\d|\+\s*(de\s+)?\d)/i;

/**
 * Blocos de prova do site: o menor bloco que junta o número e o rótulo ("100.000" e "Membros ativos" em
 * elementos vizinhos viram "100.000 Membros ativos"). Blocos que contêm outro candidato saem (é a seção inteira).
 */
function blocosComNumero($: cheerio.CheerioAPI, max = 12): string[] {
  const candidatos = uniq(
    $("li, p, span, div, strong, b, h3, h4, h5, dd, dt, figure, figcaption")
      .map((_, el) => $(el).text())
      .get()
      .map((t) => t.replace(/\s+/g, " ").trim())
      .filter((t) => t.length >= 6 && t.length <= 160 && RE_PROVA.test(t) && temRotulo(t)),
    200,
  );
  const menores = candidatos.filter((c) => !candidatos.some((o) => o !== c && o.length < c.length && c.includes(o)));
  // Preço é prova fraca para post: vai para o fim, e as provas de resultado ficam com as vagas.
  const preco = (t: string) => /R\$/.test(t);
  return [...menores.filter((t) => !preco(t)), ...menores.filter(preco)].slice(0, max);
}

const VAZIAS = new Set(["de", "do", "da", "dos", "das", "por", "mais", "com", "até", "ate", "em", "que", "mil", "the", "and"]);
/** Tem palavra de verdade além do número ("Membros ativos"), não só "+ de 85%". */
function temRotulo(t: string): boolean {
  return (t.toLowerCase().match(/\p{L}{3,}/gu) ?? []).some((w) => !VAZIAS.has(w) && !/^(milh|bilh)/.test(w));
}

/** Depoimentos marcados como tal no HTML, até 3. */
function depoimentos($: cheerio.CheerioAPI): string[] {
  return uniq(
    $("blockquote, q, [class*='testimonial'], [class*='depoimento'], [class*='review'], [class*='quote']")
      .map((_, el) => $(el).text())
      .get()
      .filter((t) => t.trim().length >= 40 && t.trim().length <= 400)
      .map((t) => `Depoimento no site: "${t.replace(/\s+/g, " ").trim()}"`),
    3,
  );
}

function uniq(list: string[], max: number, minLen = 2): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of list) {
    const t = raw.replace(/\s+/g, " ").trim();
    const k = t.toLowerCase();
    if (t.length < minLen || seen.has(k)) continue;
    seen.add(k);
    out.push(t);
    if (out.length >= max) break;
  }
  return out;
}

function jsonLd($: cheerio.CheerioAPI): { name?: string; logo?: string } {
  const out: { name?: string; logo?: string } = {};
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).text());
      const nodes: unknown[] = Array.isArray(data) ? data : data["@graph"] ?? [data];
      for (const n of nodes as Record<string, unknown>[]) {
        const type = String(n?.["@type"] ?? "");
        if (!/Organization|Corporation|WebSite|Brand/i.test(type)) continue;
        if (!out.name && typeof n.name === "string") out.name = n.name;
        const logo = n.logo as unknown;
        if (!out.logo) {
          if (typeof logo === "string") out.logo = logo;
          else if (logo && typeof (logo as { url?: string }).url === "string")
            out.logo = (logo as { url: string }).url;
        }
      }
    } catch {
      /* JSON-LD quebrado é comum; ignora */
    }
  });
  return out;
}

export function extractFromHtml(html: string, pageUrl: string): HtmlExtract {
  const $ = cheerio.load(html);
  const meta = (sel: string) => clean($(sel).attr("content"));

  const ld = jsonLd($);
  const iconHref =
    $('link[rel="icon"][type="image/svg+xml"]').attr("href") ??
    $('link[rel="icon"]').last().attr("href") ??
    $('link[rel="shortcut icon"]').attr("href") ??
    "/favicon.ico";

  // Logo: JSON-LD, depois <img> com "logo" no cabeçalho, depois qualquer <img> com "logo".
  let logo: string | null = abs(ld.logo, pageUrl);
  if (!logo) {
    const candidates = $("header img, nav img, a[href='/'] img, img")
      .toArray()
      .filter((el) => {
        const $el = $(el);
        const hay = [$el.attr("src"), $el.attr("alt"), $el.attr("class"), $el.attr("id"), $el.parent().attr("class")]
          .join(" ")
          .toLowerCase();
        return hay.includes("logo");
      });
    const src = candidates.length ? $(candidates[0]).attr("src") ?? $(candidates[0]).attr("data-src") : null;
    if (src && !src.startsWith("data:")) logo = abs(src, pageUrl);
  }

  const themeRaw = meta('meta[name="theme-color"]');
  const themeColor = themeRaw ? parseColor(themeRaw) : null;

  const redes: Record<string, string> = {};
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    for (const [rede, re] of SOCIAL) {
      if (!redes[rede] && re.test(href)) redes[rede] = abs(href, pageUrl) ?? href;
    }
  });

  let inlineCss = "";
  $("style").each((_, el) => {
    inlineCss += $(el).text() + "\n";
  });
  $("[style]").each((_, el) => {
    inlineCss += `x{${$(el).attr("style")}}\n`;
  });

  const stylesheets: string[] = [];
  const googleFonts: string[] = [];
  $('link[rel~="stylesheet"], link[as="style"]').each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    const full = abs(href, pageUrl);
    if (!full) return;
    if (full.includes("fonts.googleapis.com")) googleFonts.push(...fontsFromGoogleUrl(full));
    else if (!stylesheets.includes(full)) stylesheets.push(full);
  });
  // @import de Google Fonts dentro de <style>
  for (const m of inlineCss.slice(0, 400_000).matchAll(/@import\s+url\(['"]?(https?:\/\/fonts\.googleapis\.com[^'")]{0,500})/g)) {
    googleFonts.push(...fontsFromGoogleUrl(m[1]));
  }

  $("script, noscript, svg, style").remove();
  // Elementos inline colados ("Mais de<b>1,8 milhão</b>de") viram palavras grudadas no .text(). Separa com espaço.
  $("br").replaceWith(" ");
  $("span, strong, b, em, i, a, small, sup, sub, div, p, li, button, label").prepend(" ").append(" ");
  const h1 = uniq($("h1").map((_, el) => $(el).text()).get(), 5);
  const h2 = uniq($("h2").map((_, el) => $(el).text()).get(), 10);
  const paragrafos = uniq(
    $("main p, section p, p, [class*='subtitle'], [class*='description']")
      .map((_, el) => $(el).text())
      .get()
      .filter((t) => t.trim().length > 40 && t.trim().length < 600),
    8,
    40,
  );
  const provas = [...blocosComNumero($), ...depoimentos($)];
  const textoVisivel = ($("body").text() ?? "").replace(/\s+/g, " ").trim().length;

  return {
    title: clean($("title").first().text()),
    description: meta('meta[name="description"]'),
    siteName: meta('meta[property="og:site_name"]') ?? meta('meta[name="application-name"]') ?? clean(ld.name),
    og: {
      title: meta('meta[property="og:title"]') ?? meta('meta[name="twitter:title"]'),
      description: meta('meta[property="og:description"]') ?? meta('meta[name="twitter:description"]'),
      image: abs(meta('meta[property="og:image"]') ?? meta('meta[name="twitter:image"]'), pageUrl),
    },
    favicon: abs(iconHref, pageUrl),
    appleTouchIcon: abs($('link[rel="apple-touch-icon"], link[rel="apple-touch-icon-precomposed"]').attr("href"), pageUrl),
    logo,
    themeColor,
    h1,
    h2,
    paragrafos,
    provas,
    redes,
    inlineCss,
    stylesheets,
    googleFonts: [...new Set(googleFonts)],
    textoVisivel,
  };
}

/**
 * Nome da marca: site_name ou pedaço do title que bate com o domínio, depois o jeito como o
 * texto do site escreve o domínio, e por fim o domínio capitalizado. Regras em ./nome.ts.
 */
export function guessBrandName(
  ex: Pick<HtmlExtract, "siteName" | "title" | "og">,
  dominio: string,
  textos: string[] = [],
): string {
  return nomeDaMarca({ siteName: ex.siteName, title: ex.title, ogTitle: ex.og.title, dominio, textos });
}
