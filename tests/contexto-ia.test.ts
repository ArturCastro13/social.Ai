import { afterEach, expect, it, vi } from "vitest";
import { extrairMaterial } from "@/lib/contexto/extrair";
import { partesGemini, blocosClaude } from "@/lib/llm/anexos";
import { provedorConfigurado } from "@/lib/llm";
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
const input = { nome: "Manual", origem: "arquivo" as const, arquivo: { mime: "application/pdf" as const, bytes: new Uint8Array([1, 2, 3]) } };
it("envia anexo visual e preserva regra e origem verificável na saída", async () => {
  const result = await extrairMaterial(input, { nome: "teste", gerar: async () => { throw Error("caminho só texto incorreto"); }, gerarComAnexos: async (_s, _p, anexos) => {
    expect(anexos).toEqual([{ mime: "application/pdf", dadosBase64: "AQID" }]);
    return JSON.stringify({ fatos: [{ campo: "proibicao", texto: "Não usar superlativos", evidencia: "página 1" }], cores: [{ hex: "#0055AA", origem: "declarada", evidencia: "página 2" }], avisos: [] });
  } });
  expect(result.fatos[0].texto).toBe("Não usar superlativos"); expect(result.cores[0].hex).toBe("#0055AA"); expect(result.nome).toBe("Manual");
});
it("não finge extrair visual sem modelo; texto pode ficar manual sem perder 20 mil caracteres", async () => {
  await expect(extrairMaterial(input, null)).rejects.toThrow(/IA/);
  const m = await extrairMaterial({ nome: "Notas", origem: "notion", texto: "x".repeat(20_000) }, null);
  expect(m.texto_manual).toHaveLength(20_000); expect(m.avisos.join()).toMatch(/manual/i);
});
it("rejeita saída inválida e não expõe erro cru do provedor", async () => {
  await expect(extrairMaterial(input, { nome: "teste", gerar: async () => "", gerarComAnexos: async () => "not json" })).rejects.toThrow(/resposta/);
  await expect(extrairMaterial(input, { nome: "teste", gerar: async () => "", gerarComAnexos: async () => { throw Error("API key SEGREDO payload privado"); } })).rejects.not.toThrow(/SEGREDO/);
});
it("monta payloads multimodais conforme tipo do arquivo", () => {
  expect(partesGemini("Oi", [{ mime: "application/pdf", dadosBase64: "AQID" }])).toEqual([{ text: "Oi" }, { inlineData: { mimeType: "application/pdf", data: "AQID" } }]);
  expect(blocosClaude("Oi", [{ mime: "image/png", dadosBase64: "AQID" }])[1]).toEqual({ type: "image", source: { type: "base64", media_type: "image/png", data: "AQID" } });
});
it("Gemini limita saída multimodal e rejeita resposta cortada", async () => {
  vi.stubEnv("GEMINI_API_KEY", "test-only"); vi.stubEnv("DEMO_MODE", "0"); vi.stubEnv("LLM_PROVIDER", "gemini");
  let body: Record<string, unknown> = {};
  vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => {
    body = JSON.parse(init.body as string);
    return Response.json({ candidates: [{ finishReason: "MAX_TOKENS", content: { parts: [{ text: "{}" }] } }] });
  });
  await expect(provedorConfigurado()!.gerarComAnexos!("s", "p", [])).rejects.toThrow();
  expect(body.generationConfig).toMatchObject({ maxOutputTokens: 6000 });
});
