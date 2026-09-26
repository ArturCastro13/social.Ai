import { afterEach, describe, expect, it, vi } from "vitest";
import { contextoConfirmadoSchema, materialSchema } from "@/lib/contexto/contrato";
import { aplicarContextoMarca } from "@/lib/contexto/revisao";
import { preferenciasSchema } from "@/lib/motor/contrato";
import { salvarPreferencias } from "@/lib/client/onboarding";
import { brandSemSite } from "@/lib/brand/sem-site";

const material = { id: "m1", nome: "Manual", origem: "arquivo", fatos: [], cores: [], avisos: [] };
const base = {
  versao: 1, empresa: "recallo.com.br", revisao: 1,
  entendimento: { negocio: "Preparação para inglês", segmento: "Idiomas", publico: "Estudantes", nicho: "edtech", evidencias: [], duvidas: [], fonte: "manual" },
  materiais: [],
};
afterEach(() => vi.unstubAllGlobals());
describe("contexto temporário", () => {
  it("rejeita quatro materiais e IDs repetidos", () => {
    expect(materialSchema.safeParse(material).success).toBe(true);
    expect(contextoConfirmadoSchema.safeParse({ ...base, materiais: Array.from({ length: 4 }, (_, i) => ({ ...material, id: `m${i}` })) }).success).toBe(false);
    expect(contextoConfirmadoSchema.safeParse({ ...base, materiais: [material, material] }).success).toBe(false);
  });
  it("rejeita códigos e origens não permitidos", () => {
    expect(materialSchema.safeParse({ ...material, cores: [{ hex: "javascript:alert(1)", origem: "declarada", evidencia: "" }] }).success).toBe(false);
    expect(materialSchema.safeParse({ ...material, origem: "hacker" }).success).toBe(false);
  });
  it("rejeita excesso agregado sem truncar fatos", () => {
    const fatos = Array.from({ length: 24 }, () => ({ campo: "regra", texto: "x".repeat(500), evidencia: "y".repeat(250) }));
    expect(contextoConfirmadoSchema.safeParse({ ...base, materiais: [0, 1, 2].map(i => ({ ...material, id: String(i), fatos })) }).success).toBe(false);
  });
  it("não persiste documentos privados no navegador", () => {
    let saved = "";
    vi.stubGlobal("localStorage", { setItem: (_k: string, v: string) => { saved = v; } });
    const contexto = contextoConfirmadoSchema.parse({ ...base, materiais: [{ ...material, fatos: [{ campo: "regra", texto: "segredo-documental", evidencia: "página 1" }] }] });
    salvarPreferencias("recallo.com.br", preferenciasSchema.parse({ contexto_empresa: contexto }));
    expect(saved).not.toContain("segredo-documental");
    expect(saved).not.toContain("contexto_empresa");
    expect(JSON.parse(saved).perfil_alvo).toBe("empresa");
  });
  it("aplica somente paleta aprovada à empresa certa, imutavelmente", () => {
    const b = brandSemSite({ nome: "Teste", descricao: "Ensino de inglês" });
    const contexto = contextoConfirmadoSchema.parse({ ...base, empresa: b.dominio, paleta: { primaria: "#0055AA", secundaria: "#113355", destaque: "#BB7700" } });
    const out = aplicarContextoMarca(b, contexto);
    expect(out.paleta.primaria).toBe("#0055AA");
    expect(b.paleta.primaria).not.toBe("#0055AA");
    expect(out.fontes).toEqual(b.fontes);
    expect(() => aplicarContextoMarca(b, { ...contexto, empresa: "outra.com.br" })).toThrow(/empresa/);
  });
});
