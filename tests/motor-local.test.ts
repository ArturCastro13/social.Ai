import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { analiseLocal } from "@/lib/engine/local";
import { palpiteNicho, textoDaMarca } from "@/lib/engine/nicho";
import { analiseIASchema } from "@/lib/engine/schema";
import { paraHashtag } from "@/lib/engine/texto-local";
import { nomeDaMarca, nomeDoPerfil } from "@/lib/brand/nome";
import { guessBrandName } from "@/lib/brand/html";
import { construirCatalogo, padroesDoNicho } from "@/lib/virais/catalogo";
import { itensDoArquivo } from "@/lib/virais";
import type { BrandProfile, Rede } from "@/lib/types";

const raiz = path.resolve(import.meta.dirname, "..");
const ler = (arq: string) => JSON.parse(readFileSync(path.join(raiz, arq), "utf8"));

const MARCAS: { arquivo: string; nome: string; brand: BrandProfile }[] = [
  { arquivo: "omie", nome: "Omie", brand: ler("tests/fixtures/marcas/omie.json") },
  { arquivo: "contaazul", nome: "Conta Azul", brand: ler("tests/fixtures/marcas/contaazul.json") },
  { arquivo: "rdstation", nome: "RD Station", brand: ler("tests/fixtures/marcas/rdstation.json") },
  { arquivo: "nuvemshop", nome: "Nuvemshop", brand: ler("tests/fixtures/marcas/nuvemshop.json") },
  { arquivo: "cora", nome: "Cora", brand: ler("data/demo/cora.json").brand },
  { arquivo: "pipefy", nome: "Pipefy", brand: ler("data/demo/pipefy.json").brand },
  { arquivo: "sallve", nome: "Sallve", brand: ler("data/demo/sallve.json").brand },
];

const catalogo = construirCatalogo(itensDoArquivo());

function gerar(b: BrandProfile, quantidade = 7) {
  const nicho = palpiteNicho(b).nicho;
  const padroes = padroesDoNicho(catalogo, nicho, 10);
  const redes = (["linkedin", "instagram", "x", "facebook"] as Rede[]).filter((r) => b.handles[r]);
  return { out: analiseLocal(b, nicho, padroes, quantidade, redes.length ? redes : ["linkedin", "instagram"]), padroes };
}

/** Todas as strings da saída, para varrer regras de escrita. */
function textos(v: unknown): string[] {
  if (typeof v === "string") return [v];
  if (Array.isArray(v)) return v.flatMap(textos);
  if (v && typeof v === "object") return Object.values(v).flatMap(textos);
  return [];
}

// Lista independente da implementação (regras do SISTEMA em src/lib/llm/prompt.ts).
const PROIBIDAS = [
  /descubr/i, /descobr/i, /revolucion/i, /potencializ/i, /transform/i, /(?<![\p{L}])elev(e|a|ar|am|ando)(?![\p{L}])/iu,
  /alavanc/i, /jornada/i, /sinergia/i, /incr[íi]ve(l|is)/i, /no mundo de hoje/i, /o segredo [ée]/i,
];

const NAVEGACAO = [
  "Dúvidas frequentes", "Depoimentos de nossos clientes", "Marcas que crescem com a", "Radar setorial", "Radar Setorial",
  "Teste grátis por 7 dias", "Estamos revolucionando", "seu carrinho", "Onde encontrar", "avaliações da comunidade",
  "Tá com dúvida", "Conheça os produtos", "Escolhido por líderes", "Descubra o AI Studio", "Solução para empresas",
  "Manual de sobrevivência", "CHEGUEI20", "necessaire", "Advogados autônomos", "Qual seu principal desafio",
];

const EMOJI = /\p{Extended_Pictographic}/gu;

describe("nome da marca", () => {
  it.each(MARCAS.map((m) => [m.arquivo, m.nome, m.brand] as const))("%s vira %s", (_, nome, brand) => {
    expect(nomeDoPerfil(brand)).toBe(nome);
  });
  it("prefere o nome que bate com o domínio ao pedaço genérico do title", () => {
    const omie = MARCAS[0].brand;
    const ex = { siteName: null, title: omie.title, og: { title: omie.og.title, description: null, image: null } };
    expect(guessBrandName(ex, "omie.com.br", [...omie.headings.h2, ...omie.paragrafos])).toBe("Omie");
    // Sem texto nenhum, cai para o domínio, nunca para "Solução para empresas".
    expect(guessBrandName(ex, "omie.com.br")).toBe("Omie");
  });
  it("usa og:site_name quando bate com o domínio e cai para o domínio capitalizado", () => {
    expect(nomeDaMarca({ siteName: "Conta Azul", title: "ERP online", dominio: "contaazul.com" })).toBe("Conta Azul");
    expect(nomeDaMarca({ title: "Plataforma de gestão online", dominio: "exemplo.com.br" })).toBe("Exemplo");
  });
});

describe("hashtags", () => {
  it("tiram acento do jeito certo", () => {
    expect(paraHashtag("Solução para empresas")).toBe("solucaoparaempresas");
    expect(paraHashtag("Gestão")).toBe("gestao");
    expect(paraHashtag("RD Station")).toBe("rdstation");
  });
});

describe.each(MARCAS.map((m) => [m.arquivo, m] as const))("motor local: %s", (_, marca) => {
  const { out, padroes } = gerar(marca.brand);
  const copy = textos(out);
  const siteTexto = textoDaMarca(marca.brand);

  it("gera saída válida no schema do engine", () => {
    const r = analiseIASchema.safeParse(out);
    expect(r.success, JSON.stringify(!r.success && r.error.issues)).toBe(true);
    expect(out.posts).toHaveLength(7);
  });

  it("não tem travessão nem palavra proibida", () => {
    for (const t of copy) {
      expect(/[—–]/.test(t), t).toBe(false);
      for (const re of PROIBIDAS) expect(re.test(t), `${re} em: ${t}`).toBe(false);
    }
  });

  it("não cola fragmentos de navegação do site", () => {
    const tudo = copy.join("\n");
    for (const frag of NAVEGACAO) expect(tudo.includes(frag), frag).toBe(false);
  });

  it("usa o nome certo da marca", () => {
    const tudo = copy.join("\n");
    expect(tudo).toContain(marca.nome);
    expect(out.posicionamento).toContain(marca.nome);
  });

  it("não repete gancho e varia formato", () => {
    const ganchos = out.posts.map((p) => p.gancho.toLowerCase());
    expect(new Set(ganchos).size).toBe(ganchos.length);
    expect(new Set(out.posts.map((p) => p.formato)).size).toBeGreaterThanOrEqual(3);
  });

  it("segue as regras por rede", () => {
    for (const p of out.posts) {
      for (const h of p.hashtags) expect(h, h).toMatch(/^[a-z0-9]+$/);
      expect(p.legendas.x.length).toBeLessThanOrEqual(260);
      expect(p.legendas.instagram.split("\n")[0]).toBe(p.gancho);
      for (const rede of ["instagram", "facebook"] as const) expect((p.legendas[rede].match(EMOJI) ?? []).length).toBeLessThanOrEqual(1);
      for (const rede of ["linkedin", "x"] as const) expect(p.legendas[rede].match(EMOJI)).toBeNull();
      const tagsLinkedin = p.legendas.linkedin.match(/#\S+/g) ?? [];
      expect(tagsLinkedin.length).toBeLessThanOrEqual(3);
      for (const t of [...tagsLinkedin, ...(p.legendas.instagram.match(/#\S+/g) ?? [])]) expect(t).toMatch(/^#[a-z0-9]+$/);
      // Gancho na primeira linha, 2 a 5 linhas de conteúdo, chamada no fim.
      const blocos = p.legendas.facebook.split("\n\n");
      const miolo = blocos.slice(1, -1).join("\n").split("\n").filter(Boolean);
      expect(miolo.length).toBeGreaterThanOrEqual(2);
      expect(miolo.length).toBeLessThanOrEqual(5);
    }
  });

  it("monta slides coerentes com cada template", () => {
    for (const p of out.posts) {
      if (p.template === "capa-gancho") {
        expect(p.slides.length).toBeGreaterThanOrEqual(5);
        expect(p.slides.length).toBeLessThanOrEqual(8);
        expect(p.slides[0].titulo).toBe(p.gancho);
        expect(p.gancho.split(/\s+/).length).toBeLessThanOrEqual(9);
      }
      if (p.template === "lista") expect(p.slides.length).toBeGreaterThanOrEqual(4);
      if (p.template === "antes-depois") expect(p.slides).toHaveLength(2);
      if (p.formato === "citacao") expect(p.slides[0].titulo).toMatch(new RegExp(`^Time d[ao] ${marca.nome}$`));
      if (p.template === "dado-impacto") {
        // Número só se estiver no texto do site.
        const digitos = p.slides[0].titulo.match(/\d+(?:[.,]\d+)?/)?.[0];
        expect(digitos && siteTexto.includes(digitos), p.slides[0].titulo).toBe(true);
      }
    }
  });

  it("explica o porquê com um padrão real da base, sem prometer métrica", () => {
    const ids = new Set(padroes.map((p) => p.id));
    for (const p of out.posts) {
      expect(ids.has(p.padrao_inspirador), p.padrao_inspirador).toBe(true);
      expect(p.por_que).not.toMatch(/mais salvo|mais engaja|mais converte|o que mais/i);
      expect(p.por_que.length).toBeGreaterThan(40);
    }
  });

  it("é determinístico", () => {
    expect(gerar(marca.brand).out).toEqual(out);
  });
});

describe("motor local com 12 posts", () => {
  it.each(MARCAS.map((m) => [m.arquivo, m.brand] as const))("%s gera 12 posts sem repetir gancho", (_, brand) => {
    const { out } = gerar(brand, 12);
    expect(analiseIASchema.safeParse(out).success).toBe(true);
    expect(out.posts).toHaveLength(12);
    expect(new Set(out.posts.map((p) => p.gancho.toLowerCase())).size).toBe(12);
  });
});
