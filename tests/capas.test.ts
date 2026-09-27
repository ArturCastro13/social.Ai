// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { analiseProvisoria, lerSemCapa, marcarSemCapa, pedirCapa, precisaCapa } from "@/lib/client/capas";
import { lerFotos } from "@/lib/client/artes";
import { DEMOS } from "@/lib/engine/demo";
import type { BrandProfile, PostGerado } from "@/lib/types";

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

// DEMOS é uma lista de análises prontas (não um objeto com chave por empresa).
const cora = DEMOS.find((d) => d.id === "cora")!;
const brand = cora.brand as BrandProfile;
const post = (n: number, template = "capa-gancho") => ({ ...cora.posts[0], id: `an${n}-p1`, template }) as PostGerado;

describe("capas automáticas", () => {
  it("quem precisa: carrossel, citação e dado, sem foto, fora da demo", () => {
    const a = analiseProvisoria({ id: "x", brand, posts: [] });
    expect(precisaCapa(a, post(1))).toBe(true);
    expect(precisaCapa(a, post(1, "lista"))).toBe(false);
    expect(precisaCapa(a, post(1), "https://ja.tem")).toBe(false);
    expect(precisaCapa({ ...a, origem: "demo" }, post(1))).toBe(false);
  });

  it("dois pedidos do mesmo post viram um só, e a URL fica guardada", async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ url: "https://cdn/capa.jpg", direcao: "d" })));
    vi.stubGlobal("fetch", fetch);
    const a = analiseProvisoria({ id: "an2", brand, posts: [post(2)] });
    const [u1, u2] = await Promise.all([pedirCapa(a, post(2)), pedirCapa(a, post(2))]);
    expect([u1, u2]).toEqual(["https://cdn/capa.jpg", "https://cdn/capa.jpg"]);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(lerFotos("an2")["an2-p1"]).toBe("https://cdn/capa.jpg");
  });

  it("no máximo 3 capas ao mesmo tempo", async () => {
    let abertas = 0,
      pico = 0;
    const soltar: (() => void)[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(() => {
        abertas++;
        pico = Math.max(pico, abertas);
        return new Promise<Response>((r) =>
          soltar.push(() => {
            abertas--;
            r(new Response(JSON.stringify({ url: "https://cdn/x.jpg" })));
          }),
        );
      }),
    );
    const pedidos = [3, 4, 5, 6, 7].map((n) => pedirCapa(analiseProvisoria({ id: `an${n}`, brand, posts: [] }), post(n)));
    for (let i = 0; i < 5; i++) {
      await new Promise((r) => setTimeout(r, 0));
      soltar.shift()?.();
    }
    await Promise.all(pedidos);
    expect(pico).toBe(3);
  });

  it("capa tirada pela pessoa não volta sozinha", () => {
    marcarSemCapa("an9", "an9-p1");
    expect(lerSemCapa("an9").has("an9-p1")).toBe(true);
  });
});
