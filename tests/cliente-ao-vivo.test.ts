import { describe, expect, it } from "vitest";
import { lerLinhasJson } from "@/lib/client/ao-vivo";

function resposta(pedacos: string[]): Response {
  const cod = new TextEncoder();
  return new Response(new ReadableStream({ start(c) { pedacos.forEach((p) => c.enqueue(cod.encode(p))); c.close(); } }));
}

describe("leitor de NDJSON no navegador", () => {
  it("junta linhas cortadas entre pedaços e ignora linhas vazias", async () => {
    const vistos: unknown[] = [];
    await lerLinhasJson(resposta(['{"a":1}\n{"b"', ':2}\n\n{"c":', "3}"]), (e) => vistos.push(e));
    expect(vistos).toEqual([{ a: 1 }, { b: 2 }, { c: 3 }]);
  });

  it("erro dentro do tratamento interrompe a leitura", async () => {
    await expect(lerLinhasJson(resposta(['{"a":1}\n{"a":2}\n']), () => { throw new Error("parar"); })).rejects.toThrow("parar");
  });
});
