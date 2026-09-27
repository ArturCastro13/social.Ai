export type BillingMode = "disabled" | "test";

export function billingMode(): BillingMode {
  const value = process.env.BILLING_MODE?.trim() || "disabled";
  if (value === "disabled" || value === "test") return value;
  throw new Error("Modo de cobrança inválido; apenas sandbox é permitido.");
}

export function appOrigin(): string {
  const raw = process.env.APP_ORIGIN;
  if (!raw) throw new Error("APP_ORIGIN não configurada.");
  const url = new URL(raw);
  if (url.origin !== raw.replace(/\/$/, "") || (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname)))) {
    throw new Error("APP_ORIGIN inválida.");
  }
  return url.origin;
}

export function stripeTestConfig() {
  if (billingMode() !== "test") throw new Error("Cobrança desabilitada.");
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const priceId = process.env.STRIPE_TEST_PRICE_ID;
  if (!secretKey?.startsWith("sk_test_") || !webhookSecret?.startsWith("whsec_") || !priceId?.startsWith("price_")) {
    throw new Error("Configuração Stripe sandbox incompleta ou inválida.");
  }
  return {
    secretKey,
    webhookSecret,
    priceId,
    portalConfigurationId: process.env.STRIPE_TEST_PORTAL_CONFIGURATION_ID || undefined,
    origin: appOrigin(),
  };
}

/** Stripe identifiers alone are insufficient: reject live objects returned by its API. */
export function assertStripeTestObject(value: { livemode?: boolean }): void {
  if (value.livemode !== false) throw new Error("Objeto Stripe não confirmado como sandbox.");
}
