// Sugestões de concorrentes para a tela de ajustes (POST /api/concorrentes).
// Com IA: uma chamada pequena pede empresas reais do mesmo mercado no Brasil, com o site oficial, e cada
// site é conferido pelo fetch seguro (sem rede interna, 3 s no máximo, em paralelo); o que não responde sai.
// Sem IA, com a IA fora do ar ou sem nenhum site confirmado: perfis de referência da base curada do nicho,
// só com post verificado. Nenhuma URL é inventada aqui: ou veio da IA e respondeu, ou está na base.
import type { BrandProfile, Nicho, ViralItem } from "@/lib/types";
import type { LLM } from "@/lib/llm";
import { FetchError, fetchLimited, normalizeUrl } from "@/lib/brand/fetch";
import { ehSemSite } from "@/lib/brand/sem-site";
import { semAcento } from "@/lib/brand/nome";
import { palpiteNicho } from "@/lib/engine/nicho";
import { demoPorDominio } from "@/lib/engine/demo";
import { extrairJson } from "@/lib/engine/schema";
import { corte } from "@/lib/engine/texto-local";
import { todosOsVirais } from "@/lib/virais";
import { NICHOS } from "@/lib/types";
import type { SugestaoConcorrente } from "./contrato";
import { hostDe } from "./benchmark";

export const MAX_SUGESTOES = 5;
export const MOTIVO_BASE = "Referência do nicho na nossa base curada, com post verificado.";

const semTraco = (s: string) => s.replace(/\s*[—–]\s*/g, ", ").replace(/\s{2,}/g, " ").trim();
const normal = (s: string) => semAcento(s).toLowerCase();

// ---------- Base curada ----------

/** "Luis von Ahn (Duolingo)" e "Luis von Ahn" são o mesmo autor. */
const chaveAutor = (a: string) => normal(a.split("(")[0]).replace(/[^a-z0-9]+/g, " ").trim();

/**
 * Perfis de referência do nicho: itens verificados com autor e link da fonte, um por autor, na ordem da base.
 * Autores que citam a própria marca do usuário ficam de fora.
 */
export function sugestoesDaBase(itens: ViralItem[], nicho: Nicho, op: { marca?: string; max?: number } = {}): SugestaoConcorrente[] {
  const max = op.max ?? MAX_SUGESTOES;
  const marca = normal(op.marca ?? "").trim();
  const autores = new Set<string>();
  const out: SugestaoConcorrente[] = [];
  for (const it of itens) {
    if (out.length >= max) break;
    if (it.nicho !== nicho || it.status !== "verificado" || !it.link_fonte || !it.autor_ou_marca?.trim()) continue;
    const autor = it.autor_ou_marca.trim();
    const chave = chaveAutor(autor);
    if (!chave || autores.has(chave)) continue;
    if (marca.length >= 3 && normal(autor).includes(marca)) continue;
    autores.add(chave);
    out.push({ nome: corte(semTraco(autor), 80), url: it.link_fonte, motivo: MOTIVO_BASE, fonte: "base_nicho" });
  }
  return out;
}

// ---------- IA ----------

export const SISTEMA_CONCORRENTES = `Você ajuda um founder brasileiro a achar concorrentes e empresas de referência para acompanhar nas redes.
Recebe um JSON com o que a empresa faz. Responda só com JSON, sem texto fora dele:
{"sugestoes": [{"nome": "", "url": "", "motivo": ""}]}
Regras:
- Até 6 empresas reais que vendem para o mesmo público no Brasil, ou que são referência clara nesse mercado.
- "url" é a página inicial do site oficial, com https. Se você não tem certeza do endereço, deixe a empresa de fora.
- "motivo": uma frase curta dizendo por que ela é concorrente ou referência para esta empresa. Sem número, sem dado de audiência, sem elogio vazio.
- Nunca inclua a própria empresa. Nunca invente empresa nem endereço.
- Português do Brasil, frases simples, sem travessão.`;

/** Mensagem do usuário: o mínimo que descreve o negócio, em JSON compacto. */
export function montarPromptConcorrentes(brand: BrandProfile, publico?: string | null): string {
  const nicho = palpiteNicho(brand).nicho;
  const descricao = [brand.description || brand.og?.description || "", ...brand.headings.h1.slice(0, 1), ...brand.paragrafos.slice(0, 2)]
    .map((s) => s?.trim())
    .filter(Boolean)
    .join(" ");
  return JSON.stringify({
    empresa: brand.nome || brand.title || "",
    site: ehSemSite(brand.url) ? null : brand.url,
    nicho: NICHOS.find((n) => n.id === nicho)?.nome ?? nicho,
    o_que_faz: corte(descricao, 600),
    publico: corte(publico?.trim() || "", 300),
  });
}

interface SugestaoBruta {
  nome: string;
  url: string;
  motivo: string;
}

/** Lê a resposta da IA sem nunca lançar: aceita {sugestoes: [...]} ou a lista direto. Itens sem nome ou url saem. */
export function lerSugestoesIA(txt: string): SugestaoBruta[] {
  let bruto: unknown;
  try {
    bruto = extrairJson(txt);
  } catch {
    return [];
  }
  const lista = Array.isArray(bruto) ? bruto : Array.isArray((bruto as { sugestoes?: unknown })?.sugestoes) ? (bruto as { sugestoes: unknown[] }).sugestoes : [];
  const s = (v: unknown) => (typeof v === "string" ? semTraco(v) : "");
  return lista
    .map((x) => ({ nome: s((x as SugestaoBruta)?.nome), url: s((x as SugestaoBruta)?.url), motivo: s((x as SugestaoBruta)?.motivo) }))
    .filter((x) => x.nome && x.url)
    .slice(0, 8);
}

/**
 * true quando o site responde. Recusa por robô (403, 429, 503) conta como resposta: o site existe.
 * 404, domínio que não resolve, rede interna e tempo esgotado contam como não respondeu.
 */
export async function siteResponde(url: string, timeoutMs = 3000): Promise<boolean> {
  const tentar = async () => {
    try {
      await fetchLimited(url, { timeoutMs, maxBytes: 20_000 });
      return true;
    } catch (e) {
      return e instanceof FetchError && e.kind === "bloqueado";
    }
  };
  // O DNS não obedece ao AbortController: um teto extra garante o prazo.
  let timer: ReturnType<typeof setTimeout> | undefined;
  const teto = new Promise<boolean>((r) => {
    timer = setTimeout(() => r(false), timeoutMs + 250);
  });
  const ok = await Promise.race([tentar(), teto]);
  clearTimeout(timer);
  return ok;
}

export interface OpcoesSugestao {
  publico?: string | null;
  /** Provedor de IA; null usa só a base curada. */
  llm?: LLM | null;
  /** Conferência de cada site (injeção para teste). Padrão: siteResponde com 3 s. */
  verificar?: (url: string) => Promise<boolean>;
  /** Itens da base (injeção para teste). Padrão: base do repositório mais o que o time cadastrou. */
  itens?: ViralItem[];
  /** Prazo da chamada de IA, em ms. */
  prazoIaMs?: number;
}

/** A IA respondendo dentro do prazo, ou null. Nunca lança. */
async function chamarIA(llm: LLM, sistema: string, prompt: string, prazoMs: number): Promise<string | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const teto = new Promise<null>((r) => {
    timer = setTimeout(() => r(null), prazoMs);
  });
  try {
    return await Promise.race([llm.gerar(sistema, prompt), teto]);
  } catch (e) {
    console.error("[concorrentes] IA falhou:", (e as Error).message.slice(0, 200));
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Até 5 sugestões. IA primeiro (só sites que responderam), completadas pela base curada do nicho.
 * Empresas de exemplo (demo) usam só a base: resposta na hora, sem rede. Nunca lança.
 */
export async function sugerirConcorrentes(brand: BrandProfile, op: OpcoesSugestao = {}): Promise<SugestaoConcorrente[]> {
  const nicho = palpiteNicho(brand).nicho;
  const proprio = ehSemSite(brand.url) ? "" : hostDe(brand.url);
  const demo = !!demoPorDominio(brand.dominio);
  const out: SugestaoConcorrente[] = [];
  const hosts = new Set<string>(proprio ? [proprio] : []);

  if (op.llm && !demo) {
    const txt = await chamarIA(op.llm, SISTEMA_CONCORRENTES, montarPromptConcorrentes(brand, op.publico), op.prazoIaMs ?? 12_000);
    const candidatos: { s: SugestaoBruta; url: string; host: string }[] = [];
    for (const s of txt ? lerSugestoesIA(txt) : []) {
      let url: string;
      try {
        url = normalizeUrl(s.url);
      } catch {
        continue; // endereço inválido ou interno
      }
      const host = hostDe(url);
      if (!host || hosts.has(host) || candidatos.some((c) => c.host === host)) continue;
      candidatos.push({ s, url, host });
    }
    const verificar = op.verificar ?? ((u: string) => siteResponde(u));
    const respostas = await Promise.all(candidatos.map((c) => verificar(c.url).catch(() => false)));
    candidatos.forEach((c, i) => {
      if (!respostas[i] || out.length >= MAX_SUGESTOES) return;
      hosts.add(c.host);
      out.push({
        nome: corte(c.s.nome, 80),
        url: c.url,
        motivo: corte(c.s.motivo || "Empresa do mesmo mercado, sugerida a partir do que o seu site conta.", 200),
        fonte: "ia",
      });
    });
  }

  if (out.length < MAX_SUGESTOES) {
    let itens = op.itens;
    if (!itens) {
      try {
        itens = await todosOsVirais();
      } catch {
        itens = [];
      }
    }
    const nomes = new Set(out.map((o) => chaveAutor(o.nome)));
    const base = sugestoesDaBase(itens, nicho, { marca: brand.nome, max: MAX_SUGESTOES * 2 }).filter((b) => !nomes.has(chaveAutor(b.nome)));
    out.push(...base.slice(0, MAX_SUGESTOES - out.length));
  }
  return out;
}

// ---------- Limite de uso ----------

// Contagem em memória, por instância: barata e suficiente para nenhum script esgotar a cota numa noite.
const uso = { dia: "", global: 0, porIp: new Map<string, number>() };

/**
 * Reserva uma chamada de IA para sugestões: até LIMITE_CONCORRENTES_POR_IP (padrão 10) por IP e
 * LIMITE_CONCORRENTES_DIA (padrão 200) no total, por dia. false quando passou: a rota usa só a base.
 */
export function reservarUsoConcorrentes(ip: string, agora = new Date()): boolean {
  const hoje = agora.toISOString().slice(0, 10);
  if (uso.dia !== hoje) Object.assign(uso, { dia: hoje, global: 0, porIp: new Map() });
  const porIp = Number(process.env.LIMITE_CONCORRENTES_POR_IP || 10);
  const global = Number(process.env.LIMITE_CONCORRENTES_DIA || 200);
  const n = uso.porIp.get(ip) ?? 0;
  if (n >= porIp || uso.global >= global) return false;
  uso.porIp.set(ip, n + 1);
  uso.global++;
  return true;
}
