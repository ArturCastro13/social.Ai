import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/store", () => ({
  store: {
    buscarCache: async () => null,
    salvarAnalise: async () => undefined,
    contarUso: async () => 0,
    registrarUso: async () => undefined,
    listarDecisoes: async () => [],
    listarResultados: async () => [],
    listarVirais: async () => [],
    buscarAnalise: async () => null,
  },
}));

import { hashPreferencias } from "@/lib/engine";
import { conhecimentoPreenchido, preferenciasSchema } from "@/lib/motor/contrato";

const CONHECIMENTO = {
  objecao_cliente: "Todo cliente pergunta se precisa trocar de banco para usar a conta.",
  crenca_contraria: "O mercado acha que PME não liga para gestão financeira. Liga, só não tem tempo.",
  historia: "Um cliente fechou as portas com dinheiro para receber porque cobrava tudo no papel.",
};

describe("preferencias.conhecimento_founder", () => {
  it("é opcional", () => {
    const p = preferenciasSchema.parse({});
    expect(p.conhecimento_founder).toBeUndefined();
  });

  it("aceita as três respostas e cada uma sozinha", () => {
    expect(preferenciasSchema.parse({ conhecimento_founder: CONHECIMENTO }).conhecimento_founder).toEqual(CONHECIMENTO);
    expect(preferenciasSchema.parse({ conhecimento_founder: { historia: " Uma história. " } }).conhecimento_founder).toEqual({ historia: "Uma história." });
  });

  it("recusa resposta acima de 600 caracteres com erro em português", () => {
    const r = preferenciasSchema.safeParse({ conhecimento_founder: { objecao_cliente: "a".repeat(601) } });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toBe("Cada resposta pode ter até 600 caracteres.");
    expect(r.error?.issues[0].path).toEqual(["conhecimento_founder", "objecao_cliente"]);
    expect(preferenciasSchema.safeParse({ conhecimento_founder: { objecao_cliente: "a".repeat(600) } }).success).toBe(true);
  });

  it("entra no hash do cache", () => {
    const sem = preferenciasSchema.parse({});
    const com = preferenciasSchema.parse({ conhecimento_founder: CONHECIMENTO });
    const outra = preferenciasSchema.parse({ conhecimento_founder: { ...CONHECIMENTO, historia: "Outra história." } });
    expect(hashPreferencias(sem)).not.toBe(hashPreferencias(com));
    expect(hashPreferencias(com)).not.toBe(hashPreferencias(outra));
  });

  it("conhecimentoPreenchido ignora respostas vazias", () => {
    expect(conhecimentoPreenchido({ objecao_cliente: "  ", historia: "" })).toBeNull();
    expect(conhecimentoPreenchido({ objecao_cliente: " x ", historia: "" })).toEqual({ objecao_cliente: "x" });
  });
});

describe("preferencias.link_destino", () => {
  it("aceita link completo e recusa texto solto em português", () => {
    expect(preferenciasSchema.parse({ link_destino: "https://wa.me/5511999999999" }).link_destino).toBe("https://wa.me/5511999999999");
    const r = preferenciasSchema.safeParse({ link_destino: "meu whatsapp" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toMatch(/link de destino/);
  });
});
