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
import { intercalar, postsDoFounder, referenciaDoPadrao } from "@/lib/motor/local-founder";
import { aplicarLinkDestino } from "@/lib/motor/link-destino";
import { extrairInspiracoes, montarContexto, redesDoMotor } from "@/lib/motor/contexto";
import { filtrarLocal } from "@/lib/motor/local-filtros";
import { aplicarExtras, saidaMotorSchema, saidaParaAnaliseIA, type ResultadoMotor } from "@/lib/motor/saida";
import { montarPromptMotor, SISTEMA_MOTOR } from "@/lib/llm/prompt-motor";
import {
  completarEnderecamento,
  contextoDoSite,
  garantirEnderecamento,
  objetivosDoRodizio,
  REVISAR_PUBLICO,
  type ContextoEnderecamento,
} from "@/lib/motor/enderecamento";
import { objetivosDoSite } from "@/lib/motor/inferir";
import { garantirRoteiros } from "@/lib/motor/roteiros-locais";
import {
  aprendizadosLocais,
  calcularAprendizados,
  desempenhoDosPosts,
  ordenarPorAprendizado,
  pontuacaoAprendida,
  temAprendizado,
} from "@/lib/motor/aprendizados";
import { diaDaSemana } from "@/lib/motor/saida";
import type { Decisao, ResultadoPost } from "@/lib/feedback";
import { ultimaPorPost } from "@/lib/feedback";
import type { CalendarioItem } from "@/lib/types";
import { textoDaMarca } from "./nicho";

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

/** Hash curto dos resultados informados (o último de cada post). Vazio quando não há nenhum. */
export function hashResultados(resultados: ResultadoPost[] = []): string {
  const rs = ultimaPorPost(resultados).map((r) => [r.post_id, r.curtidas, r.comentarios, r.salvamentos, r.alcance, r.compartilhamentos ?? null]);
  return rs.length ? createHash("sha256").update(JSON.stringify(rs)).digest("base64url").slice(0, 10) : "";
}

/**
 * Chave do cache: a URL, o hash das preferências (preferências diferentes = análise diferente) e, quando o founder
 * já informou números, o hash dos resultados: plano feito antes das métricas não é servido depois delas.
 */
export function chaveCache(url: string, preferencias?: Preferencias | null, resultados?: ResultadoPost[]): string {
  const base = chaveUrl(url);
  const comPref = preferencias ? `${base}#m:${hashPreferencias(preferencias)}` : base;
  const r = hashResultados(resultados);
  return r ? `${comPref}#r:${r}` : comPref;
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
  /** Com contexto, o endereçamento de cada post é copiado e completado (o que faltar vai para revisão, se pedido). */
  enderecar?: ContextoEnderecamento,
): Analise {
  const limpa = semTravessao(saida);
  const posts: PostGerado[] = limpa.posts.map((p, i) => ({
    ...enderecamentoDoPost(p, i, enderecar),
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
    ...(p.origem_tema ? { origem_tema: p.origem_tema } : {}),
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

/** Sem padrao_referencia, usa o nome do padrão da base e o link da fonte verificada, quando o id existe no catálogo. */
function comReferencia(p: PostGerado): PostGerado {
  if (p.padrao_referencia?.nome?.trim()) return p;
  const ref = referenciaDoPadrao(p.padrao_inspirador);
  return ref ? { ...p, padrao_referencia: ref } : p;
}

/** Copia o endereçamento que veio na saída; com contexto, completa o que faltar. */
function enderecamentoDoPost(p: AnaliseIA["posts"][number], i: number, ctx?: ContextoEnderecamento): Pick<PostGerado, "enderecamento" | "precisa_revisao"> {
  if (!ctx) return {};
  const legenda = p.legendas[p.rede_principal] || p.legendas.instagram;
  const { enderecamento, completou } = completarEnderecamento(p.enderecamento, { ...p, legenda }, i, ctx);
  return ctx.marcarRevisao && completou ? { enderecamento, precisa_revisao: [REVISAR_PUBLICO] } : { enderecamento };
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
  const llm = provedorConfigurado();

  // 1. Empresas de exemplo: resposta instantânea e idêntica em qualquer cenário de palco.
  // Objetivos do rodízio quando o post não traz um: os do onboarding ou, sem ele, os que o site sugere.
  const objetivos = pref ? objetivosDoRodizio(pref) : objetivosDoSite(textoDaMarca(brand), palpiteNicho(brand).nicho);
  const enderecarSite = (marcarRevisao: boolean, publico?: string | null) =>
    contextoDoSite(brand, { objetivos, publico: pref?.publico_alvo || publico, gatilho: "site", marcarRevisao });

  const demo = demoPorDominio(brand.dominio);
  if (demo && (!llm || !op.forcarNovo)) {
    const ctxDemo = enderecarSite(false, demo.contexto_inferido?.publico);
    const doSite = garantirEnderecamento(demo, ctxDemo).posts.map(comReferencia);
    // Com "O que só você sabe" preenchido, os posts do founder (motor local, instantâneo) entram intercalados na frente.
    const doFounder: PostGerado[] = pref
      ? postsDoFounder(pref.conhecimento_founder, {
          perfil_alvo: pref.perfil_alvo,
          publico: ctxDemo.publico,
          redes: demo.estrategia.map((e) => e.rede),
          hashtags: demo.posts[0]?.hashtags,
          nomeFounder: pref.founder?.nome,
          marca: demo.brand.nome,
        }).map(({ post, extras }, i) => ({
          ...extras,
          id: `${demo.id}-f${i + 1}`,
          rede_principal: post.rede_principal,
          formato: post.formato,
          template: templateValido(post.template, post.formato),
          gancho: post.gancho,
          slides: post.slides,
          legendas: post.legendas,
          hashtags: post.hashtags,
          padrao_inspirador: post.padrao_inspirador,
          por_que: post.por_que,
        }))
      : [];
    const posts = intercalar(semTravessao(doFounder), doSite).slice(0, quantidade);
    const total = doSite.length + doFounder.length;
    const calendario = montarCalendario(posts, demo.estrategia);
    // Roteiros de vídeo montados na hora, sem IA: das respostas do founder ou dos posts da demo.
    const comRoteiros = garantirRoteiros(
      { ...demo, id: `demo-${demo.id}`, posts, calendario },
      { conhecimento: pref?.conhecimento_founder, perfil_alvo: pref?.perfil_alvo, publico: ctxDemo.publico },
    );
    const pronta: Analise = {
      ...demo,
      id: `demo-${demo.id}`,
      posts,
      calendario,
      roteiros: semTravessao(comRoteiros.roteiros),
      origem: "demo",
      avisos: [
        "Exemplo pré-processado do modo demo, gerado a partir do site público da empresa.",
        ...(doFounder.length ? ["Os posts marcados como vindos do que você contou foram montados na hora, a partir das suas respostas."] : []),
        ...(total < quantidade ? [`Este exemplo tem ${total} posts prontos; mostramos todos.`] : []),
      ],
    };
    return aplicarLinkDestino(pronta, pref?.link_destino);
  }

  // Histórico da marca: decisões, números informados e as análises de origem. Entra na chave do cache,
  // no CONTEXTO da IA e na ordem do motor local.
  const hist = await historicoDaMarca(brand);
  const desempenho = desempenhoDosPosts(hist.resultados, hist.postsAnteriores, hist.calendarioAnterior);
  const calc = calcularAprendizados(desempenho);
  const urlChave = chaveCache(brand.url, pref, hist.resultados);

  // 2. Cache: mesma URL e mesma quantidade não pagam de novo.
  if (!op.forcarNovo) {
    try {
      const c = await store.buscarCache(urlChave, quantidade);
      if (c) {
        // Datas novas a partir de hoje e a marca como está agora (paleta ou @ podem ter mudado).
        // Análises salvas antes do endereçamento: completa pelo gancho e pede para confirmar o público.
        const comEnd = garantirEnderecamento(c, {
          ...enderecarSite(true, c.contexto_inferido?.publico),
          gatilho: c.origem === "local" ? "site" : "gancho",
        });
        const calendario = montarCalendario(c.posts, c.estrategia);
        const comRoteiros = garantirRoteiros(
          { ...comEnd, calendario },
          { conhecimento: pref?.conhecimento_founder, perfil_alvo: pref?.perfil_alvo, publico: pref?.publico_alvo, reagendar: true },
        );
        return aplicarLinkDestino(
          {
            ...comRoteiros,
            brand: { ...c.brand, paleta: brand.paleta, handles: brand.handles, fontes: brand.fontes },
            origem: "cache",
          },
          pref?.link_destino,
        );
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
        const ctx = await contextoDoMotor(brand, pref, hist, { palpite, quantidade, redes, referencias: contexto });
        // Dia e horário com número real do founder: só neles o modelo pode dizer "sua audiência".
        const horariosComDado = desempenho.flatMap((d) => {
          const dia = diaDaSemana(d.dia_semana);
          return d.engajamento_pct !== null && dia !== null && d.horario ? [`${dia}|${d.horario}`] : [];
        });
        sistema = SISTEMA_MOTOR;
        prompt = montarPromptMotor(ctx);
        interpretar = (txt) => {
          const bruto = saidaMotorSchema.safeParse(extrairJson(txt));
          if (!bruto.success) return { erro: erroZod(bruto.error.issues) };
          const r = saidaParaAnaliseIA(bruto.data, { brand, palpite, quantidade, redes, preferencias: pref, padroes: contexto.map((c) => c.padrao), horariosComDado });
          const v = analiseIASchema.safeParse(r.analise);
          if (!v.success) return { erro: erroZod(v.error.issues) };
          return { saida: v.data, motor: { ...r, analise: v.data } };
        };
      } else {
        const aprendido = aprendizadosLocais(calc);
        const preferencias = [
          textoPreferencias(resumirPreferencias(hist.decisoes, hist.resultados)),
          aprendido ? `O que os números dos posts publicados mostram:\n- ${[...aprendido.funcionou, ...aprendido.nao_funcionou].join("\n- ")}\n${aprendido.ajuste}` : "",
        ]
          .filter(Boolean)
          .join("\n\n");
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
    // O que funcionou com o founder sobe na fila (padrões e posts); sem número informado, a ordem não muda.
    const nota = pontuacaoAprendida(calc);
    const padroes = ordenarPorAprendizado(
      contexto.map((c) => c.padrao),
      (p) => nota({ formato: p.formato, padrao_inspirador: p.id }),
    );
    if (pref) {
      // Gera candidatos a mais para sobrar post depois dos filtros de formato e proibição.
      const bruto = analiseLocal(brand, palpite, padroes, Math.min(36, quantidade * 3), redesDoMotor(brand, pref));
      motor = filtrarLocal(bruto, pref, { quantidade, marca: nomeDoPerfil(brand), nota });
      saida = motor.analise;
    } else if (temAprendizado(calc)) {
      const bruto = analiseLocal(brand, palpite, padroes, Math.min(36, quantidade * 3), redesAtivas(brand));
      saida = { ...bruto, posts: ordenarPorAprendizado(bruto.posts, nota).slice(0, quantidade) };
    } else {
      saida = analiseLocal(brand, palpite, padroes, quantidade, redesAtivas(brand));
    }
    if (!llm) avisos.push("Modo demo: sem chave de IA configurada, a estratégia foi montada pelo motor local a partir do texto do site.");
  }

  // Endereçamento: a IA manda o dela (o que faltar é completado pelo gancho e vai para revisão);
  // o motor local tira o gatilho das dores reais do site.
  const ctxEnd: ContextoEnderecamento = provedor
    ? { ...enderecarSite(true, motor?.extrasAnalise.contexto_inferido?.publico || saida.publico), gatilho: "gancho" }
    : enderecarSite(false, motor?.extrasAnalise.contexto_inferido?.publico);
  const base = finalizar(id, brand, saida, provedor ? "ia" : "local", provedor, avisos, motor ? undefined : ctxEnd);
  const comExtras = garantirEnderecamento(motor ? aplicarExtras(base, motor) : base, ctxEnd);
  const comRoteiros = garantirRoteiros(
    { ...comExtras, posts: comExtras.posts.map(comReferencia) },
    { conhecimento: pref?.conhecimento_founder, perfil_alvo: pref?.perfil_alvo, publico: ctxEnd.publico },
  );
  const aprendizados = comRoteiros.aprendizados ?? aprendizadosLocais(calc) ?? undefined;
  const analise = aplicarLinkDestino(
    {
      ...comRoteiros,
      roteiros: semTravessao(comRoteiros.roteiros),
      ...(aprendizados ? { aprendizados: semTravessao(aprendizados) } : {}),
      ...(brand.sem_site ? { sem_site: true } : {}),
    },
    pref?.link_destino,
  );
  try {
    // Só análises feitas pela IA entram no cache; as do motor local são baratas e podem melhorar depois.
    if (provedor) await store.salvarAnalise(analise, urlChave, op.email, quantidade);
    else await store.salvarAnalise(analise, `local:${urlChave}`, op.email, quantidade);
  } catch (e) {
    console.error("[analyze] não salvou:", (e as Error).message);
  }
  return analise;
}

export interface HistoricoMarca {
  decisoes: Decisao[];
  resultados: ResultadoPost[];
  postsAnteriores: PostGerado[];
  calendarioAnterior: CalendarioItem[];
}

/** Decisões, números informados e as análises em que os posts nasceram (no máximo 5 leituras). Falha vira vazio. */
export async function historicoDaMarca(brand: BrandProfile): Promise<HistoricoMarca> {
  try {
    const [decisoes, resultados] = await Promise.all([store.listarDecisoes(brand.dominio), store.listarResultados(brand.dominio)]);
    const ids = [...new Set([...decisoes, ...resultados].map((d) => d.analise_id))].slice(-5);
    const analises = await Promise.all(ids.map((i) => store.buscarAnalise(i).catch(() => null)));
    return {
      decisoes: decisoes ?? [],
      resultados: resultados ?? [],
      postsAnteriores: analises.flatMap((a) => a?.posts ?? []),
      calendarioAnterior: analises.flatMap((a) => a?.calendario ?? []),
    };
  } catch {
    return { decisoes: [], resultados: [], postsAnteriores: [], calendarioAnterior: [] };
  }
}

/** Monta o CONTEXTO do motor: histórico já lido, inspirações e concorrentes lidos em paralelo pelo fetch seguro. */
async function contextoDoMotor(
  brand: BrandProfile,
  pref: Preferencias,
  historico: HistoricoMarca,
  x: { palpite: Nicho; quantidade: number; redes: Rede[]; referencias: Awaited<ReturnType<typeof contextoViralDoNicho>> },
) {
  const [inspiracoesExtraidas, concorrenciaExtraida] = await Promise.all([
    extrairInspiracoes(pref.inspiracoes),
    extrairInspiracoes((pref.concorrentes ?? []).map((url) => ({ url }))),
  ]);
  return montarContexto(brand, pref, {
    nicho: x.palpite,
    quantidade: x.quantidade,
    redes: x.redes,
    referencias: x.referencias,
    inspiracoesExtraidas,
    concorrenciaExtraida,
    ...historico,
  });
}
