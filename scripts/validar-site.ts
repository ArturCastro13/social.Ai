// Validação paga de ponta a ponta contra um servidor local, pelo mesmo caminho da tela:
// marca, pesquisa, análise em stream e uma capa por post que pede capa (no máximo 3 ao mesmo tempo).
// Uso: npx tsx scripts/validar-site.ts <url> <saida.json> [http://localhost:3100]
import { writeFileSync } from "node:fs";
import { marcaMinima } from "../src/lib/client/artes";
import { precisaCapa } from "../src/lib/client/capas";
import { preferenciasSchema } from "../src/lib/motor/contrato";
import type { Analise, PostGerado } from "../src/lib/types";

const [url, saida, base = "http://localhost:3100"] = process.argv.slice(2);
const t0 = Date.now();
const seg = () => ((Date.now() - t0) / 1000).toFixed(1);

async function post(rota: string, corpo: unknown) {
  const res = await fetch(base + rota, { method: "POST", headers: { "content-type": "application/json", origin: base }, body: JSON.stringify(corpo) });
  if (!res.ok) throw new Error(`${rota} HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res;
}

async function main() {
  const brand = await (await post("/api/brand", { url })).json();
  console.log(`[${seg()}s] marca: ${brand.nome} (${brand.dominio})`);

  const pesquisa = await (await post("/api/concorrentes", { brand })).json();
  const ia = (pesquisa.sugestoes ?? []).filter((s: { fonte: string }) => s.fonte === "ia");
  console.log(`[${seg()}s] pesquisa: ${ia.length} concorrentes da IA, ${pesquisa.pesquisa?.em_alta?.length ?? 0} em alta, ${pesquisa.pesquisa?.virais_ao_vivo?.length ?? 0} virais ao vivo, nicho ${pesquisa.pesquisa?.nicho ?? "?"}`);

  const preferencias = preferenciasSchema.parse({
    perfil_alvo: "ambos",
    conhecimento_founder: {
      problema_cliente: "O cliente sabe que precisa resolver isso, mas vive apagando incêndio e adia a decisão.",
      objecao_cliente: "Acha que vai dar trabalho trocar o que já usa e que o resultado demora.",
      diferencial: "A gente resolve rápido, com suporte de gente de verdade e sem contrato de fidelidade.",
    },
    concorrentes: ia.slice(0, 3).map((s: { url: string }) => s.url),
    ...(pesquisa.pesquisa ? { pesquisa_mercado: pesquisa.pesquisa } : {}),
  });

  const inicioAnalise = Date.now();
  const res = await post("/api/analyze", { brand, preferencias, quantidade: 6, stream: true });
  let analise: Analise | null = null;
  let primeiro: number | null = null;
  const capas: Promise<void>[] = [];
  const resultadoCapas: Record<string, unknown> = {};
  let ativas = 0;
  const fila: (() => void)[] = [];
  const vez = () => (ativas < 3 ? (ativas++, Promise.resolve()) : new Promise<void>((r) => fila.push(() => (ativas++, r()))));
  const libera = () => (ativas--, fila.shift()?.());

  const pedidas = new Set<string>();
  const pedirCapa = (p: PostGerado, origem: Analise["origem"], contexto: Record<string, unknown>) => {
    // Como a tela: cada post pede a capa uma vez só.
    if (pedidas.has(p.id) || !precisaCapa({ origem }, p)) return;
    pedidas.add(p.id);
    capas.push(
      (async () => {
        await vez();
        const t = Date.now();
        try {
          const r = await (await post("/api/imagem", { post: p, brand: marcaMinima(brand), contexto })).json();
          resultadoCapas[p.id] = { ...r, segundos: (Date.now() - t) / 1000 };
          console.log(`[${seg()}s] capa ${p.id} (${p.template}) em ${((Date.now() - t) / 1000).toFixed(0)}s${r.cache ? " (cache)" : ""}`);
        } catch (e) {
          resultadoCapas[p.id] = { erro: (e as Error).message };
          console.log(`[${seg()}s] capa ${p.id} falhou: ${(e as Error).message}`);
        } finally {
          libera();
        }
      })(),
    );
  };

  const leitor = res.body!.getReader();
  const dec = new TextDecoder();
  let buf = "";
  const contextoBase = { nicho: pesquisa.pesquisa?.nicho, publico: brand.descricao?.slice(0, 600) };
  for (;;) {
    const { value, done } = await leitor.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf("\n")) >= 0) {
      const linha = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (!linha) continue;
      const e = JSON.parse(linha);
      if (e.tipo === "post") {
        if (primeiro === null) primeiro = (Date.now() - inicioAnalise) / 1000;
        console.log(`[${seg()}s] post ${e.indice} ${e.post.template} ${e.previa ? "(ao vivo)" : ""}: ${e.post.gancho.slice(0, 80)}`);
        if (e.previa) pedirCapa(e.post, "ia", contextoBase);
      } else if (e.tipo === "final") {
        analise = e.analise;
      } else if (e.tipo === "erro") {
        throw new Error(`stream: ${e.mensagem}`);
      }
    }
  }
  if (!analise) throw new Error("stream sem evento final");
  const fimTexto = (Date.now() - inicioAnalise) / 1000;
  // Posts que não saíram ao vivo (cache) pedem capa agora.
  for (const p of analise.posts) pedirCapa(p, analise.origem, { nicho: analise.nicho, tom: analise.tom_de_voz?.slice(0, 400) });
  await Promise.all(capas);
  console.log(`[${seg()}s] fim. origem=${analise.origem} provedor=${analise.provedor} primeiro post ${primeiro?.toFixed(1)}s após a pesquisa, texto completo ${fimTexto.toFixed(1)}s, avisos=${JSON.stringify(analise.avisos)}`);
  writeFileSync(saida, JSON.stringify({ url, pesquisa, preferencias, analise, capas: resultadoCapas, tempos: { primeiro_post: primeiro, texto: fimTexto, total: (Date.now() - t0) / 1000 } }, null, 2));
}
main().catch((e) => {
  console.error("FALHOU:", e.message);
  process.exit(1);
});
