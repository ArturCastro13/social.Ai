import { describe, expect, it } from "vitest";
import { contrastRatio } from "@/lib/color";
import { DEMOS } from "@/lib/engine/demo";
import { adaptarSlides } from "@/lib/render/adaptar";
import { familiaDoTitulo } from "@/lib/render/fonts";
import { temaDaMarca } from "@/lib/render/tema";
import { caber, limpar } from "@/lib/render/templates";
import { TEMPLATES } from "@/lib/engine/schema";
import type { BrandProfile } from "@/lib/types";

describe("fonte do título", () => {
  it("fonte genérica vira display pelo tom; fonte com personalidade fica", () => {
    for (const f of ["Inter", "Roboto", "Arial", "Helvetica", "system-ui", "Open Sans", "Montserrat", "Poppins"]) {
      expect(familiaDoTitulo(f, "direto, prático e bem-humorado")).toBe("Bricolage Grotesque");
    }
    expect(familiaDoTitulo("Inter")).toBe("Bricolage Grotesque");
    expect(familiaDoTitulo("Inter", "acolhedor e cuidadoso")).toBe("Fraunces");
    expect(familiaDoTitulo("Roboto", "Sofisticado, premium")).toBe("Fraunces");
    expect(familiaDoTitulo("Arial", "institucional e sério")).toBe("Fraunces");
    expect(familiaDoTitulo("DM Serif Display", "acolhedor")).toBe("DM Serif Display");
    expect(familiaDoTitulo("Space Grotesk")).toBe("Space Grotesk");
  });
});

describe("render", () => {
  it("tema garante contraste legível para qualquer cor principal", () => {
    const brand = DEMOS[0].brand;
    for (const cor of ["#ffe600", "#00ff85", "#111111", "#ffffff", "#8a05be", "#9f77ff"]) {
      const t = temaDaMarca(brand, cor);
      expect(contrastRatio(t.naPrimaria, t.primaria), cor).toBeGreaterThanOrEqual(3);
      expect(contrastRatio(t.tintaNoClaro, t.claro), cor).toBeGreaterThanOrEqual(7);
      expect(contrastRatio(t.primariaNoClaro, t.claro), cor).toBeGreaterThanOrEqual(3);
      expect(contrastRatio(t.destaqueNoEscuro, t.escuro), cor).toBeGreaterThanOrEqual(3);
    }
  });
  it("tema sobrevive a paleta estranha", () => {
    const b = { ...DEMOS[0].brand, paleta: { primaria: "#fefefe", secundaria: "#fdfdfd", destaque: "#ffffff", fundo: "#000000", texto: "#ffffff", todas: [] } } as BrandProfile;
    const t = temaDaMarca(b);
    expect(contrastRatio(t.tintaNoClaro, t.claro)).toBeGreaterThanOrEqual(7);
  });
  it("adapta qualquer post para qualquer template", () => {
    for (const post of DEMOS.flatMap((d) => d.posts)) {
      for (const t of TEMPLATES) {
        const slides = adaptarSlides(post, t);
        expect(slides.length, `${post.id} ${t}`).toBeGreaterThan(0);
        if (t === "antes-depois") expect(slides.length).toBeGreaterThanOrEqual(2);
        if (t === "capa-gancho") expect(slides.length).toBeGreaterThanOrEqual(3);
      }
    }
  });
  it("reduz a fonte para textos longos e tira emoji", () => {
    expect(caber("curto", 900, 400, 150, 40)).toBe(150);
    expect(caber("um texto bem mais longo que precisa quebrar em várias linhas para caber na caixa", 900, 300, 150, 40)).toBeLessThan(100);
    expect(limpar("oi 💗 tudo ✨ bem")).toBe("oi tudo bem");
  });
});
