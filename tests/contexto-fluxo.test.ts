import { expect, it, vi } from "vitest";
vi.mock("@/lib/store", () => ({ store: { buscarCache: async () => null, salvarAnalise: async () => {}, contarUso: async () => 0, registrarUso: async () => {}, listarDecisoes: async () => [], listarResultados: async () => [], listarVirais: async () => [], buscarAnalise: async () => null } }));
import { analisar } from "@/lib/engine";
import { montarPromptConcorrentes, sugerirConcorrentes } from "@/lib/motor/concorrentes";
import { montarContexto } from "@/lib/motor/contexto";
import { contextoConfirmadoSchema } from "@/lib/contexto/contrato";
import { preferenciasSchema } from "@/lib/motor/contrato";
import recallo from "./fixtures/marcas/recallo.json";
import type { BrandProfile } from "@/lib/types";
const brand = recallo as BrandProfile;
const c = contextoConfirmadoSchema.parse({ versao: 1, empresa: brand.dominio, revisao: 1, entendimento: { negocio: "Inglês para IELTS", segmento: "Idiomas", publico: "Adultos", nicho: "edtech", evidencias: [], duvidas: [], fonte: "manual" }, materiais: [{ id: "m", nome: "Manual", origem: "arquivo", fatos: [{ campo: "proibicao", texto: "Não usar superlativos", evidencia: "página 1" }], cores: [], avisos: [] }] });
it("contexto revisado chega completo ao buscador e ao motor", () => {
  const prompt = montarPromptConcorrentes(brand, "Público antigo", c);
  expect(prompt).toContain("Adultos"); expect(prompt).toContain("Não usar superlativos");
  const context = montarContexto(brand, preferenciasSchema.parse({ contexto_empresa: c }));
  expect(context.contexto_confirmado?.materiais[0].fatos[0].texto).toBe("Não usar superlativos");
  expect(context.publico_alvo).toBe("Adultos"); expect(context.proibicoes).toContain("Não usar superlativos");
  const removed = montarContexto(brand, preferenciasSchema.parse({ contexto_empresa: { ...c, materiais: [] } }));
  expect(JSON.stringify(removed)).not.toContain("Não usar superlativos");
});
it("não preenche negócio desconhecido com referências arbitrárias", async () => {
  const unknown = { ...c, entendimento: { ...c.entendimento, nicho: "outro" as const } };
  const r = await sugerirConcorrentes(brand, { contexto: unknown, llm: null, itens: [] }); expect(r).toEqual([]);
});
it("geração recebe paleta confirmada mas não devolve documentos privados", async () => {
  const preferences = preferenciasSchema.parse({ contexto_empresa: { ...c, paleta: { primaria: "#0055AA", secundaria: "#113355", destaque: "#BB7700" } } });
  const r = await analisar(brand, { quantidade: 2, identificadores: [], preferencias: preferences });
  expect(r.brand.paleta.primaria).toBe("#0055AA");
  expect(JSON.stringify(r)).not.toContain("contexto_empresa"); expect(JSON.stringify(r)).not.toContain("página 1");
});
