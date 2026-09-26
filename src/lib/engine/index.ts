import { createHash, randomBytes } from "node:crypto";
import type { Analise, BrandProfile, Nicho, PostGerado, Rede } from "@/lib/types";
import { provedorConfigurado } from "@/lib/llm";
import { nomeDoPerfil } from "@/lib/brand/nome";
import { resumirPreferencias, textoPreferencias } from "@/lib/feedback";
import { montarPrompt, SISTEMA } from "@/lib/llm/prompt";
import { store } from "@/lib/store";
import { contextoViralDoNicho } from "@/lib/virais";
import { montarCalendario } from "./calendario";
import { analiseLocal } from "./local";
import { palpiteNicho } from "./nicho";
import { analiseIASchema, extrairJson, semTravessao, templateValido, type AnaliseIA } from "./schema";
import { demoPorDominio } from "./demo";
import type { Preferencias } from "@/lib/motor/contrato";
import { extrairInspiracoes, montarContexto, redesDoMotor } from "@/lib/motor/contexto";
import { filtrarLocal } from "@/lib/motor/local-filtros";
import { aplicarExtras, saidaMotorSchema, saidaParaAnaliseIA, type ResultadoMotor } from "@/lib/motor/saida";
import { montarPromptMotor, SISTEMA_MOTOR } from "@/lib/llm/prompt-motor";

export const LIMITE_POSTS = 12;

export function novoId(): string {
  return randomBytes(6).toString("base64url");
}

export function chaveUrl(url: string): string {
  const u = new URL(url);
  return (u.hostname.replace(/^www\./, "") + u.pathname.replace(/\/+$/, "")).toLowerCase();
}

/** Hash curto e estável das preferências: a mesma escolha dá a mesma chave, em qualquer ordem de campos. */
export function hashPreferencias(p: Preferencias): string {
  const ordenar = (v: unknown): unknown =>
    Array.isArray(v)
      ? v.map(ordenar)
      : v && typeof v === "object"
        ? Object.fromEntries(
            Object.entries(v as Record<string, unknown>)
              .filter(([, x]) => x !== undefined)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([k, x]) => [k, ordenar(x)]),
          )
        : v;
  return createHash("sha256").update(JSON.stringify(ordenar(p))).digest("base64url").slice(0, 12);
}

/** Chave do cache: a URL e, quando houver, o hash das preferências (preferências diferentes = análise diferente). */
export function chaveCache(url: string, preferencias?: Preferencias | null): string {
  const base = chaveUrl(url);
  return preferencias ? `${base}#m:${hashPreferencias(preferencias)}` : base;
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
    // Perfis lidos antes da correção de nome (ex.: "Solução para empresas" no lugar de "Omie") saem com o nome certo.
    brand: origem === "demo" ? brand : { ...brand, nome: nomeDoPerfil(brand) },
    origem,
    provedor,
    avisos: [...brand.avisos, ...avisos],
    criadoEm: new Date().toISOString(),
  };
}

export interface AnalisarOpcoes {
  quantidade: number;
  email?: string | null;
  /** Chaves de uso para o limite da demo (e-mail e IP); todas precisam estar abaixo do limite. */
  identificadores: string[];
  forcarNovo?: boolean;
  /** Onboarding em camadas. Com preferências, o motor novo (PROMPT_MOTOR_POSTS.md) entra no lugar do prompt antigo. */
  preferencias?: Preferencias;
}

// Teto global por instância, para nenhum script esgotar a cota da IA numa noite.
const usoGlobal = { dia: "", total: 0 };
function dentroDoTetoGlobal(): boolean {
  const hoje = new Date().toISOString().slice(0, 10);
  if (usoGlobal.dia !== hoje) Object.assign(usoGlobal, { dia: hoje, total: 0 });
  return usoGlobal.total < Number(process.env.LIMITE_GLOBAL_DIA || 300);
}

/** Tempo máximo somado das chamadas de IA, abaixo do maxDuration da rota, para sobrar tempo ao motor local. */
const PRAZO_IA_MS = 85_000;

/**
 * Fluxo do motor: demo pré-processada, cache por URL, uma chamada de IA, e motor local como rede de segurança.
 * Nunca lança erro por falha de IA: sempre devolve uma análise utilizável.
 */
export async function analisar(brand: BrandProfile, op: AnalisarOpcoes): Promise<Analise> {
  const quantidade = Math.min(LIMITE_POSTS, Math.max(1, Math.round(op.quantidade)));
  const pref = op.preferencias ?? null;
  const urlChave = chaveCache(brand.url, pref);
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
      avisos: [
        "Exemplo pré-processado do modo demo, gerado a partir do site público da empresa.",
        ...(demo.posts.length < quantidade ? [`Este exemplo tem ${demo.posts.length} posts prontos; mostramos todos.`] : []),
      ],
    };
  }

  // 2. Cache: mesma URL e mesma quantidade não pagam de novo.
  if (!op.forcarNovo) {
    try {
      const c = await store.buscarCache(urlChave, quantidade);
      if (c) {
        // Datas novas a partir de hoje e a marca como está agora (paleta ou @ podem ter mudado).
        return {
          ...c,
          brand: { ...c.brand, paleta: brand.paleta, handles: brand.handles, fontes: brand.fontes },
          calendario: montarCalendario(c.posts, c.estrategia),
          origem: "cache",
        };
      }
    } catch {
      /* cache indisponível não impede a análise */
    }
  }

  const { nicho: palpite } = palpiteNicho(brand);
  const avisos: string[] = [];
  const id = novoId();

  let saida: AnaliseIA | null = null;
  let motor: ResultadoMotor | null = null;
  let provedor: string | null = null;

  if (llm) {
    const limite = Number(process.env.LIMITE_ANALISES_POR_EMAIL || 3);
    let usados = 0;
    try {
      usados = Math.max(0, ...(await Promise.all(op.identificadores.map((k) => store.contarUso(k)))));
    } catch {
      /* sem contagem, segue */
    }
    if (usados >= limite || !dentroDoTetoGlobal()) {
      avisos.push(`Limite de análises com IA da demo atingido para este acesso. Esta versão foi montada pelo motor local, sem IA.`);
    } else {
      // Registra antes de chamar: requisições em paralelo não furam o limite.
      usoGlobal.total++;
      await Promise.all(op.identificadores.map((k) => store.registrarUso(k, brand.url).catch(() => undefined)));
      const inicio = Date.now();
      const contexto = await contextoViralDoNicho(palpite, 10);
      let sistema = SISTEMA;
      let prompt: string;
      // Interpreta a resposta: devolve a saída pronta ou a mensagem de erro para a nova tentativa.
      let interpretar: (txt: string) => { saida: AnaliseIA; motor?: ResultadoMotor } | { erro: string };
      const erroZod = (issues: { path: PropertyKey[]; message: string }[]) =>
        issues.slice(0, 4).map((i) => `${i.path.map(String).join(".")}: ${i.message}`).join("; ");

      if (pref) {
        const redes = redesDoMotor(brand, pref);
        const ctx = await contextoDoMotor(brand, pref, { palpite, quantidade, redes, referencias: contexto });
        sistema = SISTEMA_MOTOR;
        prompt = montarPromptMotor(ctx);
        interpretar = (txt) => {
          const bruto = saidaMotorSchema.safeParse(extrairJson(txt));
          if (!bruto.success) return { erro: erroZod(bruto.error.issues) };
          const r = saidaParaAnaliseIA(bruto.data, { brand, palpite, quantidade, redes, preferencias: pref, padroes: contexto.map((c) => c.padrao) });
          const v = analiseIASchema.safeParse(r.analise);
          if (!v.success) return { erro: erroZod(v.error.issues) };
          return { saida: v.data, motor: { ...r, analise: v.data } };
        };
      } else {
        let preferencias = "";
        try {
          const [decisoes, resultados] = await Promise.all([store.listarDecisoes(brand.dominio), store.listarResultados(brand.dominio)]);
          preferencias = textoPreferencias(resumirPreferencias(decisoes, resultados));
        } catch {
          /* sem histórico, segue */
        }
        prompt = montarPrompt({ brand, palpite, padroes: contexto, quantidade, redes: redesAtivas(brand), preferencias });
        interpretar = (txt) => {
          const parsed = analiseIASchema.safeParse(extrairJson(txt));
          if (!parsed.success) return { erro: erroZod(parsed.error.issues) };
          return { saida: { ...parsed.data, posts: parsed.data.posts.slice(0, quantidade) } };
        };
      }
      let erroAnterior = "";
      // Segunda tentativa só se a primeira falhou rápido o bastante para caber no prazo.
      for (let tentativa = 0; tentativa < 2 && !saida && Date.now() - inicio < PRAZO_IA_MS / 2; tentativa++) {
        try {
          const txt = await llm.gerar(
            sistema,
            erroAnterior ? `${prompt}\n\nA resposta anterior veio inválida (${erroAnterior}). Corrija e devolva só o JSON.` : prompt,
          );
          const r = interpretar(txt);
          if ("saida" in r) {
            saida = r.saida;
            motor = r.motor ?? null;
            provedor = llm.nome;
          } else {
            erroAnterior = r.erro;
          }
        } catch (e) {
          erroAnterior = (e as Error).message.slice(0, 200);
          if (/HTTP (401|403|429)/.test(erroAnterior)) break; // chave inválida ou sem cota: não adianta repetir
        }
      }
      if (!saida) {
        console.error("[analyze] IA falhou:", erroAnterior);
        avisos.push("A IA não respondeu direito desta vez. Esta versão foi montada pelo motor local, sem IA; tente de novo em instantes para a versão completa.");
      }
    }
  }

  if (!saida) {
    const contexto = await contextoViralDoNicho(palpite, 10);
    if (pref) {
      // Gera candidatos a mais para sobrar post depois dos filtros de formato e proibição.
      const bruto = analiseLocal(brand, palpite, contexto.map((c) => c.padrao), Math.min(36, quantidade * 3), redesDoMotor(brand, pref));
      motor = filtrarLocal(bruto, pref, { quantidade, marca: nomeDoPerfil(brand) });
      saida = motor.analise;
    } else {
      saida = analiseLocal(brand, palpite, contexto.map((c) => c.padrao), quantidade, redesAtivas(brand));
    }
    if (!llm) avisos.push("Modo demo: sem chave de IA configurada, a estratégia foi montada pelo motor local a partir do texto do site.");
  }

  const base = finalizar(id, brand, saida, provedor ? "ia" : "local", provedor, avisos);
  const analise = motor ? aplicarExtras(base, motor) : base;
  try {
    // Só análises feitas pela IA entram no cache; as do motor local são baratas e podem melhorar depois.
    if (provedor) await store.salvarAnalise(analise, urlChave, op.email, quantidade);
    else await store.salvarAnalise(analise, `local:${urlChave}`, op.email, quantidade);
  } catch (e) {
    console.error("[analyze] não salvou:", (e as Error).message);
  }
  return analise;
}

/** Busca o que o CONTEXTO do motor precisa fora do brand: histórico do founder, posts anteriores e inspirações. */
async function contextoDoMotor(
  brand: BrandProfile,
  pref: Preferencias,
  x: { palpite: Nicho; quantidade: number; redes: Rede[]; referencias: Awaited<ReturnType<typeof contextoViralDoNicho>> },
) {
  const [historico, inspiracoesExtraidas] = await Promise.all([
    (async () => {
      try {
        const [decisoes, resultados] = await Promise.all([store.listarDecisoes(brand.dominio), store.listarResultados(brand.dominio)]);
        // Ganchos e redes das decisões vêm das análises em que os posts nasceram (no máximo 5 leituras).
        const ids = [...new Set([...decisoes, ...resultados].map((d) => d.analise_id))].slice(-5);
        const analises = await Promise.all(ids.map((i) => store.buscarAnalise(i).catch(() => null)));
        return { decisoes, resultados, postsAnteriores: analises.flatMap((a) => a?.posts ?? []) };
      } catch {
        return { decisoes: [], resultados: [], postsAnteriores: [] };
      }
    })(),
    extrairInspiracoes(pref.inspiracoes),
  ]);
  return montarContexto(brand, pref, {
    nicho: x.palpite,
    quantidade: x.quantidade,
    redes: x.redes,
    referencias: x.referencias,
    inspiracoesExtraidas,
    ...historico,
  });
}
