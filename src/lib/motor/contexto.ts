// Monta o objeto CONTEXTO da Parte 2 de PROMPT_MOTOR_POSTS.md a partir do que já temos:
// perfil de marca (lido sem IA), preferências do onboarding, base curada e histórico do founder.
// O JSON sai compacto (textos cortados, listas curtas) para custar pouco token.
import * as cheerio from "cheerio";
import type { BrandProfile, Nicho, PadraoViral, PostGerado, Rede, ViralItem } from "@/lib/types";
import type { Decisao, ResultadoPost } from "@/lib/feedback";
import { ultimaPorPost } from "@/lib/feedback";
import { fetchLimited, normalizeUrl } from "@/lib/brand/fetch";
import { corte, depoimentosDoSite, frasesDeProduto, frasesDoSite, numerosDoSite } from "@/lib/engine/texto-local";
import { textoDaMarca } from "@/lib/engine/nicho";
import { tomDeVozSchema, type Preferencias, type TomDeVoz } from "./contrato";
import { MOTOR_DO_FORMATO, nichoParaMotor, type NichoMotor } from "./mapa";
import { publicoAlvoDoSite } from "./enderecamento";

type Arroba = { instagram: string; linkedin: string; x: string };

export interface ContextoMotor {
  perfil_alvo: Preferencias["perfil_alvo"];
  /** Quem os posts precisam fazer se reconhecer: o que o founder escreveu ou, se vazio, o inferido do site. */
  publico_alvo: string;
  empresa: {
    site_url: string;
    site_extraido: { proposta: string; publico: string; produtos: string[]; provas: string[]; paleta: string[]; fontes: string[] };
    arroba: Arroba;
    brand_book_extraido: string | null;
  };
  founder: { nome: string; arroba: Arroba; transcricao_audio: string | null };
  nicho: NichoMotor;
  objetivos: string[];
  tom_de_voz: TomDeVoz;
  formatos_permitidos: string[];
  frequencia_escolhida: string | null;
  redes: Rede[];
  proibicoes: string[];
  inspiracoes: { url: string; tipo: string; descricao_extraida: string }[];
  desempenho_proprio: {
    rede: string;
    post_url: string;
    formato: string;
    gancho: string;
    curtidas: number | null;
    comentarios: number | null;
    compartilhamentos: number | null;
    salvamentos: number | null;
    alcance: number | null;
    data_hora: string;
  }[];
  insights_audiencia: { horarios_pico: null; fonte: "nao_disponivel" };
  referencias_nicho: { padrao: string; gancho_modelo: string; formato: string; rede: string; metrica_verificada: boolean; fonte_url: string }[];
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
  /** url da inspiração → og:title + og:description (de extrairInspiracoes). */
  inspiracoesExtraidas?: Record<string, string>;
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
    provas: [...new Set(provas)].slice(0, 5).map((p) => corte(p, 200)),
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

function referenciasDoNicho(refs: ExtrasContexto["referencias"] = []): ContextoMotor["referencias_nicho"] {
  const out: ContextoMotor["referencias_nicho"] = [];
  for (const { padrao, exemplos } of refs) {
    const lista = exemplos.length ? exemplos.slice(0, 2) : [null];
    for (const e of lista) {
      out.push({
        padrao: padrao.nome,
        gancho_modelo: padrao.modelo_gancho,
        formato: MOTOR_DO_FORMATO[padrao.formato],
        rede: e?.rede ?? "",
        metrica_verificada: e?.status === "verificado",
        fonte_url: e?.link_fonte ?? "",
      });
    }
  }
  // Verificados primeiro (camada 4 da hierarquia de evidências), depois o resto.
  return out.sort((a, b) => Number(b.metrica_verificada) - Number(a.metrica_verificada)).slice(0, 14);
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

function desempenho(resultados: ResultadoPost[], posts: Map<string, PostGerado>): ContextoMotor["desempenho_proprio"] {
  return ultimaPorPost(resultados)
    .filter((r) => [r.curtidas, r.comentarios, r.salvamentos, r.alcance].some((v) => v !== null && v !== undefined))
    .slice(-10)
    .map((r) => {
      const p = posts.get(r.post_id);
      return {
        rede: p?.rede_principal ?? "",
        post_url: "",
        formato: MOTOR_DO_FORMATO[r.formato] ?? r.formato,
        gancho: corte(p?.gancho ?? "", 140),
        curtidas: r.curtidas ?? null,
        comentarios: r.comentarios ?? null,
        compartilhamentos: null,
        salvamentos: r.salvamentos ?? null,
        alcance: r.alcance ?? null,
        data_hora: "",
      };
    });
}

/**
 * Objeto CONTEXTO do motor (Parte 2 da spec). Só com o brand já funciona: campos sem dado ficam vazios ou null.
 * Nunca inventa horário nem métrica: insights e benchmarks saem como "nao_disponivel".
 */
export function montarContexto(brand: BrandProfile, preferencias?: Preferencias | null, extras: ExtrasContexto = {}): ContextoMotor {
  const p = preferencias ?? null;
  const posts = new Map((extras.postsAnteriores ?? []).map((x) => [x.id, x]));
  const insp = extras.inspiracoesExtraidas ?? {};
  return {
    perfil_alvo: p?.perfil_alvo ?? "empresa",
    publico_alvo: p?.publico_alvo?.trim() || publicoAlvoDoSite(brand),
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
    nicho: nichoParaMotor(extras.nicho),
    objetivos: p?.objetivos ?? [],
    tom_de_voz: p?.tom_de_voz ?? REGUAS_PADRAO,
    formatos_permitidos: p?.formatos_permitidos ?? [],
    frequencia_escolhida: p?.frequencia_escolhida ?? null,
    redes: extras.redes ?? redesDoMotor(brand, p),
    proibicoes: p?.proibicoes ?? [],
    inspiracoes: (p?.inspiracoes ?? []).map((i) => ({ url: i.url, tipo: i.tipo, descricao_extraida: corte(insp[i.url] ?? "", 300) })),
    desempenho_proprio: desempenho(extras.resultados ?? [], posts),
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
