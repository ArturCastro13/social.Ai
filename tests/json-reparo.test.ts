import { describe, expect, it } from "vitest";
import { extrairJson } from "@/lib/engine/schema";

describe("extrairJson", () => {
  it("conserta aspas sem escape e vírgula faltando, que o modelo às vezes devolve", () => {
    const quebrado = '```json\n{"posts": [{"gancho": "Você já ouviu "planilha resolve"?", "legenda": "texto"} {"gancho": "b"}]}\n```';
    const v = extrairJson(quebrado) as { posts: { gancho: string }[] };
    expect(v.posts).toHaveLength(2);
    expect(v.posts[0].gancho).toContain("planilha resolve");
  });

  it("aceita texto antes do JSON e continua lançando quando não há JSON", () => {
    expect(extrairJson('Aqui está: {"a": 1}')).toEqual({ a: 1 });
    expect(() => extrairJson("sem nada")).toThrow();
  });
});
