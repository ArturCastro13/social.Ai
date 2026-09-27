import { describe, expect, it } from "vitest";
import { limpar, marcarDestaque } from "@/lib/render/templates";

describe("peças do estilo creator", () => {
  it("a arte nunca mostra [PREENCHER]", () => {
    expect(limpar("Ganhe [PREENCHER: número real]% de tempo.")).toBe("Ganhe % de tempo.");
    expect(limpar("Emite [PREENCHER: número real] notas por mês")).toBe("Emite notas por mês");
  });

  it("marca o destaque sem ligar para acento, caixa e pontuação", () => {
    const m = marcarDestaque("Por que seus alunos somem antes do 3º mês?", "antes do 3º MES");
    expect(m.filter((w) => w.marcada).map((w) => w.palavra)).toEqual(["antes", "do", "3º", "mês?"]);
    expect(marcarDestaque("Título qualquer", "não existe").some((w) => w.marcada)).toBe(false);
    expect(marcarDestaque("Título", undefined).every((w) => !w.marcada)).toBe(true);
  });
});
