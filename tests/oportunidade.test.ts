import { describe, expect, it } from "vitest";
import type { Decisao } from "@/lib/feedback";
import { ordenarPorOportunidade, pontuar, sinaisDoNicho } from "@/lib/oportunidade";
import type { PostGerado } from "@/lib/types";
import { itensDoArquivo } from "@/lib/virais";

const post = (id: string, formato: PostGerado["formato"], padrao: string) =>
  ({ id, formato, padrao_inspirador: padrao, rede_principal: "instagram", template: "lista" }) as unknown as PostGerado;
const dec = (formato: Decisao["formato"], decisao: Decisao["decisao"], i: number): Decisao => ({
  analise_id: "a",
  post_id: `x${i}`,
  dominio: "cora.com.br",
  nicho: "fintech",
  formato,
  template: "lista",
  padrao: "",
  rede: "instagram",
  decisao,
});

describe("radar do nicho", () => {
  it("só marca como outlier post verificado, com métrica e fonte", () => {
    const s = sinaisDoNicho(itensDoArquivo(), "fintech");
    expect(s.totalBase).toBeGreaterThan(0);
    for (const o of s.outliers) {
      expect(o.multiplo).toBeGreaterThanOrEqual(1.5);
      expect(o.link).toBeTruthy();
    }
  });
});

describe("opportunity score", () => {
  const sinais = { nicho: "fintech" as const, totalBase: 10, frequencias: { "lista--numero": 4, "citacao--polemica": 1 }, outliers: [] };

  it("fica neutro sem histórico e explica só com números reais", () => {
    const o = pontuar(post("p1", "lista", "lista--numero"), sinais, [], []);
    expect(o.score).toBeGreaterThan(0);
    expect(o.score).toBeLessThanOrEqual(100);
    expect(o.motivos[0]).toContain("4 vezes entre os 10");
    expect(o.motivos.join(" ")).not.toMatch(/cresc|acelera|em alta/i);
  });

  it("sobe o formato que o founder aprova e desce o que ele pula", () => {
    const hist = [dec("lista", "aprovado", 1), dec("lista", "aprovado", 2), dec("citacao", "pulado", 3), dec("citacao", "pulado", 4)];
    const [primeiro] = ordenarPorOportunidade([post("c", "citacao", "citacao--polemica"), post("l", "lista", "lista--numero")], sinais, hist, []);
    expect(primeiro.post.id).toBe("l");
  });
});

describe("opportunity score com dados estranhos", () => {
  const sinais = { nicho: "fintech" as const, totalBase: 10, frequencias: { "lista--numero": 4 }, outliers: [] };

  it("padrão com nome de propriedade de objeto não vira NaN", () => {
    const o = pontuar(post("p1", "lista", "constructor"), sinais, [], []);
    expect(Number.isFinite(o.score)).toBe(true);
  });

  it("a mesma decisão repetida conta uma vez só", () => {
    const uma = pontuar(post("p1", "lista", "lista--numero"), sinais, [dec("lista", "aprovado", 1)], []);
    const repetida = pontuar(post("p1", "lista", "lista--numero"), sinais, [dec("lista", "aprovado", 1), dec("lista", "aprovado", 1), dec("lista", "aprovado", 1)], []);
    expect(repetida.score).toBe(uma.score);
  });

  it("alcance zero não divide por zero", () => {
    const r = { analise_id: "a", post_id: "x1", dominio: "cora.com.br", formato: "lista" as const, curtidas: 5, comentarios: 0, salvamentos: 0, alcance: 0 };
    expect(Number.isFinite(pontuar(post("p1", "lista", "lista--numero"), sinais, [], [r]).score)).toBe(true);
  });
});
