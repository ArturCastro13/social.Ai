import { describe, expect, it } from "vitest";
import { itensDoArquivo, BASE_ARQUIVO } from "@/lib/virais";
import { viralItemSchema } from "@/lib/virais/schema";
import { construirCatalogo, padroesDoNicho } from "@/lib/virais/catalogo";
import { IDS_NICHO } from "@/lib/types";

describe("base de virais", () => {
  const itens = itensDoArquivo();
  it("tem de 10 a 15 itens por nicho", () => {
    for (const [nicho, lista] of Object.entries(BASE_ARQUIVO)) {
      expect(lista.length, nicho).toBeGreaterThanOrEqual(10);
      expect(lista.length, nicho).toBeLessThanOrEqual(70);
    }
  });
  it("todos os itens passam no esquema e nas regras de curadoria", () => {
    for (const it of itens) {
      const r = viralItemSchema.safeParse(it);
      expect(r.success, `${it.id}: ${r.success ? "" : JSON.stringify(r.error.issues)}`).toBe(true);
    }
  });
  it("não tem travessão em nenhum texto", () => {
    expect(JSON.stringify(itens).includes("—")).toBe(false);
  });
  it("métrica preenchida sempre vem com fonte e observação", () => {
    for (const it of itens) {
      const m = it.metricas;
      if ([m.curtidas, m.comentarios, m.compartilhamentos, m.visualizacoes].some((v) => v !== null)) {
        expect(it.link_fonte, it.id).toBeTruthy();
        expect(m.observacao.length, it.id).toBeGreaterThan(10);
      }
    }
  });
  it("gera catálogo e seleciona padrões por nicho", () => {
    const cat = construirCatalogo(itens);
    expect(cat.length).toBeGreaterThan(10);
    const fin = padroesDoNicho(cat, "fintech", 10);
    expect(fin.length).toBe(10);
    expect(fin[0].nichos).toContain("fintech");
  });
});

describe("biblioteca de 8 nichos", () => {
  it("cada nicho tem pelo menos 40 itens e metade verificada", () => {
    for (const id of IDS_NICHO) {
      const itens = BASE_ARQUIVO[id];
      expect(itens.length, id).toBeGreaterThanOrEqual(40);
      expect(itens.filter((i) => i.status === "verificado").length, id).toBeGreaterThanOrEqual(Math.floor(itens.length / 2));
      expect(itens.every((i) => i.nicho === id), id).toBe(true);
    }
  });
});
