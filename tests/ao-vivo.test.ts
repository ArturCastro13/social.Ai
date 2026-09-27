import { describe, expect, it } from "vitest";
import { ganchoParcial, lerPostsParciais } from "@/lib/engine/ao-vivo";

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
