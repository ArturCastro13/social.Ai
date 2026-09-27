import { beforeAll, describe, expect, it, vi } from "vitest";

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

import { analisar, finalizar, hashPreferencias } from "@/lib/engine";
import { DEMOS } from "@/lib/engine/demo";
import { analiseLocal } from "@/lib/engine/local";
import { analiseIASchema } from "@/lib/engine/schema";
import { conhecimentoPreenchido, preferenciasSchema } from "@/lib/motor/contrato";
import { montarContexto } from "@/lib/motor/contexto";
import { filtrarLocal } from "@/lib/motor/local-filtros";
import { postsDoFounder, referenciaDoPadrao } from "@/lib/motor/local-founder";
import { aplicarLinkDestino, CHAMADA_LINK } from "@/lib/motor/link-destino";
import { objetivoDoTextoLivre, objetivosDoRodizio } from "@/lib/motor/enderecamento";
import { aplicarExtras, saidaMotorSchema, saidaParaAnaliseIA } from "@/lib/motor/saida";
import { montarPromptMotor, SISTEMA_MOTOR } from "@/lib/llm/prompt-motor";
import { construirCatalogo, padroesDoNicho } from "@/lib/virais/catalogo";
import { itensDoArquivo } from "@/lib/virais";
import type { Analise, BrandProfile, PostGerado } from "@/lib/types";

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

// ---------- Motor: conhecimento do founder como fonte de tema ----------

const cora = DEMOS.find((d) => d.brand.dominio === "cora.com.br")!;
const catalogo = construirCatalogo(itensDoArquivo());
const idsCatalogo = new Set(catalogo.map((p) => p.id));
const EMOJI = /\p{Extended_Pictographic}/gu;

function textos(v: unknown): string[] {
  if (typeof v === "string") return [v];
  if (Array.isArray(v)) return v.flatMap(textos);
  if (v && typeof v === "object") return Object.values(v).flatMap(textos);
  return [];
}

/** Mesmas regras por rede que tests/motor-local.test.ts checa no motor local. */
function regrasPorRede(p: { gancho: string; hashtags: string[]; legendas: Record<string, string> }) {
  for (const h of p.hashtags) expect(h).toMatch(/^[a-z0-9]+$/);
  expect(p.legendas.x.length).toBeLessThanOrEqual(260);
  expect(p.legendas.instagram.split("\n")[0]).toBe(p.gancho);
  for (const rede of ["instagram", "facebook"]) expect((p.legendas[rede].match(EMOJI) ?? []).length).toBeLessThanOrEqual(1);
  for (const rede of ["linkedin", "x"]) expect(p.legendas[rede].match(EMOJI)).toBeNull();
  const tagsLinkedin = p.legendas.linkedin.match(/#\S+/g) ?? [];
  expect(tagsLinkedin.length).toBeLessThanOrEqual(3);
  for (const t of [...tagsLinkedin, ...(p.legendas.instagram.match(/#\S+/g) ?? [])]) expect(t).toMatch(/^#[a-z0-9]+$/);
  const blocos = p.legendas.facebook.split("\n\n");
  const miolo = blocos.slice(1, -1).join("\n").split("\n").filter(Boolean);
  expect(miolo.length).toBeGreaterThanOrEqual(2);
  expect(miolo.length).toBeLessThanOrEqual(5);
}

describe("contexto e prompt com conhecimento do founder", () => {
  it("o CONTEXTO leva as respostas logo depois do público", () => {
    const sem = montarContexto(cora.brand);
    expect(sem.conhecimento_founder).toBeNull();
    const c = montarContexto(cora.brand, preferenciasSchema.parse({ conhecimento_founder: { objecao_cliente: CONHECIMENTO.objecao_cliente } }));
    expect(c.conhecimento_founder).toEqual({ problema_cliente: null, objecao_cliente: CONHECIMENTO.objecao_cliente, diferencial: null, crenca_contraria: null, historia: null });
    expect(Object.keys(c).indexOf("conhecimento_founder")).toBe(Object.keys(c).indexOf("publico_alvo") + 1);
    expect(montarPromptMotor(c)).toContain(CONHECIMENTO.objecao_cliente);
  });

  it("o system prompt põe o founder no topo das fontes de tema e pede origem_tema", () => {
    expect(SISTEMA_MOTOR).toContain('"origem_tema"');
    expect(SISTEMA_MOTOR).toContain("conhecimento_founder");
    expect(SISTEMA_MOTOR).toMatch(/pelo menos metade dos posts/);
    expect(SISTEMA_MOTOR).not.toMatch(/[—–]/);
  });
});

describe("motor local com as três respostas", () => {
  const bruto = analiseLocal(cora.brand, "fintech", padroesDoNicho(catalogo, "fintech", 10), 24, ["instagram", "linkedin", "x"]);

  it("posts do motor local dizem de onde veio o tema", () => {
    for (const p of bruto.posts) expect(["site", "nicho"]).toContain(p.origem_tema);
    expect(analiseIASchema.safeParse({ ...bruto, posts: bruto.posts.slice(0, 12) }).success).toBe(true);
  });

  it("gera um post por resposta, com o formato esperado, intercalado na frente", () => {
    const pref = preferenciasSchema.parse({ perfil_alvo: "founder", conhecimento_founder: CONHECIMENTO, formatos_permitidos: ["carrossel"] });
    const r = filtrarLocal(bruto, pref, { quantidade: 6, marca: "Cora" });
    expect(r.analise.posts).toHaveLength(6);
    expect(analiseIASchema.safeParse(r.analise).success).toBe(true);
    const origens = r.extrasPosts.map((e) => e.origem_tema);
    expect(origens).toEqual(["founder", expect.anything(), "founder", expect.anything(), "founder", expect.anything()]);
    const [obj, , cren, , hist] = r.analise.posts;
    // Não somem pelo filtro de formatos (só carrossel foi permitido).
    expect(obj).toMatchObject({ formato: "print-tweet", template: "print-x", origem_tema: "founder" });
    expect(cren).toMatchObject({ formato: "citacao", template: "citacao", origem_tema: "founder" });
    expect(hist).toMatchObject({ formato: "bastidor-founder", template: "bastidor", origem_tema: "founder" });
    expect(r.extrasPosts[0].enderecamento?.objetivo).toBe("gerar_clientes");
    expect(r.extrasPosts[2].enderecamento?.objetivo).toBe("autoridade_founder");
    expect(r.extrasPosts[4].enderecamento?.objetivo).toBe("autoridade_founder");
    expect(r.extrasPosts[0].enderecamento?.gatilho_identificacao).toContain("trocar de banco");
    for (const i of [0, 2, 4]) expect(r.extrasPosts[i].trilho).toBe("founder");
    for (const i of [1, 3, 5]) expect(r.analise.posts[i].formato).toBe("carrossel");
    // O texto do founder entra como está.
    expect(obj.slides[0].texto).toContain(CONHECIMENTO.objecao_cliente);
    expect(cren.slides[0].texto).toBe(CONHECIMENTO.crenca_contraria);
    expect(hist.slides[0].titulo.split(/\s+/).length).toBeLessThanOrEqual(12);
    expect(hist.slides[0].titulo).toMatch(/mudei/);
    expect(hist.slides[0].texto.length).toBeLessThanOrEqual(200);
  });

  it("segue as regras de escrita por rede e aponta padrões reais da base", () => {
    const pref = preferenciasSchema.parse({ conhecimento_founder: CONHECIMENTO });
    const fs = postsDoFounder(pref.conhecimento_founder, { perfil_alvo: "founder", publico: "Donos de PME que cuidam do financeiro sozinhos", redes: ["linkedin", "instagram", "x"], hashtags: ["ContaPJ", "gestão", "#x y"], marca: "Cora" });
    expect(fs).toHaveLength(3);
    for (const { post, extras } of fs) {
      regrasPorRede(post);
      expect(idsCatalogo.has(post.padrao_inspirador), post.padrao_inspirador).toBe(true);
      expect(post.por_que.length).toBeGreaterThan(40);
      expect(post.por_que).not.toMatch(/mais salvo|mais engaja|mais converte|o que mais/i);
      expect(extras.padrao_referencia?.nome.length).toBeGreaterThan(5);
      expect(extras.enderecamento?.publico).toBe("Donos de PME que cuidam do financeiro sozinhos");
      for (const t of textos(post)) expect(/[—–]/.test(t), t).toBe(false);
    }
    expect(fs.map((f) => f.post.padrao_inspirador)).toEqual(["print-tweet--pergunta", "citacao--contraintuitivo", "bastidor-founder--historia-pessoal"]);
  });

  it("perfil empresa fala como a gente, e resposta sozinha gera só o seu post", () => {
    const fs = postsDoFounder({ historia: CONHECIMENTO.historia }, { perfil_alvo: "empresa", publico: "Donos de PME", redes: [], marca: "Cora" });
    expect(fs).toHaveLength(1);
    expect(fs[0].extras.trilho).toBe("empresa");
    const texto = textos(fs[0].post).join(" ").replace(CONHECIMENTO.historia, "");
    expect(texto).toMatch(/a gente/);
    expect(texto).not.toMatch(/(?<![\p{L}])(eu|mudei|minha)(?![\p{L}])/iu);
    expect(postsDoFounder({ objecao_cliente: "  " }, { perfil_alvo: "founder", publico: "x", redes: [], marca: "Cora" })).toEqual([]);
  });

  it("analisar sem IA traz os posts do founder com origem e endereçamento", async () => {
    vi.stubEnv("DEMO_MODE", "1");
    const coraLocal: BrandProfile = { ...cora.brand, url: "https://cora-founder.com.br", dominio: "cora-founder.com.br" };
    const a = await analisar(coraLocal, { quantidade: 6, identificadores: [], preferencias: preferenciasSchema.parse({ conhecimento_founder: CONHECIMENTO }) });
    expect(a.origem).toBe("local");
    const doFounder = a.posts.filter((p) => p.origem_tema === "founder");
    expect(doFounder.map((p) => p.formato)).toEqual(["print-tweet", "citacao", "bastidor-founder"]);
    expect(a.posts.filter((p) => p.origem_tema !== "founder").every((p) => p.origem_tema === "site" || p.origem_tema === "nicho")).toBe(true);
    for (const p of a.posts) expect(p.enderecamento?.publico.length).toBeGreaterThan(5);
    expect(JSON.stringify(a.posts)).not.toMatch(/[—–]/);
    vi.unstubAllEnvs();
  });
});

describe("saída da IA com origem_tema", () => {
  const post = {
    post_id: "p1", rede: "instagram", formato: "carrossel", template: "capa-gancho", objetivo: "gerar_clientes",
    gancho: "O erro que todo PJ comete", slides_ou_arte: [{ titulo: "Capa", texto: "Sub" }, { titulo: "1", texto: "Passo" }],
    legenda: "O erro que todo PJ comete\n\nCorpo.", hashtags: ["pj"],
  };
  const saida = (posts: object[]) => ({
    diagnostico: {}, contexto_inferido: { nicho: "fintech", publico: "Donos de pequenas empresas" }, estrategia: {}, calendario: {}, posts, o_que_aprendi: "", avisos: [],
  });

  it("sem origem_tema é aceita e completada com site; valores estranhos são normalizados", () => {
    const bruto = saidaMotorSchema.parse(saida([post, { ...post, post_id: "p2", origem_tema: "Fundador" }, { ...post, post_id: "p3", origem_tema: "NOTÍCIA" }, { ...post, post_id: "p4", origem_tema: 42 }]));
    expect(bruto.posts.map((p) => p.origem_tema)).toEqual(["site", "founder", "noticia", "site"]);
    const r = saidaParaAnaliseIA(bruto, { brand: cora.brand, palpite: "fintech", quantidade: 6, redes: ["instagram"] });
    expect(r.extrasPosts.map((e) => e.origem_tema)).toEqual(["site", "founder", "noticia", "site"]);
    const a = aplicarExtras(finalizar("t", cora.brand, r.analise, "ia", "teste", []), r);
    expect(a.posts[1].origem_tema).toBe("founder");
  });

  it("schema do prompt antigo tolera origem_tema inválida", () => {
    const local = analiseLocal(cora.brand, "fintech", padroesDoNicho(catalogo, "fintech", 10), 2, ["instagram"]);
    const v = analiseIASchema.parse({ ...local, posts: [{ ...local.posts[0], origem_tema: "qualquer" }, { ...local.posts[1], origem_tema: "nicho" }] });
    expect(v.posts[0].origem_tema).toBeUndefined();
    expect(finalizar("t", cora.brand, v, "ia", "teste", []).posts[1].origem_tema).toBe("nicho");
  });
});

describe("link de destino com UTM", () => {
  const LINK = "https://wa.me/5511999999999?text=oi";
  const base = (objetivo: "gerar_clientes" | "autoridade_founder", x = "Post curto no X."): PostGerado => ({
    ...cora.posts[0],
    id: `a-${objetivo}`,
    legendas: { instagram: "Gancho\n\nCorpo.", linkedin: "Gancho\n\nCorpo.", x, facebook: "Gancho\n\nCorpo." },
    enderecamento: { objetivo, publico: "Donos de PME", gatilho_identificacao: "x", acao_esperada: "y" },
  });
  const analise = { ...cora, posts: [base("gerar_clientes"), base("autoridade_founder"), { ...base("gerar_clientes", "a ".repeat(139)), id: "longo" }] } as Analise;
  const a = aplicarLinkDestino(analise, LINK);

  it("posts de gerar_clientes terminam com a chamada e o link com UTM da rede", () => {
    const p = a.posts[0];
    for (const rede of ["instagram", "linkedin", "x", "facebook"] as const) {
      const ultima = p.legendas[rede].split("\n").pop()!;
      const u = new URL(ultima);
      expect(u.origin + u.pathname).toBe("https://wa.me/5511999999999");
      expect(u.searchParams.get("text")).toBe("oi");
      expect(u.searchParams.get("utm_source")).toBe(rede);
      expect(u.searchParams.get("utm_medium")).toBe("social");
      expect(u.searchParams.get("utm_campaign")).toBe("socialai");
      expect(u.searchParams.get("utm_content")).toBe(p.id);
      expect(p.legendas[rede]).toContain(CHAMADA_LINK);
      expect(p.legendas[rede].startsWith("Gancho") || rede === "x").toBe(true);
    }
  });

  it("outros objetivos não recebem link", () => {
    expect(a.posts[1].legendas).toEqual(analise.posts[1].legendas);
  });

  it("X cabe em 280 cortando o corpo, nunca o link, e aplicar de novo não duplica", () => {
    const x = a.posts[2].legendas.x;
    expect(x.length).toBeLessThanOrEqual(280);
    expect(x).toContain("utm_content=longo");
    expect(aplicarLinkDestino(a, LINK)).toEqual(a);
    expect(aplicarLinkDestino(analise, undefined)).toBe(analise);
  });
});

describe("demo com e sem conhecimento do founder", () => {
  beforeAll(() => {
    vi.stubEnv("DEMO_MODE", "1");
  });

  it("sem respostas, a demo continua igual e sem origem_tema", async () => {
    const a = await analisar(cora.brand, { quantidade: 12, identificadores: [], preferencias: preferenciasSchema.parse({}) });
    expect(a.origem).toBe("demo");
    expect(a.posts.map((p) => p.id)).toEqual(cora.posts.map((p) => p.id));
    expect(a.posts.map((p) => p.gancho)).toEqual(cora.posts.map((p) => p.gancho));
    expect(a.posts.every((p) => p.origem_tema === undefined)).toBe(true);
    // Padrão com fonte da base preenchido no servidor.
    expect(a.posts[0].padrao_referencia).toEqual(referenciaDoPadrao(cora.posts[0].padrao_inspirador));
  });

  it("com respostas, os posts do founder entram intercalados, na hora", async () => {
    const pref = preferenciasSchema.parse({ perfil_alvo: "founder", conhecimento_founder: CONHECIMENTO, link_destino: "https://cora.com.br/conversa" });
    const inicio = Date.now();
    const a = await analisar(cora.brand, { quantidade: 9, identificadores: [], preferencias: pref });
    expect(Date.now() - inicio).toBeLessThan(2000);
    expect(a.origem).toBe("demo");
    expect(a.posts).toHaveLength(9);
    expect(a.posts.filter((_, i) => i % 2 === 0).slice(0, 3).map((p) => p.origem_tema)).toEqual(["founder", "founder", "founder"]);
    expect(a.posts.filter((p) => p.origem_tema === "founder").map((p) => p.formato)).toEqual(["print-tweet", "citacao", "bastidor-founder"]);
    expect(new Set(a.posts.map((p) => p.id)).size).toBe(9);
    expect(a.calendario).toHaveLength(9);
    // Link com UTM só nos posts de gerar_clientes.
    for (const p of a.posts) {
      const tem = p.legendas.linkedin.includes("utm_campaign=socialai");
      expect(tem).toBe(p.enderecamento?.objetivo === "gerar_clientes");
      expect(p.legendas.x.length).toBeLessThanOrEqual(280);
    }
    expect(JSON.stringify({ ...a, brand: undefined })).not.toMatch(/[—–]/);
  });
});

// ---------- Perguntas novas: problema, objeção e diferencial ----------

const NOVAS = {
  problema_cliente: "Dono de pequena empresa cobra cliente no papel e perde dinheiro sem perceber. No fim do mês não sabe quanto entrou. E só descobre quando falta para pagar as contas.",
  objecao_cliente: "Todo cliente pergunta se precisa trocar de banco para usar a conta.",
  diferencial: "A gente junta cobrança e conta no mesmo app, e o dono vê o caixa do dia no celular.",
};

describe("perguntas novas do founder", () => {
  const op = { perfil_alvo: "founder" as const, publico: "Donos de PME que cuidam do financeiro sozinhos", redes: ["linkedin", "instagram", "x"] as ("linkedin" | "instagram" | "x")[], hashtags: ["contapj", "gestao"], marca: "Cora" };

  it("aceita as três chaves novas e as antigas juntas", () => {
    const p = preferenciasSchema.parse({ conhecimento_founder: { ...NOVAS, ...CONHECIMENTO } });
    expect(conhecimentoPreenchido(p.conhecimento_founder)).toEqual({ ...NOVAS, ...CONHECIMENTO });
  });

  it("o CONTEXTO leva as cinco chaves, com null no que ficou vazio, e o prompt explica cada uma", () => {
    const c = montarContexto(cora.brand, preferenciasSchema.parse({ conhecimento_founder: { problema_cliente: NOVAS.problema_cliente, diferencial: NOVAS.diferencial } }));
    expect(c.conhecimento_founder).toEqual({ problema_cliente: NOVAS.problema_cliente, objecao_cliente: null, diferencial: NOVAS.diferencial, crenca_contraria: null, historia: null });
    for (const k of ["problema_cliente", "objecao_cliente", "diferencial", "crenca_contraria", "historia"]) expect(SISTEMA_MOTOR).toContain(k);
    expect(SISTEMA_MOTOR).toMatch(/Nunca cite concorrente pelo nome nesse post/);
  });

  it("problema com 3 frases vira carrossel só com o texto do founder; objeção e diferencial seguem", () => {
    const fs = postsDoFounder(NOVAS, op);
    expect(fs.map((f) => f.post.formato)).toEqual(["carrossel", "print-tweet", "antes-depois"]);
    const [prob, , dif] = fs;
    expect(prob.post.template).toBe("capa-gancho");
    expect(prob.post.slides.length).toBeGreaterThanOrEqual(5);
    expect(prob.post.slides.length).toBeLessThanOrEqual(8);
    // Miolo do carrossel: cada frase do founder, como está.
    const miolo = prob.post.slides.slice(1, -1).map((s) => s.texto);
    expect(miolo).toEqual(["Dono de pequena empresa cobra cliente no papel e perde dinheiro sem perceber.", "No fim do mês não sabe quanto entrou.", "E só descobre quando falta para pagar as contas."]);
    expect(prob.extras.enderecamento?.objetivo).toBe("gerar_clientes");
    // Diferencial: antes = o problema do founder, depois = o diferencial.
    expect(dif.post.template).toBe("antes-depois");
    expect(dif.post.slides).toHaveLength(2);
    expect(NOVAS.problema_cliente.startsWith(dif.post.slides[0].texto.replace(/…$/, ""))).toBe(true);
    expect(dif.post.slides[1].texto).toBe(NOVAS.diferencial);
    expect(dif.extras.enderecamento?.objetivo).toBe("gerar_clientes");
    for (const { post, extras } of fs) {
      regrasPorRede(post);
      expect(idsCatalogo.has(post.padrao_inspirador), post.padrao_inspirador).toBe(true);
      expect(extras.origem_tema).toBe("founder");
      expect(extras.padrao_referencia?.nome.length).toBeGreaterThan(5);
      for (const t of textos(post)) {
        expect(/[—–]/.test(t), t).toBe(false);
        expect(/descubr|desvend|potencializ/i.test(t), t).toBe(false);
      }
    }
    // Determinístico.
    expect(postsDoFounder(NOVAS, op)).toEqual(fs);
  });

  it("problema curto vira imagem única; diferencial sem problema vira imagem única com a frase do founder", () => {
    const [prob] = postsDoFounder({ problema_cliente: "dono de clínica fecha o mês sem saber o lucro" }, op);
    expect(prob.post).toMatchObject({ formato: "imagem-unica", template: "citacao" });
    expect(prob.post.gancho).toBe("Dono de clínica fecha o mês sem saber o lucro. Isso é a sua rotina?");
    regrasPorRede(prob.post);
    const [dif] = postsDoFounder({ diferencial: NOVAS.diferencial }, op);
    expect(dif.post).toMatchObject({ formato: "imagem-unica", template: "citacao" });
    expect(dif.post.slides[0].texto).toBe(NOVAS.diferencial);
    regrasPorRede(dif.post);
  });

  it("com as cinco respostas, a ordem é problema, objeção, diferencial, crença, história", () => {
    const fs = postsDoFounder({ ...NOVAS, ...CONHECIMENTO }, op);
    expect(fs.map((f) => f.post.formato)).toEqual(["carrossel", "print-tweet", "antes-depois", "citacao", "bastidor-founder"]);
    expect(fs.every((f) => f.extras.origem_tema === "founder")).toBe(true);
  });

  it("filtrarLocal e analisar sem IA levam os posts novos na frente, válidos", async () => {
    const pref = preferenciasSchema.parse({ perfil_alvo: "empresa", conhecimento_founder: NOVAS });
    const bruto = analiseLocal(cora.brand, "fintech", padroesDoNicho(catalogo, "fintech", 10), 24, ["instagram", "linkedin"]);
    const r = filtrarLocal(bruto, pref, { quantidade: 6, marca: "Cora" });
    expect(analiseIASchema.safeParse(r.analise).success).toBe(true);
    expect(r.extrasPosts.filter((_, i) => i % 2 === 0).map((e) => e.origem_tema)).toEqual(["founder", "founder", "founder"]);
    vi.stubEnv("DEMO_MODE", "1");
    const coraLocal: BrandProfile = { ...cora.brand, url: "https://cora-novas.com.br", dominio: "cora-novas.com.br" };
    const a = await analisar(coraLocal, { quantidade: 6, identificadores: [], preferencias: pref });
    expect(a.posts.filter((p) => p.origem_tema === "founder").map((p) => p.formato)).toEqual(["carrossel", "print-tweet", "antes-depois"]);
    expect(a.roteiros![0].origem_tema).toBe("founder");
    expect(JSON.stringify({ ...a, brand: undefined })).not.toMatch(/[—–]/);
    vi.unstubAllEnvs();
  });

  it("demo continua instantânea com as perguntas novas", async () => {
    vi.stubEnv("DEMO_MODE", "1");
    const inicio = Date.now();
    const a = await analisar(cora.brand, { quantidade: 9, identificadores: [], preferencias: preferenciasSchema.parse({ conhecimento_founder: NOVAS }) });
    expect(Date.now() - inicio).toBeLessThan(2000);
    expect(a.origem).toBe("demo");
    expect(a.posts.filter((p) => p.origem_tema === "founder").map((p) => p.formato)).toEqual(["carrossel", "print-tweet", "antes-depois"]);
    expect(a.benchmark_concorrentes).toBeUndefined();
    vi.unstubAllEnvs();
  });
});

// ---------- Objetivo escrito pelo founder ----------

describe("preferencias.objetivo_livre", () => {
  it("aceita até 200 caracteres e entra no hash do cache", () => {
    expect(preferenciasSchema.safeParse({ objetivo_livre: "a".repeat(201) }).success).toBe(false);
    const sem = preferenciasSchema.parse({ objetivos: ["gerar_clientes"] });
    const com = preferenciasSchema.parse({ objetivos: ["gerar_clientes"], objetivo_livre: "Fechar 5 clínicas novas até dezembro" });
    const outro = preferenciasSchema.parse({ objetivos: ["gerar_clientes"], objetivo_livre: "Fechar 6 clínicas novas até dezembro" });
    expect(hashPreferencias(sem)).not.toBe(hashPreferencias(com));
    expect(hashPreferencias(com)).not.toBe(hashPreferencias(outro));
  });

  it("vai no CONTEXTO com as palavras do founder, e o prompt diz como usar", () => {
    const c = montarContexto(cora.brand, preferenciasSchema.parse({ objetivos: ["gerar_clientes"], objetivo_livre: "Fechar clínicas novas até dezembro" }));
    expect(c.objetivo_livre).toBe("Fechar clínicas novas até dezembro");
    expect(c.objetivos).toEqual(["gerar_clientes"]);
    expect(montarContexto(cora.brand, preferenciasSchema.parse({ objetivo_livre: "   " })).objetivo_livre).toBeNull();
    expect(SISTEMA_MOTOR).toContain("objetivo_livre");
  });

  it("só escolhe o objetivo do rodízio quando o texto aponta claramente para um id", () => {
    expect(objetivoDoTextoLivre("Quero mais clientes pelo LinkedIn")).toBe("gerar_clientes");
    expect(objetivoDoTextoLivre("Atrair investidores para a rodada")).toBe("atrair_investidor");
    expect(objetivoDoTextoLivre("Contratar vendedor e ganhar clientes")).toBeNull();
    expect(objetivoDoTextoLivre("Crescer")).toBeNull();
    expect(objetivoDoTextoLivre("")).toBeNull();
    expect(objetivosDoRodizio({ objetivos: [], objetivo_livre: "Atrair investidores", perfil_alvo: "empresa" })).toEqual(["atrair_investidor"]);
    expect(objetivosDoRodizio({ objetivos: ["gerar_clientes"], objetivo_livre: "Contratar dois devs" })).toEqual(["gerar_clientes", "contratar"]);
    expect(objetivosDoRodizio({ objetivos: ["gerar_clientes", "comunidade"], objetivo_livre: "Contratar dois devs" })).toEqual(["gerar_clientes", "comunidade"]);
    expect(objetivosDoRodizio({ objetivos: [], objetivo_livre: "Crescer", perfil_alvo: "empresa" })).toEqual(["gerar_clientes"]);
  });

  it("o motor local usa o objetivo escrito no rodízio quando não há botão escolhido", () => {
    const bruto = analiseLocal(cora.brand, "fintech", padroesDoNicho(catalogo, "fintech", 10), 12, ["instagram", "linkedin"]);
    const r = filtrarLocal(bruto, preferenciasSchema.parse({ objetivo_livre: "Achar pessoas para contratar" }), { quantidade: 4, marca: "Cora" });
    expect(r.extrasAnalise.contexto_inferido?.objetivos).toEqual(["contratar"]);
    expect(r.extrasPosts.every((e) => e.objetivo === "contratar")).toBe(true);
    const nada = filtrarLocal(bruto, preferenciasSchema.parse({ objetivo_livre: "Crescer rápido" }), { quantidade: 4, marca: "Cora" });
    expect(nada.extrasAnalise.contexto_inferido?.objetivos).toEqual(["gerar_clientes"]);
  });
});
