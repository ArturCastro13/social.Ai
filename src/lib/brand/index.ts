import type { BrandColor, BrandInput, BrandProfile } from "@/lib/types";
import { colorDistance, contrastRatio, isNeutral, luminance, shade, hue } from "@/lib/color";
import { extractColorsFromCss, extractFontsFromCss, mergeCounts, rankColors } from "./css";
import { fetchLimited, FetchError, normalizeUrl } from "./fetch";
import { extractFromHtml, guessBrandName, type HtmlExtract } from "./html";
import { normalizarFonte, sugerirPar } from "./fonts";
import { ehSemSite } from "./sem-site";

export interface ReadBrandOptions {
  /** Cores extraídas no navegador a partir de um print do grid do Instagram. */
  paletaInstagram?: string[];
  timeoutMs?: number;
}

const handle = (s?: string) => {
  if (!s) return undefined;
  const t = s.trim();
  if (!t) return undefined;
  const fromUrl = t.match(/(?:instagram|linkedin|twitter|x|facebook)\.com\/(?:company\/|in\/)?([\w.-]+)/i);
  return "@" + (fromUrl ? fromUrl[1] : t).replace(/^@/, "").replace(/\/$/, "");
};

async function vibrantFrom(url: string): Promise<string[]> {
  if (/\.svg(\?|$)/i.test(url) || url.startsWith("data:")) return [];
  const { body, contentType } = await fetchLimited(url, { timeoutMs: 5000, maxBytes: 4_000_000, accept: "image/*" });
  // Imagem pesada demais pode estourar memória ao decodificar; para cor, um logo leve basta.
  if (contentType.includes("svg") || body.length < 100 || body.length > 2_500_000) return [];
  const { Vibrant } = await import("node-vibrant/node");
  const p = await Vibrant.from(body).getPalette();
  return [p.Vibrant, p.DarkVibrant, p.LightVibrant, p.Muted]
    .filter((s): s is NonNullable<typeof s> => !!s && s.population > 0)
    .sort((a, b) => b.population - a.population)
    .map((s) => s.hex.toLowerCase());
}

/** Cor de marca mais forte: frequência no CSS com bônus para theme-color e imagens. */
function montarPaleta(pesos: Map<string, { peso: number; fonte: BrandColor["fonte"] }>, neutros: string[]) {
  const todas: BrandColor[] = [...pesos.entries()]
    .map(([hex, v]) => ({ hex, fonte: v.fonte, peso: Math.round(v.peso * 10) / 10 }))
    .sort((a, b) => b.peso - a.peso);

  // Agrupa tons muito parecidos para não sugerir três azuis quase iguais.
  const distintas: BrandColor[] = [];
  for (const c of todas.filter((c) => !isNeutral(c.hex))) {
    if (distintas.every((d) => colorDistance(d.hex, c.hex) > 60)) distintas.push(c);
  }

  // Evita escolher um quase preto como principal quando existe uma cor viva com peso parecido.
  const topo = distintas[0]?.peso ?? 0;
  const viva = distintas.find((c) => {
    const l = luminance(c.hex);
    return l > 0.03 && l < 0.75 && c.peso >= topo * 0.45;
  });
  const primaria = viva?.hex ?? distintas[0]?.hex ?? neutros.find((n) => luminance(n) < 0.2) ?? "#4f46e5";
  // Secundária e destaque: cores com corpo (tons pastel quase brancos servem de fundo, não de destaque).
  const comCorpo = distintas.filter((c) => c.hex !== primaria && luminance(c.hex) > 0.02 && luminance(c.hex) < 0.7);
  const secundaria =
    comCorpo.find((c) => {
      const d = Math.abs(hue(c.hex) - hue(primaria));
      return Math.min(d, 360 - d) > 25;
    })?.hex ??
    comCorpo[0]?.hex ??
    shade(primaria, luminance(primaria) > 0.4 ? -0.25 : -0.12);
  const destaque =
    comCorpo.find((c) => c.hex !== secundaria)?.hex ?? shade(primaria, luminance(primaria) > 0.4 ? -0.35 : 0.22);

  // Fundo e texto: neutros do site, desde que contrastem entre si.
  const escuros = neutros.filter((n) => luminance(n) < 0.08);
  const claros = neutros.filter((n) => luminance(n) > 0.85);
  const fundo = claros[0] ?? "#ffffff";
  let texto = escuros[0] ?? "#111111";
  if (contrastRatio(texto, fundo) < 7) texto = "#111111";

  return { primaria, secundaria, destaque, fundo, texto, todas: todas.slice(0, 16) };
}

export async function readBrand(input: BrandInput, opts: ReadBrandOptions = {}): Promise<BrandProfile> {
  const avisos: string[] = [];
  const url = normalizeUrl(input.url);
  // Endereço interno das marcas sem site: não existe para ler.
  if (ehSemSite(url)) throw new Error("Marca sem site: envie o perfil montado no onboarding, não a url.");
  const dominio = new URL(url).hostname.replace(/^www\./, "");
  let ex: HtmlExtract | null = null;
  let finalUrl = url;

  try {
    const res = await fetchLimited(url, { timeoutMs: opts.timeoutMs ?? 9000 });
    finalUrl = res.finalUrl;
    const html = res.body.toString("utf8");
    ex = extractFromHtml(html, finalUrl);
    if (/cf-browser-verification|challenge-platform|Just a moment\.\.\.|captcha/i.test(html) && ex.textoVisivel < 800) {
      avisos.push("O site tem proteção contra robôs. Li só o que estava disponível; confira as cores e o texto antes de gerar.");
    }
    if (ex.textoVisivel < 300 && ex.h1.length === 0) {
      avisos.push("O site parece montado todo em JavaScript e mostrou pouco texto para leitura. Use a descrição e revise o resumo do negócio.");
    }
  } catch (e) {
    const err = e as FetchError;
    const motivo =
      err.kind === "timeout"
        ? "O site demorou demais para responder."
        : err.kind === "bloqueado"
          ? "O site bloqueou a leitura automática."
          : err.kind === "invalido"
            ? "Esse endereço não pode ser lido."
            : "Não consegui abrir o site.";
    avisos.push(`${motivo} Segui com o que deu para inferir pelo domínio; você pode ajustar cores e fontes no painel.`);
  }

  const colorCounts = new Map<string, number>();
  const fontCounts = new Map<string, number>();
  if (ex) {
    mergeCounts(colorCounts, extractColorsFromCss(ex.inlineCss));
    mergeCounts(fontCounts, extractFontsFromCss(ex.inlineCss));
    // Até 3 folhas de estilo, priorizando as do próprio domínio.
    const host = new URL(finalUrl).hostname;
    const sheets = [...ex.stylesheets]
      .sort((a, b) => Number(new URL(b).hostname === host) - Number(new URL(a).hostname === host))
      .slice(0, 3);
    const results = await Promise.allSettled(
      sheets.map((s) => fetchLimited(s, { timeoutMs: 5000, maxBytes: 1_500_000, accept: "text/css,*/*;q=0.1" })),
    );
    for (const r of results) {
      if (r.status !== "fulfilled") continue;
      const css = r.value.body.toString("utf8");
      mergeCounts(colorCounts, extractColorsFromCss(css));
      mergeCounts(fontCounts, extractFontsFromCss(css));
    }
    if (sheets.length && results.every((r) => r.status === "rejected")) {
      avisos.push("Não consegui baixar as folhas de estilo; a paleta veio só do HTML e das imagens.");
    }
  }

  // Pesos: CSS normalizado + theme-color + imagens (og:image e logo) + print do Instagram.
  const pesos = new Map<string, { peso: number; fonte: BrandColor["fonte"] }>();
  const bump = (hex: string, w: number, fonte: BrandColor["fonte"]) => {
    const cur = pesos.get(hex);
    pesos.set(hex, { peso: (cur?.peso ?? 0) + w, fonte: cur && cur.peso >= w ? cur.fonte : fonte });
  };
  const cssChromatic = rankColors(colorCounts, false);
  const maxCss = cssChromatic[0]?.count ?? 1;
  cssChromatic.slice(0, 12).forEach((c) => bump(c.hex, (c.count / maxCss) * 10, "css"));
  if (ex?.themeColor && !isNeutral(ex.themeColor)) bump(ex.themeColor, 8, "theme-color");

  const imagens: [string | null, BrandColor["fonte"], number][] = [
    [ex?.logo ?? null, "logo", 6],
    [ex?.appleTouchIcon ?? null, "logo", 5],
    [ex?.og.image ?? null, "og-image", 3],
  ];
  const vib = await Promise.allSettled(
    imagens.filter(([u]) => !!u).map(async ([u, fonte, w]) => ({ cores: await vibrantFrom(u!), fonte, w })),
  );
  for (const r of vib) {
    if (r.status !== "fulfilled") continue;
    r.value.cores.forEach((hex, i) => bump(hex, r.value.w / (i + 1), r.value.fonte));
  }
  (opts.paletaInstagram ?? []).forEach((hex, i) => bump(hex.toLowerCase(), 7 / (i + 1), "instagram-print"));

  const neutros = rankColors(colorCounts, true).map((c) => c.hex);
  if (pesos.size === 0) avisos.push("Não achei cor de marca no site. Usei uma paleta padrão; troque a cor principal no painel.");
  const paleta = montarPaleta(pesos, neutros);

  // Fontes: Google Fonts linkadas valem mais que CSS.
  const encontradas = [
    ...(ex?.googleFonts ?? []),
    ...[...fontCounts.entries()].sort((a, b) => b[1] - a[1]).map(([f]) => f),
  ].filter((f, i, arr) => arr.indexOf(f) === i);
  const conhecidas = encontradas.map(normalizarFonte).filter((f): f is string => !!f);
  const unicas = [...new Set(conhecidas)];
  let fontes: BrandProfile["fontes"];
  if (unicas.length) {
    fontes = { titulo: unicas[0], corpo: unicas[1] ?? unicas[0], encontradas: encontradas.slice(0, 6), sugeridas: false };
  } else {
    const par = sugerirPar(paleta.primaria);
    fontes = { titulo: par.titulo, corpo: par.corpo, encontradas: encontradas.slice(0, 6), sugeridas: true };
    if (encontradas.length) {
      avisos.push(`O site usa ${encontradas[0]}, que não está no Google Fonts. Sugeri ${par.titulo === par.corpo ? par.titulo : `${par.titulo} e ${par.corpo}`} como alternativa parecida.`);
    }
  }

  const redesEncontradas = (ex?.redes ?? {}) as BrandProfile["redesEncontradas"];
  const handles = {
    instagram: handle(input.instagram) ?? handle(redesEncontradas.instagram),
    linkedin: handle(input.linkedin) ?? handle(redesEncontradas.linkedin),
    x: handle(input.x) ?? handle(redesEncontradas.x),
    facebook: handle(input.facebook) ?? handle(redesEncontradas.facebook),
  };

  return {
    url: finalUrl,
    dominio,
    nome: guessBrandName(
      ex ?? { siteName: null, title: null, og: { title: null, description: null, image: null } },
      dominio,
      ex ? [...ex.h1, ...ex.h2, ...ex.paragrafos, ex.description ?? "", ex.og.description ?? ""] : [],
    ),
    title: ex?.title ?? null,
    description: ex?.description ?? ex?.og.description ?? null,
    og: ex?.og ?? { title: null, description: null, image: null },
    favicon: ex?.favicon ?? null,
    appleTouchIcon: ex?.appleTouchIcon ?? null,
    logo: ex?.logo ?? ex?.appleTouchIcon ?? null,
    themeColor: ex?.themeColor ?? null,
    headings: { h1: ex?.h1 ?? [], h2: ex?.h2 ?? [] },
    paragrafos: ex?.paragrafos ?? [],
    provas: ex?.provas ?? [],
    redesEncontradas,
    handles,
    paleta,
    fontes,
    avisos,
    lidoEm: new Date().toISOString(),
  };
}
