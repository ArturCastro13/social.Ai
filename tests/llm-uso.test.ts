import { afterEach, beforeEach, expect, it, vi } from "vitest";

const create = vi.fn();
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create, stream: vi.fn() };
  },
}));

import { linhaUso, provedorConfigurado } from "@/lib/llm";

const uso = (extra: Record<string, unknown> = {}) => ({ input_tokens: 1200, output_tokens: 340, ...extra });

beforeEach(() => {
  vi.stubEnv("DEMO_MODE", "");
  vi.stubEnv("LLM_PROVIDER", "claude");
  vi.stubEnv("ANTHROPIC_API_KEY", "sk-teste");
  vi.stubEnv("GEMINI_API_KEY", "");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  create.mockReset();
});

it("linha de uso traz tokens, cache, buscas e tempo, sem conteúdo", () => {
  const linha = linhaUso("claude-sonnet-5", "pesquisar", { ...uso(), cache_read_input_tokens: 800, cache_creation_input_tokens: 50, server_tool_use: { web_search_requests: 3 } } as never, 2150);
  expect(linha).toBe("[ia] pesquisar claude-sonnet-5 entrada=1200 saida=340 cache_leitura=800 cache_escrita=50 buscas=3 2150ms");
});

it("linha de uso omite cache e buscas quando zerados", () => {
  expect(linhaUso("claude-haiku-4-5", "gerar", { ...uso(), cache_read_input_tokens: 0, cache_creation_input_tokens: null } as never, 90)).toBe(
    "[ia] gerar claude-haiku-4-5 entrada=1200 saida=340 90ms",
  );
});

it("chamada com anexos também registra o uso", async () => {
  const info = vi.spyOn(console, "info").mockImplementation(() => {});
  create.mockResolvedValue({ stop_reason: "end_turn", usage: uso(), content: [{ type: "text", text: "{}" }] });
  await provedorConfigurado("rapido")!.gerarComAnexos!("sistema", "prompt com segredo", []);
  expect(info).toHaveBeenCalledTimes(1);
  const linha = String(info.mock.calls[0][0]);
  expect(linha).toMatch(/^\[ia\] anexos claude-haiku-4-5 entrada=1200 saida=340 \d+ms$/);
  expect(linha).not.toContain("segredo");
});

it("falha da API vira linha de erro com o tipo, sem a mensagem", async () => {
  const error = vi.spyOn(console, "error").mockImplementation(() => {});
  class APIConnectionError extends Error { name = "APIConnectionError"; }
  create.mockRejectedValue(new APIConnectionError("detalhe do prompt com segredo"));
  await expect(provedorConfigurado("rapido")!.gerarComAnexos!("s", "p", [])).rejects.toThrow();
  const linha = String(error.mock.calls[0][0]);
  expect(linha).toMatch(/^\[ia\] anexos claude-haiku-4-5 falhou APIConnectionError \d+ms$/);
  expect(linha).not.toContain("segredo");
});
