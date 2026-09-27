import React from "react";
import { beforeAll, describe, expect, it } from "vitest";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { Arte, limpar, marcarDestaque } from "@/lib/render/templates";
import { temaDaMarca, TAMANHOS, type Tamanho } from "@/lib/render/tema";
import { fontesDaMarca } from "@/lib/render/fonts";
import { DEMOS } from "@/lib/engine/demo";
import type { PostGerado, TemplateId } from "@/lib/types";

// Desvio do plano: DEMOS aqui é um array ([cora, pipefy, sallve]), não um objeto por nome. DEMOS[0] é a Cora.
// tom_de_voz mora na análise (DEMOS[0]), não em BrandProfile.
const brand = DEMOS[0].brand;
const tom = DEMOS[0].tom_de_voz;
let FOTO = "";
beforeAll(async () => {
  const b = await sharp({ create: { width: 96, height: 64, channels: 3, background: "#3366aa" } }).jpeg().toBuffer();
  FOTO = `data:image/jpeg;base64,${b.toString("base64")}`;
});

async function desenhar(post: PostGerado, template: TemplateId, slide: number, tamanho: Tamanho, foto: string | null) {
  const { w, h } = TAMANHOS[tamanho];
  const fonts = await fontesDaMarca(brand.fontes.titulo, brand.fontes.corpo, tom);
  const r = new ImageResponse(<Arte post={post} template={template} slide={slide} brand={brand} tema={temaDaMarca(brand)} w={w} h={h} logo={null} foto={foto} />, { width: w, height: h, fonts });
  return Buffer.from(await r.arrayBuffer());
}

const carrossel = {
  ...DEMOS[0].posts[0],
  template: "capa-gancho",
  destaque: "sem virar o chato",
  slides: [
    { titulo: "Como cobrar cliente atrasado sem virar o chato", texto: "4 passos que funcionam para qualquer PJ" },
    { titulo: "Mande o lembrete antes do vencimento", texto: "Um aviso gentil dois dias antes resolve metade dos atrasos." },
    { titulo: "3", texto: "Ofereça o Pix na mesma mensagem." },
    { titulo: "Salve para usar no fim do mês", texto: "E mande para quem cobra por você." },
  ],
} as PostGerado;

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

describe("carrossel creator", () => {
  it("desenha todos os slides nos 4 tamanhos, com e sem foto na capa", async () => {
    for (const tamanho of ["feed", "quadrado", "linkedin", "x"] as Tamanho[]) {
      for (let s = 0; s < carrossel.slides.length; s++) {
        for (const foto of s === 0 ? [null, FOTO] : [null]) {
          expect((await desenhar(carrossel, "capa-gancho", s, tamanho, foto)).length).toBeGreaterThan(5000);
        }
      }
    }
  }, 120_000);

  it("lista e checklist nos 4 tamanhos", async () => {
    const lista = { ...carrossel, template: "lista", slides: [{ titulo: "5 sinais de que a planilha travou", texto: "" }, ...["Fechamento leva dias", "Ninguém confia no saldo", "Nota sai atrasada", "Cobrança fica esquecida", "Contador pede tudo de novo"].map((t) => ({ titulo: t, texto: "" }))] } as PostGerado;
    for (const t of ["lista", "checklist"] as TemplateId[])
      for (const tamanho of ["feed", "quadrado", "linkedin", "x"] as Tamanho[]) expect((await desenhar(lista, t, 0, tamanho, null)).length).toBeGreaterThan(5000);
  }, 60_000);
});
