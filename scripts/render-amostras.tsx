// Desenha artes de exemplo em PNG para revisão visual, sem gastar IA.
// Uso: npx tsx scripts/render-amostras.tsx <pasta-de-saida> [imagem-da-capa.jpg]
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { ImageResponse } from "next/og";
import { DEMOS } from "../src/lib/engine/demo";
import { Arte, totalDeImagens } from "../src/lib/render/templates";
import { temaDaMarca, TAMANHOS, type Tamanho } from "../src/lib/render/tema";
import { fontesDaMarca } from "../src/lib/render/fonts";
import type { PostGerado } from "../src/lib/types";

const [saida = "amostras", fotoArq] = process.argv.slice(2);
const foto = fotoArq ? `data:image/jpeg;base64,${readFileSync(fotoArq).toString("base64")}` : null;
mkdirSync(saida, { recursive: true });

async function main() {
  // Desvio do plano: DEMOS é um array (Analise[]), não um objeto por nome de marca. O id de cada análise
  // (demo.id: "cora", "pipefy", "sallve") faz o papel de `marca` no nome do arquivo.
  for (const demo of DEMOS) {
    const marca = demo.id;
    const brand = demo.brand;
    const fonts = await fontesDaMarca(brand.fontes.titulo, brand.fontes.corpo, demo.tom_de_voz);
    for (const original of demo.posts.slice(0, 4)) {
      // Destaque de exemplo: as 3 últimas palavras do título da capa.
      const titulo = original.slides[0]?.titulo || original.gancho;
      const post = { ...original, destaque: titulo.split(" ").slice(-3).join(" ") } as PostGerado;
      const total = totalDeImagens(post.template, post);
      for (const tamanho of ["feed", "linkedin"] as Tamanho[]) {
        for (let s = 0; s < total; s++) {
          for (const comFoto of s === 0 && foto ? [false, true] : [false]) {
            const { w, h } = TAMANHOS[tamanho];
            const png = await new ImageResponse(
              createElement(Arte, { post, template: post.template, slide: s, brand, tema: temaDaMarca(brand), w, h, logo: null, foto: comFoto ? foto : null }),
              { width: w, height: h, fonts },
            ).arrayBuffer();
            const nome = `${marca}-${post.id}-${post.template}-s${s + 1}-${tamanho}${comFoto ? "-foto" : ""}.png`;
            writeFileSync(path.join(saida, nome), Buffer.from(png));
          }
        }
      }
    }
  }
  console.log(`Artes em ${saida}`);
}
main();
