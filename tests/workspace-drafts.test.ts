import { describe, expect, it } from "vitest";
import { createWorkspaceHarness } from "./helpers/assinatura";
import brand from "./fixtures/marcas/omie.json";

describe("rascunhos privados", () => {
  it("isola contas e recusa salvar versão obsoleta", async () => {
    const h = createWorkspaceHarness();
    const draft = await h.save(h.a, { expectedVersion: 0, body: h.emptyBody });
    await expect(h.load(h.b, draft.id)).rejects.toMatchObject({ status: 404 });
    await h.save(h.a, { id: draft.id, expectedVersion: 1, body: h.emptyBody });
    await expect(h.save(h.a, { id: draft.id, expectedVersion: 1, body: h.emptyBody })).rejects.toMatchObject({ status: 409 });
  });

  it("exclui somente rascunho próprio", async () => {
    const h = createWorkspaceHarness();
    const draft = await h.save(h.a, { expectedVersion: 0, body: h.emptyBody });
    await expect(h.remove(h.b, draft.id)).rejects.toMatchObject({ status: 404 });
    await h.remove(h.a, draft.id);
    await expect(h.load(h.a, draft.id)).rejects.toMatchObject({ status: 404 });
  });

  it("recusa corpo malformado antes de persistir", async () => {
    const h = createWorkspaceHarness();
    await expect(h.save(h.a, { expectedVersion: 0, body: { ...h.emptyBody, brand: { nome: "parcial" } } as never })).rejects.toMatchObject({ status: 400 });
    await expect(h.save(h.a, { expectedVersion: 0, body: { ...h.emptyBody, personalizacoes: { post: { edicao: { gancho: "x".repeat(301) } } } } })).rejects.toMatchObject({ status: 400 });
  });

  it("aceita perfil de marca completo e limita o corpo UTF-8 a 150 KB", async () => {
    const h = createWorkspaceHarness();
    const valid = { ...h.emptyBody, brand } as never;
    const draft = await h.save(h.a, { expectedVersion: 0, body: valid });
    expect(draft.version).toBe(1);
    const oversized = { ...brand, paragrafos: Array.from({ length: 100 }, () => "á".repeat(1000)) };
    await expect(h.save(h.a, { id: draft.id, expectedVersion: 1, body: { ...h.emptyBody, brand: oversized } as never })).rejects.toMatchObject({ status: 413 });
  });

  it("mantém contexto canônico e rejeita cópia divergente", async () => {
    const h = createWorkspaceHarness();
    const contexto = { versao: 1, empresa: "Acme", revisao: 0,
      entendimento: { negocio: "Vendas", segmento: "B2B", publico: "PME", nicho: "saas-b2b", evidencias: [], duvidas: [], fonte: "manual" },
      materiais: [] } as const;
    const body = { ...h.emptyBody, contexto, preferencias: { ...h.emptyBody.preferencias, contexto_empresa: contexto } };
    const draft = await h.save(h.a, { expectedVersion: 0, body: body as never });
    expect(draft.body.contexto).toEqual(contexto);
    expect(draft.body.preferencias.contexto_empresa).toBeUndefined();
    await expect(h.save(h.a, { expectedVersion: 0, body: {
      ...body, preferencias: { ...h.emptyBody.preferencias, contexto_empresa: { ...contexto, empresa: "Outra" } },
    } as never })).rejects.toMatchObject({ status: 400 });
  });
});
