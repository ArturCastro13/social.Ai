import { describe, expect, it } from "vitest";
import { criarOuvinteAoVivo, ganchoParcial, lerPostsParciais } from "@/lib/engine/ao-vivo";
import { DEMOS } from "@/lib/engine/demo";
import { preferenciasSchema, type EventoAoVivo } from "@/lib/motor/contrato";

// DEMOS é uma lista de análises prontas (não um objeto com chave por empresa).
const cora = DEMOS.find((d) => d.brand.dominio === "cora.com.br")!;

const completo = JSON.stringify({
  posts: [
    { gancho: "Primeiro {com chave} e \"aspas\"", slides_ou_arte: [{ titulo: "a", texto: "b" }] },
    { gancho: "Segundo", slides_ou_arte: [] },
  ],
  roteiros: [],
});

describe("leitor incremental", () => {
  it("devolve só os objetos que já fecharam, na ordem", () => {
    // Corta logo depois do campo "gancho" do segundo post: ele ainda não fechou (falta slides_ou_arte).
    const idx = completo.indexOf('{"gancho":"Segundo"');
    const corte = idx > 0 ? idx : completo.length;
    const r = lerPostsParciais(completo.slice(0, corte + 20));
    expect(r.prontos).toHaveLength(1);
    expect(JSON.parse(r.prontos[0]).gancho).toBe('Primeiro {com chave} e "aspas"');
    expect(r.escrevendo).toEqual({ indice: 1, gancho: "Segundo" });
  });

  it("com a resposta inteira, lê todos e não há post aberto", () => {
    const r = lerPostsParciais(completo);
    expect(r.prontos.map((p) => JSON.parse(p).gancho)).toEqual(['Primeiro {com chave} e "aspas"', "Segundo"]);
    expect(r.escrevendo).toBeNull();
  });

  it("antes do array de posts não há nada", () => {
    expect(lerPostsParciais('{"pos')).toEqual({ prontos: [], escrevendo: null });
  });

  it("gancho parcial só quando o campo já fechou", () => {
    expect(ganchoParcial('{"gancho":"Meio do')).toBeNull();
    expect(ganchoParcial('{"gancho":"Inteiro \\"ok\\"","slides')).toBe('Inteiro "ok"');
  });
});

describe("ouvinte ao vivo", () => {
  const saida = JSON.stringify({
    posts: [
      { rede: "instagram", formato: "carrossel", gancho: "Analisamos 3.847 PMEs", slides_ou_arte: [{ titulo: "Analisamos 3.847 PMEs", texto: "E aprendemos isto" }, { titulo: "Um", texto: "x" }], legenda: "Legenda **forte**", destaque: "3.847 PMEs" },
      { rede: "linkedin", formato: "carrossel", gancho: "Segundo post", slides_ou_arte: [{ titulo: "Segundo post", texto: "" }], legenda: "Outra" },
    ],
    roteiros: [],
  });

  it("emite escrevendo e post, já com id final e checagens aplicadas", () => {
    const eventos: EventoAoVivo[] = [];
    const o = criarOuvinteAoVivo({
      id: "abc",
      quantidade: 2,
      adaptador: { brand: cora.brand, palpite: "fintech", quantidade: 2, redes: ["instagram", "linkedin"], preferencias: preferenciasSchema.parse({}) },
      fontes: new Set<string>(),
      temFounder: false,
      emitir: (e) => eventos.push(e),
    });
    for (let i = 0; i < saida.length; i += 37) o.receber(saida.slice(i, i + 37));
    const posts = eventos.filter((e) => e.tipo === "post");
    expect(posts.map((e) => e.tipo === "post" && e.post.id)).toEqual(["abc-p1", "abc-p2"]);
    const primeiro = posts[0].tipo === "post" ? posts[0].post : null;
    expect(primeiro?.gancho).toBe("Analisamos PMEs");
    expect(primeiro?.legendas.instagram).not.toContain("**");
    expect(primeiro?.precisa_revisao?.length).toBeGreaterThan(0);
    expect(eventos.find((e) => e.tipo === "escrevendo" && e.indice === 1)).toBeTruthy();
    expect(eventos.findIndex((e) => e.tipo === "post" && e.indice === 0)).toBeLessThan(eventos.findIndex((e) => e.tipo === "escrevendo" && e.indice === 1 && e.gancho !== null));
  });
});
