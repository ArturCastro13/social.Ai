import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const bridge = vi.hoisted(() => ({
  options: null as null | { cookies: { getAll: () => unknown; setAll: (items: { name: string; value: string; options: object }[], headers: Record<string, string>) => void } },
  set: vi.fn(),
}));
vi.mock("@supabase/ssr", () => ({
  createServerClient: (_url: string, _key: string, options: typeof bridge.options) => {
    bridge.options = options;
    const refresh = () => options!.cookies.setAll([{ name: "sb-access", value: "refreshed", options: { path: "/", httpOnly: true } }], { "cache-control": "private, no-store" });
    return { auth: {
      verifyOtp: async () => { refresh(); return { error: null }; },
      getUser: async () => { refresh(); return { data: { user: { id: "verified-user" } }, error: null }; },
    } };
  },
}));
vi.mock("next/headers", () => ({ cookies: async () => ({ getAll: () => [], set: bridge.set }) }));

import { createSessionClient } from "@/lib/auth/server";
import { refreshSession } from "@/lib/auth/proxy";
import { POST as verifyOtp } from "@/app/api/auth/verify/route";

afterEach(() => { vi.unstubAllEnvs(); bridge.set.mockReset(); });

describe("propagação de cookies SSR", () => {
  it("grava o cookie atualizado no contexto da rota", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-example");
    bridge.set.mockReset();
    await createSessionClient();
    bridge.options!.cookies.setAll([{ name: "sb-access", value: "refreshed", options: { httpOnly: true, path: "/" } }], {});
    expect(bridge.set).toHaveBeenCalledWith("sb-access", "refreshed", { httpOnly: true, path: "/" });
  });

  it("proxy devolve cookie atualizado e resposta não cacheável", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-example");
    const response = await refreshSession(new NextRequest("https://example.test/api/auth/session"));
    expect(response.cookies.get("sb-access")?.value).toBe("refreshed");
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("não confirma OTP se o cookie da sessão não puder ser persistido", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-example");
    vi.stubEnv("APP_ORIGIN", "https://example.test");
    vi.stubEnv("BILLING_MODE", "test");
    bridge.set.mockImplementation(() => { throw new Error("cookie write failed"); });

    const response = await verifyOtp(new Request("https://example.test/api/auth/verify", {
      method: "POST",
      headers: { origin: "https://example.test" },
      body: JSON.stringify({ email: "person@example.test", code: "123456" }),
    }));

    expect(response.status).toBe(503);
    expect(await response.json()).not.toEqual({ ok: true });
  });
});
