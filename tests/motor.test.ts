import { describe, expect, it } from "vitest";
import { DEMOS } from "@/lib/engine/demo";
import { analiseLocal } from "@/lib/engine/local";
import { analiseIASchema } from "@/lib/engine/schema";
import { chaveCache, finalizar, hashPreferencias } from "@/lib/engine";
import { construirCatalogo, padroesDoNicho } from "@/lib/virais/catalogo";
import { itensDoArquivo } from "@/lib/virais";
import { preferenciasSchema } from "@/lib/motor/contrato";
import { montarContexto, ogDoHtml } from "@/lib/motor/contexto";
import { aplicarExtras, legendasPorRede, saidaMotorSchema, saidaParaAnaliseIA } from "@/lib/motor/saida";
import { filtrarLocal, termosProibidos, violaProibicao } from "@/lib/motor/local-filtros";
import { brandParaInferencia, inferirSugestoes, tomDoSite } from "@/lib/motor/inferir";
import { montarPromptMotor, SISTEMA_MOTOR } from "@/lib/llm/prompt-motor";

const cora = DEMOS.find((d) => d.brand.dominio === "cora.com.br")!.brand;
const catalogo = construirCatalogo(itensDoArquivo());

const CHAVES_CONTEXTO = [
  "perfil_alvo", "empresa", "founder", "nicho", "objetivos", "tom_de_voz", "formatos_permitidos", "frequencia_escolhida", "redes",
  "proibicoes", "inspiracoes", "desempenho_proprio", "insights_audiencia", "referencias_nicho", "benchmarks_publicacao", "noticias",
  "historico_preferencias", "quantidade_posts",
];

describe("montarContexto", () => {
  it("funciona só com o brand e deixa vazio o que não tem dado", () => {
    const c = montarContexto(cora);
    expect(Object.keys(c).sort()).toEqual([...CHAVES_CONTEXTO].sort());
    expect(c.perfil_alvo).toBe("empresa");
    expect(c.empresa.site_url).toBe(cora.url);
    expect(c.empresa.site_extraido.proposta.length).toBeGreaterThan(0);
    expect(c.empresa.brand_book_extraido).toBeNull();
    expect(c.founder).toEqual({ nome: "", arroba: { instagram: "", linkedin: "", x: "" }, transcricao_audio: null });
    expect(c.objetivos).toEqual([]);
    expect(c.inspiracoes).toEqual([]);
    expect(c.desempenho_proprio).toEqual([]);
    expect(c.historico_preferencias).toEqual({ aprovados: [], recusados: [] });
    // Nunca inventa horário.
    expect(c.insights_audiencia).toEqual({ horarios_pico: null, fonte: "nao_disponivel" });
    expect(c.benchmarks_publicacao).toEqual({ por_rede: {}, fonte: "nao_disponivel" });
    expect(c.tom_de_voz.formal_descontraido).toBe(0.5);
    expect(JSON.stringify(c)).not.toContain("—");
  });

  it("mapeia nicho, referências da base e histórico", () => {
    const refs = padroesDoNicho(catalogo, "saas-b2b", 4).map((p) => ({ padrao: p, exemplos: itensDoArquivo().filter((i) => p.exemplos.includes(i.id)) }));
    const pref = preferenciasSchema.parse({
      perfil_alvo: "founder",
      founder: { nome: "Ana", linkedin: "ana" },
      objetivos: ["autoridade_founder"],
      inspiracoes: [{ url: "https://exemplo.com/post" }],
    });
    const c = montarContexto(cora, pref, {
      nicho: "saas-b2b",
      quantidade: 6,
      referencias: refs,
      inspiracoesExtraidas: { "https://exemplo.com/post": "Título. Descrição" },
      decisoes: [
        { analise_id: "a", post_id: "a-p1", dominio: "cora.com.br", nicho: "fintech", formato: "carrossel", template: "capa-gancho", padrao: "x", rede: "instagram", decisao: "aprovado" },
        { analise_id: "a", post_id: "a-p2", dominio: "cora.com.br", nicho: "fintech", formato: "print-tweet", template: "print-x", padrao: "y", rede: "x", decisao: "pulado" },
      ],
    });
    expect(c.nicho).toBe("saas_b2b");
    expect(c.founder.arroba.linkedin).toBe("@ana");
    expect(c.redes).toContain("linkedin");
    expect(c.inspiracoes[0].descricao_extraida).toBe("Título. Descrição");
    expect(c.referencias_nicho.length).toBeGreaterThan(0);
    for (const r of c.referencias_nicho) expect(typeof r.metrica_verificada).toBe("boolean");
    expect(c.historico_preferencias.aprovados[0].formato).toBe("carrossel");
    expect(c.historico_preferencias.recusados[0].formato).toBe("print_de_tweet");
    expect(montarPromptMotor(c).startsWith("CONTEXTO:\n{")).toBe(true);
  });

  it("lê og:title e og:description de uma inspiração", () => {
    const html = '<html><head><meta property="og:title" content="Post bom"><meta property="og:description" content="Sobre algo"></head></html>';
    expect(ogDoHtml(html)).toBe("Post bom. Sobre algo");
  });

  it("system prompt não tem travessão e fala de template", () => {
    expect(SISTEMA_MOTOR).not.toContain("—");
    expect(SISTEMA_MOTOR).toContain('"template"');
  });
});

const SAIDA_EXEMPLO = {
  diagnostico: {
    problemas: [{ ponto: "O site não mostra prova", evidencia: "Nenhum número de cliente no texto." }],
    oportunidades: [{ ponto: "Founder com voz", evidencia: "Referências verificadas de founders no nicho." }],
  },
  contexto_inferido: { nicho: "fintech", publico: "Donos de pequenas empresas", tom_resumo: "Direto e próximo", objetivos: ["gerar_clientes"], confianca: "alta" },
  estrategia: {
    posicionamento_em_uma_frase: "A conta PJ para quem empreende sem financeiro.",
    pilares: [{ nome: "Dinheiro sem mistério", porque: "Educa o público." }],
    por_rede: [{ rede: "instagram", papel: "Educação salvável" }],
  },
  calendario: {
    frequencia_semana: [{ rede: "instagram", posts: 3 }, { rede: "x", posts: "2" }],
    slots: [
      { dia: "segunda", horario: "19h", rede: "instagram", post_id: "p1", fonte: "teste" },
      { dia: "Quarta-feira", horario: "12:30", rede: "x", post_id: "p2", fonte: "teste" },
      { dia: "segunda", horario: "09:00", rede: "instagram", post_id: "p3", fonte: "teste" },
    ],
    comentario_frequencia: "Leve cabe na rotina.",
  },
  posts: [
    {
      post_id: "p1", trilho: "empresa", rede: "instagram", formato: "carrossel", template: "capa-gancho", objetivo: "gerar_clientes",
      padrao_referencia: { nome: "Carrossel com gancho de erro comum", fonte_url: "" },
      gancho: "O erro que todo PJ comete — e como evitar",
      slides_ou_arte: [{ titulo: "Capa", texto: "Sub" }, { titulo: "1", texto: "Passo" }],
      legenda: "Gancho aqui\n\nCorpo do post.\n\n#pj #financas", hashtags: ["#pj", "financas"],
      chamada_final: "Salva", por_que_funciona: "Segue o padrão de erro comum.", precisa_revisao: [],
    },
    { post_id: "p2", rede: "twitter", formato: "print_de_tweet", gancho: "Taxa escondida é o pior tipo de taxa.", slides_ou_arte: ["Taxa escondida é o pior tipo de taxa."], legenda: "Taxa escondida é o pior tipo de taxa." },
    { post_id: "p3", rede: "instagram", formato: "estatico", template: "lista", gancho: "3 contas para separar", slides_ou_arte: [{ titulo: "3 contas" }], legenda: "", precisa_revisao: "x" },
    { post_id: "p4", gancho: "" },
  ],
  o_que_aprendi: "",
  avisos: ["Sem notícias: notícia comentada ficou de fora."],
};

describe("adaptador da saída do motor", () => {
  const bruto = saidaMotorSchema.parse(SAIDA_EXEMPLO);
  const pref = preferenciasSchema.parse({ perfil_alvo: "ambos" });
  const r = saidaParaAnaliseIA(bruto, { brand: cora, palpite: "fintech", quantidade: 6, redes: ["instagram", "x"], preferencias: pref, padroes: catalogo });

  it("gera AnaliseIA válida e descarta post sem gancho", () => {
    const v = analiseIASchema.safeParse(r.analise);
    expect(v.success, JSON.stringify(!v.success && v.error.issues)).toBe(true);
    expect(r.analise.posts).toHaveLength(3);
    expect(r.analise.pilares.length).toBeGreaterThanOrEqual(3);
    expect(r.analise.diagnostico.length).toBeGreaterThanOrEqual(3);
    expect(r.analise.estrategia.find((e) => e.rede === "x")?.frequencia_semanal).toBe(2);
    expect(JSON.stringify(r.analise)).not.toContain("—");
  });

  it("mapeia formatos, redes, legendas e extras", () => {
    const [p1, p2, p3] = r.analise.posts;
    expect(p1).toMatchObject({ formato: "carrossel", template: "capa-gancho", rede_principal: "instagram" });
    expect(p1.hashtags).toEqual(["pj", "financas"]);
    expect(p1.padrao_inspirador).toBe("carrossel--erro-comum");
    expect(p1.legendas.linkedin).not.toContain("#pj");
    expect(p2).toMatchObject({ formato: "print-tweet", template: "print-x", rede_principal: "x" });
    expect(p2.slides[0].texto).toContain("Taxa escondida");
    expect(p3).toMatchObject({ formato: "lista", template: "lista" });
    expect(r.extrasPosts.map((e) => e.trilho)).toEqual(["empresa", "founder", "founder"]);
    expect(r.extrasPosts[0].formato_motor).toBe("carrossel");
    expect(r.extrasAnalise.contexto_inferido?.confianca).toBe("alta");
    expect(r.extrasAnalise.comentario_frequencia).toBe("Leve cabe na rotina.");
    expect(r.avisos).toHaveLength(1);
  });

  it("usa o calendário do modelo quando é coerente", () => {
    expect(r.slots).toHaveLength(3);
    const base = finalizar("t", cora, r.analise, "ia", "teste", []);
    const a = aplicarExtras(base, r, new Date("2026-09-26T15:00:00Z"));
    expect(a.calendario.map((c) => [c.data, c.horario])).toEqual([
      ["2026-09-28", "19:00"],
      ["2026-09-30", "12:30"],
      // Segunda repetida vai para a semana seguinte: no máximo um slot por dia da semana em cada semana.
      ["2026-10-05", "09:00"],
    ]);
    expect(a.calendario.every((c) => c.fonte === "teste")).toBe(true);
    expect(a.posts[0].trilho).toBe("empresa");
    expect(a.perfil_alvo).toBe("ambos");
  });

  it("cai para o calendário das janelas quando o do modelo é incoerente", () => {
    const b2 = saidaMotorSchema.parse({ ...SAIDA_EXEMPLO, calendario: { slots: [{ dia: "ontem", horario: "x", post_id: "p1" }] } });
    const r2 = saidaParaAnaliseIA(b2, { brand: cora, palpite: "fintech", quantidade: 6, redes: ["instagram"] });
    expect(r2.slots).toBeNull();
  });

  it("X sempre cabe em 280 caracteres", () => {
    const l = legendasPorRede("linkedin", "a".repeat(100) + "\n\n" + "b ".repeat(300), "Gancho", ["x"]);
    expect(l.x.length).toBeLessThanOrEqual(280);
    expect(l.instagram).toContain("#x");
  });
});

describe("filtros do motor local", () => {
  const bruto = analiseLocal(cora, "fintech", padroesDoNicho(catalogo, "fintech", 10), 24, ["instagram", "linkedin"]);

  it("tira o prefixo das proibições", () => {
    expect(termosProibidos(["nada de política", "não falo de concorrente", "sem meme"])).toEqual(["politica", "concorrente", "meme"]);
  });

  it("descarta post com termo proibido", () => {
    const alvo = bruto.posts[0];
    const palavra = alvo.gancho.split(/\s+/).find((w) => w.length >= 6)!.replace(/[^\p{L}]/gu, "");
    expect(violaProibicao(alvo, termosProibidos([`nada de ${palavra}`]))).toBe(true);
    const pref = preferenciasSchema.parse({ proibicoes: [`nada de ${palavra}`] });
    const r = filtrarLocal(bruto, pref, { quantidade: 5, marca: "Cora" });
    for (const p of r.analise.posts) expect(violaProibicao(p, termosProibidos(pref.proibicoes))).toBe(false);
  });

  it("respeita os formatos permitidos e preenche trilho e objetivo", () => {
    const pref = preferenciasSchema.parse({ perfil_alvo: "ambos", formatos_permitidos: ["carrossel", "print_de_tweet"], objetivos: ["gerar_clientes", "contratar"], frequencia_escolhida: "leve" });
    const r = filtrarLocal(bruto, pref, { quantidade: 4, marca: "Cora" });
    expect(r.analise.posts.length).toBeGreaterThan(0);
    for (const p of r.analise.posts) expect(["carrossel", "print-tweet"]).toContain(p.formato);
    expect(r.extrasPosts.map((e) => e.trilho).slice(0, 2)).toEqual(["founder", "empresa"]);
    expect(r.extrasPosts[1].objetivo).toBe("contratar");
    expect(r.extrasPosts.every((e) => Array.isArray(e.precisa_revisao))).toBe(true);
    expect(r.analise.estrategia.reduce((s, e) => s + e.frequencia_semanal, 0)).toBe(3);
  });

  it("perfil founder marca tudo como trilho founder", () => {
    const pref = preferenciasSchema.parse({ perfil_alvo: "founder" });
    const r = filtrarLocal(bruto, pref, { quantidade: 6, marca: "Cora" });
    expect(r.analise.posts).toHaveLength(6);
    expect(r.extrasPosts.every((e) => e.trilho === "founder" && e.objetivo === "autoridade_founder")).toBe(true);
  });
});

describe("inferência do onboarding", () => {
  it("sugere nicho, objetivos, tom, formatos e frequência sem IA", () => {
    const s = inferirSugestoes(cora);
    expect(s.nicho).toBe("fintech");
    expect(s.objetivos.length).toBeGreaterThanOrEqual(1);
    expect(s.objetivos.length).toBeLessThanOrEqual(2);
    expect(s.formatos.length).toBeGreaterThanOrEqual(3);
    expect(["leve", "constante"]).toContain(s.frequencia);
    expect(s.porque_frequencia.length).toBeGreaterThan(10);
    expect(s.exemplo_tom.length).toBeGreaterThan(10);
    expect(JSON.stringify(s)).not.toContain("—");
    for (const v of Object.values(s.tom_de_voz)) expect(v).toBeGreaterThanOrEqual(0);
  });

  it("acha vagas e lançamento no texto", () => {
    const b = brandParaInferencia({ url: "https://x.com.br", headings: { h1: ["Estamos contratando"], h2: ["Lançamento do novo produto"] }, paragrafos: ["Veja as vagas abertas."] })!;
    expect(b).not.toBeNull();
    expect(inferirSugestoes(b).objetivos).toEqual(["contratar", "lancar_produto"]);
    expect(brandParaInferencia({ nome: "sem url" })).toBeNull();
  });

  it("réguas de tom reagem ao texto", () => {
    const informal = tomDoSite("Você vai adorar! A gente resolve pra você, bora? Chega de planilha!");
    const tecnico = tomDoSite("Integração via API e SDK com compliance LGPD, workflow e analytics de dados para ERP e CRM.");
    expect(informal.formal_descontraido).toBeGreaterThan(tecnico.formal_descontraido);
    expect(tecnico.tecnico_simples).toBeLessThan(informal.tecnico_simples);
  });
});

describe("cache com preferências", () => {
  it("a chave muda com as preferências e é estável", () => {
    const a = preferenciasSchema.parse({ perfil_alvo: "founder" });
    const b = preferenciasSchema.parse({ perfil_alvo: "empresa" });
    expect(chaveCache("https://cora.com.br")).toBe("cora.com.br");
    expect(chaveCache("https://cora.com.br", a)).not.toBe(chaveCache("https://cora.com.br", b));
    expect(chaveCache("https://cora.com.br", a)).toBe(chaveCache("https://www.cora.com.br/", preferenciasSchema.parse({ perfil_alvo: "founder" })));
    expect(hashPreferencias(a)).toHaveLength(12);
  });
});
