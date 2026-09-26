// Valida a base de virais e gera data/virais/catalogo.json. Uso: npm run virais:catalogo
import { writeFileSync } from "node:fs";
import { itensDoArquivo } from "../src/lib/virais";
import { viralItemSchema } from "../src/lib/virais/schema";
import { construirCatalogo } from "../src/lib/virais/catalogo";

const itens = itensDoArquivo();
let erros = 0;
const ids = new Set<string>();
for (const it of itens) {
  const r = viralItemSchema.safeParse(it);
  if (!r.success) {
    erros++;
    console.error(`✗ ${it.id}:`, r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
  }
  if (ids.has(it.id)) {
    erros++;
    console.error(`✗ id repetido: ${it.id}`);
  }
  ids.add(it.id);
  if (JSON.stringify(it).includes("—")) {
    erros++;
    console.error(`✗ ${it.id}: tem travessão`);
  }
}
const catalogo = construirCatalogo(itens);
writeFileSync(
  "data/virais/catalogo.json",
  JSON.stringify({ gerado_em: new Date().toISOString(), total_itens: itens.length, padroes: catalogo }, null, 2) + "\n",
);
const ver = itens.filter((i) => i.status === "verificado").length;
console.log(`${itens.length} itens (${ver} verificados, ${itens.length - ver} a verificar), ${catalogo.length} padrões.`);
console.log("Mais frequentes:", catalogo.slice(0, 6).map((p) => `${p.nome} (${p.frequencia})`).join(" | "));
if (erros) {
  console.error(`${erros} problema(s) na base.`);
  process.exit(1);
}
