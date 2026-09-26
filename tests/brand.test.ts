import { describe, expect, it } from "vitest";
import { parseColor, isNeutral, contrastRatio, ensureContrast } from "@/lib/color";
import { extractColorsFromCss, extractFontsFromCss, fontsFromGoogleUrl, rankColors, isUsefulFont } from "@/lib/brand/css";
import { extractFromHtml, guessBrandName } from "@/lib/brand/html";
import { isPrivateHost, normalizeUrl } from "@/lib/brand/fetch";
import { normalizarFonte, sugerirPar } from "@/lib/brand/fonts";

describe("cores", () => {
  it("converte formatos comuns para hex", () => {
    expect(parseColor("#FFF")).toBe("#ffffff");
    expect(parseColor("rgb(255, 0, 128)")).toBe("#ff0080");
    expect(parseColor("rgba(0 0 0 / 0.1)")).toBeNull(); // transparente demais
    expect(parseColor("hsl(0, 100%, 50%)")).toBe("#ff0000");
    expect(parseColor("222.2 47.4% 11.2%")).toBe("#0f172a");
    expect(parseColor("oklch(62.7% 0.258 29.23)")).toMatch(/^#f[0-9a-f]{5}$/);
  });
  it("reconhece neutros", () => {
    expect(isNeutral("#ffffff")).toBe(true);
    expect(isNeutral("#777777")).toBe(true);
    expect(isNeutral("#8a05be")).toBe(false);
  });
  it("garante contraste mínimo", () => {
    const fg = ensureContrast("#ffe066", "#ffffff");
    expect(contrastRatio(fg, "#ffffff")).toBeGreaterThanOrEqual(4.5);
  });
});

describe("css", () => {
  const css = `
    :root { --primary: #8a05be; --color-red-500: #ef4444; --tw-ring: #3b82f6; }
    .btn { background: #8a05be; color: #fff; }
    .link { color: rgb(0, 102, 255); border-color: #eee; }
    body { font-family: "Space Grotesk", sans-serif; font-size: 16px; }
    @font-face { font-family: 'Font Awesome 6'; }
    :root { --font-size-sm: 10px; }
  `;
  it("dá peso à cor de marca e ignora paleta do framework", () => {
    const ranked = rankColors(extractColorsFromCss(css), false);
    expect(ranked[0].hex).toBe("#8a05be");
    expect(ranked.find((c) => c.hex === "#ef4444")).toBeUndefined();
  });
  it("extrai fontes úteis e ignora ícones e tamanhos", () => {
    const fonts = [...extractFontsFromCss(css).keys()];
    expect(fonts).toContain("Space Grotesk");
    expect(fonts.some((f) => /awesome|10px/i.test(f))).toBe(false);
    expect(isUsefulFont("clamp(1rem")).toBe(false);
  });
  it("lê famílias do Google Fonts", () => {
    expect(fontsFromGoogleUrl("https://fonts.googleapis.com/css2?family=Inter:wght@400;700&family=DM+Serif+Display")).toEqual([
      "Inter",
      "DM Serif Display",
    ]);
  });
});

describe("html", () => {
  const html = `<!doctype html><html><head>
    <title>Contabilidade sem dor | Contabilizei</title>
    <meta name="description" content="Contabilidade online para PJ">
    <meta property="og:image" content="/og.png">
    <meta name="theme-color" content="#0a58ca">
    <link rel="apple-touch-icon" href="/apple.png">
    <link rel="stylesheet" href="/app.css">
    <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400" rel="stylesheet">
    <style>.hero{background:#0a58ca}</style>
    </head><body>
    <header><a href="/"><img src="/img/logo.svg" alt="Logo Contabilizei"></a></header>
    <h1>Abra sua empresa sem sair de casa</h1><h2>Planos a partir de R$ 89</h2>
    <p>Somos a maior contabilidade online do Brasil, com mais de 30 mil clientes atendidos.</p>
    <footer><a href="https://instagram.com/contabilizei">ig</a><a href="https://www.linkedin.com/company/contabilizei">in</a></footer>
    </body></html>`;
  const ex = extractFromHtml(html, "https://www.contabilizei.com.br/");
  it("extrai metadados, logo e redes", () => {
    expect(ex.title).toBe("Contabilidade sem dor | Contabilizei");
    expect(ex.og.image).toBe("https://www.contabilizei.com.br/og.png");
    expect(ex.logo).toBe("https://www.contabilizei.com.br/img/logo.svg");
    expect(ex.themeColor).toBe("#0a58ca");
    expect(ex.h1[0]).toMatch(/Abra sua empresa/);
    expect(ex.redes.instagram).toContain("contabilizei");
    expect(ex.redes.linkedin).toContain("company/contabilizei");
    expect(ex.stylesheets).toEqual(["https://www.contabilizei.com.br/app.css"]);
    expect(ex.googleFonts).toEqual(["Manrope"]);
  });
  it("adivinha o nome da marca pelo título", () => {
    expect(guessBrandName(ex, "contabilizei.com.br")).toBe("Contabilizei");
    expect(guessBrandName({ siteName: null, title: null, og: { title: null, description: null, image: null } }, "cora.com.br")).toBe("Cora");
  });
  it("não quebra com HTML vazio", () => {
    const vazio = extractFromHtml("<html><body><div id=root></div></body></html>", "https://spa.com");
    expect(vazio.h1).toEqual([]);
    expect(vazio.textoVisivel).toBe(0);
  });
});

describe("rede e fontes", () => {
  it("bloqueia hosts internos", () => {
    expect(isPrivateHost("localhost")).toBe(true);
    expect(isPrivateHost("192.168.0.1")).toBe(true);
    expect(isPrivateHost("10.2.3.4")).toBe(true);
    expect(isPrivateHost("fcbarcelona.com")).toBe(false);
    expect(isPrivateHost("nubank.com.br")).toBe(false);
  });
  it("normaliza URL digitada", () => {
    expect(normalizeUrl("nubank.com.br")).toBe("https://nubank.com.br/");
    expect(() => normalizeUrl("abc")).toThrow();
  });
  it("casa nomes de fonte conhecidos", () => {
    expect(normalizarFonte("Inter Variable")).toBe("Inter");
    expect(normalizarFonte("larkenFont")).toBeNull();
    expect(sugerirPar("#8a05be").titulo).toBeTruthy();
  });
});
