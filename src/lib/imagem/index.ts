import { createHash } from "node:crypto";
import { provedorConfigurado, type LLM } from "@/lib/llm";
import { armazenamentoSupabase, type Armazenamento } from "./armazenamento";
import { escreverDirecao, montarPromptImagem, type Direcao, type EntradaImagem } from "./direcao";
import { ErroImagem, configImagem, gerarImagemOpenAI } from "./openai";

// Imagem do post com IA, "o melhor de cada IA": o Claude escreve a direção de arte, a OpenAI desenha a imagem
// (sem texto nenhum) e os templates do Satori põem o texto do post por cima, com a fonte e as cores da marca.

export { ErroImagem } from "./openai";
export type { Direcao, EntradaImagem } from "./direcao";

export interface ImagemDoPost {
  url: string;
  direcao: Direcao;
  modelo: string;
  /** true quando a imagem já estava no bucket e nada foi gerado. */
  cache: boolean;
}

export interface Dependencias {
  /** undefined: o provedor configurado. null: direção por regra. */
  llm?: LLM | null;
  armazenamento?: Armazenamento | null;
  chaveOpenAI?: string | null;
  /** Chamado só antes de gastar com a OpenAI (imagem em cache não conta). false: passou do limite. */
  reservar?: () => boolean;
  /** Pasta dentro de ia/. Padrão: o domínio da marca. */
  pasta?: string;
}

// A IA não repete a mesma direção de arte, e sem a mesma direção o hash muda. Guardar a direção por entrada
// faz o mesmo post pedir a mesma imagem (e achar o cache) enquanto a instância viver.
const LIMITE_DIRECOES = 200;
const direcoes = new Map<string, Direcao>();

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

function chaveEntrada(e: EntradaImagem): string {
  const { post, brand, contexto, variacao } = e;
  return sha(JSON.stringify([post.id, post.gancho, post.slides, post.formato, brand.dominio, brand.paleta, contexto ?? null, variacao ?? 0]));
}

/** Nome da pasta no bucket: só letras, números, ponto e hífen. */
export function pastaDoDominio(dominio: string): string {
  const p = dominio.toLowerCase().replace(/^www\./, "").replace(/[^a-z0-9.-]+/g, "-").replace(/^[-.]+|[-.]+$/g, "").slice(0, 80);
  return p || "sem-dominio";
}

/** Hash do arquivo: post, gancho, direção de arte e modelo. Mesma combinação, mesma imagem. */
export function hashImagem(e: EntradaImagem, d: Direcao, modelo: string, qualidade: string): string {
  return sha([e.post.id, e.post.gancho, d.estilo, d.cena, modelo, qualidade].join("\n")).slice(0, 32);
}

export async function criarImagemDoPost(e: EntradaImagem, deps: Dependencias = {}): Promise<ImagemDoPost> {
  const chave = deps.chaveOpenAI === undefined ? process.env.OPENAI_API_KEY : deps.chaveOpenAI;
  if (!chave) throw new ErroImagem("A criação de imagem com IA não está ligada neste servidor: falta a chave da OpenAI (OPENAI_API_KEY).", 503);
  const arm = deps.armazenamento === undefined ? armazenamentoSupabase() : deps.armazenamento;
  if (!arm) throw new ErroImagem("A criação de imagem com IA precisa do Supabase para guardar as imagens, e ele não está configurado neste servidor.", 503);

  const k = chaveEntrada(e);
  let direcao = direcoes.get(k);
  if (!direcao) {
    const llm = deps.llm === undefined ? provedorConfigurado("rapido") : deps.llm;
    direcao = await escreverDirecao(e, llm);
    // Regra por falha passageira da IA não fica guardada: o próximo pedido tenta a IA de novo.
    if (!llm || direcao.origem === "ia") {
      if (direcoes.size >= LIMITE_DIRECOES) direcoes.delete(direcoes.keys().next().value!);
      direcoes.set(k, direcao);
    }
  }

  const { modelo, qualidade } = configImagem();
  const caminho = `ia/${deps.pasta ?? pastaDoDominio(e.brand.dominio)}/${hashImagem(e, direcao, modelo, qualidade)}.jpg`;
  if (await arm.existe(caminho)) return { url: arm.urlPublica(caminho), direcao, modelo, cache: true };

  if (deps.reservar && !deps.reservar()) {
    throw new ErroImagem("Você chegou ao limite de imagens com IA por hoje. Amanhã libera de novo.", 429);
  }
  const img = await gerarImagemOpenAI(montarPromptImagem(e, direcao), { chave, modelo, qualidade });
  try {
    await arm.subir(caminho, img.bytes, img.tipo);
  } catch (err) {
    console.error("[imagem] upload", (err as Error).message);
    throw new ErroImagem("A imagem foi criada, mas não deu para guardar. Tente de novo em instantes.", 502);
  }
  return { url: arm.urlPublica(caminho), direcao, modelo, cache: false };
}

// ---------- Limite de uso ----------

// Contagem em memória, por instância, como em concorrentes.ts: cada imagem custa uns US$ 0,04.
const uso = { dia: "", global: 0, porIp: new Map<string, number>() };

/**
 * Reserva uma imagem: até LIMITE_IMAGENS_POR_IP (padrão 10) por IP e LIMITE_IMAGENS_DIA (padrão 60) no total,
 * por dia. false quando passou.
 */
export function reservarUsoImagem(ip: string, agora = new Date()): boolean {
  const hoje = agora.toISOString().slice(0, 10);
  if (uso.dia !== hoje) Object.assign(uso, { dia: hoje, global: 0, porIp: new Map() });
  const porIp = Number(process.env.LIMITE_IMAGENS_POR_IP || 10);
  const global = Number(process.env.LIMITE_IMAGENS_DIA || 60);
  const n = uso.porIp.get(ip) ?? 0;
  if (n >= porIp || uso.global >= global) return false;
  uso.porIp.set(ip, n + 1);
  uso.global++;
  return true;
}
