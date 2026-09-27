import { describe, expect, it } from "vitest";
import { parametrosDoPedido } from "@/lib/llm";

describe("parâmetros do pedido ao Claude", () => {
  const longo = "x".repeat(7000);

  it("Sonnet com instrução longa usa cache de prompt e esforço", () => {
    const p = parametrosDoPedido("claude-sonnet-5", { maxTokens: 32000, esforco: "low" }, longo, "oi");
    expect(p.system).toEqual([{ type: "text", text: longo, cache_control: { type: "ephemeral" } }]);
    expect(p.output_config).toEqual({ effort: "low" });
  });

  it("Haiku e instrução curta vão sem cache e sem esforço", () => {
    expect(parametrosDoPedido("claude-haiku-4-5", { maxTokens: 16000, esforco: "low" }, longo, "oi").system).toBe(longo);
    expect(parametrosDoPedido("claude-haiku-4-5", { maxTokens: 16000, esforco: "low" }, longo, "oi").output_config).toBeUndefined();
    expect(parametrosDoPedido("claude-sonnet-5", { maxTokens: 16000 }, "curto", "oi").system).toBe("curto");
  });
});
