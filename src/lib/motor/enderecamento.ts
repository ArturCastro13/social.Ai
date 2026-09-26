// Objetivo endereçado: todo post precisa dizer para quem é, o que faz essa pessoa pensar "isso sou eu"
// e o que ela deve fazer depois de ler. Aqui ficam o público inferido do site (sem IA), as dores reais
// do site e a normalização final que garante `enderecamento` completo em todo post que sai de `analisar`.
import type { Analise, BrandProfile, PostGerado } from "@/lib/types";
import { semAcento } from "@/lib/brand/nome";
import { palpiteNicho, textoDaMarca } from "@/lib/engine/nicho";
import { escolherTema, type Tema } from "@/lib/engine/temas-locais";
import { corte, ehNavegacao, ehPromocao, frasesDoSite, maiuscula, temProibida } from "@/lib/engine/texto-local";
import { OBJETIVOS, type Enderecamento, type ObjetivoId } from "./contrato";

export const REVISAR_PUBLICO = "Confirmar público deste post";

const normal = (s: string) => semAcento(s).toLowerCase();
const semTravessoes = (s: string) => s.replace(/\s*[—–]\s*/g, ", ").replace(/\s{2,}/g, " ").trim();
const semPontoFinal = (s: string) => s.replace(/[.!;:,]+$/, "").trim();

const juntar = (itens: string[]) =>
  itens.length <= 1 ? (itens[0] ?? "") : `${itens.slice(0, -1).join(", ")} e ${itens[itens.length - 1]}`;

/** Segmentos que o site cita literalmente, com a palavra que indica se o tema já fala deles. */
const SEGMENTOS: [RegExp, string, RegExp][] = [
  [/\bpmes?\b|pequenas e medias/, "pequenas e médias empresas", /pme|pequenas/],
  [/grandes? empresas?/, "empresas grandes", /grandes/],
  [/\bmeis?\b|microempreendedor/, "MEIs", /\bmei|microempreendedor/],
  [/autonom[oa]s?/, "autônomos", /autonom/],
  [/contadores|escritorios? de contabilidade/, "contadores", /contador|contabil/],
  [/\bestudantes?\b|\balunos?\b/, "estudantes", /estudante|aluno/],
  [/\bpacientes?\b/, "pacientes", /paciente/],
  [/\bmedicos?\b|clinicas?/, "médicos e clínicas", /medico|clinica/],
  [/lojistas?|lojas? virtuais?/, "lojistas", /lojist|loja/],
  [/equipes? de vendas|\bvendedores\b/, "times de vendas", /venda/],
];

function temaDaMarca(b: BrandProfile): Tema {
  return escolherTema(textoDaMarca(b), palpiteNicho(b).nicho);
}

/**
 * Público-alvo em uma frase concreta, sem IA: o público do tema detectado no site (quem é e qual
 * situação vive) mais os segmentos que o próprio site cita e o tema ainda não cobre.
 */
export function publicoAlvoDoSite(b: BrandProfile): string {
  const tema = temaDaMarca(b);
  const t = normal(textoDaMarca(b));
  const base = semPontoFinal(tema.publico);
  const nb = normal(base);
  const extras = SEGMENTOS.filter(([re, , ja]) => re.test(t) && !ja.test(nb)).map(([, nome]) => nome);
  const frase = extras.length ? `${base}, com destaque para ${juntar(extras.slice(0, 3))}` : base;
  return corte(semTravessoes(`${maiuscula(frase)}.`), 300);
}

// Frases do site que descrevem uma dor ou situação de quem compra (não benefício do produto).
const DOR =
  /(?<![\p{L}])(chega de|cansad[oa]s?|cansou|perde|perder|perdendo|dor de cabe[çc]a|dif[íi]cil|complicad[oa]|burocracia|demora|atrasad[oa]|atraso|retrabalho|susto|sufoco|preocupa\p{L}*|estresse|confus[oa]|bagun[çc]a|esquece|esqueceu|trava|travad[oa]|sozinh[oa]|na m[ãa]o|ningu[ée]m)(?![\p{L}])/iu;

// "sem burocracia ou taxa escondida": o que vem depois do "sem" é a dor que o site promete tirar.
const SEM_DOR = /(?<![\p{L}])sem ([\p{L}\s,-]{4,60}?)(?=[.!?;:]|\s+(?:que|para|pra|com|e com|nem)\s|$)/iu;
const NOME_DE_DOR =
  /(?<![\p{L}])(burocracias?|taxas?|tarifas?|anuidade|mensalidades?|filas?|papelada|planilhas?|complica\p{L}*|susto|retrabalho|espera|atrasos?|multas?|juros|erros?|dor de cabe[çc]a)(?![\p{L}])/iu;

/** Dores e situações reais tiradas do texto do site (nunca inventadas). Lista vazia se o site não tiver. */
export function doresDoSite(b: BrandProfile, max = 8): string[] {
  const marca = normal(b.nome || "").trim();
  const out: string[] = [];
  // Sem repetição: entre "Anuidade" e "Anuidade ou taxa extra", fica a mais completa.
  const add = (f: string) => {
    const k = normal(f);
    const j = out.findIndex((o) => normal(o).includes(k) || k.includes(normal(o)));
    if (j < 0) out.push(f);
    else if (k.length > normal(out[j]).length) out[j] = f;
  };
  for (const f of frasesDoSite(b)) {
    const n = f.split(/\s+/).filter(Boolean).length;
    if (n < 3 || n > 28 || f.length > 170) continue;
    if (ehNavegacao(f) || ehPromocao(f) || temProibida(f) || f.endsWith("?")) continue;
    if (DOR.test(f) && !(marca.length >= 3 && normal(f).includes(marca))) add(maiuscula(semPontoFinal(f)));
    else {
      const m = f.match(SEM_DOR);
      const dor = m?.[1].trim().replace(/[,\s]+$/, "");
      if (dor && NOME_DE_DOR.test(dor)) add(`Ainda lidar com ${dor.charAt(0).toLowerCase()}${dor.slice(1)}`);
    }
    if (out.length >= max) break;
  }
  return out;
}

const ACAO_DO_OBJETIVO: Record<ObjetivoId, string> = {
  gerar_clientes: "Visitar o site e conhecer a solução",
  autoridade_founder: "Seguir o founder e comentar com a própria experiência",
  lancar_produto: "Testar a novidade ou entrar na lista de espera",
  contratar: "Se candidatar ou mandar o post para alguém que combina com a vaga",
  atrair_investidor: "Chamar o founder para uma conversa",
  comunidade: "Comentar a própria experiência e marcar alguém que vive o mesmo",
};

const IDS = new Set<string>(OBJETIVOS.map((o) => o.id));

/** Pistas de cada objetivo em texto normalizado (sem acento, minúsculo, espaços viram "_"). */
const PISTAS: [RegExp, ObjetivoId][] = [
  [/cliente|venda|lead/, "gerar_clientes"],
  [/autoridade|founder/, "autoridade_founder"],
  [/lanc/, "lancar_produto"],
  [/contrat|vaga|talento/, "contratar"],
  [/invest/, "atrair_investidor"],
  [/comunidade/, "comunidade"],
];

/** Aceita o id ("gerar_clientes"), o nome ("Gerar clientes") ou variações. null se não reconhecer. */
export function normalizarObjetivo(v: unknown): ObjetivoId | null {
  if (typeof v !== "string") return null;
  const k = normal(v).trim().replace(/[\s-]+/g, "_");
  if (IDS.has(k)) return k as ObjetivoId;
  const porNome = OBJETIVOS.find((o) => normal(o.nome).replace(/\s+/g, "_") === k);
  if (porNome) return porNome.id;
  return PISTAS.find(([re]) => re.test(k))?.[1] ?? null;
}

/**
 * Objetivo escrito pelo founder ("quero mais clientes pelo LinkedIn") convertido em id só quando o texto
 * aponta para um objetivo só. Texto vazio, sem pista ou com pistas de objetivos diferentes: null.
 */
export function objetivoDoTextoLivre(v: unknown): ObjetivoId | null {
  if (typeof v !== "string" || !v.trim()) return null;
  const k = normal(v).trim().replace(/[\s-]+/g, "_");
  const ids = new Set(PISTAS.filter(([re]) => re.test(k)).map(([, id]) => id));
  return ids.size === 1 ? normalizarObjetivo(v) : null;
}

/** Ação pelo texto do post (chamada final ou fim da legenda); cai para a ação padrão do objetivo. */
export function acaoDoPost(objetivo: ObjetivoId, chamadaFinal: string | undefined, legenda: string, marca?: string): string {
  if (chamadaFinal?.trim()) return corte(semTravessoes(maiuscula(semPontoFinal(chamadaFinal.trim()))), 200);
  const fim = normal(legenda.split(/\n+/).filter((l) => l.trim() && !/^\s*#/.test(l)).slice(-2).join(" "));
  if (/salv/.test(fim)) return "Salvar o post para consultar depois e mandar para quem precisa";
  if (/coment|conta aqui|conta nos/.test(fim)) return "Comentar como isso acontece na própria rotina";
  if (/link na bio|pelo site|conheca|no site/.test(fim)) return marca ? `Conhecer ${marca} pelo site ou pelo link da bio` : ACAO_DO_OBJETIVO.gerar_clientes;
  return ACAO_DO_OBJETIVO[objetivo];
}

const palavrasChave = (s: string) => new Set(normal(s).split(/[^a-z0-9]+/).filter((w) => w.length >= 5));

/** A dor que mais conversa com o post (palavras em comum); sem nenhuma em comum, rodízio. */
function dorParaPost(dores: string[], textoPost: string, i: number): string | null {
  if (!dores.length) return null;
  const ks = palavrasChave(textoPost);
  let melhor = -1;
  let pontos = 0;
  dores.forEach((d, j) => {
    const n = [...palavrasChave(d)].filter((w) => ks.has(w)).length;
    if (n > pontos) {
      pontos = n;
      melhor = j;
    }
  });
  return dores[melhor >= 0 ? melhor : i % dores.length];
}

export interface ContextoEnderecamento {
  /** Objetivos em rodízio quando o post não traz um válido. Nunca vazio. */
  objetivos: ObjetivoId[];
  /** Público-alvo (preferência, contexto inferido ou inferência do site). */
  publico: string;
  /** "site": gatilho das dores reais do site (motor local e demo). "gancho": do gancho do post (saída da IA). */
  gatilho: "site" | "gancho";
  dores?: string[];
  /** Situação do tema, para quando o site não tem dor escrita (motor local). */
  dorTema?: string;
  marca?: string;
  /** Marca "Confirmar público deste post" em precisa_revisao quando algo precisou ser completado. */
  marcarRevisao: boolean;
}

interface PostParaEnderecar {
  gancho: string;
  slides: { titulo: string; texto: string }[];
  legenda: string;
  chamada_final?: string;
  objetivo?: string;
}

/** Completa o que faltar no endereçamento de um post. `completou` diz se algum campo veio vazio. */
export function completarEnderecamento(
  parcial: Partial<Record<keyof Enderecamento, unknown>> | null | undefined,
  post: PostParaEnderecar,
  i: number,
  ctx: ContextoEnderecamento,
): { enderecamento: Enderecamento; completou: boolean } {
  const s = (v: unknown) => (typeof v === "string" ? semTravessoes(v.trim()) : "");
  const objetivos = ctx.objetivos.length ? ctx.objetivos : (["gerar_clientes", "autoridade_founder"] as ObjetivoId[]);
  const objDoModelo = normalizarObjetivo(parcial?.objetivo);
  const objetivo = objDoModelo ?? normalizarObjetivo(post.objetivo) ?? objetivos[i % objetivos.length];
  const publicoDoModelo = s(parcial?.publico);
  const gatilhoDoModelo = s(parcial?.gatilho_identificacao);
  const acaoDoModelo = s(parcial?.acao_esperada);

  const textoPost = [post.gancho, ...post.slides.flatMap((x) => [x.titulo, x.texto])].join(" ");
  let gatilho = gatilhoDoModelo;
  if (!gatilho) {
    // Motor local: dores do site primeiro; a situação do tema entra no rodízio quando o site tem pouca dor escrita.
    const opcoes = ctx.gatilho === "site" ? [...(ctx.dores ?? []), ...(ctx.dorTema && (ctx.dores ?? []).length < 3 ? [maiuscula(ctx.dorTema)] : [])] : [];
    gatilho = dorParaPost(opcoes, textoPost, i) ?? semPontoFinal(post.gancho);
  }

  const enderecamento: Enderecamento = {
    objetivo,
    publico: corte(publicoDoModelo || ctx.publico || "Público a confirmar com o founder", 300),
    gatilho_identificacao: corte(semTravessoes(gatilho), 300),
    acao_esperada: acaoDoModelo ? corte(acaoDoModelo, 200) : acaoDoPost(objetivo, post.chamada_final, post.legenda, ctx.marca),
  };
  return { enderecamento, completou: !objDoModelo || !publicoDoModelo || !gatilhoDoModelo || !acaoDoModelo };
}

const completo = (e: Partial<Enderecamento> | undefined): e is Enderecamento =>
  !!e && !!normalizarObjetivo(e.objetivo) && [e.publico, e.gatilho_identificacao, e.acao_esperada].every((x) => typeof x === "string" && x.trim().length > 0);

/** Contexto de endereçamento só com o brand (motor local, demo e cache). */
export function contextoDoSite(
  b: BrandProfile,
  x: { objetivos: ObjetivoId[]; publico?: string | null; gatilho: "site" | "gancho"; marcarRevisao: boolean },
): ContextoEnderecamento {
  return {
    objetivos: x.objetivos,
    publico: x.publico?.trim() || publicoAlvoDoSite(b),
    gatilho: x.gatilho,
    dores: doresDoSite(b),
    dorTema: temaDaMarca(b).dor,
    marca: b.nome || undefined,
    marcarRevisao: x.marcarRevisao,
  };
}

/**
 * Normalização final: todo post da análise sai com `enderecamento` completo. O que já veio completo
 * fica como está; o que falta é completado de forma determinística e, se pedido, marcado para revisão.
 */
export function garantirEnderecamento(a: Analise, ctx: ContextoEnderecamento): Analise {
  const posts: PostGerado[] = a.posts.map((p, i) => {
    if (completo(p.enderecamento)) return { ...p, enderecamento: { ...p.enderecamento, objetivo: normalizarObjetivo(p.enderecamento.objetivo)! } };
    const legenda = p.legendas[p.rede_principal] || p.legendas.instagram || "";
    const { enderecamento, completou } = completarEnderecamento(p.enderecamento, { ...p, legenda }, i, ctx);
    const revisar = [...(p.precisa_revisao ?? [])];
    if (ctx.marcarRevisao && completou && !revisar.includes(REVISAR_PUBLICO)) revisar.push(REVISAR_PUBLICO);
    return { ...p, enderecamento, ...(revisar.length || p.precisa_revisao ? { precisa_revisao: revisar } : {}) };
  });
  return { ...a, posts };
}

/**
 * Objetivos escolhidos: os botões do onboarding mais o id do objetivo escrito (objetivo_livre), quando ele
 * aponta claramente para um objetivo e ainda cabe (no máximo 2). Vazio quando não há nenhum dos dois.
 */
export function objetivosEscolhidos(pref?: { objetivos?: ObjetivoId[]; objetivo_livre?: string } | null): ObjetivoId[] {
  const out = [...(pref?.objetivos ?? [])];
  const livre = objetivoDoTextoLivre(pref?.objetivo_livre);
  if (livre && !out.includes(livre) && out.length < 2) out.push(livre);
  return out;
}

/** Objetivos do rodízio: os escolhidos no onboarding (botões e texto livre); sem escolha, os padrões do perfil. */
export function objetivosDoRodizio(pref?: { objetivos?: ObjetivoId[]; objetivo_livre?: string; perfil_alvo?: string } | null): ObjetivoId[] {
  const escolhidos = objetivosEscolhidos(pref);
  if (escolhidos.length) return escolhidos;
  if (pref?.perfil_alvo === "founder") return ["autoridade_founder"];
  if (pref?.perfil_alvo === "empresa") return ["gerar_clientes"];
  return ["gerar_clientes", "autoridade_founder"];
}
