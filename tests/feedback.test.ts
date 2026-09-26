import { beforeEach, describe, expect, it, vi } from "vitest";
import { resumirPreferencias, textoPreferencias, ultimaPorPost, type Decisao } from "@/lib/feedback";

const salvos = vi.hoisted(() => ({ decisoes: [] as unknown[], resultados: [] as unknown[] }));
vi.mock("@/lib/store", () => ({
  store: {
    salvarDecisao: async (d: unknown) => void salvos.decisoes.push(d),
    salvarResultado: async (r: unknown) => void salvos.resultados.push(r),
    listarDecisoes: async () => [],
    listarResultados: async () => [],
  },
}));

const d = (post_id: string, formato: Decisao["formato"], decisao: Decisao["decisao"]): Decisao => ({
  analise_id: "a1",
  post_id,
  dominio: "cora.com.br",
  nicho: "fintech",
  formato,
  template: "capa-gancho",
  padrao: "p",
  rede: "instagram",
  decisao,
});

describe("preferências do founder", () => {
  it("conta a última decisão de cada post e ordena por taxa de aprovação", () => {
    const r = resumirPreferencias([
      d("1", "carrossel", "pulado"),
      d("1", "carrossel", "aprovado"),
      d("2", "carrossel", "aprovado"),
      d("3", "lista", "pulado"),
      d("4", "lista", "aprovado"),
    ]);
    expect(r.total).toBe(4);
    expect(r.aprovados).toBe(3);
    expect(r.formatos[0]).toMatchObject({ formato: "carrossel", aprovados: 2, pulados: 0, taxa: 1 });
    expect(r.formatos[1]).toMatchObject({ formato: "lista", aprovados: 1, pulados: 1, taxa: 0.5 });
  });

  it("calcula engajamento só com alcance informado e não inventa número", () => {
    const r = resumirPreferencias(
      [d("1", "lista", "aprovado")],
      [
        { analise_id: "a1", post_id: "1", dominio: "cora.com.br", formato: "lista", curtidas: 40, comentarios: 5, salvamentos: 5, alcance: 1000 },
        { analise_id: "a1", post_id: "2", dominio: "cora.com.br", formato: "citacao", curtidas: 10, comentarios: null, salvamentos: null, alcance: null },
      ],
    );
    expect(r.formatos.find((f) => f.formato === "lista")?.engajamento).toBeCloseTo(0.05);
    expect(r.formatos.find((f) => f.formato === "citacao")?.engajamento).toBeNull();
  });

  it("só vira instrução para a IA com decisões suficientes", () => {
    expect(textoPreferencias(resumirPreferencias([d("1", "lista", "aprovado")]))).toBe("");
    const txt = textoPreferencias(resumirPreferencias(["1", "2", "3", "4"].map((i) => d(i, "lista", "aprovado"))));
    expect(txt).toContain("lista: aprovou 4 de 4 (100%)");
    expect(txt).not.toMatch(/[—–]/);
  });
});

describe("última decisão por post", () => {
  it("mantém a ordem de quando cada post foi decidido pela última vez", () => {
    const r = ultimaPorPost([d("1", "lista", "aprovado"), d("2", "lista", "aprovado"), d("1", "lista", "pulado")]);
    expect(r.map((x) => `${x.post_id}:${x.decisao}`)).toEqual(["2:aprovado", "1:pulado"]);
  });
});

describe("POST /api/feedback", () => {
  beforeEach(() => {
    salvos.decisoes.length = 0;
    salvos.resultados.length = 0;
  });
  const post = async (corpo: unknown, headers: Record<string, string> = {}) => {
    const { POST } = await import("@/app/api/feedback/route");
    return POST(new Request("http://x/api/feedback", { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(corpo) }));
  };

  it("aceita a decisão exatamente como o painel envia, inclusive padrão vazio", async () => {
    const r = await post({ tipo: "decisao", ...d("cora-p1", "carrossel", "aprovado"), template: "capa-gancho", padrao: "", rede: "facebook" });
    expect(r.status).toBe(200);
    expect(salvos.decisoes).toHaveLength(1);
    expect(salvos.decisoes[0]).not.toHaveProperty("tipo");
  });

  it("aceita resultado com campos vazios e recusa número fora do limite", async () => {
    const base = { tipo: "resultado", analise_id: "a1", post_id: "p1", dominio: "cora.com.br", formato: "lista" };
    expect((await post({ ...base, curtidas: 10, comentarios: null, salvamentos: null, alcance: null })).status).toBe(200);
    expect((await post({ ...base, curtidas: 2e9, comentarios: null, salvamentos: null, alcance: null })).status).toBe(400);
  });

  it("recusa formato, nicho ou texto fora do esperado", async () => {
    expect((await post({ tipo: "decisao", ...d("p1", "lista", "aprovado"), nicho: "cripto" })).status).toBe(400);
    expect((await post({ tipo: "decisao", ...d("p1", "lista", "aprovado"), padrao: "x".repeat(81) })).status).toBe(400);
    expect((await post({ tipo: "decisao", ...d("p1", "lista", "aprovado") }, { "content-length": "100000" })).status).toBe(413);
    expect(salvos.decisoes).toHaveLength(0);
  });
});
