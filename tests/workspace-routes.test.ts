import { beforeEach, describe, expect, it, vi } from "vitest";

const bridge = vi.hoisted(() => ({
  scope: vi.fn(), load: vi.fn(), save: vi.fn(), remove: vi.fn(),
}));
vi.mock("@/lib/auth/scope", () => ({ requireScope: bridge.scope }));
vi.mock("@/lib/workspace/drafts", () => ({ loadDraft: bridge.load, saveDraft: bridge.save, deleteDraft: bridge.remove }));

import { GET, PATCH, DELETE } from "@/app/api/workspace/drafts/[id]/route";
import { POST } from "@/app/api/workspace/drafts/route";

const id = "11111111-1111-4111-8111-111111111111";
const scope = { userId: "22222222-2222-4222-8222-222222222222", workspaceId: "33333333-3333-4333-8333-333333333333" };
const ctx = { params: Promise.resolve({ id }) };
const body = { brand: null, preferencias: {}, contexto: null, personalizacoes: {} };

beforeEach(() => {
  vi.stubEnv("APP_ORIGIN", "https://example.test");
  bridge.scope.mockReset().mockResolvedValue(scope);
  bridge.load.mockReset().mockResolvedValue({ id, workspaceId: scope.workspaceId, version: 1, body });
  bridge.save.mockReset().mockResolvedValue({ id, workspaceId: scope.workspaceId, version: 1, body });
  bridge.remove.mockReset().mockResolvedValue(undefined);
});

describe("rotas privadas de rascunho", () => {
  it("GET devolve conteúdo próprio com cache desabilitado", async () => {
    const response = await GET(new Request(`https://example.test/api/workspace/drafts/${id}`), ctx);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(await response.json()).toMatchObject({ id, version: 1 });
    expect(bridge.load).toHaveBeenCalledWith(scope, id);
  });

  it("bloqueia mutações de outra origem antes de persistir", async () => {
    const headers = { origin: "https://evil.test", "content-type": "application/json" };
    const create = await POST(new Request("https://example.test/api/workspace/drafts", { method: "POST", headers, body: JSON.stringify({ expectedVersion: 0, body }) }));
    const update = await PATCH(new Request(`https://example.test/api/workspace/drafts/${id}`, { method: "PATCH", headers, body: JSON.stringify({ expectedVersion: 1, body }) }), ctx);
    const remove = await DELETE(new Request(`https://example.test/api/workspace/drafts/${id}`, { method: "DELETE", headers }), ctx);
    expect([create.status, update.status, remove.status]).toEqual([403, 403, 403]);
    expect(bridge.save).not.toHaveBeenCalled();
    expect(bridge.remove).not.toHaveBeenCalled();
  });
});
