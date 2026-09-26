// Monta as análises do modo demo: lê a marca no site real e junta com o conteúdo de data/demo/conteudo.
// Uso: npm run demo:gerar   (sem internet, reaproveita a marca salva no JSON anterior)
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { readBrand } from "../src/lib/brand";
import { finalizar } from "../src/lib/engine";
import { analiseIASchema } from "../src/lib/engine/schema";
import { construirCatalogo } from "../src/lib/virais/catalogo";
import { itensDoArquivo } from "../src/lib/virais";
import type { Analise, BrandProfile } from "../src/lib/types";

const ids = new Set(construirCatalogo(itensDoArquivo()).map((p) => p.id));

async function main() {
  const arquivos = readdirSync("data/demo/conteudo").filter((f) => f.endsWith(".json"));
  for (const arq of arquivos) {
    const slug = arq.replace(/\.json$/, "");
    const bruto = JSON.parse(readFileSync(`data/demo/conteudo/${arq}`, "utf8"));
    const analise = analiseIASchema.parse(bruto.analise);
    for (const p of analise.posts) {
      if (!ids.has(p.padrao_inspirador)) console.warn(`  ! ${slug}: padrão ${p.padrao_inspirador} não existe no catálogo`);
    }
    let brand: BrandProfile;
    try {
      brand = await readBrand({ url: bruto.url, ...bruto.handles });
    } catch {
      const anterior = `data/demo/${slug}.json`;
      if (!existsSync(anterior)) throw new Error(`Sem internet e sem marca salva para ${slug}`);
      brand = (JSON.parse(readFileSync(anterior, "utf8")) as Analise).brand;
      console.warn(`  ! ${slug}: usando marca salva (site indisponível)`);
    }
    const final = finalizar(slug, brand, analise, "demo", "pré-processado", []);
    writeFileSync(`data/demo/${slug}.json`, JSON.stringify(final, null, 2) + "\n");
    console.log(`✓ ${slug}: ${brand.nome}, ${final.posts.length} posts, paleta ${brand.paleta.primaria}/${brand.paleta.secundaria}`);
  }
}
main();
