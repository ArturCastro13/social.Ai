// @vitest-environment jsdom
import React from "react";
import { afterEach, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { AoVivo } from "@/components/estudio/AoVivo";
import { DEMOS } from "@/lib/engine/demo";
import type { BrandProfile, PostGerado } from "@/lib/types";

afterEach(cleanup);

// DEMOS é uma lista de análises prontas (não um objeto com chave por empresa).
const cora = DEMOS.find((d) => d.brand.dominio === "cora.com.br")!;

it("mostra a pesquisa, o post pronto, o que está sendo escrito e a fila", () => {
  const post = { ...cora.posts[0], id: "abc-p1" } as PostGerado;
  render(
    <AoVivo
      estado={{ resumo: { concorrentes: ["Nubank", "Inter"], em_alta: ["Pix parcelado"], virais_ao_vivo: 4 }, posts: { 0: { post, previa: true } }, escrevendo: { indice: 1, gancho: "Segundo gancho" } }}
      quantidade={3}
      totalVirais={480}
      brand={cora.brand as BrandProfile}
    />,
  );
  expect(screen.getByText(/480 virais/)).toBeTruthy();
  expect(screen.getByText(/Nubank, Inter/)).toBeTruthy();
  expect(screen.getByText(/Pix parcelado/)).toBeTruthy();
  expect(screen.getByText(post.gancho)).toBeTruthy();
  expect(screen.getByText("Segundo gancho")).toBeTruthy();
  expect(screen.getAllByText("Na fila")).toHaveLength(1);
});
