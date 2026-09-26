import { randomBytes } from "node:crypto";
import type { Analise, BrandProfile, PostGerado, Rede } from "@/lib/types";
import { provedorConfigurado } from "@/lib/llm";
import { montarPrompt, SISTEMA } from "@/lib/llm/prompt";
import { store } from "@/lib/store";
import { contextoViralDoNicho } from "@/lib/virais";
import { montarCalendario } from "./calendario";
import { analiseLocal } from "./local";
import { palpiteNicho } from "./nicho";
import { analiseIASchema, extrairJson, semTravessao, templateValido, type AnaliseIA } from "./schema";
import { demoPorDominio } from "./demo";

export const LIMITE_POSTS = 12;

export function novoId(): string {
  return randomBytes(6).toString("base64url");
}

export function chaveUrl(url: string): string {
  const u = new URL(url);
  return (u.hostname.replace(/^www\./, "") + u.pathname.replace(/\/+$/, "")).toLowerCase();
}

function redesAtivas(b: BrandProfile): Rede[] {
  const r = (["linkedin", "instagram", "x", "facebook"] as Rede[]).filter((k) => b.handles[k]);
  return r.length ? r : ["linkedin", "instagram"];
}

/** Converte a saída validada (IA ou motor local) em Analise com ids e calendário. */
export function finalizar(
  id: string,
  brand: BrandProfile,
  saida: AnaliseIA,
  origem: Analise["origem"],
  provedor: string | null,
  avisos: string[],
): Analise {
  const limpa = semTravessao(saida);
  const posts: PostGerado[] = limpa.posts.map((p, i) => ({
    id: `${id}-p${i + 1}`,
    rede_principal: p.rede_principal,
    formato: p.formato,
    template: templateValido(p.template, p.formato),
    gancho: p.gancho,
    slides: p.slides.map((s) => ({ titulo: s.titulo ?? "", texto: s.texto ?? "" })),
    legendas: p.legendas,
    hashtags: p.hashtags.map((h) => h.replace(/^#/, "").replace(/\s+/g, "")).filter(Boolean),
    padrao_inspirador: p.padrao_inspirador,
    por_que: p.por_que,
  }));
  return {
    id,
    url: brand.url,
    nicho: limpa.nicho,
    resumo_negocio: limpa.resumo_negocio,
    publico: limpa.publico,
    tom_de_voz: limpa.tom_de_voz,
    posicionamento: limpa.posicionamento,
    pilares: limpa.pilares,
    diagnostico: limpa.diagnostico,
    estrategia: limpa.estrategia,
    posts,
    calendario: montarCalendario(posts, limpa.estrategia),
    brand,
    origem,
    provedor,
    avisos: [...brand.avisos, ...avisos],
    criadoEm: new Date().toISOString(),
  };
}

export interface AnalisarOpcoes {
  quantidade: number;
  email?: string | null;
  identificador: string; // e-mail ou IP, para o limite da demo
  forcarNovo?: boolean;
}

/**
 * Fluxo do motor: demo pré-processada, cache por URL, uma chamada de IA, e motor local como rede de segurança.
 * Nunca lança erro por falha de IA: sempre devolve uma análise utilizável.
 */
export async function analisar(brand: BrandProfile, op: AnalisarOpcoes): Promise<Analise> {
  const quantidade = Math.min(LIMITE_POSTS, Math.max(1, Math.round(op.quantidade)));
  const urlChave = chaveUrl(brand.url);
  const llm = provedorConfigurado();

  // 1. Empresas de exemplo: resposta instantânea e idêntica em qualquer cenário de palco.
  const demo = demoPorDominio(brand.dominio);
  if (demo && (!llm || !op.forcarNovo)) {
    const posts = demo.posts.slice(0, quantidade);
    return {
      ...demo,
      id: `demo-${demo.id}`,
      posts,
      calendario: montarCalendario(posts, demo.estrategia),
      origem: "demo",
      avisos: ["Exemplo pré-processado do modo demo, gerado a partir do site público da empresa."],
    };
  }

  // 2. Cache: mesma URL e mesma quantidade não pagam de novo.
  if (!op.forcarNovo) {
    try {
      const c = await store.buscarCache(urlChave, quantidade);
      if (c) return { ...c, origem: "cache" };
    } catch {
      /* cache indisponível não impede a análise */
    }
  }

  const { nicho: palpite } = palpiteNicho(brand);
  const avisos: string[] = [];
  const id = novoId();

  let saida: AnaliseIA | null = null;
  let provedor: string | null = null;

  if (llm) {
    const limite = Number(process.env.LIMITE_ANALISES_POR_EMAIL || 3);
    let usados = 0;
    try {
      usados = await store.contarUso(op.identificador);
    } catch {
      /* sem contagem, segue */
    }
    if (usados >= limite) {
      avisos.push(`Limite de ${limite} análises com IA na demo atingido para este acesso. Esta versão foi montada pelo motor local, sem IA.`);
    } else {
      const contexto = await contextoViralDoNicho(palpite, 10);
      const prompt = montarPrompt({ brand, palpite, padroes: contexto, quantidade, redes: redesAtivas(brand) });
      let erroAnterior = "";
      for (let tentativa = 0; tentativa < 2 && !saida; tentativa++) {
        try {
          const txt = await llm.gerar(
            SISTEMA,
            erroAnterior ? `${prompt}\n\nA resposta anterior veio inválida (${erroAnterior}). Corrija e devolva só o JSON.` : prompt,
          );
          const parsed = analiseIASchema.safeParse(extrairJson(txt));
          if (parsed.success) {
            saida = { ...parsed.data, posts: parsed.data.posts.slice(0, quantidade) };
            provedor = llm.nome;
          } else {
            erroAnterior = parsed.error.issues.slice(0, 4).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
          }
        } catch (e) {
          erroAnterior = (e as Error).message.slice(0, 200);
          if (/HTTP (401|403|429)/.test(erroAnterior)) break; // chave inválida ou sem cota: não adianta repetir
        }
      }
      if (saida) {
        try {
          await store.registrarUso(op.identificador, brand.url);
        } catch {
          /* ignora */
        }
      } else {
        console.error("[analyze] IA falhou:", erroAnterior);
        avisos.push("A IA não respondeu direito desta vez. Esta versão foi montada pelo motor local, sem IA; tente de novo em instantes para a versão completa.");
      }
    }
  }

  if (!saida) {
    const contexto = await contextoViralDoNicho(palpite, 10);
    saida = analiseLocal(brand, palpite, contexto.map((c) => c.padrao), quantidade, redesAtivas(brand));
    if (!llm) avisos.push("Modo demo: sem chave de IA configurada, a estratégia foi montada pelo motor local a partir do texto do site.");
  }

  const analise = finalizar(id, brand, saida, provedor ? "ia" : "local", provedor, avisos);
  try {
    // Só análises feitas pela IA entram no cache; as do motor local são baratas e podem melhorar depois.
    if (provedor) await store.salvarAnalise(analise, urlChave, op.email);
    else await store.salvarAnalise(analise, `local:${urlChave}`, op.email);
  } catch (e) {
    console.error("[analyze] não salvou:", (e as Error).message);
  }
  return analise;
}
