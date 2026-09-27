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

import { analisar, chaveCache, finalizar } from "@/lib/engine";
import { DEMOS } from "@/lib/engine/demo";
import { montarCalendario } from "@/lib/engine/calendario";
import { palpiteNicho } from "@/lib/engine/nicho";
import { analiseIASchema, postIASchema } from "@/lib/engine/schema";
import { brandSemSite } from "@/lib/brand/sem-site";
import { nomeDoPerfil } from "@/lib/brand/nome";
import { preferenciasSchema, type RoteiroVideo } from "@/lib/motor/contrato";
import { montarContexto } from "@/lib/motor/contexto";
import { aplicarLinkDestino } from "@/lib/motor/link-destino";
import { aplicarExtras, saidaMotorSchema, saidaParaAnaliseIA } from "@/lib/motor/saida";
import { garantirRoteiros, quantosRoteiros, roteirosLocais } from "@/lib/motor/roteiros-locais";
import { montarPromptMotor, SISTEMA_MOTOR } from "@/lib/llm/prompt-motor";
import { construirCatalogo, padroesDoNicho } from "@/lib/virais/catalogo";
import { contextoViralDoNicho, itensDoArquivo } from "@/lib/virais";
import { POST as analyzePOST } from "@/app/api/analyze/route";
import type { Analise } from "@/lib/types";

const cora = DEMOS.find((d) => d.brand.dominio === "cora.com.br")!;
const AGORA = new Date("2026-09-26T15:00:00Z");
const CONHECIMENTO = {
  objecao_cliente: "Todo cliente pergunta se precisa trocar de banco para usar a conta.",
  crenca_contraria: "O mercado acha que PME não liga para gestão financeira. Liga, só não tem tempo.",
  historia: "Um cliente fechou as portas com dinheiro para receber porque cobrava tudo no papel. Foi ali que a gente entendeu o tamanho do problema.",
};
const NOVAS = {
  problema_cliente: "Dono de pequena empresa cobra cliente no papel e perde dinheiro sem perceber. No fim do mês não sabe quanto entrou. Quem cobrava tudo no papel sente isso primeiro.",
  objecao_cliente: "Todo cliente pergunta se precisa trocar de banco para usar a conta.",
  diferencial: "A gente junta cobrança e conta no mesmo app, e o dono vê o caixa do dia no celular.",
};
const NEUTRAS = [
  "Deixa eu te contar o que aconteceu.",
  "Vou direto ao ponto.",
  "Desde então, eu olho para isso de outro jeito.",
  "Desde então, a gente olha para isso de outro jeito.",
];
const IA_DEMAIS = /descubr|potencializ|desvend/i;

function textos(v: unknown): string[] {
  if (typeof v === "string") return [v];
  if (Array.isArray(v)) return v.flatMap(textos);
  if (v && typeof v === "object") return Object.values(v).flatMap(textos);
  return [];
}

function formaValida(r: RoteiroVideo) {
  expect(r.gancho.length).toBeGreaterThan(0);
  expect(r.titulo.length).toBeGreaterThan(0);
  expect(r.chamada_final.length).toBeGreaterThan(0);
  expect(r.legenda.length).toBeGreaterThan(0);
  expect(r.cenas.length).toBeGreaterThanOrEqual(3);
  expect(r.cenas.length).toBeLessThanOrEqual(6);
  for (const c of r.cenas) expect(c.fala.trim().length).toBeGreaterThan(0);
  expect(r.duracao_seg).toBeGreaterThanOrEqual(15);
  expect(r.duracao_seg).toBeLessThanOrEqual(90);
  expect(["instagram", "linkedin", "tiktok", "youtube"]).toContain(r.rede);
  expect(r.agenda?.data).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expect(r.agenda?.horario).toMatch(/^\d{2}:\d{2}$/);
  expect(r.enderecamento?.publico.length).toBeGreaterThan(5);
  for (const t of textos(r)) {
    expect(/[—–]/.test(t), t).toBe(false);
    expect(IA_DEMAIS.test(t), t).toBe(false);
  }
}

describe("roteiros locais", () => {
  const calendario = montarCalendario(cora.posts, cora.estrategia, AGORA);

  it("do que o founder contou: história e objeção viram vídeo, sem inventar a resposta", () => {
    const rs = roteirosLocais({
      analiseId: "a1", posts: cora.posts, calendario, conhecimento: CONHECIMENTO, perfil_alvo: "founder",
      publico: "Donos de PME que cuidam do financeiro sozinhos", redes: ["instagram", "linkedin"], max: 2, agora: AGORA,
    });
    expect(rs.map((r) => r.id)).toEqual(["a1-v1", "a1-v2"]);
    for (const r of rs) formaValida(r);
    // Objeção vem antes da história (a tela nova prioriza problema e objeção); crença não vira vídeo com 2 vagas.
    const [obj, hist] = rs;
    expect(hist.origem_tema).toBe("founder");
    expect(hist.enderecamento?.objetivo).toBe("autoridade_founder");
    expect(hist.cenas.map((c) => c.fala).join(" ")).toContain("cobrava tudo no papel");
    // A resposta da objeção é do founder: fica um [PREENCHER] e o pedido em precisa_revisao.
    expect(obj.enderecamento?.objetivo).toBe("gerar_clientes");
    expect(obj.cenas.some((c) => c.fala.includes("[PREENCHER"))).toBe(true);
    expect(obj.precisa_revisao?.join(" ")).toMatch(/sua resposta/);
    expect(textos(obj).join(" ")).toContain("trocar de banco");
    // Vídeos em dias sem post, com fonte de hipótese.
    const diasComPost = new Set(calendario.map((c) => c.data));
    for (const r of rs) {
      expect(diasComPost.has(r.agenda!.data)).toBe(false);
      expect(r.agenda!.fonte).toBe("hipótese do nicho");
      expect(r.agenda!.data > "2026-09-26").toBe(true);
    }
    expect(hist.agenda!.data).not.toBe(obj.agenda!.data);
  });

  it("perguntas novas: problema e objeção viram vídeo, e o diferencial responde o problema com as palavras do founder", () => {
    const base = { analiseId: "a3", posts: cora.posts, calendario, perfil_alvo: "founder" as const, publico: "Donos de PME que cuidam do financeiro sozinhos", redes: ["instagram" as const], max: 2, agora: AGORA };
    const rs = roteirosLocais({ ...base, conhecimento: { ...NOVAS, historia: CONHECIMENTO.historia } });
    expect(rs.map((r) => r.origem_tema)).toEqual(["founder", "founder"]);
    const [prob, obj] = rs;
    for (const r of rs) formaValida(r);
    expect(prob.enderecamento?.objetivo).toBe("gerar_clientes");
    expect(textos(prob).join(" ")).toContain("cobrava tudo no papel");
    expect(prob.cenas.map((c) => c.fala).join(" ")).toContain("vê o caixa do dia no celular");
    expect(prob.cenas.some((c) => c.fala.includes("[PREENCHER"))).toBe(false);
    expect(obj.cenas.some((c) => c.fala.includes("[PREENCHER"))).toBe(true);
    // Sem diferencial, a solução fica para o founder gravar.
    const [semDif] = roteirosLocais({ ...base, max: 1, conhecimento: { problema_cliente: NOVAS.problema_cliente } });
    expect(semDif.cenas.some((c) => c.fala.includes("[PREENCHER"))).toBe(true);
    expect(semDif.precisa_revisao?.length).toBeGreaterThan(0);
    // Só história (preferência antiga): continua virando vídeo.
    const [hist] = roteirosLocais({ ...base, max: 1, conhecimento: { historia: CONHECIMENTO.historia } });
    expect(hist.enderecamento?.objetivo).toBe("autoridade_founder");
  });

  it("só com posts: carrossel e bastidor viram vídeo, com texto que já existe nos posts", () => {
    const rs = roteirosLocais({ analiseId: "a2", posts: cora.posts, calendario, publico: "Donos de PME", redes: ["instagram"], max: 2, agora: AGORA });
    expect(rs).toHaveLength(2);
    const doLote = JSON.stringify(cora.posts);
    for (const r of rs) {
      formaValida(r);
      expect(doLote).toContain(JSON.stringify(r.gancho).slice(1, -1).replace(/\.$/, ""));
      for (const c of r.cenas) {
        const fala = c.fala.replace(/…$/, "");
        const existe = doLote.includes(JSON.stringify(fala).slice(1, -1)) || NEUTRAS.includes(c.fala) || c.fala.startsWith("Resumindo: ");
        expect(existe, c.fala).toBe(true);
      }
    }
    expect(rs[0].cenas.length).toBeGreaterThanOrEqual(3);
    expect(rs.map((r) => r.rede)).toEqual(["instagram", "instagram"]);
  });

  it("1 roteiro em lote de até 3 posts, 2 nos outros; nenhum com max 0", () => {
    expect(quantosRoteiros(3)).toBe(1);
    expect(quantosRoteiros(4)).toBe(2);
    expect(roteirosLocais({ analiseId: "x", posts: cora.posts, calendario: [], publico: "", redes: [], max: 0 })).toEqual([]);
  });
});

// ---------- Saída da IA ----------

const POST = {
  post_id: "p1", rede: "instagram", formato: "carrossel", template: "capa-gancho", objetivo: "gerar_clientes",
  gancho: "O erro que todo PJ comete", slides_ou_arte: [{ titulo: "Capa", texto: "Sub" }, { titulo: "1", texto: "Passo" }],
  legenda: "O erro que todo PJ comete\n\nCorpo.", hashtags: ["pj"],
};
const saida = (extra: object) => ({
  diagnostico: {}, contexto_inferido: { nicho: "fintech", publico: "Donos de pequenas empresas" }, estrategia: {}, calendario: {},
  posts: [POST, { ...POST, post_id: "p2" }, { ...POST, post_id: "p3" }, { ...POST, post_id: "p4" }], o_que_aprendi: "", avisos: [], ...extra,
});
const ROTEIRO = {
  roteiro_id: "v1", titulo: "Respondo a dúvida da troca de banco", rede: "Reels", duracao_seg: 40,
  gancho: "Precisa trocar de banco para usar a conta?",
  cenas: [{ fala: "Essa é a pergunta que mais ouço." }, "Não precisa: [PREENCHER: sua resposta]", { fala: "Comenta a sua dúvida.", tela: "Comenta aqui" }],
  chamada_final: "Comenta a sua dúvida.", legenda: "Precisa trocar de banco?\n\nComenta.", origem_tema: "founder",
  enderecamento: { objetivo: "gerar_clientes", publico: "Donos de PME com conta em banco grande", gatilho_identificacao: "Medo de trocar de banco", acao_esperada: "Comentar a dúvida" },
  agenda: { dia: "Quinta-feira", horario: "18h30", fonte: "sua audiência" },
};

describe("roteiros na saída da IA", () => {
  it("aceita roteiros válidos, descarta inválidos e dá id e data real", () => {
    const bruto = saidaMotorSchema.parse(saida({ roteiros: [ROTEIRO, { titulo: "sem gancho", cenas: ["a", "b"] }, { ...ROTEIRO, cenas: ["só uma"] }, "lixo"] }));
    expect(bruto.roteiros).toHaveLength(1);
    const r = saidaParaAnaliseIA(bruto, { brand: cora.brand, palpite: "fintech", quantidade: 4, redes: ["instagram"] });
    const a = aplicarExtras(finalizar("t", cora.brand, r.analise, "ia", "teste", []), r, AGORA);
    expect(a.roteiros).toHaveLength(1);
    const v = a.roteiros![0];
    expect(v.id).toBe("t-v1");
    expect(v.rede).toBe("instagram");
    expect(v.cenas[1]).toEqual({ fala: "Não precisa: [PREENCHER: sua resposta]" });
    expect(v.agenda).toMatchObject({ dia_semana: "quinta", horario: "18:30" });
    expect(new Date(`${v.agenda!.data}T12:00:00Z`).getUTCDay()).toBe(4);
    // Sem dado real do founder naquele horário, "sua audiência" vira hipótese.
    expect(v.agenda!.fonte).toBe("hipótese do nicho");
    expect(v.precisa_revisao?.join(" ")).toMatch(/PREENCHER/);
    // Com dado real naquele dia e horário, a fonte fica.
    const comDado = saidaParaAnaliseIA(bruto, { brand: cora.brand, palpite: "fintech", quantidade: 4, redes: ["instagram"], horariosComDado: ["4|18:30"] });
    expect(aplicarExtras(finalizar("t", cora.brand, comDado.analise, "ia", "teste", []), comDado, AGORA).roteiros![0].agenda!.fonte).toBe("sua audiência");
  });

  it("sem roteiros (ou com lixo) a análise passa e o motor local completa", () => {
    for (const extra of [{}, { roteiros: "nenhum" }, { roteiros: null }]) {
      const bruto = saidaMotorSchema.parse(saida(extra));
      expect(bruto.roteiros).toEqual([]);
      const r = saidaParaAnaliseIA(bruto, { brand: cora.brand, palpite: "fintech", quantidade: 4, redes: ["instagram"] });
      const a = aplicarExtras(finalizar("t", cora.brand, r.analise, "ia", "teste", []), r, AGORA);
      expect(a.roteiros).toBeUndefined();
      const g = garantirRoteiros(a, { publico: "Donos de PME", agora: AGORA });
      expect(g.roteiros).toHaveLength(2);
      expect(g.roteiros![0].id).toBe("t-v1");
    }
  });

  it("corta para 1 roteiro em lote pequeno", () => {
    const bruto = saidaMotorSchema.parse(saida({ roteiros: [ROTEIRO, { ...ROTEIRO, roteiro_id: "v2" }] }));
    expect(saidaParaAnaliseIA(bruto, { brand: cora.brand, palpite: "fintech", quantidade: 3, redes: ["instagram"] }).roteiros).toHaveLength(1);
  });

  it("o system prompt pede roteiros e explica referências e concorrência, sem travessão", () => {
    expect(SISTEMA_MOTOR).toContain('"roteiros"');
    expect(SISTEMA_MOTOR).toContain("concorrencia");
    expect(SISTEMA_MOTOR).toMatch(/nunca cite concorrente pelo nome/);
    expect(SISTEMA_MOTOR).toContain("por_que_funciona");
    expect(SISTEMA_MOTOR).not.toMatch(/[—–]/);
  });
});

// ---------- Demo ----------

describe("demo com roteiros", () => {
  beforeAll(() => {
    vi.stubEnv("DEMO_MODE", "1");
  });

  it("cora ganha roteiros na hora e o resto continua igual", async () => {
    const inicio = Date.now();
    const a = await analisar(cora.brand, { quantidade: 12, identificadores: [] });
    const b = await analisar(cora.brand, { quantidade: 12, identificadores: [] });
    expect(Date.now() - inicio).toBeLessThan(2000);
    expect(a.origem).toBe("demo");
    expect(a.posts.map((p) => p.gancho)).toEqual(cora.posts.map((p) => p.gancho));
    expect(a.posts.map((p) => p.legendas)).toEqual(cora.posts.map((p) => p.legendas));
    expect(a.roteiros).toHaveLength(2);
    expect(a.roteiros).toEqual(b.roteiros);
    for (const r of a.roteiros!) formaValida(r);
    expect(a.roteiros![0].id).toBe("demo-cora-v1");
  });

  it("com respostas do founder, os roteiros nascem delas e o de gerar_clientes leva o link", async () => {
    const pref = preferenciasSchema.parse({ perfil_alvo: "founder", conhecimento_founder: CONHECIMENTO, link_destino: "https://cora.com.br/conversa" });
    const a = await analisar(cora.brand, { quantidade: 9, identificadores: [], preferencias: pref });
    expect(a.roteiros!.map((r) => r.origem_tema)).toEqual(["founder", "founder"]);
    const obj = a.roteiros!.find((r) => r.enderecamento?.objetivo === "gerar_clientes")!;
    const url = new URL(obj.legenda.split("\n").pop()!);
    expect(url.searchParams.get("utm_source")).toBe(obj.rede);
    expect(url.searchParams.get("utm_content")).toBe(obj.id);
    const outro = a.roteiros!.find((r) => r.enderecamento?.objetivo !== "gerar_clientes")!;
    expect(outro.legenda).not.toContain("utm_campaign");
  });
});

// ---------- Link de destino ----------

describe("link de destino nos roteiros", () => {
  const rot = (objetivo: "gerar_clientes" | "comunidade", rede: RoteiroVideo["rede"]): RoteiroVideo => ({
    id: `r-${objetivo}`, titulo: "t", rede, duracao_seg: 30, gancho: "g", cenas: [{ fala: "a" }, { fala: "b" }, { fala: "c" }],
    chamada_final: "c", legenda: "Gancho\n\nCorpo.",
    enderecamento: { objetivo, publico: "Donos de PME", gatilho_identificacao: "x", acao_esperada: "y" },
  });
  const analise = { ...cora, roteiros: [rot("gerar_clientes", "tiktok"), rot("comunidade", "instagram")] } as Analise;

  it("gerar_clientes recebe utm da rede do vídeo e do id; o resto fica igual; idempotente", () => {
    const a = aplicarLinkDestino(analise, "https://wa.me/5511999999999");
    const u = new URL(a.roteiros![0].legenda.split("\n").pop()!);
    expect(u.searchParams.get("utm_source")).toBe("tiktok");
    expect(u.searchParams.get("utm_medium")).toBe("social");
    expect(u.searchParams.get("utm_campaign")).toBe("socialai");
    expect(u.searchParams.get("utm_content")).toBe("r-gerar_clientes");
    expect(a.roteiros![1]).toEqual(analise.roteiros![1]);
    expect(aplicarLinkDestino(a, "https://wa.me/5511999999999")).toEqual(a);
  });
});

// ---------- Concorrência e referências no CONTEXTO ----------

describe("concorrentes e referências no CONTEXTO", () => {
  it("concorrentes entram com a descrição lida e nada mais", () => {
    const pref = preferenciasSchema.parse({ concorrentes: ["https://concorrente.com.br", "https://outro.com"] });
    const c = montarContexto(cora.brand, pref, { concorrenciaExtraida: { "https://concorrente.com.br": "Conta PJ grátis. Para MEI" } });
    expect(c.concorrencia).toEqual([
      { url: "https://concorrente.com.br", descricao_extraida: "Conta PJ grátis. Para MEI", o_que_publica: "" },
      { url: "https://outro.com", descricao_extraida: "", o_que_publica: "" },
    ]);
    expect(montarPromptMotor(c)).toContain("concorrente.com.br");
    expect(preferenciasSchema.safeParse({ concorrentes: ["https://a.com", "https://b.com", "https://c.com", "https://d.com"] }).success).toBe(false);
    expect(preferenciasSchema.parse({}).concorrentes).toEqual([]);
  });

  it("pesquisa de mercado: o que o concorrente publica entra pela url, e o que está em alta vai com a fonte", () => {
    const pref = preferenciasSchema.parse({
      concorrentes: ["https://concorrente.com.br"],
      pesquisa_mercado: {
        mercado: "Conta digital para MEI",
        nicho: "fintech",
        concorrentes: [{ nome: "Concorrente", url: "https://www.concorrente.com.br/", o_que_publica: "Dicas de imposto em carrossel" }],
        em_alta: [{ tema: "DAS atrasado", gancho: "Você sabe quanto custa atrasar o DAS?", por_que: "medo de multa", quem: "mídia do nicho", url: "https://exemplo.com/das" }],
      },
    });
    const c = montarContexto(cora.brand, pref, {});
    expect(c.concorrencia[0].o_que_publica).toBe("Dicas de imposto em carrossel");
    expect(c.mercado_pesquisado).toBe("Conta digital para MEI");
    expect(c.em_alta_no_nicho).toEqual([{ tema: "DAS atrasado", gancho: "Você sabe quanto custa atrasar o DAS?", por_que: "medo de multa", quem: "mídia do nicho", url: "https://exemplo.com/das" }]);
    const prompt = montarPromptMotor(c);
    expect(prompt).toContain("DAS atrasado");
    expect(prompt).toContain("em_alta_no_nicho");
  });

  it("cada referência do nicho diz o gancho real, a estrutura e por que funcionou, em JSON compacto", () => {
    const catalogo = construirCatalogo(itensDoArquivo());
    const refs = padroesDoNicho(catalogo, "fintech", 10).map((p) => ({ padrao: p, exemplos: itensDoArquivo().filter((i) => p.exemplos.includes(i.id)) }));
    const c = montarContexto(cora.brand, null, { referencias: refs });
    expect(c.referencias_nicho.length).toBeGreaterThan(0);
    expect(c.referencias_nicho.length).toBeLessThanOrEqual(12);
    const comExemplo = c.referencias_nicho.filter((r) => r.texto_gancho);
    expect(comExemplo.length).toBeGreaterThan(0);
    for (const r of c.referencias_nicho) {
      expect(r.estrutura.length).toBeLessThanOrEqual(6);
      expect(r.por_que_funciona.length).toBeLessThanOrEqual(240);
      expect(r.texto_gancho.length).toBeLessThanOrEqual(200);
    }
    expect(JSON.stringify(c.referencias_nicho)).not.toMatch(/[—–]/);
  });

  it("referências: até 12, verificados e carrosséis primeiro, estrutura de até 6 passos", async () => {
    const refs = await contextoViralDoNicho("saas-b2b", 10);
    const c = montarContexto(cora.brand, null, { referencias: refs });
    expect(c.referencias_nicho.length).toBeLessThanOrEqual(12);
    expect(c.referencias_nicho.length).toBeGreaterThan(6);
    expect(c.referencias_nicho.every((r) => r.estrutura.length <= 6)).toBe(true);
    const pesos = c.referencias_nicho.map((r) => Number(r.metrica_verificada) * 2 + Number(r.formato === "carrossel"));
    expect([...pesos].sort((a, b) => b - a)).toEqual(pesos);
  });
});

// ---------- Sem site ----------

describe("marca sem site", () => {
  beforeAll(() => {
    vi.stubEnv("DEMO_MODE", "1");
  });
  const brand = brandSemSite({ nome: "Loja da Ana", descricao: "Consultoria de finanças para clínicas pequenas.", nicho: "healthtech" }, AGORA);

  it("nicho informado ganha do palpite, nome digitado fica, chave de cache funciona", () => {
    expect(palpiteNicho(brand).nicho).toBe("healthtech");
    expect(palpiteNicho({ ...brand, nicho_informado: "qualquer" as never }).nicho).not.toBe("qualquer");
    expect(nomeDoPerfil(brand)).toBe("Loja da Ana");
    expect(chaveCache(brand.url)).toBe(brand.dominio);
  });

  it("analisar sem IA entrega posts válidos e roteiros, sem inventar e sem cara de IA", async () => {
    for (const pref of [undefined, preferenciasSchema.parse({ conhecimento_founder: { historia: "Atendi uma clínica que fechava o mês sem saber quanto tinha lucrado." } })]) {
      const a = await analisar(brand, { quantidade: 6, identificadores: [], preferencias: pref });
      expect(a.origem).toBe("local");
      expect(a.sem_site).toBe(true);
      expect(a.nicho).toBe("healthtech");
      expect(a.brand.nome).toBe("Loja da Ana");
      expect(a.posts.length).toBeGreaterThan(0);
      const core = { ...a, posts: a.posts.map((p) => postIASchema.parse(p)) };
      expect(analiseIASchema.safeParse(core).success).toBe(true);
      for (const p of a.posts) {
        expect(p.enderecamento?.publico.trim().length).toBeGreaterThan(5);
        expect(p.enderecamento?.gatilho_identificacao.trim().length).toBeGreaterThan(3);
        expect(p.enderecamento?.acao_esperada.trim().length).toBeGreaterThan(3);
      }
      expect(a.roteiros!.length).toBeGreaterThanOrEqual(1);
      for (const r of a.roteiros!) formaValida(r);
      const tudo = JSON.stringify({ ...a, brand: undefined });
      expect(tudo).not.toMatch(/[—–]/);
      expect(tudo).not.toMatch(IA_DEMAIS);
      // Nada de lixo de navegação vindo de um "site" que não existe.
      expect(tudo).not.toMatch(/sem-site\.social\.ai.*(login|entrar|menu)/i);
      if (pref) expect(a.roteiros![0].origem_tema).toBe("founder");
    }
  });

  it("/api/analyze aceita o perfil sem site e nunca tenta ler a url", async () => {
    const req = (body: object) => new Request("http://localhost/api/analyze", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const r = await analyzePOST(req({ brand, quantidade: 3 }));
    expect(r.status).toBe(200);
    const a = (await r.json()) as Analise;
    expect(a.sem_site).toBe(true);
    expect(a.roteiros).toHaveLength(1);
    const incompleto = await analyzePOST(req({ brand: { url: brand.url }, quantidade: 3 }));
    expect(incompleto.status).toBe(400);
    const soUrl = await analyzePOST(req({ url: brand.url, quantidade: 3 }));
    expect(soUrl.status).toBe(400);
  });
});
