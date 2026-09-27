import { afterEach, describe, expect, it, vi } from "vitest";
import { assertStripeTestObject, billingMode, stripeTestConfig } from "@/lib/assinatura/config";
import { canGeneratePaid } from "@/lib/assinatura/acesso";
import type { AccessState } from "@/lib/assinatura/contrato";

afterEach(() => vi.unstubAllEnvs());

describe("configuração de assinatura sandbox", () => {
  it("começa desabilitada sem configuração", () => {
    vi.stubEnv("BILLING_MODE", "");
    expect(billingMode()).toBe("disabled");
  });

  it("recusa configuração live nesta entrega", () => {
    vi.stubEnv("BILLING_MODE", "live");
    expect(() => billingMode()).toThrow();
  });

  it("recusa segredo live mesmo em modo test", () => {
    vi.stubEnv("BILLING_MODE", "test");
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_live_exemplo");
    vi.stubEnv("STRIPE_TEST_PRICE_ID", "price_test");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_example");
    expect(() => stripeTestConfig()).toThrow();
  });

  it("recusa objeto Stripe sem livemode=false vindo da API", () => {
    expect(() => assertStripeTestObject({ livemode: true })).toThrow();
    expect(() => assertStripeTestObject({})).toThrow();
    expect(() => assertStripeTestObject({ livemode: false })).not.toThrow();
  });
});

describe("janela de acesso pago", () => {
  const state: AccessState = {
    status: "active", paidFrom: "2026-09-01T00:00:00.000Z",
    paidThrough: "2026-10-01T00:00:00.000Z", cancelAtPeriodEnd: false, riskHold: false,
  };

  it("não concede acesso apenas porque status é active", () => {
    expect(canGeneratePaid({ status: "active", paidFrom: null,
      paidThrough: null, cancelAtPeriodEnd: false, riskHold: false }, new Date())).toBe(false);
  });

  it("recusa intervalo expirado e limite final exclusivo", () => {
    expect(canGeneratePaid(state, new Date("2026-10-01T00:00:00.000Z"))).toBe(false);
    expect(canGeneratePaid(state, new Date("2026-10-02T00:00:00.000Z"))).toBe(false);
  });

  it("permite cancelamento ao fim do período até o vencimento", () => {
    expect(canGeneratePaid({ ...state, cancelAtPeriodEnd: true }, new Date("2026-09-15T00:00:00.000Z"))).toBe(true);
  });

  it("recusa bloqueio de risco e status sem pagamento", () => {
    const now = new Date("2026-09-15T00:00:00.000Z");
    expect(canGeneratePaid({ ...state, riskHold: true }, now)).toBe(false);
    expect(canGeneratePaid({ ...state, status: "unpaid" }, now)).toBe(false);
  });
});
