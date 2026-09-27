import { describe, expect, it } from "vitest";
import { destaqueValido } from "@/lib/motor/saida";

describe("destaque da capa", () => {
  it("aceita o trecho inteiro e recupera o pedaço que bate", () => {
    expect(destaqueValido("não é o pesadelo", "Trocar não é o pesadelo que você imagina")).toBe("não é o pesadelo");
    expect(destaqueValido("o marketplace mudou demais", "A conta do marketplace mudou")).toBe("marketplace mudou");
    expect(destaqueValido("Sua margem sentiu?", "A conta do marketplace mudou")).toBe("");
    expect(destaqueValido("mudou", "A conta do marketplace mudou")).toBe("mudou");
    expect(destaqueValido("", "Título")).toBe("");
  });
});
