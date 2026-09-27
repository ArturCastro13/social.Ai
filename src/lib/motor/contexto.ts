// Monta o objeto CONTEXTO da Parte 2 de PROMPT_MOTOR_POSTS.md a partir do que já temos:
// perfil de marca (lido sem IA), preferências do onboarding, base curada e histórico do founder.
// O JSON sai compacto (textos cortados, listas curtas) para custar pouco token.
import * as cheerio from "cheerio";
import type { BrandProfile, CalendarioItem, Nicho, PadraoViral, PostGerado, Rede, ViralItem } from "@/lib/types";
import type { Decisao, ResultadoPost } from "@/lib/feedback";
import { ultimaPorPost } from "@/lib/feedback";
import { fetchLimited, normalizeUrl } from "@/lib/brand/fetch";
import { corte, depoimentosDoSite, frasesDeProduto, frasesDoSite, numerosDoSite } from "@/lib/engine/texto-local";
import { textoDaMarca } from "@/lib/engine/nicho";
import { hojeEmSaoPaulo } from "./concorrentes";
import { conhecimentoPreenchido, tomDeVozSchema, type Preferencias, type TomDeVoz } from "./contrato";
import { MOTOR_DO_FORMATO, nichoParaMotor, type NichoMotor } from "./mapa";
import { publicoAlvoDoSite } from "./enderecamento";
import { calcularAprendizados, desempenhoDosPosts, type AprendizadosCalculados } from "./aprendizados";
import type { ContextoConfirmado } from "@/lib/contexto/contrato";

type Arroba = { instagram: string; linkedin: string; x: string };

export interface ContextoMotor {
  contexto_confirmado?: ContextoConfirmado;
  perfil_alvo: Preferencias["perfil_alvo"];
  /** Quem os posts precisam fazer se reconhecer: o que o founder escreveu ou, se vazio, o inferido do site. */
  publico_alvo: string;
  /**
   * "O que só você sabe": primeira fonte de tema. null quando o founder pulou todas as perguntas.
   * As três da tela atual (problema, objeção, diferencial) vêm primeiro; crença e história são da versão anterior.
   */
  conhecimento_founder: {
    problema_cliente: string | null;
    objecao_cliente: string | null;
    diferencial: string | null;
    crenca_contraria: string | null;
    historia: string | null;
  } | null;
  empresa: {
    site_url: string;
    site_extraido: { proposta: string; publico: string; produtos: string[]; provas: string[]; paleta: string[]; fontes: string[] };
    arroba: Arroba;
    brand_book_extraido: string | null;
  };
  founder: { nome: string; arroba: Arroba; transcricao_audio: string | null };
  nicho: NichoMotor;
  objetivos: string[];
  /** Objetivo nas palavras do founder, além dos ids escolhidos. null quando não escreveu. */
  objetivo_livre: string | null;
  tom_de_voz: TomDeVoz;
  formatos_permitidos: string[];
  frequencia_escolhida: string | null;
  redes: Rede[];
  proibicoes: string[];
  inspiracoes: { url: string; tipo: string; descricao_extraida: string }[];
  /** Concorrentes que o founder acompanha. Só para achar ganchos, ângulos e brechas; nunca aparece no resultado. */
  concorrencia: { url: string; descricao_extraida: string; o_que_publica: string }[];
  /** Data de referência (AAAA-MM-DD, horário de Brasília): prazos e "agora" nos posts partem dela. */
  hoje: string;
  /** O mercado como a pesquisa na web entendeu, quando houve pesquisa. */
  mercado_pesquisado: string | null;
  /** Temas e ganchos que estão rendendo agora com concorrentes e mídias do nicho, achados na web, com a fonte. */
  em_alta_no_nicho: { tema: string; gancho: string; por_que: string; quem: string; url: string | null }[];
  /** Posts publicados com os números que o founder informou, e o que se sabe de cada um. */
  desempenho_proprio: {
    rede: string;
    post_url: string;
    formato: string;
    gancho: string;
    origem_tema: string;
    padrao: string;
    objetivo: string;
    dia_semana: string;
    horario: string;
    curtidas: number | null;
    comentarios: number | null;
    compartilhamentos: number | null;
    salvamentos: number | null;
    alcance: number | null;
    /** Interações sobre alcance, em %. null sem alcance. */
    engajamento_pct: number | null;
    data_hora: string;
  }[];
  /** Médias por formato, origem, padrão e rede comparadas com a mediana do próprio founder. Sem benchmark externo. */
  aprendizados_calculados: AprendizadosCalculados;
  insights_audiencia: { horarios_pico: null; fonte: "nao_disponivel" };
  /** Por que cada viral do nicho funcionou: gancho real, estrutura e mecanismo. Para adaptar o mecanismo, nunca as palavras. */
  referencias_nicho: {
    padrao: string;
    gancho_modelo: string;
    formato: string;
    rede: string;
    metrica_verificada: boolean;
    fonte_url: string;
    texto_gancho: string;
    estrutura: string[];
    por_que_funciona: string;
  }[];
  benchmarks_publicacao: { por_rede: Record<string, never>; fonte: "nao_disponivel" };
  noticias: { titulo: string; resumo: string; url: string; data: string }[];
  historico_preferencias: { aprovados: ItemHistorico[]; recusados: ItemHistorico[] };
  quantidade_posts: number;
}

interface ItemHistorico {
  formato: string;
  rede: string;
  padrao: string;
  gancho: string;
}

export interface ExtrasContexto {
  nicho?: Nicho;
  quantidade?: number;
  redes?: Rede[];
  /** Saída de contextoViralDoNicho: padrões do nicho com exemplos da base curada. */
  referencias?: { padrao: PadraoViral; exemplos: ViralItem[] }[];
  decisoes?: Decisao[];
  resultados?: ResultadoPost[];
  /** Posts de análises anteriores, para achar gancho e rede de decisões e resultados. */
  postsAnteriores?: PostGerado[];
  /** Calendário das análises anteriores, para saber dia e horário em que cada post saiu. */
  calendarioAnterior?: CalendarioItem[];
  /** url da inspiração → og:title + og:description (de extrairInspiracoes). */
  inspiracoesExtraidas?: Record<string, string>;
  /** url do concorrente → og:title + og:description (mesma leitura das inspirações). */
  concorrenciaExtraida?: Record<string, string>;
}

const ARROBA_VAZIO: Arroba = { instagram: "", linkedin: "", x: "" };

const REGUAS_PADRAO: TomDeVoz = tomDeVozSchema.parse({});

function publicoDoTexto(texto: string): string {
  const t = texto.toLowerCase();
  const seg: string[] = [];
  if (/\bpmes?\b|pequenas e m[ée]dias/.test(t)) seg.push("pequenas e médias empresas");
  if (/grandes? empresas?/.test(t)) seg.push("empresas grandes");
  if (/\bmeis?\b|microempreendedor/.test(t)) seg.push("MEIs");
  if (/aut[ôo]nom[oa]s?/.test(t)) seg.push("autônomos");
  if (/contadores|escrit[óo]rios? de contabilidade/.test(t)) seg.push("contadores");
  if (/\bestudantes?\b|\balunos?\b/.test(t)) seg.push("estudantes");
  if (/\bpacientes?\b/.test(t)) seg.push("pacientes");
  if (/\bm[ée]dicos?\b|cl[íi]nicas?/.test(t)) seg.push("médicos e clínicas");
  if (/lojistas?|lojas? virtuais?/.test(t)) seg.push("lojistas");
  if (/\bequipes? de vendas\b|\bvendedores\b/.test(t)) seg.push("times de vendas");
  return seg.length ? `O site fala com ${seg.slice(0, 4).join(", ")}.` : "";
}

/** O que o site diz, sem IA. Provas só entram se houver número ou relato literal no texto. */
export function siteExtraido(b: BrandProfile): ContextoMotor["empresa"]["site_extraido"] {
  const frases = frasesDoSite(b);
  const h1 = b.headings.h1[0]?.trim() ?? "";
  const desc = (b.description || b.og?.description || "").trim();
  const proposta = [h1, desc && desc !== h1 ? desc : ""].filter(Boolean).join(". ").replace(/\.\./g, ".");
  const provas = [
    ...(b.provas ?? []),
    ...numerosDoSite(frases).map((n) => n.frase),
    ...depoimentosDoSite(b).map((d) => `Relato de cliente no site: "${corte(d, 180)}"`),
  ];
  const paleta = [b.paleta?.primaria, b.paleta?.secundaria, b.paleta?.destaque].filter((c): c is string => !!c);
  const fontes = [b.fontes?.titulo, b.fontes?.corpo].filter((f): f is string => !!f);
  return {
    proposta: corte(proposta, 300),
    publico: publicoDoTexto(textoDaMarca(b)),
    produtos: [...new Set([...frasesDeProduto(frases), ...b.headings.h2.filter((h) => h.length >= 12 && h.length <= 110)])]
      .slice(0, 6)
      .map((f) => corte(f, 140)),
    provas: [...new Set(provas)].slice(0, 10).map((p) => corte(p, 220)),
    paleta: [...new Set(paleta)],
    fontes: [...new Set(fontes)],
  };
}

const arrobaLimpo = (v?: string | null) => (v ? "@" + v.trim().replace(/^@/, "") : "");

/** Redes do plano: as da empresa e as do founder. Sem nenhuma, LinkedIn e Instagram. */
export function redesDoMotor(b: BrandProfile, p?: Preferencias | null): Rede[] {
  const r = (["linkedin", "instagram", "x", "facebook"] as Rede[]).filter(
    (k) => b.handles?.[k] || (k !== "facebook" && p?.founder?.[k]),
  );
  return r.length ? r : ["linkedin", "instagram"];
}

/** Itens curados pelo painel podem trazer travessão; o CONTEXTO não. */
const semTraco = (s: string) => s.replace(/\s*[—–]\s*/g, ", ").trim();

/**
 * Referências do nicho com o porquê de cada viral: gancho real, os 4 primeiros passos da estrutura e o
 * mecanismo, cortados para o JSON ficar compacto. A base curada hoje só tem posts estáticos e carrosséis,
 * sem vídeo: os roteiros de vídeo adaptam esses mesmos padrões de gancho (o gancho vira a fala de abertura).
 */
function referenciasDoNicho(refs: ExtrasContexto["referencias"] = []): ContextoMotor["referencias_nicho"] {
  const out: ContextoMotor["referencias_nicho"] = [];
  for (const { padrao, exemplos } of refs) {
    const lista = exemplos.length ? exemplos.slice(0, 3) : [null];
    for (const e of lista) {
      out.push({
        padrao: padrao.nome,
        gancho_modelo: padrao.modelo_gancho,
        formato: MOTOR_DO_FORMATO[padrao.formato],
        rede: e?.rede ?? "",
        metrica_verificada: e?.status === "verificado",
        fonte_url: e?.link_fonte ?? "",
        texto_gancho: corte(semTraco(e?.texto_gancho ?? ""), 200),
        estrutura: (e?.estrutura ?? []).slice(0, 6).map((x) => corte(semTraco(x), 120)),
        por_que_funciona: corte(semTraco(e?.por_que_funciona || padrao.descricao || ""), 240),
      });
    }
  }
  // Verificados primeiro (camada 4 da hierarquia), carrossel em seguida (o formato principal do produto).
  const peso = (r: ContextoMotor["referencias_nicho"][number]) => Number(r.metrica_verificada) * 2 + Number(r.formato === "carrossel");
  return out.sort((a, b) => peso(b) - peso(a)).slice(0, 12);
}

function historico(decisoes: Decisao[], posts: Map<string, PostGerado>): ContextoMotor["historico_preferencias"] {
  const item = (d: Decisao): ItemHistorico => ({
    formato: MOTOR_DO_FORMATO[d.formato] ?? d.formato,
    rede: d.rede,
    padrao: d.padrao,
    gancho: corte(posts.get(d.post_id)?.gancho ?? "", 140),
  });
  const ds = ultimaPorPost(decisoes);
  return {
    aprovados: ds.filter((d) => d.decisao === "aprovado").slice(-10).map(item),
    recusados: ds.filter((d) => d.decisao === "pulado").slice(-10).map(item),
  };
}

function desempenho(ds: ReturnType<typeof desempenhoDosPosts>): ContextoMotor["desempenho_proprio"] {
  return ds.slice(-12).map((d) => ({
    rede: d.rede,
    post_url: "",
    formato: MOTOR_DO_FORMATO[d.formato] ?? d.formato,
    gancho: corte(d.gancho, 140),
    origem_tema: d.origem_tema,
    padrao: d.padrao,
    objetivo: d.objetivo,
    dia_semana: d.dia_semana,
    horario: d.horario,
    curtidas: d.curtidas,
    comentarios: d.comentarios,
    compartilhamentos: d.compartilhamentos,
    salvamentos: d.salvamentos,
    alcance: d.alcance,
    engajamento_pct: d.engajamento_pct,
    data_hora: "",
  }));
}

function conhecimentoDoContexto(p: Preferencias | null): ContextoMotor["conhecimento_founder"] {
  const c = conhecimentoPreenchido(p?.conhecimento_founder);
  if (!c) return null;
  return {
    problema_cliente: c.problema_cliente ?? null,
    objecao_cliente: c.objecao_cliente ?? null,
    diferencial: c.diferencial ?? null,
    crenca_contraria: c.crenca_contraria ?? null,
    historia: c.historia ?? null,
  };
}

/**
 * Objeto CONTEXTO do motor (Parte 2 da spec). Só com o brand já funciona: campos sem dado ficam vazios ou null.
 * Nunca inventa horário nem métrica: insights e benchmarks saem como "nao_disponivel".
 */
/** Mesmo site, com ou sem www e barra no fim. */
function mesmoSite(a: string, b: string): boolean {
  const host = (u: string) => {
    try {
      return new URL(u).hostname.replace(/^www\./, "").toLowerCase();
    } catch {
      return u;
    }
  };
  return host(a) === host(b);
}

export function montarContexto(brand: BrandProfile, preferencias?: Preferencias | null, extras: ExtrasContexto = {}): ContextoMotor {
  const p = preferencias ?? null;
  const posts = new Map((extras.postsAnteriores ?? []).map((x) => [x.id, x]));
  const ds = desempenhoDosPosts(extras.resultados ?? [], extras.postsAnteriores ?? [], extras.calendarioAnterior ?? []);
  const insp = extras.inspiracoesExtraidas ?? {};
  return {
    perfil_alvo: p?.perfil_alvo ?? "empresa",
    ...(p?.contexto_empresa ? { contexto_confirmado: p.contexto_empresa } : {}),
    publico_alvo: p?.contexto_empresa?.entendimento.publico || p?.publico_alvo?.trim() || publicoAlvoDoSite(brand),
    conhecimento_founder: conhecimentoDoContexto(p),
    empresa: {
      site_url: brand.url,
      site_extraido: siteExtraido(brand),
      arroba: {
        instagram: arrobaLimpo(brand.handles?.instagram),
        linkedin: arrobaLimpo(brand.handles?.linkedin),
        x: arrobaLimpo(brand.handles?.x),
      },
      brand_book_extraido: p?.brand_book_texto ? corte(p.brand_book_texto, 3000) : null,
    },
    founder: {
      nome: p?.founder?.nome ?? "",
      arroba: p?.founder
        ? { instagram: arrobaLimpo(p.founder.instagram), linkedin: arrobaLimpo(p.founder.linkedin), x: arrobaLimpo(p.founder.x) }
        : { ...ARROBA_VAZIO },
      transcricao_audio: p?.founder?.transcricao_audio ? corte(p.founder.transcricao_audio, 3000) : null,
    },
    nicho: nichoParaMotor(p?.contexto_empresa?.entendimento.nicho ?? extras.nicho),
    objetivos: p?.objetivos ?? [],
    objetivo_livre: p?.objetivo_livre?.trim() ? semTraco(p.objetivo_livre) : null,
    tom_de_voz: p?.tom_de_voz ?? REGUAS_PADRAO,
    formatos_permitidos: p?.formatos_permitidos ?? [],
    frequencia_escolhida: p?.frequencia_escolhida ?? null,
    redes: extras.redes ?? redesDoMotor(brand, p),
    proibicoes: [...(p?.proibicoes ?? []), ...(p?.contexto_empresa?.materiais.flatMap(m => m.fatos.filter(f => f.campo === "proibicao").map(f => f.texto)) ?? [])],
    inspiracoes: (p?.inspiracoes ?? []).map((i) => ({ url: i.url, tipo: i.tipo, descricao_extraida: corte(insp[i.url] ?? "", 300) })),
    concorrencia: (p?.concorrentes ?? []).map((url) => ({
      url,
      descricao_extraida: corte(extras.concorrenciaExtraida?.[url] ?? "", 300),
      o_que_publica: corte(p?.pesquisa_mercado?.concorrentes.find((c) => mesmoSite(c.url, url))?.o_que_publica ?? "", 400),
    })),
    hoje: hojeEmSaoPaulo(),
    mercado_pesquisado: p?.pesquisa_mercado?.mercado ? semTraco(p.pesquisa_mercado.mercado) : null,
    em_alta_no_nicho: (p?.pesquisa_mercado?.em_alta ?? []).map((t) => ({
      tema: semTraco(t.tema),
      gancho: semTraco(t.gancho),
      por_que: semTraco(t.por_que),
      quem: semTraco(t.quem),
      url: t.url ?? null,
    })),
    desempenho_proprio: desempenho(ds),
    aprendizados_calculados: calcularAprendizados(ds),
    insights_audiencia: { horarios_pico: null, fonte: "nao_disponivel" },
    referencias_nicho: referenciasDoNicho(extras.referencias),
    benchmarks_publicacao: { por_rede: {}, fonte: "nao_disponivel" },
    noticias: (p?.noticias ?? []).map((n) => ({ titulo: corte(n.titulo, 200), resumo: corte(n.resumo, 400), url: n.url, data: n.data })),
    historico_preferencias: historico(extras.decisoes ?? [], posts),
    quantidade_posts: extras.quantidade ?? 9,
  };
}

/** og:title + og:description (ou title + description) de um HTML. */
export function ogDoHtml(html: string): string {
  const $ = cheerio.load(html);
  const meta = (k: string) => $(`meta[property="${k}"]`).attr("content") || $(`meta[name="${k}"]`).attr("content") || "";
  const titulo = (meta("og:title") || $("title").first().text() || "").trim();
  const desc = (meta("og:description") || meta("description") || "").trim();
  return [titulo, desc].filter(Boolean).join(". ").replace(/\s+/g, " ").slice(0, 300);
}

/**
 * Lê as inspirações em paralelo pelo fetch seguro (bloqueia rede interna), no máximo 4 s cada.
 * Falha de qualquer uma vira descrição vazia; nunca derruba a análise.
 */
export async function extrairInspiracoes(insp: { url: string }[], timeoutMs = 4000): Promise<Record<string, string>> {
  const pares = await Promise.all(
    insp.slice(0, 3).map(async ({ url }) => {
      const ler = async (): Promise<readonly [string, string]> => {
        try {
          const { body } = await fetchLimited(normalizeUrl(url), { timeoutMs, maxBytes: 400_000 });
          return [url, ogDoHtml(body.toString("utf8"))] as const;
        } catch {
          return [url, ""] as const;
        }
      };
      // O DNS não obedece ao AbortController: um teto extra garante o prazo.
      let timer: ReturnType<typeof setTimeout> | undefined;
      const teto = new Promise<readonly [string, string]>((r) => {
        timer = setTimeout(() => r([url, ""] as const), timeoutMs + 250);
      });
      const res = await Promise.race([ler(), teto]);
      clearTimeout(timer);
      return res;
    }),
  );
  return Object.fromEntries(pares);
}
