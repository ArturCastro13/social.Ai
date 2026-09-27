import { expect, it } from "vitest";
import { lerCorpoLimitado, protegerOrigem, criarLimitador } from "@/lib/contexto/requisicao";
import { POST } from "@/app/api/materiais/route";
it("limita corpo chunked sem Content-Length", async () => {
  const stream = new ReadableStream({ start(c) { c.enqueue(new Uint8Array(8)); c.enqueue(new Uint8Array(8)); c.close(); } });
  const req = new Request("http://localhost/api/materiais", { method: "POST", body: stream, duplex: "half" } as RequestInit);
  await expect(lerCorpoLimitado(req, 10)).rejects.toThrow(/tamanho/);
});
it("nega origem cruzada", () => {
  expect(() => protegerOrigem(new Request("http://localhost/api/materiais", { headers: { origin: "https://malicioso.com" } }))).toThrow();
});
it("compara a origem com o Host recebido quando Next normaliza a URL interna", () => {
  expect(() => protegerOrigem(new Request("http://localhost:3001/api/materiais", { headers: { host: "127.0.0.1:3001", origin: "http://127.0.0.1:3001", "sec-fetch-site": "same-origin" } }))).not.toThrow();
  expect(() => protegerOrigem(new Request("http://localhost:3001/api/materiais", { headers: { host: "127.0.0.1:3001", origin: "https://malicioso.com" } }))).toThrow();
  expect(() => protegerOrigem(new Request("http://localhost:3001/api/materiais", { headers: { host: "127.0.0.1:3001", origin: "http://localhost:3001" } }))).toThrow();
});
it("limita simultaneidade, frequência e libera após erro", async () => {
  const reserve = criarLimitador(); const a = reserve("a"), b = reserve("b");
  expect(() => reserve("c")).toThrow(); a(); b();
  for (let i = 0; i < 14; i++) reserve("a")();
  expect(() => reserve("a")).toThrow();
  expect(() => reserve("novo")()).not.toThrow();
});
it("rota rejeita arquivo inválido e JSON quebrado antes de precisar de provedor", async () => {
  const form = new FormData(); form.set("arquivo", new File(["não sou png"], "marca.png", { type: "image/png" }));
  const r = await POST(new Request("http://localhost/api/materiais", { method: "POST", body: form }));
  expect(r.status).toBe(400);
  const bad = await POST(new Request("http://localhost/api/materiais", { method: "POST", headers: { "content-type": "application/json" }, body: "{" }));
  expect(bad.status).toBe(400); expect(bad.headers.get("cache-control")).toBe("no-store");
});
