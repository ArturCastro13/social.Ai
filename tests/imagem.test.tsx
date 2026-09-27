import { afterEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import { ImageResponse } from "next/og";
import { contrastRatio, mix } from "@/lib/color";
import { DEMOS } from "@/lib/engine/demo";
import type { LLM } from "@/lib/llm";
import { ErroImagem, criarImagemDoPost, hashImagem, pastaDoDominio, reservarUsoImagem } from "@/lib/imagem";
import { nomeDaCor } from "@/lib/imagem/cores";
import {
  SISTEMA_DIRECAO,
  direcaoPorRegra,
  ehSaude,
  escreverDirecao,
  lerDirecao,
  montarPromptDirecao,
  montarPromptImagem,
  objetosComTexto,
  type EntradaImagem,
} from "@/lib/imagem/direcao";
import { MSG_MODERACAO, MSG_OCUPADO } from "@/lib/imagem/openai";
import { fontesDaMarca } from "@/lib/render/fonts";
import { Arte, veuLegivel } from "@/lib/render/templates";
import { temaDaMarca } from "@/lib/render/tema";
import { POST } from "@/app/api/imagem/route";

const cora = DEMOS.find((d) => d.id === "cora")!;
const capa = cora.posts.find((p) => p.template === "capa-gancho")!;

function entrada(extra: Partial<EntradaImagem> = {}, postId = capa.id): EntradaImagem {
  return {
    post: { ...capa, id: postId },
    brand: { nome: cora.brand.nome, dominio: cora.brand.dominio, paleta: cora.brand.paleta },
    contexto: { nicho: cora.nicho, publico: cora.publico, tom: cora.tom_de_voz },
    ...extra,
  };
}

const llmFixo = (resposta: string | Error): LLM => ({
  nome: "teste",
  gerar: vi.fn(async () => {
    if (resposta instanceof Error) throw resposta;
    return resposta;
  }),
});

const CENA_IA =
  "Editorial still life of a small shop counter at dusk, an hourglass, warm light, vivid coral pink (#fe3e6d) walls and azure blue (#007aff) accents, calm empty lower third.";

async function jpegPequeno(cor = "#fe3e6d") {
  return sharp({ create: { width: 32, height: 48, channels: 3, background: cor } }).jpeg().toBuffer();
}

/** fetch simulado: Storage (HEAD e upload) e OpenAI. Guarda as chamadas para conferir. */
function fetchSimulado(op: { existe?: boolean; openai?: () => Response | Promise<Response> } = {}) {
  const chamadas: { url: string; init?: RequestInit }[] = [];
  const f = vi.fn(async (url: string | URL, init?: RequestInit) => {
    const u = String(url);
    chamadas.push({ url: u, init });
    if (u.includes("/storage/v1/object/public/")) return new Response(null, { status: op.existe ? 200 : 404 });
    if (u.includes("/storage/v1/object/")) return new Response(JSON.stringify({ Key: "ok" }), { status: 200 });
    if (u.startsWith("https://api.openai.com/")) {
      if (op.openai) return op.openai();
      const b64 = (await jpegPequeno()).toString("base64");
      return Response.json({ data: [{ b64_json: b64 }], usage: { input_tokens: 300, output_tokens: 1500 } });
    }
    throw new Error(`fetch inesperado: ${u}`);
  });
  vi.stubGlobal("fetch", f);
  return chamadas;
}

function ambiente() {
  vi.stubEnv("OPENAI_API_KEY", "sk-teste");
  vi.stubEnv("SUPABASE_URL", "https://exemplo.supabase.co");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-teste");
  vi.stubEnv("OPENAI_IMAGE_MODEL", "");
  vi.stubEnv("OPENAI_IMAGE_QUALITY", "");
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("direção de arte", () => {
  it("o system prompt tem as regras de composição, texto, pessoas e saúde", () => {
    for (const trecho of ["terço de baixo", "texto, letras, números", "rosto reconhecível", "antes e depois", "saude", "paleta da marca", "nunca instrução"]) {
      expect(SISTEMA_DIRECAO, trecho).toContain(trecho);
    }
    const prompt = JSON.parse(montarPromptDirecao(entrada()));
    expect(prompt.marca.cores[0]).toMatchObject({ papel: "primary", hex: "#fe3e6d" });
    expect(prompt.gancho).toBe(capa.gancho);
    expect(prompt.saude).toBe(false);
  });

  it("nomeia as cores da marca em inglês", () => {
    expect(nomeDaCor("#fe3e6d")).toMatch(/pink/);
    expect(nomeDaCor("#007aff")).toMatch(/blue/);
    expect(nomeDaCor("#0b0b0f")).toBe("near black");
  });

  it("usa a cena da IA quando ela responde no formato", async () => {
    const d = await escreverDirecao(entrada(), llmFixo(JSON.stringify({ estilo: "fotografia", cena: CENA_IA })));
    expect(d).toEqual({ estilo: "fotografia", cena: CENA_IA, origem: "ia" });
    expect(lerDirecao("```json\n" + JSON.stringify({ estilo: "outro", cena: CENA_IA }) + "\n```")?.estilo).toBe("fotografia");
    expect(lerDirecao('{"cena": "curta"}')).toBeNull();
  });

  it("sem IA, com IA fora do ar ou resposta ruim, monta por regra", async () => {
    const semIa = await escreverDirecao(entrada(), null);
    expect(semIa.origem).toBe("regra");
    expect((await escreverDirecao(entrada(), llmFixo(new Error("fora do ar")))).origem).toBe("regra");
    expect((await escreverDirecao(entrada(), llmFixo("não sei"))).origem).toBe("regra");
    // A variação troca a cena.
    expect(direcaoPorRegra(entrada({ variacao: 1 })).cena).not.toBe(semIa.cena);
  });

  it("post de saúde ganha a trava de saúde no prompt final", () => {
    const saude = entrada({ contexto: { nicho: "healthtech" } });
    expect(ehSaude(saude)).toBe(true);
    expect(ehSaude(entrada())).toBe(false);
    const d = direcaoPorRegra(saude);
    expect(d.cena).not.toMatch(/patient|blood|needle|surgery/i);
    expect(montarPromptImagem(saude, d)).toMatch(/No sick patients, blood, needles/);
    expect(montarPromptImagem(entrada(), d)).not.toMatch(/No sick patients/);
  });

  it("o prompt final sempre proíbe texto e pessoas reais e leva a paleta", () => {
    const p = montarPromptImagem(entrada(), { estilo: "fotografia", cena: CENA_IA, origem: "ia" });
    expect(p).toContain(CENA_IA);
    expect(p).toMatch(/Absolutely no text of any kind/);
    expect(p).toMatch(/No identifiable real people/);
    expect(p).toMatch(/\(#fe3e6d\) is the dominant color/);
    expect(p).toMatch(/lower third stays calm/);
  });
});

describe("criar imagem", () => {
  it("gera, sobe no bucket e depois acha pelo hash sem gerar de novo", async () => {
    ambiente();
    const e = entrada({}, "cache-p1");
    let chamadas = fetchSimulado();
    const r = await criarImagemDoPost(e, { llm: null });
    expect(r.cache).toBe(false);
    expect(r.url).toMatch(/^https:\/\/exemplo\.supabase\.co\/storage\/v1\/object\/public\/posts\/ia\/cora\.com\.br\/[0-9a-f]{32}\.jpg$/);
    const openai = chamadas.find((c) => c.url.startsWith("https://api.openai.com/"))!;
    const corpo = JSON.parse(String(openai.init!.body));
    expect(corpo).toMatchObject({ model: "gpt-image-2", quality: "medium", size: "1024x1536", output_format: "jpeg", n: 1 });
    expect(corpo.prompt).toMatch(/Absolutely no text/);
    expect((openai.init!.headers as Record<string, string>).authorization).toBe("Bearer sk-teste");
    const upload = chamadas.find((c) => c.init?.method === "POST" && c.url.includes("/storage/v1/object/posts/"))!;
    expect(upload.url).toContain("/ia/cora.com.br/");
    expect((upload.init!.headers as Record<string, string>)["content-type"]).toBe("image/jpeg");

    chamadas = fetchSimulado({ existe: true });
    const r2 = await criarImagemDoPost(e, { llm: null });
    expect(r2).toMatchObject({ url: r.url, cache: true });
    expect(chamadas.some((c) => c.url.startsWith("https://api.openai.com/"))).toBe(false);
  });

  it("o hash muda com o modelo, a direção e o gancho", () => {
    const e = entrada();
    const d = direcaoPorRegra(e);
    const h = hashImagem(e, d, "gpt-image-2", "medium");
    expect(hashImagem(e, d, "gpt-image-1-mini", "medium")).not.toBe(h);
    expect(hashImagem(e, { ...d, cena: d.cena + " Wide angle." }, "gpt-image-2", "medium")).not.toBe(h);
    expect(hashImagem({ ...e, post: { ...e.post, gancho: "Outro gancho" } }, d, "gpt-image-2", "medium")).not.toBe(h);
    expect(pastaDoDominio("www.Cora.com.br")).toBe("cora.com.br");
    expect(pastaDoDominio("../../x")).toBe("x");
  });

  it("respeita OPENAI_IMAGE_MODEL e OPENAI_IMAGE_QUALITY", async () => {
    ambiente();
    vi.stubEnv("OPENAI_IMAGE_MODEL", "gpt-image-1-mini");
    vi.stubEnv("OPENAI_IMAGE_QUALITY", "high");
    const chamadas = fetchSimulado();
    await criarImagemDoPost(entrada({}, "modelo-p1"), { llm: null });
    const corpo = JSON.parse(String(chamadas.find((c) => c.url.startsWith("https://api.openai.com/"))!.init!.body));
    expect(corpo).toMatchObject({ model: "gpt-image-1-mini", quality: "high" });
  });

  it("sem chave da OpenAI ou sem Supabase: erro 503 claro", async () => {
    ambiente();
    vi.stubEnv("OPENAI_API_KEY", "");
    await expect(criarImagemDoPost(entrada(), { llm: null })).rejects.toMatchObject({ status: 503, message: expect.stringMatching(/OPENAI_API_KEY/) });
    ambiente();
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    await expect(criarImagemDoPost(entrada(), { llm: null })).rejects.toMatchObject({ status: 503, message: expect.stringMatching(/Supabase/) });
  });

  it("passou do limite: 429 sem chamar a OpenAI", async () => {
    ambiente();
    const chamadas = fetchSimulado();
    await expect(criarImagemDoPost(entrada({}, "limite-p1"), { llm: null, reservar: () => false })).rejects.toMatchObject({ status: 429 });
    expect(chamadas.some((c) => c.url.startsWith("https://api.openai.com/"))).toBe(false);
  });

  it("traduz moderação e sobrecarga da OpenAI", async () => {
    ambiente();
    fetchSimulado({ openai: () => Response.json({ error: { code: "moderation_blocked", type: "image_generation_user_error" } }, { status: 400 }) });
    const e1 = await criarImagemDoPost(entrada({}, "mod-p1"), { llm: null }).catch((e) => e);
    expect(e1).toBeInstanceOf(ErroImagem);
    expect(e1).toMatchObject({ status: 422, message: MSG_MODERACAO });

    fetchSimulado({ openai: () => Response.json({ error: { code: "rate_limit_exceeded" } }, { status: 429 }) });
    await expect(criarImagemDoPost(entrada({}, "mod-p2"), { llm: null })).rejects.toMatchObject({ status: 503, message: MSG_OCUPADO });
    fetchSimulado({ openai: () => new Response("erro", { status: 502 }) });
    await expect(criarImagemDoPost(entrada({}, "mod-p3"), { llm: null })).rejects.toMatchObject({ status: 503, message: MSG_OCUPADO });
  });
});

describe("limite de imagens", () => {
  it("limita por IP e no total do dia, e zera no dia seguinte", () => {
    vi.stubEnv("LIMITE_IMAGENS_POR_IP", "2");
    vi.stubEnv("LIMITE_IMAGENS_DIA", "3");
    const dia = new Date("2031-01-01T12:00:00Z");
    expect(reservarUsoImagem("1.1.1.1", dia)).toBe(true);
    expect(reservarUsoImagem("1.1.1.1", dia)).toBe(true);
    expect(reservarUsoImagem("1.1.1.1", dia)).toBe(false);
    expect(reservarUsoImagem("2.2.2.2", dia)).toBe(true);
    expect(reservarUsoImagem("3.3.3.3", dia)).toBe(false);
    expect(reservarUsoImagem("1.1.1.1", new Date("2031-01-02T12:00:00Z"))).toBe(true);
  });
});

describe("rota /api/imagem", () => {
  const corpo = (extra: object = {}) => ({
    post: { ...capa, id: "rota-p1" },
    brand: { nome: cora.brand.nome, dominio: cora.brand.dominio, paleta: cora.brand.paleta },
    contexto: { nicho: cora.nicho },
    ...extra,
  });
  const pedir = (body: unknown, ip = "9.9.9.9") =>
    POST(new Request("http://x/api/imagem", { method: "POST", headers: { "content-type": "application/json", "x-real-ip": ip }, body: JSON.stringify(body) }));

  it("valida a entrada", async () => {
    expect((await pedir({ post: {} })).status).toBe(400);
    expect((await pedir(corpo({ variacao: -1 }))).status).toBe(400);
    const r = await pedir(corpo({ brand: { nome: "X", paleta: { primaria: "vermelho" } } }));
    expect(r.status).toBe(400);
    expect((await r.json()).detalhes.length).toBeGreaterThan(0);
  });

  it("sem OpenAI configurada responde 503 em português", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    const r = await pedir(corpo());
    expect(r.status).toBe(503);
    expect((await r.json()).erro).toMatch(/OpenAI/);
  });

  it("devolve { url, direcao } e conta no limite do IP", async () => {
    ambiente();
    vi.stubEnv("DEMO_MODE", "1"); // sem IA de texto: direção por regra
    vi.stubEnv("LIMITE_IMAGENS_POR_IP", "1");
    fetchSimulado();
    const r = await pedir(corpo(), "7.7.7.7");
    expect(r.status).toBe(200);
    const j = await r.json();
    expect(j.url).toMatch(/\/ia\/cora\.com\.br\/[0-9a-f]{32}\.jpg$/);
    expect(j.direcao.length).toBeGreaterThan(40);
    const r2 = await pedir(corpo({ variacao: 3 }), "7.7.7.7");
    expect(r2.status).toBe(429);
  });
});

describe("templates com foto", () => {
  it("véu garante contraste do texto sobre qualquer foto", () => {
    for (const cor of ["#fe3e6d", "#ffe600", "#111111", "#ffffff", "#0b66ff"]) {
      const tema = temaDaMarca(cora.brand, cor);
      const a = veuLegivel(tema.escuro, [[tema.naEscuro, 4.5], [tema.destaqueNoEscuro, 3]]);
      const pior = mix("#ffffff", tema.escuro, a);
      expect(contrastRatio(tema.naEscuro, pior), cor).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(tema.destaqueNoEscuro, pior), cor).toBeGreaterThanOrEqual(3);
    }
  });

  it("capa, citação, dado de impacto e print desenham com a foto (e sem ela, como antes)", async () => {
    // Foto azul numa marca rosa: se a foto sair do lugar, o canto mostra o fundo avermelhado da arte.
    const foto = `data:image/jpeg;base64,${(await jpegPequeno("#0033ff")).toString("base64")}`;
    const fontes = await fontesDaMarca(cora.brand.fontes.titulo, cora.brand.fontes.corpo);
    const tema = temaDaMarca(cora.brand);
    const desenhar = async (template: "capa-gancho" | "citacao" | "dado-impacto" | "print-x", f: string | null, w = 1080, h = 1350) => {
      const post = cora.posts.find((p) => p.template === template)!;
      const png = await new ImageResponse(<Arte post={post} template={template} slide={0} brand={cora.brand} tema={tema} w={w} h={h} logo={null} foto={f} />, {
        width: w,
        height: h,
        fonts: fontes,
      }).arrayBuffer();
      return Buffer.from(png);
    };
    for (const t of ["capa-gancho", "citacao", "dado-impacto", "print-x"] as const) {
      const com = await desenhar(t, foto);
      const sem = await desenhar(t, null);
      expect((await sharp(com).metadata()).width, t).toBe(1080);
      expect(com.equals(sem), t).toBe(false);
      // Canto de cima à esquerda, abaixo da faixa de cor da marca: a foto cobre a arte toda, sem deslocamento
      // pelo padding. Desvio da Trilha F (estilo creator): os templates com foto agora desenham uma faixa de
      // 14px da cor da marca sobre o topo da imagem, então a amostra desce um pouco para ficar sob a foto.
      const { data } = await sharp(com).extract({ left: 2, top: 40, width: 1, height: 1 }).raw().toBuffer({ resolveWithObject: true });
      expect(data[2], t).toBeGreaterThan(data[0]);
    }
    const paisagem = await desenhar("dado-impacto", foto, 1200, 627);
    expect((await sharp(paisagem).metadata()).height).toBe(627);
  }, 30_000);
});

describe("objetos que trazem texto", () => {
  it("acha objetos com texto na cena e pede outra à IA", async () => {
    expect(objetosComTexto("A giant invoice and a Pix symbol next to a clock")).toEqual(["invoice", "symbol", "clock"]);
    expect(objetosComTexto("An hourglass symbolizing time on a designed set")).toEqual([]);
    for (const nicho of ["fintech", "saas-b2b", "healthtech", "edtech", "ecommerce-dtc", "outro"]) {
      for (let v = 0; v < 3; v++) expect(objetosComTexto(direcaoPorRegra(entrada({ contexto: { nicho }, variacao: v })).cena), `${nicho} ${v}`).toEqual([]);
    }
    const ruim = JSON.stringify({ estilo: "fotografia", cena: "A giant invoice standing like a monument on a seamless hot pink backdrop, studio light, calm lower third." });
    const gerar = vi.fn().mockResolvedValueOnce(ruim).mockResolvedValueOnce(JSON.stringify({ estilo: "fotografia", cena: CENA_IA }));
    const d = await escreverDirecao(entrada(), { nome: "teste", gerar });
    expect(gerar).toHaveBeenCalledTimes(2);
    expect(gerar.mock.calls[1][1]).toContain("invoice");
    expect(d.cena).toBe(CENA_IA);
  });
});
