import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const banco = vi.hoisted(() => ({ tipo: "supabase" as "supabase" | "local", listarLeads: vi.fn() }));
vi.mock("@/lib/store", () => ({ store: banco }));
import { GET } from "@/app/api/admin/lista-de-espera/route";

const pedir = (senha?: string) =>
  GET(new Request("http://localhost/api/admin/lista-de-espera", { headers: senha === undefined ? {} : { "x-admin-password": senha } }));

const leads = [
  { email: "a@x.com", nome: "Ana", empresa: "Antiga", origem: "lista-de-espera", criado_em: "2026-09-20T10:00:00.000Z" },
  { email: "b@x.com", empresa: "Download", origem: "download", criado_em: "2026-09-25T10:00:00.000Z" },
  { email: "c@x.com", nome: "Caio", empresa: "Nova", origem: "lista-de-espera", criado_em: "2026-09-26T10:00:00.000Z" },
  { email: "a@x.com", empresa: null, origem: "lista-de-espera", criado_em: "2026-09-22T10:00:00.000Z" },
];

describe("GET /api/admin/lista-de-espera", () => {
  beforeEach(() => {
    banco.tipo = "supabase";
    banco.listarLeads.mockReset().mockResolvedValue(leads);
    vi.stubEnv("ADMIN_PASSWORD", "segredo");
  });
  afterEach(() => vi.unstubAllEnvs());

  it.each([undefined, "", "errada"])("recusa sem a senha certa (%s)", async (senha) => {
    const r = await pedir(senha);
    expect(r.status).toBe(401);
    expect(banco.listarLeads).not.toHaveBeenCalled();
  });

  it("fica fechada em produção sem ADMIN_PASSWORD", async () => {
    vi.stubEnv("ADMIN_PASSWORD", "");
    vi.stubEnv("VERCEL", "1");
    expect((await pedir()).status).toBe(401);
  });

  it("pede ao banco só a origem lista-de-espera e devolve as mais novas primeiro", async () => {
    const r = await pedir("segredo");
    expect(r.status).toBe(200);
    expect(banco.listarLeads).toHaveBeenCalledWith("lista-de-espera");
    const d = await r.json();
    expect(d.total).toBe(3);
    expect(d.persistente).toBe(true);
    expect(d.itens).toEqual([
      { nome: "Caio", empresa: "Nova", email: "c@x.com", criado_em: "2026-09-26T10:00:00.000Z" },
      { nome: "", empresa: "", email: "a@x.com", criado_em: "2026-09-22T10:00:00.000Z" },
      { nome: "Ana", empresa: "Antiga", email: "a@x.com", criado_em: "2026-09-20T10:00:00.000Z" },
    ]);
  });

  it("funciona sem banco, avisando que não é persistente", async () => {
    banco.tipo = "local";
    const d = await (await pedir("segredo")).json();
    expect(d.persistente).toBe(false);
    expect(d.total).toBe(3);
  });

  it("falha do banco vira 500 sem expor detalhes", async () => {
    banco.listarLeads.mockRejectedValue(new Error("private database details"));
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const r = await pedir("segredo");
    expect(r.status).toBe(500);
    expect(await r.text()).not.toContain("private database details");
  });
});
