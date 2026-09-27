import { afterEach, expect, it, vi } from "vitest";

const { createServerClient } = vi.hoisted(() => ({ createServerClient: vi.fn() }));
vi.mock("@supabase/ssr", () => ({ createServerClient, createBrowserClient: vi.fn() }));

import { NextRequest } from "next/server";
import { proxy } from "@/proxy";
import { requireScope } from "@/lib/auth/scope";

afterEach(() => {
  vi.unstubAllEnvs();
  createServerClient.mockReset();
});

it("com a assinatura desligada, o proxy não chama o Supabase nem mexe no cache do /app", async () => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://exemplo.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");
  for (const modo of ["", "disabled", "live", "qualquer"]) {
    vi.stubEnv("BILLING_MODE", modo);
    const res = await proxy(new NextRequest("https://social-ai-beige.vercel.app/app"));
    expect(res.headers.get("cache-control"), modo).toBeNull();
  }
  expect(createServerClient).not.toHaveBeenCalled();
});

it("com a assinatura desligada, rotas privadas respondem indisponível sem tocar no Supabase", async () => {
  for (const modo of ["", "disabled", "live"]) {
    vi.stubEnv("BILLING_MODE", modo);
    await expect(requireScope()).rejects.toMatchObject({ status: 503, code: "billing_disabled" });
  }
  expect(createServerClient).not.toHaveBeenCalled();
});
