import { afterEach, describe, expect, it, vi } from "vitest";

// Store em memória: cada teste escolhe os resultados e a análise de origem que a marca já tem.
const banco = vi.hoisted(() => ({ resultados: [] as unknown[], analises: new Map<string, unknown>() }));
vi.mock("@/lib/store", () => ({
  store: {
    buscarCache: async () => null,
    salvarAnalise: async () => undefined,
    contarUso: async () => 0,
    registrarUso: async () => undefined,
    listarDecisoes: async () => [],
    listarResultados: async () => banco.resultados,
    listarVirais: async () => [],
    buscarAnalise: async (id: string) => banco.analises.get(id) ?? null,
  },
}));

import { analisar, chaveCache } from "@/lib/engine";
import { DEMOS } from "@/lib/engine/demo";
import { analiseLocal } from "@/lib/engine/local";
import type { ResultadoPost } from "@/lib/feedback";
import { aprendizadosLocais, calcularAprendizados, desempenhoDosPosts, ordenarPorAprendizado, pontuacaoAprendida } from "@/lib/motor/aprendizados";
import { montarContexto } from "@/lib/motor/contexto";
import { preferenciasSchema } from "@/lib/motor/contrato";
import { filtrarLocal } from "@/lib/motor/local-filtros";
import { aplicarExtras, saidaMotorSchema, saidaParaAnaliseIA } from "@/lib/motor/saida";
import { finalizar } from "@/lib/engine";
import { SISTEMA_MOTOR } from "@/lib/llm/prompt-motor";
import { construirCatalogo, padroesDoNicho } from "@/lib/virais/catalogo";
import { itensDoArquivo } from "@/lib/virais";
import type { Analise, BrandProfile, Formato, PostGerado } from "@/lib/types";

const cora = DEMOS.find((d) => d.brand.dominio === "cora.com.br")!;

const res = (post_id: string, formato: Formato, alcance: number | null, interacoes: number, extra: Partial<ResultadoPost> = {}): ResultadoPost => ({
  analise_id: "a",
  post_id,
  dominio: "loja.com.br",
  formato,
  curtidas: interacoes,
  comentarios: 0,
  salvamentos: 0,
  alcance,
  ...extra,
});

const post = (id: string, formato: Formato, x: Partial<PostGerado> = {}): PostGerado => ({ ...cora.posts[0], id, formato, ...x });

describe("calcularAprendizados", () => {
  it("sem dado não aprende nada", () => {
    const c = calcularAprendizados(desempenhoDosPosts([]));
    expect(c).toEqual({ n_posts: 0, mediana_engajamento_pct: null, por_formato: [], por_origem_tema: [], por_padrao: [], por_rede: [] });
    expect(aprendizadosLocais(c)).toBeNull();
    expect(pontuacaoAprendida(c)({ formato: "carrossel" })).toBe(0);
    // Número sem alcance entra no desempenho, mas não na conta de engajamento.
    const soCurtida = desempenhoDosPosts([res("p1", "carrossel", null, 30)]);
    expect(soCurtida[0].engajamento_pct).toBeNull();
    expect(calcularAprendizados(soCurtida).n_posts).toBe(0);
  });

  it("compara cada grupo com a mediana do founder e marca amostra pequena", () => {
    const posts = [
      post("p1", "carrossel", { origem_tema: "founder", padrao_inspirador: "carrossel--erro-comum", rede_principal: "instagram" }),
      post("p2", "carrossel", { origem_tema: "founder", padrao_inspirador: "carrossel--erro-comum", rede_principal: "instagram" }),
      post("p3", "carrossel", { origem_tema: "site", padrao_inspirador: "carrossel--erro-comum", rede_principal: "instagram" }),
      post("p4", "citacao", { origem_tema: "site", padrao_inspirador: "citacao--contraintuitivo", rede_principal: "linkedin" }),
      post("p5", "citacao", { origem_tema: "site", padrao_inspirador: "citacao--contraintuitivo", rede_principal: "linkedin" }),
    ];
    const calendario = [{ data: "2026-09-01", dia_semana: "terça", horario: "19:00", rede: "instagram" as const, post_id: "p1" }];
    const ds = desempenhoDosPosts(
      [
        res("p1", "carrossel", 1000, 60, { compartilhamentos: 10 }), // 7%
        res("p2", "carrossel", 1000, 60), // 6%
        res("p3", "carrossel", 1000, 50), // 5%
        res("p4", "citacao", 1000, 20), // 2%
        res("p5", "citacao", 1000, 10), // 1%
        res("p5", "citacao", 1000, 10), // repetido: vale o último
      ],
      posts,
      calendario,
    );
    expect(ds).toHaveLength(5);
    expect(ds[0]).toMatchObject({ engajamento_pct: 7, dia_semana: "terça", horario: "19:00", origem_tema: "founder", padrao: "carrossel--erro-comum", compartilhamentos: 10 });
    const c = calcularAprendizados(ds);
    expect(c.n_posts).toBe(5);
    expect(c.mediana_engajamento_pct).toBe(5);
    const carrossel = c.por_formato.find((g) => g.chave === "carrossel")!;
    expect(carrossel).toMatchObject({ n: 3, engajamento_medio_pct: 6, vs_mediana: "acima", amostra_pequena: false, nome: "Carrossel" });
    const citacao = c.por_formato.find((g) => g.chave === "citacao")!;
    expect(citacao).toMatchObject({ n: 2, engajamento_medio_pct: 1.5, vs_mediana: "abaixo", amostra_pequena: true });
    expect(c.por_origem_tema.find((g) => g.chave === "founder")).toMatchObject({ n: 2, vs_mediana: "acima", amostra_pequena: true });
    expect(c.por_rede.map((g) => g.chave)).toEqual(["instagram", "linkedin"]);
    expect(c.por_padrao[0].nome.length).toBeGreaterThan(5);

    const ap = aprendizadosLocais(c)!;
    expect(ap.funcionou[0]).toBe("Carrossel teve 6,0% de engajamento médio em 3 posts, acima da sua mediana (5,0%).");
    expect(ap.nao_funcionou.some((f) => /Citação teve 1,5%.*em 2 posts, abaixo.*Amostra pequena/.test(f))).toBe(true);
    expect(ap.ajuste).toMatch(/mais espaço para carrossel/);
    expect(JSON.stringify(ap)).not.toMatch(/[—–]/);

    const nota = pontuacaoAprendida(c);
    expect(nota({ formato: "carrossel", padrao_inspirador: "carrossel--erro-comum" })).toBeGreaterThan(0);
    expect(nota({ formato: "citacao", padrao_inspirador: "citacao--contraintuitivo" })).toBeLessThan(0);
    expect(ordenarPorAprendizado(["citacao", "lista", "carrossel"], (f) => nota({ formato: f }))).toEqual(["carrossel", "lista", "citacao"]);
  });

  it("o CONTEXTO leva desempenho rico e os aprendizados calculados", () => {
    const posts = [post("p1", "carrossel", { origem_tema: "founder", enderecamento: { objetivo: "gerar_clientes", publico: "x", gatilho_identificacao: "y", acao_esperada: "z" } })];
    const c = montarContexto(cora.brand, null, { resultados: [res("p1", "carrossel", 500, 25)], postsAnteriores: posts });
    expect(c.desempenho_proprio[0]).toMatchObject({ formato: "carrossel", origem_tema: "founder", objetivo: "gerar_clientes", engajamento_pct: 5 });
    expect(c.aprendizados_calculados.n_posts).toBe(1);
    expect(c.aprendizados_calculados.por_formato[0]).toMatchObject({ amostra_pequena: true, vs_mediana: "na mediana" });
  });
});

describe("prompt e saída com aprendizados", () => {
  it("o system prompt pede aprendizados com métrica e incerteza, sem travessão", () => {
    expect(SISTEMA_MOTOR).toContain('"aprendizados"');
    expect(SISTEMA_MOTOR).toContain("aprendizados_calculados");
    expect(SISTEMA_MOTOR).toMatch(/amostra é pequena/);
    expect(SISTEMA_MOTOR).toMatch(/Só marque "sua audiência"/);
    expect(SISTEMA_MOTOR).not.toMatch(/[—–]/);
  });

  it("saída tolerante: aprendizados ausente ou quebrado não derruba; presente vai para a análise", () => {
    const p = { post_id: "p1", rede: "instagram", formato: "carrossel", gancho: "Gancho", slides_ou_arte: [{ titulo: "a", texto: "b" }], legenda: "Gancho\n\nCorpo." };
    const base = { diagnostico: {}, contexto_inferido: {}, estrategia: {}, calendario: {}, posts: [p] };
    expect(saidaMotorSchema.parse({ ...base, aprendizados: "x" }).aprendizados).toEqual({ funcionou: [], nao_funcionou: [], ajuste: "" });
    const bruto = saidaMotorSchema.parse({ ...base, aprendizados: { funcionou: ["Carrossel com 6% em 3 posts"], ajuste: "Mais carrossel." } });
    const r = saidaParaAnaliseIA(bruto, { brand: cora.brand, palpite: "fintech", quantidade: 1, redes: ["instagram"] });
    const a = aplicarExtras(finalizar("t", cora.brand, r.analise, "ia", "teste", []), r);
    expect(a.aprendizados).toEqual({ funcionou: ["Carrossel com 6% em 3 posts"], nao_funcionou: [], ajuste: "Mais carrossel." });
    const semNada = saidaParaAnaliseIA(saidaMotorSchema.parse(base), { brand: cora.brand, palpite: "fintech", quantidade: 1, redes: ["instagram"] });
    expect(semNada.extrasAnalise.aprendizados).toBeUndefined();
  });
});

describe("motor local aprende com os números", () => {
  const catalogo = construirCatalogo(itensDoArquivo());
  const bruto = analiseLocal(cora.brand, "fintech", padroesDoNicho(catalogo, "fintech", 10), 24, ["instagram", "linkedin"]);
  const pref = preferenciasSchema.parse({});

  it("filtrarLocal muda a ordem com resultados e fica igual sem eles", () => {
    const sem = filtrarLocal(bruto, pref, { quantidade: 6, marca: "Cora" });
    const semNota = filtrarLocal(bruto, pref, { quantidade: 6, marca: "Cora", nota: pontuacaoAprendida(null) });
    expect(semNota.analise.posts).toEqual(sem.analise.posts);
    const formatoRuim = sem.analise.posts[0].formato;
    const outro = bruto.posts.find((p) => p.formato !== formatoRuim)!.formato;
    const ds = desempenhoDosPosts([
      res("a1", formatoRuim, 1000, 5),
      res("a2", formatoRuim, 1000, 5),
      res("a3", formatoRuim, 1000, 5),
      res("a4", outro, 1000, 80),
      res("a5", outro, 1000, 80),
      res("a6", outro, 1000, 80),
    ]);
    const com = filtrarLocal(bruto, pref, { quantidade: 6, marca: "Cora", nota: pontuacaoAprendida(calcularAprendizados(ds)) });
    expect(com.analise.posts[0].formato).toBe(outro);
    expect(com.analise.posts.map((p) => p.gancho)).not.toEqual(sem.analise.posts.map((p) => p.gancho));
  });

  afterEach(() => {
    banco.resultados = [];
    banco.analises.clear();
    vi.unstubAllEnvs();
  });

  it("analisar sem IA lê os números da marca, reordena e explica o que aprendeu", async () => {
    vi.stubEnv("DEMO_MODE", "1");
    const brand: BrandProfile = { ...cora.brand, url: "https://loja.com.br", dominio: "loja.com.br" };
    const antes = await analisar(brand, { quantidade: 4, identificadores: [] });
    expect(antes.aprendizados).toBeUndefined();
    const primeiro = antes.posts[0].formato;
    const outro = antes.posts.find((p) => p.formato !== primeiro)?.formato ?? "citacao";
    // A análise de origem tem os posts publicados; os números dizem que o primeiro formato foi mal.
    const origem = { ...antes, id: "a", posts: [post("a-p1", primeiro), post("a-p2", primeiro), post("a-p3", primeiro), post("a-p4", outro), post("a-p5", outro), post("a-p6", outro)] } as Analise;
    banco.analises.set("a", origem);
    banco.resultados = [
      res("a-p1", primeiro, 1000, 5),
      res("a-p2", primeiro, 1000, 5),
      res("a-p3", primeiro, 1000, 5),
      res("a-p4", outro, 1000, 90),
      res("a-p5", outro, 1000, 90),
      res("a-p6", outro, 1000, 90),
    ];
    const depois = await analisar(brand, { quantidade: 4, identificadores: [] });
    expect(depois.aprendizados?.funcionou.length).toBeGreaterThan(0);
    expect(depois.aprendizados?.nao_funcionou.length).toBeGreaterThan(0);
    expect(depois.posts[0].formato).not.toBe(primeiro);
    expect(JSON.stringify(depois.aprendizados)).not.toMatch(/[—–]/);
  });

  it("a chave do cache muda quando chegam números novos", () => {
    const url = "https://loja.com.br";
    expect(chaveCache(url, null, [])).toBe(chaveCache(url));
    const um = chaveCache(url, null, [res("p1", "carrossel", 100, 5)]);
    expect(um).not.toBe(chaveCache(url));
    expect(chaveCache(url, null, [res("p1", "carrossel", 100, 9)])).not.toBe(um);
    expect(chaveCache(url, null, [res("p1", "carrossel", 100, 5)])).toBe(um);
  });
});
