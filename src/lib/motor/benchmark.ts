// Benchmark dos concorrentes que o founder informou: o que a página pública de cada um mostra.
// Com IA, sai da mesma chamada da análise (SISTEMA_MOTOR, seção 1c) e passa por `limparBenchmark`.
// Sem IA, `benchmarkLocal` monta um resumo mínimo e determinístico a partir do og:title e og:description.
// Nunca há número de desempenho: as redes não liberam esses dados.
import { semAcento } from "@/lib/brand/nome";
import { corte } from "@/lib/engine/texto-local";
import type { BenchmarkConcorrente } from "./contrato";

const semTraco = (s: string) => s.replace(/\s*[—–]\s*/g, ", ").replace(/\s{2,}/g, " ").trim();

/** Host sem www, em minúsculas. "" se não for URL. */
export function hostDe(url: string): string {
  try {
    return new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

/** Nome pelo og:title ("Conta PJ grátis | Marca" vira o trecho mais curto que pareça nome); sem título, o domínio. */
function nomeDoOg(og: string, url: string): string {
  const titulo = og.split(/\.\s/)[0] ?? "";
  const partes = titulo
    .split(/\s[|:·•-]\s/)
    .map((p) => p.trim())
    .filter((p) => p.length >= 2 && p.length <= 40);
  const host = hostDe(url);
  const marca = host.split(".")[0] ?? "";
  // O trecho que contém o nome do domínio ganha; senão, o mais curto.
  const comMarca = partes.find((p) => marca.length >= 3 && semAcento(p).toLowerCase().replace(/\s+/g, "").includes(marca));
  const escolhido = comMarca ?? [...partes].sort((a, b) => a.length - b.length)[0];
  return corte(semTraco(escolhido || host || url), 60);
}

/** Pistas de ângulo no texto da página (sem acento, minúsculo). Só o que está escrito, nada de desempenho. */
const ANGULOS: [RegExp, string][] = [
  [/gratis|gratuit|sem taxa|sem tarifa|sem mensalidade|preco justo|mais barat|economi/, "preço e economia"],
  [/rapid|em minutos|na hora|agil|instantane/, "rapidez"],
  [/simples|facil|descomplic|sem burocracia|sem complicacao/, "simplicidade"],
  [/segur|confian|protec/, "segurança e confiança"],
  [/inteligencia artificial|\bia\b|automac|automatiz/, "tecnologia e automação"],
  [/milhoes de|milhares de|lider|maior .{0,20}do brasil|mais usad/, "tamanho e prova social"],
  [/\bmeis?\b|\bpmes?\b|pequenas empresas|pequenos negocios|autonom|para empresas|para clinicas|para lojas/, "público específico"],
  [/sustent|vegan|natural|proposito|impacto/, "propósito"],
  [/personaliz|sob medida|feito para voce/, "personalização"],
  [/atendimento|suporte|humano|especialista/, "atendimento"],
];

export function angulosDoTexto(texto: string): string[] {
  const t = semAcento(texto).toLowerCase();
  return ANGULOS.filter(([re]) => re.test(t)).map(([, nome]) => nome).slice(0, 4);
}

const juntar = (itens: string[]) => (itens.length <= 1 ? (itens[0] ?? "") : `${itens.slice(0, -1).join(", ")} e ${itens[itens.length - 1]}`);

/**
 * Benchmark sem IA: um item por concorrente cuja página foi lida (og:title e og:description).
 * Concorrente sem texto lido fica de fora. Formatos ficam vazios: a página inicial não diz que formato
 * de post eles usam.
 */
export function benchmarkLocal(concorrentes: string[], extraida: Record<string, string>): BenchmarkConcorrente[] {
  const out: BenchmarkConcorrente[] = [];
  for (const url of concorrentes.slice(0, 3)) {
    const og = semTraco(extraida[url] ?? "");
    if (!og) continue;
    const angulos = angulosDoTexto(og);
    const oportunidade = angulos.length
      ? `A página deles fala de ${juntar(angulos)}. Vale mostrar o seu jeito com as suas palavras, sem repetir o mesmo discurso.`
      : "Pela página pública não dá para ver um ângulo claro. Use isso para falar do problema do cliente com as suas palavras.";
    out.push({ url, nome: nomeDoOg(og, url), formatos: [], angulos, oportunidade });
  }
  return out;
}

/** Frase que fala de desempenho ou traz número de audiência. */
const DESEMPENHO =
  /\d[\d.,]*\s*(%|mil\b|k\b|mi\b|milh|seguidor|curtida|like|view|visualiza|coment|compartilh|alcance|impress)|(?<![\p{L}])(viraliz\p{L}*|engajamento alto|mais engaja\p{L}*|performa\p{L}* melhor|bomba\p{L}*)(?![\p{L}])/iu;

/**
 * Benchmark que veio da IA: só itens de concorrentes que o founder informou (pela URL ou pelo domínio),
 * na ordem dele, sem frases de desempenho nem números de audiência. Nome vazio vira o domínio.
 */
export function limparBenchmark(itens: BenchmarkConcorrente[], concorrentes: string[]): BenchmarkConcorrente[] {
  const porHost = new Map(concorrentes.map((u) => [hostDe(u), u]));
  const vistos = new Set<string>();
  const out: BenchmarkConcorrente[] = [];
  for (const it of itens) {
    const host = hostDe(it.url);
    const url = porHost.get(host);
    if (!url || vistos.has(host)) continue;
    vistos.add(host);
    const limpa = (xs: string[], max: number) => xs.map(semTraco).filter((x) => x && !DESEMPENHO.test(x)).slice(0, max).map((x) => corte(x, 80));
    const oportunidade = semTraco(it.oportunidade);
    out.push({
      url,
      nome: corte(semTraco(it.nome) || host, 60),
      formatos: limpa(it.formatos, 5),
      angulos: limpa(it.angulos, 5),
      oportunidade: oportunidade && !DESEMPENHO.test(oportunidade) ? corte(oportunidade, 300) : "Use o que a página deles mostra para achar o seu ângulo, com as suas palavras.",
    });
  }
  return out.sort((a, b) => concorrentes.indexOf(a.url) - concorrentes.indexOf(b.url));
}
