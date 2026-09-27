import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Pesquisas guardadas no "banco" deste teste.
const pesquisasNoBanco = vi.hoisted(() => new Map<string, unknown>());

vi.mock("@/lib/store", () => ({
  store: {
    buscarPesquisa: async (chave: string) => pesquisasNoBanco.get(chave) ?? null,
    salvarPesquisa: async (chave: string, dados: unknown) => void pesquisasNoBanco.set(chave, dados),
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

// DNS sempre público: o fetch de verdade fica trocado por um stub em cada teste, sem rede.
vi.mock("node:dns/promises", () => ({ lookup: async () => [{ address: "93.184.216.34", family: 4 }] }));

import { analisar, finalizar } from "@/lib/engine";
import { DEMOS } from "@/lib/engine/demo";
import { brandSemSite } from "@/lib/brand/sem-site";
import type { LLM } from "@/lib/llm";
import { itensDoArquivo } from "@/lib/virais";
import { preferenciasSchema } from "@/lib/motor/contrato";
import { benchmarkLocal, limparBenchmark } from "@/lib/motor/benchmark";
import {
  buscarConcorrentes,
  lerPesquisaIA,
  lerSugestoesIA,
  MAX_BUSCAS,
  MOTIVO_BASE,
  pesquisaGuardada,
  SISTEMA_PESQUISA,
  reservarUsoConcorrentes,
  siteResponde,
  sugerirConcorrentes,
  sugestoesDaBase,
} from "@/lib/motor/concorrentes";
import { aplicarExtras, saidaMotorSchema, saidaParaAnaliseIA } from "@/lib/motor/saida";
import { SISTEMA_MOTOR } from "@/lib/llm/prompt-motor";
import { OPTIONS, POST } from "@/app/api/concorrentes/route";
import type { Analise } from "@/lib/types";

const cora = DEMOS.find((d) => d.brand.dominio === "cora.com.br")!;
const AGORA = new Date("2026-09-26T15:00:00Z");
const semSite = brandSemSite({ nome: "Clínica Fácil", descricao: "Agenda e cobrança para clínicas pequenas de fisioterapia.", nicho: "healthtech" }, AGORA);
const itens = itensDoArquivo();
const linksDaBase = new Set(itens.map((i) => i.link_fonte).filter(Boolean));

function llmFalso(resposta: string | (() => Promise<string>)): LLM & { chamadas: number } {
  const l = {
    nome: "falso",
    chamadas: 0,
    async gerar() {
      l.chamadas++;
      return typeof resposta === "string" ? resposta : resposta();
    },
  };
  return l;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("sugestões da base curada", () => {
  it("só itens verificados do nicho, um por autor, com o link da fonte e o motivo fixo", () => {
    const s = sugestoesDaBase(itens, "fintech");
    expect(s.length).toBeGreaterThan(0);
    expect(s.length).toBeLessThanOrEqual(5);
    const nomes = s.map((x) => x.nome.split("(")[0].trim().toLowerCase());
    expect(new Set(nomes).size).toBe(nomes.length);
    for (const x of s) {
      expect(x.fonte).toBe("base_nicho");
      expect(x.motivo).toBe(MOTIVO_BASE);
      expect(linksDaBase.has(x.url)).toBe(true);
      const item = itens.find((i) => i.link_fonte === x.url && i.autor_ou_marca?.startsWith(x.nome.replace(/…$/, "")))!;
      expect(item.status).toBe("verificado");
      expect(item.nicho).toBe("fintech");
    }
  });

  it("não sugere a própria marca", () => {
    expect(sugestoesDaBase(itens, "fintech", { marca: "Nubank", max: 20 }).some((x) => /nubank/i.test(x.nome))).toBe(false);
  });
});

describe("sugerirConcorrentes", () => {
  it("sem IA: base do nicho informado, inclusive para empresa sem site", async () => {
    const s = await sugerirConcorrentes(semSite, { itens });
    expect(s.length).toBeGreaterThan(0);
    expect(s.every((x) => x.fonte === "base_nicho" && linksDaBase.has(x.url))).toBe(true);
    const item = itens.find((i) => i.link_fonte === s[0].url)!;
    expect(item.nicho).toBe("healthtech");
  });

  it("com IA: só sites que responderam, sem a própria empresa, sem endereço interno, sem misturar a base", async () => {
    const llm = llmFalso(
      "```json\n" +
        JSON.stringify({
          sugestoes: [
            { nome: "Feegow", url: "feegow.com.br", motivo: "Software de gestão para clínicas — concorre direto." },
            { nome: "Inventada", url: "https://clinica-que-nao-existe.com.br", motivo: "x" },
            { nome: "Interna", url: "http://127.0.0.1/admin", motivo: "x" },
            { nome: "Repetida", url: "https://www.feegow.com.br/", motivo: "x" },
            { nome: "Sem url", motivo: "x" },
            { nome: "iClinic", url: "https://iclinic.com.br", motivo: "Prontuário e agenda para consultório." },
          ],
        }) +
        "\n```",
    );
    const vistas: string[] = [];
    const verificar = async (u: string) => {
      vistas.push(u);
      return !u.includes("nao-existe");
    };
    const s = await sugerirConcorrentes(semSite, { llm, verificar, itens });
    expect(llm.chamadas).toBe(1);
    expect(vistas).toEqual(["https://feegow.com.br/", "https://clinica-que-nao-existe.com.br/", "https://iclinic.com.br/"]);
    expect(s.slice(0, 2)).toEqual([
      { nome: "Feegow", url: "https://feegow.com.br/", motivo: "Software de gestão para clínicas, concorre direto.", fonte: "ia" },
      { nome: "iClinic", url: "https://iclinic.com.br/", motivo: "Prontuário e agenda para consultório.", fonte: "ia" },
    ]);
    // Perfis da base curada não são concorrentes: com concorrente confirmado pela IA, a lista fica só com eles.
    expect(s).toHaveLength(2);
    expect(JSON.stringify(s)).not.toMatch(/[—–]/);
  });

  it("IA com erro, lenta ou com lixo: lista vazia, sem lançar e sem perfis de outro mercado", async () => {
    const erro = llmFalso(async () => {
      throw new Error("HTTP 429");
    });
    const lenta = llmFalso(() => new Promise((r) => setTimeout(() => r('{"sugestoes":[]}'), 500)));
    for (const [llm, prazo] of [[erro, 1000], [lenta, 20], [llmFalso("não sei"), 1000]] as const) {
      const s = await sugerirConcorrentes(semSite, { llm, verificar: async () => true, itens, prazoIaMs: prazo });
      expect(s).toEqual([]);
    }
  });

  it("empresa de exemplo responde na hora pela base, sem chamar a IA nem a rede", async () => {
    const llm = llmFalso('{"sugestoes":[]}');
    const verificar = vi.fn(async () => true);
    const s = await sugerirConcorrentes(cora.brand, { llm, verificar, itens });
    expect(llm.chamadas).toBe(0);
    expect(verificar).not.toHaveBeenCalled();
    expect(s.every((x) => x.fonte === "base_nicho")).toBe(true);
  });

  it("com busca na web: nicho da IA, o que cada concorrente publica, em alta com fonte, e sem pagar de novo", async () => {
    const marca = { ...semSite, dominio: "pesquisa-teste.com.br", nome: "Pesquisa Teste" };
    const resposta = JSON.stringify({
      mercado: "Software de agenda para clínicas pequenas",
      nicho: "SaaS-B2B",
      concorrentes: [{ nome: "Feegow", url: "https://feegow.com.br", motivo: "Agenda para clínicas.", o_que_publica: "Dicas de gestão — em carrossel" }],
      em_alta: [
        { tema: "Falta de paciente", gancho: "Sua agenda tem buraco na terça?", por_que: "dor diária", quem: "mídia do setor", url: "https://exemplo.com/a" },
        { tema: "Sem link válido", url: "javascript:alert(1)" },
        { gancho: "sem tema" },
      ],
      virais_ao_vivo: [
        { gancho: "Sua agenda tem buraco na terça? Faça isto", formato: "carrossel", rede: "instagram", por_que: "nomeia a dor do dono", quem: "creator de gestão", url: "https://exemplo.com/v1" },
        { gancho: "Sem link", formato: "carrossel", rede: "linkedin", por_que: "x", quem: "y", url: "ftp://ruim" },
        { formato: "carrossel" },
      ],
    });
    const prompts: string[] = [];
    const llm = {
      ...llmFalso("nunca"),
      buscas: 0,
      async pesquisar(sistema: string, prompt: string) {
        llm.buscas++;
        prompts.push(sistema, prompt);
        return resposta;
      },
    };
    const r = await buscarConcorrentes(marca, { llm, verificar: async () => true, itens });
    expect(llm.buscas).toBe(1);
    expect(llm.chamadas).toBe(0);
    expect(prompts[0]).toBe(SISTEMA_PESQUISA);
    expect(r.sugestoes).toEqual([{ nome: "Feegow", url: "https://feegow.com.br/", motivo: "Agenda para clínicas.", fonte: "ia" }]);
    expect(r.pesquisa?.nicho).toBe("saas-b2b");
    expect(r.pesquisa?.concorrentes).toEqual([{ nome: "Feegow", url: "https://feegow.com.br/", o_que_publica: "Dicas de gestão, em carrossel" }]);
    expect(r.pesquisa?.em_alta.map((t) => [t.tema, t.url])).toEqual([["Falta de paciente", "https://exemplo.com/a"], ["Sem link válido", undefined]]);
    expect(r.pesquisa?.virais_ao_vivo.map((v) => [v.gancho, v.url])).toEqual([
      ["Sua agenda tem buraco na terça? Faça isto", "https://exemplo.com/v1"],
      ["Sem link", undefined],
    ]);
    expect(await pesquisaGuardada(marca)).toEqual(r);
    expect(pesquisasNoBanco.get("v2|pesquisa-teste.com.br||")).toEqual(r);
    expect(await pesquisaGuardada(marca, "outro público")).toBeNull();
  });

  it("pesquisa guardada no banco é reaproveitada por outra instância, e formato antigo é ignorado", async () => {
    const marca = { ...semSite, dominio: "banco-teste.com.br", nome: "Banco Teste" };
    const salva = {
      sugestoes: [{ nome: "Feegow", url: "https://feegow.com.br/", motivo: "Agenda.", fonte: "ia" }],
      pesquisa: { mercado: "Agenda para clínicas", nicho: "saas-b2b", concorrentes: [], em_alta: [{ tema: "Falta de paciente" }] },
    };
    pesquisasNoBanco.set("v2|banco-teste.com.br||", salva);
    const r = await pesquisaGuardada(marca);
    expect(r?.sugestoes[0].nome).toBe("Feegow");
    expect(r?.pesquisa?.em_alta[0]).toMatchObject({ tema: "Falta de paciente", gancho: "" });
    pesquisasNoBanco.set("v2|banco-teste.com.br|outro|", { sugestoes: "formato velho" });
    expect(await pesquisaGuardada(marca, "outro")).toBeNull();
  });

  it("lerPesquisaIA nunca lança e ignora nicho fora da lista", () => {
    expect(lerPesquisaIA("nada")).toEqual({ mercado: "", em_alta: [], virais_ao_vivo: [] });
    expect(lerPesquisaIA('{"nicho":"agro","mercado":"x"}')).toEqual({ mercado: "x", em_alta: [], virais_ao_vivo: [] });
  });

  it("lerSugestoesIA aceita lista direta e ignora o que não é sugestão", () => {
    expect(lerSugestoesIA('[{"nome":"A","url":"a.com","motivo":"m"}]')).toEqual([{ nome: "A", url: "a.com", motivo: "m" }]);
    expect(lerSugestoesIA('{"outra":1}')).toEqual([]);
    expect(lerSugestoesIA("nada")).toEqual([]);
  });

  it("o prompt da pesquisa pede 4 buscas, a última de virais do nicho", () => {
    expect(MAX_BUSCAS).toBe(4);
    expect(SISTEMA_PESQUISA).toContain("virais_ao_vivo");
    expect(SISTEMA_PESQUISA).toMatch(/4\. Virais do nicho/);
  });
});

describe("siteResponde (fetch seguro, sem rede)", () => {
  const html = (status: number) => new Response("<html></html>", { status, headers: { "content-type": "text/html" } });

  it("200 e recusa de robô contam; 404, erro de rede e endereço interno não", async () => {
    const respostas: Record<string, () => Response> = {
      "https://ok.com.br/": () => html(200),
      "https://robo.com.br/": () => html(403),
      "https://sumiu.com.br/": () => html(404),
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        const r = respostas[url];
        if (!r) throw new TypeError("fetch failed");
        return r();
      }),
    );
    expect(await siteResponde("https://ok.com.br/")).toBe(true);
    expect(await siteResponde("https://robo.com.br/")).toBe(true);
    expect(await siteResponde("https://sumiu.com.br/")).toBe(false);
    expect(await siteResponde("https://fora.com.br/")).toBe(false);
    expect(await siteResponde("http://127.0.0.1/")).toBe(false);
  });

  it("site que não responde no prazo sai", async () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => undefined)));
    const inicio = Date.now();
    expect(await siteResponde("https://lento.com.br/", 50)).toBe(false);
    expect(Date.now() - inicio).toBeLessThan(1000);
  });
});

describe("limite de uso", () => {
  it("por IP e global por dia", () => {
    vi.stubEnv("LIMITE_CONCORRENTES_POR_IP", "2");
    vi.stubEnv("LIMITE_CONCORRENTES_DIA", "3");
    const dia = new Date("2030-01-01T12:00:00Z");
    expect(reservarUsoConcorrentes("ip-a", dia)).toBe(true);
    expect(reservarUsoConcorrentes("ip-a", dia)).toBe(true);
    expect(reservarUsoConcorrentes("ip-a", dia)).toBe(false);
    expect(reservarUsoConcorrentes("ip-b", dia)).toBe(true);
    expect(reservarUsoConcorrentes("ip-c", dia)).toBe(false);
    expect(reservarUsoConcorrentes("ip-c", new Date("2030-01-02T12:00:00Z"))).toBe(true);
  });
});

describe("POST /api/concorrentes", () => {
  const req = (body: unknown) =>
    new Request("http://localhost/api/concorrentes", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

  beforeEach(() => {
    vi.stubEnv("DEMO_MODE", "1");
  });

  it("devolve sugestões da base sem IA, para marca com e sem site", async () => {
    for (const brand of [semSite, cora.brand]) {
      const r = await POST(req({ brand, publico: "Donos de clínica" }));
      expect(r.status).toBe(200);
      expect(r.headers.get("access-control-allow-origin")).toBe("*");
      const { sugestoes } = (await r.json()) as { sugestoes: { fonte: string; url: string }[] };
      expect(sugestoes.length).toBeGreaterThan(0);
      expect(sugestoes.length).toBeLessThanOrEqual(5);
      expect(sugestoes.every((s) => s.fonte === "base_nicho" && linksDaBase.has(s.url))).toBe(true);
    }
  });

  it("entrada inválida vira 400 em português; OPTIONS responde 204", async () => {
    const semBrand = await POST(req({ publico: "x" }));
    expect(semBrand.status).toBe(400);
    expect(((await semBrand.json()) as { erro: string }).erro).toMatch(/Entrada inválida/);
    const incompleto = await POST(req({ brand: { url: "https://x.com.br" } }));
    expect(incompleto.status).toBe(400);
    expect((await OPTIONS()).status).toBe(204);
  });
});

// ---------- Benchmark dos concorrentes ----------

describe("benchmark dos concorrentes", () => {
  const C1 = "https://concorrente.com.br";
  const C2 = "https://outro.com.br";

  it("sem IA: resumo do que a página mostra, sem formatos inventados; página não lida fica de fora", () => {
    const b = benchmarkLocal([C1, C2], { [C1]: "Concorrente | Conta PJ grátis para MEI. Abra sua conta em minutos, sem burocracia." });
    expect(b).toHaveLength(1);
    expect(b[0]).toMatchObject({ url: C1, nome: "Concorrente", formatos: [] });
    expect(b[0].angulos).toEqual(expect.arrayContaining(["preço e economia", "rapidez", "simplicidade", "público específico"]));
    expect(b[0].oportunidade).not.toMatch(/\d/);
    expect(benchmarkLocal([C2], { [C2]: "Outro. Bem-vindo" })[0]).toMatchObject({ nome: "Outro", angulos: [] });
    expect(JSON.stringify(b)).not.toMatch(/[—–]/);
  });

  it("da IA: só concorrentes informados, sem número de audiência nem frase de desempenho", () => {
    const b = limparBenchmark(
      [
        { url: "https://www.outro.com.br/", nome: "", formatos: ["carrossel", "vídeo com 10 mil views"], angulos: ["rapidez"], oportunidade: "Eles têm 50 mil seguidores." },
        { url: "https://inventado.com", nome: "Inventado", formatos: [], angulos: [], oportunidade: "x" },
        { url: C1, nome: "Concorrente — oficial", formatos: [], angulos: ["preço"], oportunidade: "Ninguém fala do dono que faz tudo sozinho." },
      ],
      [C1, C2],
    );
    expect(b.map((x) => x.url)).toEqual([C1, C2]);
    expect(b[0].nome).toBe("Concorrente, oficial");
    expect(b[1]).toMatchObject({ nome: "outro.com.br", formatos: ["carrossel"], angulos: ["rapidez"] });
    expect(b[1].oportunidade).not.toMatch(/\d/);
  });

  it("o system prompt pede o benchmark só com a descrição extraída e sem números", () => {
    expect(SISTEMA_MOTOR).toContain('"benchmark_concorrentes"');
    expect(SISTEMA_MOTOR).toMatch(/Use só o que está em descricao_extraida/);
    expect(SISTEMA_MOTOR).not.toMatch(/[—–]/);
  });

  it("schema tolerante: benchmark com lixo vira vazio; válido passa pelo filtro e vai para a análise", () => {
    const post = {
      post_id: "p1", rede: "instagram", formato: "carrossel", template: "capa-gancho", objetivo: "gerar_clientes",
      gancho: "O erro que todo PJ comete", slides_ou_arte: [{ titulo: "Capa", texto: "Sub" }], legenda: "O erro\n\nCorpo.", hashtags: [],
    };
    const saida = (extra: object) => ({ diagnostico: {}, contexto_inferido: {}, estrategia: {}, calendario: {}, posts: [post], o_que_aprendi: "", avisos: [], ...extra });
    for (const lixo of [{}, { benchmark_concorrentes: "nada" }, { benchmark_concorrentes: [1, { nome: "sem url" }] }]) {
      expect(saidaMotorSchema.parse(saida(lixo)).benchmark_concorrentes).toEqual([]);
    }
    const bruto = saidaMotorSchema.parse(saida({ benchmark_concorrentes: [{ url: C1, nome: "Concorrente", formatos: ["carrossel"], angulos: ["preço"], oportunidade: "Falar do dono sozinho." }, { url: "https://x.com", nome: "X" }] }));
    const pref = preferenciasSchema.parse({ concorrentes: [C1] });
    const r = saidaParaAnaliseIA(bruto, { brand: cora.brand, palpite: "fintech", quantidade: 1, redes: ["instagram"], preferencias: pref });
    expect(r.extrasAnalise.benchmark_concorrentes).toEqual([{ url: C1, nome: "Concorrente", formatos: ["carrossel"], angulos: ["preço"], oportunidade: "Falar do dono sozinho." }]);
    const a = aplicarExtras(finalizar("t", cora.brand, r.analise, "ia", "teste", []), r, AGORA);
    expect(a.benchmark_concorrentes).toHaveLength(1);
    // Sem concorrentes informados, nada passa.
    expect(saidaParaAnaliseIA(bruto, { brand: cora.brand, palpite: "fintech", quantidade: 1, redes: ["instagram"] }).extrasAnalise.benchmark_concorrentes).toBeUndefined();
  });

  it("analisar sem IA lê a página dos concorrentes e monta o benchmark; sem concorrentes, nada", async () => {
    vi.stubEnv("DEMO_MODE", "1");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        url.startsWith("https://concorrente.com.br")
          ? new Response('<html><head><meta property="og:title" content="Concorrente"><meta property="og:description" content="Conta PJ grátis para MEI, sem burocracia."></head></html>', { status: 200, headers: { "content-type": "text/html" } })
          : new Response("", { status: 404 }),
      ),
    );
    const coraLocal = { ...cora.brand, url: "https://cora-bench.com.br", dominio: "cora-bench.com.br" };
    const a: Analise = await analisar(coraLocal, { quantidade: 3, identificadores: [], preferencias: preferenciasSchema.parse({ concorrentes: [C1, C2] }) });
    expect(a.origem).toBe("local");
    expect(a.benchmark_concorrentes).toHaveLength(1);
    expect(a.benchmark_concorrentes![0]).toMatchObject({ url: C1, nome: "Concorrente", formatos: [] });
    const sem = await analisar({ ...coraLocal, url: "https://cora-bench2.com.br", dominio: "cora-bench2.com.br" }, { quantidade: 3, identificadores: [], preferencias: preferenciasSchema.parse({}) });
    expect(sem.benchmark_concorrentes).toBeUndefined();
  });

  it("demo com concorrentes: instantânea, sem ler nada e sem benchmark", async () => {
    vi.stubEnv("DEMO_MODE", "1");
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    const inicio = Date.now();
    const a = await analisar(cora.brand, { quantidade: 6, identificadores: [], preferencias: preferenciasSchema.parse({ concorrentes: [C1] }) });
    expect(Date.now() - inicio).toBeLessThan(2000);
    expect(a.origem).toBe("demo");
    expect(a.benchmark_concorrentes).toBeUndefined();
    expect(f).not.toHaveBeenCalled();
  });
});
