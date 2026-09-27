import { describe, expect, it } from "vitest";
import { createBillingHarness } from "./helpers/assinatura";
import type { RemoteSubscription } from "@/lib/billing/contrato";

describe("checkout sandbox recuperável", () => {
  const subscription = (status: RemoteSubscription["status"], id = "sub_1"): RemoteSubscription => ({ id, livemode: false, customerId: "cus_test_customer", status, priceId: "price_test_monthly", subscriptionItemId: "si_1", cancelAtPeriodEnd: false, periodStart: "2026-09-01T00:00:00Z", periodEnd: "2026-10-01T00:00:00Z", latestInvoiceId: null });
  it.each(["active", "incomplete", "unpaid"] as const)("reconcilia conclusão durante expiração e preserva %s", async status => {
    const h = createBillingHarness();
    await h.start();
    h.changeDraft();
    h.onExpire(() => {
      h.tamperSession(s => { s.status = "complete"; s.subscriptionId = "sub_1"; });
      h.setSubscriptions([subscription(status)]);
    });
    expect(await h.start()).toMatchObject({ kind: "billing_state", status });
    expect(h.sessions()).toHaveLength(1);
    expect(h.getAttempt()?.state).toBe("open");
  });
  it("bloqueia recompra quando consulta da assinatura concluída falha", async () => {
    const h = createBillingHarness();
    await h.start();
    h.tamperSession(s => { s.status = "complete"; s.subscriptionId = "sub_unknown"; });
    await expect(h.start()).rejects.toThrow("unknown subscription");
    expect(h.sessions()).toHaveLength(1);
    expect(h.getAttempt()?.state).toBe("open");
  });
  it("detecta compra concorrente entre assinatura terminal e fechamento", async () => {
    const h = createBillingHarness();
    await h.start();
    h.tamperSession(s => { s.status = "complete"; s.subscriptionId = "sub_1"; });
    h.setSubscriptions([subscription("canceled")]);
    h.onReconcile(() => h.setSubscriptions([subscription("canceled"), subscription("incomplete", "sub_2")]));
    expect(await h.start()).toMatchObject({ kind: "billing_state", status: "incomplete" });
    expect(h.getAttempt()?.state).toBe("open");
    expect(h.sessions()).toHaveLength(1);
  });
  it("falha de fencing no fechamento não cria compra", async () => {
    const h = createBillingHarness();
    await h.start();
    h.tamperSession(s => { s.status = "complete"; s.subscriptionId = "sub_1"; });
    h.setSubscriptions([subscription("canceled")]);
    h.onReconcile(() => { h.getAttempt()!.leaseToken = "replacement-worker"; });
    await expect(h.start()).rejects.toMatchObject({ code: "billing_write_failed" });
    expect(h.getAttempt()?.state).toBe("open");
    expect(h.sessions()).toHaveLength(1);
  });
  it.each(["canceled", "incomplete_expired"] as const)("permite recompra explícita após sessão completa e assinatura %s", async status => {
    const h = createBillingHarness();
    await h.start();
    const sub: RemoteSubscription = { id: "sub_1", livemode: false, customerId: "cus_test_customer", status: "active", priceId: "price_test_monthly", subscriptionItemId: "si_1", cancelAtPeriodEnd: false, periodStart: "2026-09-01T00:00:00Z", periodEnd: "2026-10-01T00:00:00Z", latestInvoiceId: null };
    h.tamperSession(s => { s.status = "complete"; s.subscriptionId = sub.id; });
    h.setSubscriptions([sub]);
    expect(await h.start()).toMatchObject({ kind: "billing_state", status: "active" });
    h.setSubscriptions([{ ...sub, status }]);
    const next = await h.startDraft(h.createDraft());
    expect(next.kind).toBe("checkout");
    expect(h.sessions()).toHaveLength(2);
  });

  it("mantém sessão completa sem assinatura conhecida bloqueada", async () => {
    const h = createBillingHarness();
    await h.start();
    h.tamperSession(s => { s.status = "complete"; });
    expect(await h.start()).toMatchObject({ kind: "operator_required", reason: "unknown_outcome" });
    expect(h.sessions()).toHaveLength(1);
  });
  it("retoma a mesma sessão após falha da gravação local e chamadas paralelas", async () => {
    const h = createBillingHarness();
    h.failNextWrite("checkout_session");
    await expect(h.start(h.scope)).rejects.toThrow();
    const [a, b] = await Promise.all([h.start(h.scope), h.start(h.scope)]);
    expect(a.kind).toBe("checkout");
    expect(b.kind).toBe("checkout");
    if (a.kind === "checkout" && b.kind === "checkout") expect(a.sessionId).toBe(b.sessionId);
    expect(h.sessions()).toHaveLength(1);
    expect(h.frequencyCount()).toBe(1);
  });

  it("expira sessão aberta ao mudar o rascunho e cria outra tentativa", async () => {
    const h = createBillingHarness();
    const first = await h.start();
    h.changeDraft();
    const second = await h.start();
    expect(first.kind).toBe("checkout");
    expect(second.kind).toBe("checkout");
    expect(h.sessions().map(s => s.status)).toEqual(["expired", "open"]);
    expect(h.frequencyCount()).toBe(2);
  });

  it("não devolve a URL antiga quando o rascunho persistido mudou e o cliente repete a versão antiga", async () => {
    const h = createBillingHarness();
    await h.start();
    h.changeDraft();
    await expect(h.start(h.scope, 1)).rejects.toMatchObject({ code: "invalid_draft" });
    expect(h.sessions()[0].status).toBe("expired");
    expect(h.sessions()).toHaveLength(1);
  });

  it("troca Checkout aberto do rascunho A por um rascunho B válido", async () => {
    const h = createBillingHarness();
    const first = await h.start();
    const otherDraftId = h.createDraft();
    const second = await h.startDraft(otherDraftId);
    expect(first.kind).toBe("checkout");
    expect(second.kind).toBe("checkout");
    expect(h.sessions().map(s => s.status)).toEqual(["expired", "open"]);
    expect(h.getAttempt()?.draftId).toBe(otherDraftId);
  });

  it("rascunho B inexistente não expira Checkout A ainda válido", async () => {
    const h = createBillingHarness();
    const first = await h.start();
    await expect(h.startDraft(crypto.randomUUID())).rejects.toMatchObject({ code: "invalid_draft" });
    expect(h.sessions().map(s => s.status)).toEqual(["open"]);
    expect(await h.start()).toEqual(first);
  });

  it("não devolve URL de sessão que Stripe manteve aberta após tentar expirar", async () => {
    const h = createBillingHarness();
    await h.start();
    h.changeDraft();
    h.keepSessionOpenOnExpire();
    await expect(h.start()).rejects.toMatchObject({ code: "stripe_mismatch" });
    expect(h.sessions()).toHaveLength(1);
  });

  it("requer operador se resultado desconhecido ultrapassou 24 horas", async () => {
    const h = createBillingHarness();
    h.failNextWrite("checkout_session");
    await expect(h.start()).rejects.toThrow();
    h.advanceHours(25);
    expect(await h.start()).toEqual({ kind: "operator_required", reason: "unknown_outcome" });
    expect(h.sessions()).toHaveLength(1);
    expect(h.holdReason()).toBe("unknown_checkout");
  });

  it("recupera Customer com a mesma chave após falha local", async () => {
    const h = createBillingHarness();
    h.failNextWrite("customer_id");
    await expect(h.start()).rejects.toThrow();
    const result = await h.start();
    expect(result.kind).toBe("checkout");
    expect(h.sessions()).toHaveLength(1);
    expect(h.getCustomer()?.customerId).toBe("cus_test_customer");
  });

  it("bloqueia criação após Customer desconhecido envelhecer 24 horas", async () => {
    const h = createBillingHarness();
    h.failNextWrite("customer_id");
    await expect(h.start()).rejects.toThrow();
    h.advanceHours(25);
    await expect(h.start()).rejects.toMatchObject({ code: "operator_required" });
    expect(h.sessions()).toHaveLength(0);
  });

  it("bloqueia assinaturas remotas duplicadas sem criar checkout", async () => {
    const h = createBillingHarness();
    await h.start();
    const customerId = h.getCustomer()?.customerId ?? "";
    const subscription = (id: string): RemoteSubscription => ({ id, livemode: false, customerId, status: "active", priceId: "price_test_monthly", subscriptionItemId: `si_${id}`, cancelAtPeriodEnd: false, periodStart: "2026-09-01T00:00:00.000Z", periodEnd: "2026-10-01T00:00:00.000Z", latestInvoiceId: null });
    h.setSubscriptions([subscription("sub_1"), subscription("sub_2")]);
    expect(await h.start()).toEqual({ kind: "operator_required", reason: "duplicate_subscription" });
    expect(h.sessions()).toHaveLength(1);
  });

  it("mostra estado de assinatura existente sem criar nova compra", async () => {
    const h = createBillingHarness();
    await h.start();
    const customerId = h.getCustomer()?.customerId ?? "";
    h.setSubscriptions([{ id: "sub_1", livemode: false, customerId, status: "past_due", priceId: "price_test_monthly", subscriptionItemId: "si_1", cancelAtPeriodEnd: false, periodStart: "2026-09-01T00:00:00.000Z", periodEnd: "2026-10-01T00:00:00.000Z", latestInvoiceId: null }]);
    expect(await h.start()).toEqual({ kind: "billing_state", status: "past_due", portalAvailable: true });
    expect(h.sessions()).toHaveLength(1);
  });

  it("bloqueia assinatura atual em outro Price do mesmo Customer", async () => {
    const h = createBillingHarness();
    await h.start();
    h.setSubscriptions([{ id: "sub_other", livemode: false, customerId: h.getCustomer()?.customerId ?? "", status: "active", priceId: "price_other", subscriptionItemId: "si_other", cancelAtPeriodEnd: false, periodStart: "2026-09-01T00:00:00.000Z", periodEnd: "2026-10-01T00:00:00.000Z", latestInvoiceId: null }]);
    expect(await h.start()).toEqual({ kind: "operator_required", reason: "inconsistent_remote_state" });
    expect(h.sessions()).toHaveLength(1);
  });

  it("recusa sessão remota com Price adulterado", async () => {
    const h = createBillingHarness();
    await h.start();
    h.tamperSession(s => { s.priceId = "price_other"; });
    await expect(h.start()).rejects.toMatchObject({ code: "stripe_mismatch" });
  });

  it("portal só aceita o proprietário do cliente persistido", async () => {
    const h = createBillingHarness();
    await h.start();
    expect(await h.portal(h.scope)).toEqual({ url: "https://billing.stripe.test/portal" });
    await expect(h.portal({ userId: h.scope.userId, workspaceId: crypto.randomUUID() })).rejects.toMatchObject({ code: "billing_customer_missing" });
  });
});
