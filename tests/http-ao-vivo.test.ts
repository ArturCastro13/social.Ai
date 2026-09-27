import { describe, expect, it } from "vitest";
import { inicioDaPesquisa, respostaAoVivo } from "@/lib/http-ao-vivo";
import { DEMOS } from "@/lib/engine/demo";
import type { Analise } from "@/lib/types";

const linhas = async (r: Response) => (await r.text()).trim().split("\n").map((l) => JSON.parse(l));

// DEMOS é uma lista de análises prontas (não um objeto com chave por empresa).
const cora = DEMOS.find((d) => d.brand.dominio === "cora.com.br")!;

describe("resposta ao vivo", () => {
  const analise = { ...cora, posts: cora.posts.slice(0, 2) } as unknown as Analise;

  it("inicio com preenchimento de 1 KB, posts ao vivo, os que faltaram e o final", async () => {
    const r = respostaAoVivo(inicioDaPesquisa({ concorrentes: [{ nome: "A" }], em_alta: [{ tema: "T" }], virais_ao_vivo: [1, 2] }), async (emitir) => {
      emitir({ tipo: "escrevendo", indice: 0, gancho: "G" });
      emitir({ tipo: "post", indice: 0, post: analise.posts[0], previa: true });
      return analise;
    });
    expect(r.headers.get("content-type")).toContain("application/x-ndjson");
    const ev = await linhas(r);
    expect(ev.map((e) => e.tipo)).toEqual(["inicio", "escrevendo", "post", "post", "final"]);
    expect(ev[0]).toMatchObject({ concorrentes: ["A"], em_alta: ["T"], virais_ao_vivo: 2 });
    expect(ev[0].preenchimento.length).toBe(1024);
    expect(ev[3]).toMatchObject({ indice: 1, previa: false });
  });

  it("falha vira evento de erro, sem derrubar o stream", async () => {
    const ev = await linhas(respostaAoVivo(inicioDaPesquisa(undefined), async () => { throw new Error("x"); }));
    expect(ev.map((e) => e.tipo)).toEqual(["inicio", "erro"]);
  });
});
