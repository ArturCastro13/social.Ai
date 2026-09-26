// Roda o leitor de marca contra sites reais e imprime um resumo. Uso: npx tsx scripts/testar-marcas.ts [url...]
import { readBrand } from "../src/lib/brand";

const padrao = [
  "https://nubank.com.br",
  "https://cora.com.br",
  "https://www.pipefy.com/pt-br/",
  "https://www.alice.com.br",
  "https://descomplica.com.br",
  "https://www.sallve.com.br",
  "https://www.contaazul.com",
  "https://www.rocketseat.com.br",
];

async function main() {
  const urls = process.argv.slice(2).length ? process.argv.slice(2) : padrao;
  for (const url of urls) {
    const t0 = Date.now();
    const b = await readBrand({ url });
    console.log(`\n== ${b.nome} (${b.dominio}) em ${Date.now() - t0}ms`);
    console.log("  title:", b.title);
    console.log("  h1:", b.headings.h1.slice(0, 2).join(" | "));
    console.log("  paleta:", b.paleta.primaria, b.paleta.secundaria, b.paleta.destaque, "fundo", b.paleta.fundo, "texto", b.paleta.texto);
    console.log("  top cores:", b.paleta.todas.slice(0, 6).map((c) => `${c.hex}(${c.fonte}:${c.peso})`).join(" "));
    console.log("  fontes:", b.fontes.titulo, "/", b.fontes.corpo, b.fontes.sugeridas ? "(sugeridas)" : "", "achadas:", b.fontes.encontradas.join(", "));
    console.log("  logo:", b.logo, "| og:", b.og.image ? "sim" : "não");
    console.log("  redes:", JSON.stringify(b.redesEncontradas));
    if (b.avisos.length) console.log("  avisos:", b.avisos.join(" / "));
  }
}
main();
