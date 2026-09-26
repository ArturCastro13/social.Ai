import { describe, expect, it } from "vitest";
import { calcularNumeros } from "@/lib/entrevistas";

describe("números do pitch", () => {
  it("não inventa nada quando não há entrevistas", () => {
    const n = calcularNumeros([], []);
    expect(n.total).toBe(0);
    expect(n.pctSozinhos).toBeNull();
    expect(n.mediaHoras).toBeNull();
    expect(n.medianaPagaria).toBeNull();
  });
  it("calcula a partir do que foi registrado", () => {
    const n = calcularNumeros(
      [
        { id: "a", quem_cuida: "Eu mesmo", horas_semana: 4, pagaria_mes: 100, dor_nota: 5, quer_testar: true, ja_tentou: "Canva ou template, ChatGPT ou IA", ultima_vez_sem_postar: "Mês passado, virada de sprint." },
        { id: "b", quem_cuida: "Agência", horas_semana: 1, pagaria_mes: 0, dor_nota: 2 },
        { id: "c", quem_cuida: "Sócio", horas_semana: null, pagaria_mes: 50, dor_nota: 4 },
      ],
      [{ respostas: { dor: "5", usaria: "Sim, com pequenos ajustes", pagaria: "Até R$ 50" } }],
    );
    expect(n.total).toBe(3);
    expect(n.sozinhos).toBe(2);
    expect(n.pctSozinhos).toBe(67);
    expect(n.mediaHoras).toBe(2.5);
    expect(n.medianaPagaria).toBe(50);
    expect(n.faixaPagaria).toEqual([0, 100]);
    expect(n.pagariamAlgo).toBe(2);
    expect(n.querTestar).toBe(1);
    expect(n.jaTentou["ChatGPT ou IA"]).toBe(1);
    expect(n.frases).toHaveLength(1);
    expect(n.formulario.postariam).toBe(1);
  });
});
