import { expect, it } from "vitest";
import recallo from "./fixtures/marcas/recallo.json";
import { palpiteNicho } from "@/lib/engine/nicho";
import { entenderEmpresa } from "@/lib/contexto/entender";
import { brandSemSite } from "@/lib/brand/sem-site";
import type { BrandProfile } from "@/lib/types";
const brand = recallo as BrandProfile;
it("não transforma exames de inglês em saúde", () => expect(palpiteNicho(brand).nicho).toBe("edtech"));
it("continua distinguindo exames médicos de ensino de idiomas", () => {
  expect(palpiteNicho(brandSemSite({ nome: "Teste", descricao: "Clínica de saúde, médicos e exames de sangue" })).nicho).toBe("healthtech");
  expect(palpiteNicho(brandSemSite({ nome: "Teste", descricao: "Escola de idiomas, curso de inglês" })).nicho).toBe("edtech");
});
it("fallback é explicitamente manual e desconhecido não vira negócio de software", async () => {
  const r = await entenderEmpresa({ brand, founder: {}, materiais: [], publico: "Alunos" }, null);
  expect(r.nicho).toBe("edtech"); expect(r.fonte).toBe("manual");
  const unknown = await entenderEmpresa({ brand: brandSemSite({ nome: "Ateliê", descricao: "Arranjos florais sob encomenda" }), founder: {}, materiais: [] }, null);
  expect(unknown.nicho).toBe("outro");
});
it("análise recebe respostas e documentos; evidência inexistente vira dúvida", async () => {
  const result = await entenderEmpresa({ brand, founder: { diferencial: "Foco em IELTS" }, materiais: [{ id: "m1", nome: "Manual", origem: "notion", fatos: [{ campo: "regra", texto: "Sem superlativos", evidencia: "seção 1" }], cores: [], avisos: [] }] }, {
    nome: "teste", gerar: async (_s, prompt) => {
      const data = JSON.parse(prompt); expect(JSON.stringify(data)).toContain("Foco em IELTS"); expect(JSON.stringify(data)).toContain("Sem superlativos");
      return JSON.stringify({ negocio: "Preparação para inglês", segmento: "Idiomas", publico: "Alunos", nicho: "edtech", evidencias: [{ fonte: "site", trecho: "Vendemos planos de saúde" }], duvidas: [], fonte: "ia" });
    },
  });
  expect(result.evidencias).toEqual([]); expect(result.duvidas.length).toBeGreaterThan(0);
});
