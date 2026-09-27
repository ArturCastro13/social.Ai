import { describe, expect, it } from "vitest";
import { SISTEMA_MOTOR } from "@/lib/llm/prompt-motor";

const saida = SISTEMA_MOTOR.slice(SISTEMA_MOTOR.indexOf("## Saída (JSON)"));

describe("prompt do motor", () => {
  it("a saída começa pelos posts e não pede mais diagnóstico nem estratégia", () => {
    expect(saida.indexOf('"posts"')).toBeGreaterThan(-1);
    expect(saida.indexOf('"posts"')).toBeLessThan(saida.indexOf('"roteiros"'));
    expect(saida.indexOf('"roteiros"')).toBeLessThan(saida.indexOf('"calendario"'));
    expect(saida).not.toContain('"diagnostico"');
    expect(saida).not.toContain('"estrategia"');
    expect(SISTEMA_MOTOR).not.toContain("## 9. Diagnóstico");
  });

  it("pede padrão viral, destaque e direção da capa em cada post", () => {
    for (const campo of ['"padrao_viral"', '"destaque"', '"direcao_capa"']) expect(saida).toContain(campo);
    expect(SISTEMA_MOTOR).toContain("## 11a. Direção de arte da capa");
    expect(SISTEMA_MOTOR).toMatch(/carrossel de creator/);
    expect(SISTEMA_MOTOR).toMatch(/no máximo 2 posts do lote com o mesmo padrão/);
  });
});
