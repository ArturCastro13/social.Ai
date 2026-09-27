import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { createUsageService, TEST_LIMITS, type UsageRepository, type UsageRecord } from "@/lib/workspace/usage";

function createUsageHarness(limit = 1) {
  const scope = { userId: randomUUID(), workspaceId: randomUUID() };
  const draftId = randomUUID();
  const rows = new Map<string, UsageRecord>();
  let snapshotUsable = true;
  let accessValid = true;
  let lock = Promise.resolve();
  const atomic = async <T>(fn: () => T): Promise<T> => {
    const previous = lock;
    let unlock = () => {};
    lock = new Promise<void>(resolve => { unlock = resolve; });
    await previous;
    try { return fn(); } finally { unlock(); }
  };
  const repo: UsageRepository = {
    reserve: (_scope, input) => atomic(() => {
      const prior = rows.get(input.operationId);
      if (prior) {
        if (prior.requestHash !== input.requestHash) return { status: "conflict" };
        return { status: "ok", record: prior };
      }
      if (!snapshotUsable) return { status: "conflict" };
      if (!accessValid) return { status: "quota" };
      if ([...rows.values()].filter(r => r.state !== "released").length >= limit) return { status: "quota" };
      const record: UsageRecord = { operationId: input.operationId, state: "reserved", resultId: null, requestHash: input.requestHash };
      rows.set(input.operationId, record);
      return { status: "ok", record };
    }),
    transition: (_scope, operationId, from, to, resultId) => atomic(() => {
      const row = rows.get(operationId);
      if (!row || row.state !== from) return false;
      if (to === "started" && (!snapshotUsable || !accessValid)) return false;
      rows.set(operationId, { ...row, state: to, resultId: resultId ?? null });
      return true;
    }),
  };
  const service = createUsageService(repo);
  const reserve = (operationId: string, requestHash?: string) => service.reserve(scope, { operationId, kind: "image_generate", draftId, draftVersion: 1, requestHash });
  return { scope, reserve, service, revokeSnapshot: () => { snapshotUsable = false; },
    blockAccess: () => { accessValid = false; }, used: () => [...rows.values()].filter(r => r.state !== "released").length };
}

describe("reservas de uso", () => {
  it("não libera duas operações quando resta apenas uma", async () => {
    const h = createUsageHarness();
    const r = await Promise.allSettled([h.reserve(randomUUID()), h.reserve(randomUUID())]);
    expect(r.filter(x => x.status === "fulfilled")).toHaveLength(1);
    expect(h.used()).toBe(1);
  });

  it("reaproveita operação concluída sem gastar cota e recusa corpo alterado", async () => {
    const h = createUsageHarness();
    const id = randomUUID();
    await h.reserve(id, "fingerprint-one");
    await h.service.markStarted(h.scope, id);
    await h.service.finish(h.scope, id, randomUUID());
    expect((await h.reserve(id, "fingerprint-one")).state).toBe("completed");
    expect(h.used()).toBe(1);
    await expect(h.reserve(id, "fingerprint-two")).rejects.toMatchObject({ status: 409 });
  });

  it("não devolve operação iniciada após timeout", async () => {
    const h = createUsageHarness();
    const id = randomUUID();
    await h.reserve(id);
    await h.service.markStarted(h.scope, id);
    await h.service.releaseUnused(h.scope, id);
    expect((await h.reserve(id)).state).toBe("started");
    expect(h.used()).toBe(1);
  });

  it("registra outcome incerto e exige recuperação explícita", async () => {
    const h = createUsageHarness();
    const id = randomUUID();
    await h.reserve(id);
    await h.service.markStarted(h.scope, id);
    await h.service.markUncertain(h.scope, id);
    expect((await h.reserve(id)).state).toBe("uncertain");
    await expect(h.service.markStarted(h.scope, id)).rejects.toMatchObject({ status: 409 });
  });

  it("não inicia reserva após revogação nem cria outra, mas permite consultar seu estado", async () => {
    const h = createUsageHarness();
    const id = randomUUID();
    await h.reserve(id);
    h.revokeSnapshot();
    await expect(h.service.markStarted(h.scope, id)).rejects.toMatchObject({ status: 409 });
    expect((await h.reserve(id)).state).toBe("reserved");
    await expect(h.reserve(randomUUID())).rejects.toMatchObject({ status: 409 });
  });

  it("não inicia após perda de acesso e mantém resultado histórico consultável", async () => {
    const h = createUsageHarness(2);
    const blocked = randomUUID();
    const completed = randomUUID();
    await h.reserve(blocked);
    await h.reserve(completed);
    await h.service.markStarted(h.scope, completed);
    await h.service.finish(h.scope, completed, randomUUID());
    h.blockAccess();
    h.revokeSnapshot();
    await expect(h.service.markStarted(h.scope, blocked)).rejects.toMatchObject({ status: 409 });
    expect((await h.reserve(completed)).state).toBe("completed");
  });

  it("propaga indisponibilidade do repositório sem fallback local", async () => {
    const h = createUsageHarness();
    const broken = createUsageService({
      reserve: async () => { throw Object.assign(new Error("offline"), { status: 503 }); },
      transition: async () => false,
    });
    await expect(broken.reserve(h.scope, { operationId: randomUUID(), kind: "image_generate",
      draftId: randomUUID(), draftVersion: 1 })).rejects.toMatchObject({ status: 503 });
  });

  it("define limites explícitos para imagens", () => {
    expect(TEST_LIMITS.free.image_generate).toBe(1);
    expect(TEST_LIMITS.paid.image_generate).toBe(24);
  });
});
