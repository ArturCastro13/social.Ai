import { describe, expect, it } from "vitest";
import { custoDoLog } from "@/lib/llm/custo";
import { chaveCache } from "@/lib/engine";

describe("custo pelo log", () => {
  it("soma Claude (entrada, saída, cache, buscas) e OpenAI", () => {
    const log = [
      "[ia] pesquisar claude-sonnet-5 entrada=20000 saida=3000 buscas=4",
      "[ia] gerar-ao-vivo claude-sonnet-5 entrada=9000 saida=8000 cache_lido=5000 cache_gravado=0",
      "[ia] anexos claude-haiku-4-5-20251001 entrada=1600 saida=30",
      "[imagem] openai gpt-image-2 medium entrada=300 saida=1000 21000ms 480KB",
      "linha qualquer",
    ].join("\n");
    const r = custoDoLog(log);
    expect(r.itens).toHaveLength(4);
    expect(r.total).toBeCloseTo(0.25225, 4);
  });

  it("cache de análise tem versão", () => {
    expect(chaveCache("https://cora.com.br")).toMatch(/^v2:/);
  });
});

describe("custo com o log novo", () => {
  it("lê cache e buscas em qualquer ordem, com o tempo no fim", () => {
    const novo = custoDoLog("[ia] pesquisar claude-sonnet-5 entrada=20000 saida=3000 cache_leitura=5000 buscas=4 21000ms\n[ia] gerar claude-sonnet-5 falhou APIConnectionError 900ms");
    expect(novo.itens).toHaveLength(1);
    expect(novo.total).toBeCloseTo(0.04 + 0.03 + 0.001 + 0.04, 5);
  });
});
