// Roda o fluxo com IA de ponta a ponta para um site (pesquisa na web + análise) e salva o JSON para auditar.
// Uso: npm run ia:auditar -- <url> [saida.json] [sem-founder]
// Custa uns US$ 0,15 por site na chave configurada. Para não gravar no Supabase de produção, rode sem as
// variáveis do Supabase (o store cai para .data/ local).
import { writeFileSync } from "node:fs";
import { readBrand } from "../src/lib/brand";
import { buscarConcorrentes } from "../src/lib/motor/concorrentes";
import { provedorConfigurado } from "../src/lib/llm";
import { analisar } from "../src/lib/engine";
import { preferenciasSchema } from "../src/lib/motor/contrato";

async function main() {
  const url = process.argv[2] || "https://social-ai-beige.vercel.app";
  const b = await readBrand({ url });
  let t = Date.now();
  const r = await buscarConcorrentes(b, { llm: provedorConfigurado("pesquisa") });
  console.log(`pesquisa: ${((Date.now() - t) / 1000).toFixed(1)}s, ${r.sugestoes.length} concorrentes, ${r.pesquisa?.em_alta.length ?? 0} em alta`);
  const pref = preferenciasSchema.parse({
    perfil_alvo: "ambos",
    ...(process.argv[4] === "sem-founder" ? {} : { conhecimento_founder: {
      problema_cliente: "O founder sabe tudo do mercado dele, mas não tem tempo de transformar isso em post. Fica semanas sem postar e some das redes.",
      objecao_cliente: "Post feito por IA fica genérico e não soa como eu.",
      diferencial: "A gente parte do que o founder sabe e de uma pesquisa do mercado dele, não de um template.",
    } }),
    concorrentes: r.sugestoes.filter((s) => s.fonte === "ia").slice(0, 3).map((s) => s.url),
    ...(r.pesquisa ? { pesquisa_mercado: r.pesquisa } : {}),
  });
  t = Date.now();
  const a = await analisar(b, { quantidade: 6, identificadores: [`diag-${Date.now()}`], forcarNovo: true, preferencias: pref });
  console.log(`análise: ${((Date.now() - t) / 1000).toFixed(1)}s, origem=${a.origem}, provedor=${a.provedor}, avisos=${JSON.stringify(a.avisos)}`);
  writeFileSync(process.argv[3] || "analise-diag.json", JSON.stringify({ pesquisa: r, analise: a }, null, 2));
  for (const p of a.posts) {
    console.log(`\n--- [${p.rede_principal} · ${p.formato} · origem=${p.origem_tema ?? "?"}]\nGANCHO: ${p.gancho}\n${(p.legendas[p.rede_principal] || "").slice(0, 700)}`);
  }
}
main();
