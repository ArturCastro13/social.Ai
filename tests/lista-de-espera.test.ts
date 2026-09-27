import { beforeEach, describe, expect, it, vi } from "vitest";

const banco = vi.hoisted(() => ({ tipo: "supabase", salvarLead: vi.fn() }));
vi.mock("@/lib/store", () => ({ store: banco }));
import { POST } from "@/app/api/lista-de-espera/route";

const enviar = (dados: unknown) => POST(new Request("http://localhost/api/lista-de-espera", {
  method: "POST", body: JSON.stringify(dados), headers: { "content-type": "application/json" },
}));

describe("inscrição na lista de espera", () => {
  beforeEach(() => { banco.tipo = "supabase"; banco.salvarLead.mockReset().mockResolvedValue(undefined); });
  it("normaliza o endereço e identifica a origem antes de confirmar", async () => {
    const resposta = await enviar({ nome: "  Ana Souza  ", empresa: "  Minha Empresa  ", email: " Founder@Example.com " });
    expect(resposta.status).toBe(200);
    expect(await resposta.json()).toEqual({ ok: true });
    expect(banco.salvarLead).toHaveBeenCalledWith({ nome: "Ana Souza", empresa: "Minha Empresa", email: "founder@example.com", origem: "lista-de-espera" });
  });
  it.each([{ email: "inválido" }, { email: "" }, { email: "founder@example.com", website: "spam" }])("recusa dados inválidos ou honeypot preenchido", async (dados) => {
    expect((await enviar({ nome: "Ana Souza", empresa: "Minha Empresa", ...dados })).status).toBe(400);
    expect(banco.salvarLead).not.toHaveBeenCalled();
  });
  it.each([undefined, null, "", "   ", "A", "x".repeat(121), 42])("recusa nome da empresa inválido: %s", async (empresa) => {
    expect((await enviar({ nome: "Ana Souza", empresa, email: "founder@example.com" })).status).toBe(400);
    expect(banco.salvarLead).not.toHaveBeenCalled();
  });
  it.each(["AB", "x".repeat(120)])("aceita nome da empresa nos limites de tamanho", async (empresa) => {
    expect((await enviar({ nome: "Ana Souza", empresa, email: "founder@example.com" })).status).toBe(200);
    expect(banco.salvarLead).toHaveBeenCalledWith({ nome: "Ana Souza", empresa, email: "founder@example.com", origem: "lista-de-espera" });
  });
  it.each([undefined, null, "", "   ", "A", "x".repeat(121), 42])("recusa nome da pessoa inválido: %s", async (nome) => {
    const r = await enviar({ nome, empresa: "Minha Empresa", email: "founder@example.com" });
    expect(r.status).toBe(400);
    expect((await r.json()).erro).toMatch(/seu nome/);
    expect(banco.salvarLead).not.toHaveBeenCalled();
  });
  it.each(["Al", "x".repeat(120)])("aceita nome da pessoa nos limites de tamanho", async (nome) => {
    expect((await enviar({ nome, empresa: "Minha Empresa", email: "founder@example.com" })).status).toBe(200);
    expect(banco.salvarLead).toHaveBeenCalledWith({ nome, empresa: "Minha Empresa", email: "founder@example.com", origem: "lista-de-espera" });
  });
  it("não confirma sem banco permanente", async () => {
    banco.tipo = "local";
    expect((await enviar({ nome: "Ana Souza", empresa: "Minha Empresa", email: "founder@example.com" })).status).toBe(503);
    expect(banco.salvarLead).not.toHaveBeenCalled();
  });
  it("mostra falha de gravação sem expor detalhes internos", async () => {
    banco.salvarLead.mockRejectedValue(new Error("private database details"));
    const resposta = await enviar({ nome: "Ana Souza", empresa: "Minha Empresa", email: "founder@example.com" });
    expect(resposta.status).toBe(503);
    expect(await resposta.text()).not.toContain("private database details");
  });
  it("recusa payload grande mesmo sem content-length", async () => {
    expect((await enviar({ nome: "Ana Souza", empresa: "Minha Empresa", email: "founder@example.com", extra: "x".repeat(2100) })).status).toBe(413);
    expect(banco.salvarLead).not.toHaveBeenCalled();
  });
  it("trata JSON inválido", async () => {
    expect((await POST(new Request("http://localhost/api/lista-de-espera", { method: "POST", body: "{" }))).status).toBe(400);
  });
});
