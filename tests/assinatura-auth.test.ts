import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({
  getUser: vi.fn(),
  getSession: vi.fn(),
  rpc: vi.fn(),
  signInWithOtp: vi.fn(),
  verifyOtp: vi.fn(),
  signOut: vi.fn(),
}));
vi.mock("@/lib/auth/server", () => ({ createSessionClient: () => ({ auth, rpc: auth.rpc }) }));

import { requireScope } from "@/lib/auth/scope";
import { requireAppOrigin, privateJson } from "@/lib/auth/http";
import { POST as requestOtp } from "@/app/api/auth/otp/route";
import { POST as verifyOtp } from "@/app/api/auth/verify/route";
import { GET as getSession } from "@/app/api/auth/session/route";

beforeEach(() => {
  vi.stubEnv("APP_ORIGIN", "https://example.test");
  vi.stubEnv("BILLING_MODE", "test");
  auth.getUser.mockReset();
  auth.getSession.mockReset();
  auth.rpc.mockReset();
  auth.signInWithOtp.mockReset();
  auth.verifyOtp.mockReset();
  auth.signOut.mockReset();
});

describe("identidade verificada", () => {
  it("recusa cookie forjado mesmo com getSession preenchido", async () => {
    auth.getSession.mockResolvedValue({ data: { session: { user: { id: "forged" } } }, error: null });
    auth.getUser.mockResolvedValue({ data: { user: null }, error: new Error("invalid JWT") });
    await expect(requireScope()).rejects.toMatchObject({ status: 401 });
    expect(auth.rpc).not.toHaveBeenCalled();
  });

  it("recusa sessão expirada", async () => {
    auth.getUser.mockResolvedValue({ data: { user: null }, error: new Error("session expired") });
    await expect(requireScope()).rejects.toMatchObject({ status: 401 });
  });

  it("não inventa workspace quando RPC falha", async () => {
    auth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    auth.rpc.mockResolvedValue({ data: null, error: new Error("RPC missing") });
    await expect(requireScope()).rejects.toMatchObject({ status: 503 });
  });

  it("recusa identificador de workspace que não é UUID", async () => {
    auth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    auth.rpc.mockResolvedValue({ data: "workspace-forged", error: null });
    await expect(requireScope()).rejects.toMatchObject({ status: 503 });
  });

  it("usa exclusivamente usuário verificado e workspace da RPC", async () => {
    auth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    auth.rpc.mockResolvedValue({ data: "11111111-1111-4111-8111-111111111111", error: null });
    await expect(requireScope()).resolves.toEqual({ userId: "user-1", workspaceId: "11111111-1111-4111-8111-111111111111" });
    expect(auth.rpc).toHaveBeenCalledWith("ensure_workspace");
  });
});

describe("HTTP privado", () => {
  it("recusa origem cruzada em mutações", () => {
    expect(() => requireAppOrigin(new Request("https://example.test/api/auth/otp", {
      method: "POST", headers: { origin: "https://evil.test" },
    }))).toThrowError(expect.objectContaining({ status: 403 }));
  });

  it("não envia CORS aberto nem permite cache", () => {
    const response = privateJson({ ok: true });
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("bloqueia OTP de outra origem antes de chamar Auth", async () => {
    const result = await requestOtp(new Request("https://example.test/api/auth/otp", {
      method: "POST", headers: { origin: "https://evil.test" }, body: JSON.stringify({ email: "a@example.test" }),
    }));
    expect(result.status).toBe(403);
    expect(auth.signInWithOtp).not.toHaveBeenCalled();
  });

  it("preserva limite de frequência do provedor sem expor detalhes", async () => {
    auth.signInWithOtp.mockResolvedValue({ error: { status: 429, message: "internal account detail" } });
    const result = await requestOtp(new Request("https://example.test/api/auth/otp", {
      method: "POST", headers: { origin: "https://example.test" }, body: JSON.stringify({ email: "a@example.test" }),
    }));
    expect(result.status).toBe(429);
    expect(await result.text()).not.toContain("internal account detail");
  });

  it("não revela pelo resultado do OTP se o endereço existe", async () => {
    const request = () => new Request("https://example.test/api/auth/otp", {
      method: "POST", headers: { origin: "https://example.test" }, body: JSON.stringify({ email: "a@example.test" }),
    });
    auth.signInWithOtp.mockResolvedValueOnce({ error: null }).mockResolvedValueOnce({ error: { status: 400, message: "user not found" } });
    const accepted = await requestOtp(request());
    const unknown = await requestOtp(request());
    expect(unknown.status).toBe(accepted.status);
    expect(await unknown.json()).toEqual(await accepted.json());
  });

  it("normaliza e-mail antes de solicitar OTP", async () => {
    auth.signInWithOtp.mockResolvedValue({ error: null });
    const result = await requestOtp(new Request("https://example.test/api/auth/otp", {
      method: "POST", headers: { origin: "https://example.test" }, body: JSON.stringify({ email: " A@EXAMPLE.TEST " }),
    }));
    expect(result.status).toBe(200);
    expect(auth.signInWithOtp).toHaveBeenCalledWith({ email: "a@example.test", options: { shouldCreateUser: true } });
  });

  it("não confirma OTP sem verificar usuário no servidor", async () => {
    auth.verifyOtp.mockResolvedValue({ error: null });
    auth.getUser.mockResolvedValue({ data: { user: null }, error: new Error("expired") });
    const result = await verifyOtp(new Request("https://example.test/api/auth/verify", {
      method: "POST", headers: { origin: "https://example.test" }, body: JSON.stringify({ email: "a@example.test", code: "123456" }),
    }));
    expect(result.status).toBe(401);
  });

  it("não apresenta sessão forjada como autenticada", async () => {
    auth.getSession.mockResolvedValue({ data: { session: { user: { id: "forged" } } }, error: null });
    auth.getUser.mockResolvedValue({ data: { user: null }, error: new Error("invalid JWT") });
    const result = await getSession();
    expect(await result.json()).toEqual({ enabled: true, authenticated: false });
  });
});
