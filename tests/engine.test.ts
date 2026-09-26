import { describe, expect, it } from "vitest";
import { montarCalendario } from "@/lib/engine/calendario";
import { analiseIASchema, extrairJson, semTravessao, templateValido } from "@/lib/engine/schema";
import { analiseLocal } from "@/lib/engine/local";
import { palpiteNicho } from "@/lib/engine/nicho";
import { DEMOS, demoPorDominio } from "@/lib/engine/demo";
import { construirCatalogo, padroesDoNicho } from "@/lib/virais/catalogo";
import { itensDoArquivo } from "@/lib/virais";
import { montarPrompt } from "@/lib/llm/prompt";
import type { PostGerado } from "@/lib/types";

const brand = DEMOS[0].brand;
const catalogo = construirCatalogo(itensDoArquivo());

describe("motor", () => {
  it("tira travessão de toda a saída", () => {
    expect(semTravessao({ a: ["x — y"], b: "a—b" })).toEqual({ a: ["x, y"], b: "a, b" });
  });
  it("extrai JSON mesmo com cercas", () => {
    expect(extrairJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(extrairJson('Claro! {"a":2} fim')).toEqual({ a: 2 });
  });
  it("corrige template inválido pelo formato", () => {
    expect(templateValido("inventado", "dado-impacto")).toBe("dado-impacto");
    expect(templateValido("lista", "carrossel")).toBe("lista");
  });
  it("classifica nicho pelo texto do site", () => {
    expect(palpiteNicho(DEMOS.find((d) => d.brand.dominio === "cora.com.br")!.brand).nicho).toBe("fintech");
    expect(palpiteNicho(DEMOS.find((d) => d.brand.dominio === "sallve.com.br")!.brand).nicho).toBe("ecommerce-dtc");
  });
  it("motor local gera saída válida sem IA e sem travessão", () => {
    const out = analiseLocal(brand, "fintech", padroesDoNicho(catalogo, "fintech", 10), 7, ["instagram", "linkedin"]);
    const r = analiseIASchema.safeParse(out);
    expect(r.success, JSON.stringify(!r.success && r.error.issues)).toBe(true);
    expect(out.posts).toHaveLength(7);
    expect(new Set(out.posts.map((p) => p.formato)).size).toBeGreaterThanOrEqual(3);
  });
  it("calendário respeita um post por dia e a frequência da rede", () => {
    const posts = Array.from({ length: 8 }, (_, i) => ({ id: `p${i}`, rede_principal: i % 2 ? "linkedin" : "instagram" }) as PostGerado);
    const cal = montarCalendario(posts, [{ rede: "linkedin", frequencia_semanal: 2, foco: "" }, { rede: "instagram", frequencia_semanal: 3, foco: "" }], new Date("2026-09-26T12:00:00"));
    expect(cal).toHaveLength(8);
    expect(new Set(cal.map((c) => c.data)).size).toBe(8);
    expect(cal[0].data >= "2026-09-27").toBe(true);
  });
  it("demos são válidos e acham pelo domínio", () => {
    expect(DEMOS).toHaveLength(3);
    expect(demoPorDominio("www.pipefy.com")?.nicho).toBe("saas-b2b");
    for (const d of DEMOS) {
      expect(d.posts.length).toBeGreaterThanOrEqual(6);
      const copy = JSON.stringify({ ...d, brand: undefined });
      expect(copy.includes("—"), d.id).toBe(false);
    }
  });
  it("prompt inclui padrões do nicho e a quantidade pedida", () => {
    const p = montarPrompt({ brand, palpite: "fintech", padroes: padroesDoNicho(catalogo, "fintech", 5).map((padrao) => ({ padrao, exemplos: [] })), quantidade: 4, redes: ["instagram"] });
    expect(p).toContain("exatamente 4 posts");
    expect(p).toContain("fintech");
  });
});
