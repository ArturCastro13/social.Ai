// Roteiros de vídeo curto sem IA (motor local, demo e rede de segurança da saída da IA).
// Determinístico e sem invenção: o texto é o que o founder contou ou o que já está nos posts do lote,
// mais frases neutras de ligação. A resposta para a dúvida do cliente nunca é escrita por nós:
// o roteiro deixa um [PREENCHER] e pede a resposta do founder em precisa_revisao.
//
// A base curada ainda não tem itens de vídeo (os formatos são todos estáticos ou carrossel). Por isso
// os roteiros adaptam os padrões de gancho dos posts estáticos: o gancho vira a fala dos 3 primeiros
// segundos e os slides ou a legenda viram as cenas.
import type { CalendarioItem, PostGerado, Rede } from "@/lib/types";
import { hojeEmSaoPaulo } from "@/lib/engine/calendario";
import { corte, frasesDe, paraHashtag } from "@/lib/engine/texto-local";
import { conhecimentoPreenchido, type ConhecimentoFounder, type Preferencias, type RoteiroVideo } from "./contrato";
import { referenciaDoPadrao } from "./local-founder";

export type RedeVideo = RoteiroVideo["rede"];

const DIA_MS = 86_400_000;
const DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

/** Janelas de partida para vídeo curto, por rede (horário de Brasília). Hipótese do nicho, nunca dado da audiência. */
const JANELAS_VIDEO: Record<RedeVideo, { dias: number[]; horario: string }> = {
  instagram: { dias: [2, 4, 6], horario: "19:30" },
  linkedin: { dias: [2, 3, 4], horario: "12:00" },
  tiktok: { dias: [2, 4, 6], horario: "20:00" },
  youtube: { dias: [6, 0], horario: "11:00" },
};

export const FONTE_HIPOTESE = "hipótese do nicho";

/** Quantos roteiros por lote: 1 em lotes de até 3 posts, 2 nos outros. */
export function quantosRoteiros(quantidade: number): number {
  return quantidade <= 3 ? 1 : 2;
}

/** "Reels", "Shorts", "TikTok" viram a rede de vídeo certa. null se não reconhecer. */
export function normalizarRedeVideo(r: unknown): RedeVideo | null {
  if (typeof r !== "string") return null;
  const k = r.toLowerCase();
  if (/insta|reels?/.test(k)) return "instagram";
  if (/linked/.test(k)) return "linkedin";
  if (/tik/.test(k)) return "tiktok";
  if (/you|short/.test(k)) return "youtube";
  return null;
}

/** Redes de vídeo do plano: Instagram (Reels) e LinkedIn quando estão nas redes; sem nenhuma, Instagram. */
export function redesDeVideo(redes: Rede[]): RedeVideo[] {
  const out: RedeVideo[] = [];
  if (redes.includes("instagram")) out.push("instagram");
  if (redes.includes("linkedin")) out.push("linkedin");
  return out.length ? out : ["instagram"];
}

const amanhaDe = (agora: Date) => new Date(hojeEmSaoPaulo(agora).getTime() + DIA_MS);
const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Próxima data (a partir de amanhã, Brasília) do dia da semana pedido; `semanas` empurra para as seguintes. */
export function proximaDataDoDia(dia: number, agora = new Date(), semanas = 0): string {
  const amanha = amanhaDe(agora);
  const primeira = (dia - amanha.getUTCDay() + 7) % 7;
  return iso(new Date(amanha.getTime() + (primeira + 7 * semanas) * DIA_MS));
}

/**
 * Agenda de gravação e publicação: mesma base de datas do calendário dos posts (a partir de amanhã, Brasília),
 * nos dias da janela da rede que ainda não têm post nem outro vídeo. Sem dia livre na janela, qualquer dia livre.
 */
export function agendarRoteiros<T extends { rede: RedeVideo }>(
  roteiros: T[],
  calendario: Pick<CalendarioItem, "data">[],
  agora = new Date(),
): (T & { agenda: NonNullable<RoteiroVideo["agenda"]> })[] {
  const ocupados = new Set(calendario.map((c) => c.data));
  const amanha = amanhaDe(agora);
  return roteiros.map((r) => {
    const janela = JANELAS_VIDEO[r.rede];
    let escolhido: Date | null = null;
    for (const soNaJanela of [true, false]) {
      for (let offset = 0; offset < 21 && !escolhido; offset++) {
        const d = new Date(amanha.getTime() + offset * DIA_MS);
        if (ocupados.has(iso(d))) continue;
        if (soNaJanela && !janela.dias.includes(d.getUTCDay())) continue;
        escolhido = d;
      }
      if (escolhido) break;
    }
    const d = escolhido ?? amanha;
    ocupados.add(iso(d));
    return { ...r, agenda: { data: iso(d), dia_semana: DIAS[d.getUTCDay()], horario: janela.horario, fonte: FONTE_HIPOTESE } };
  });
}

// ---------- Texto ----------

const linha = (s: string) =>
  s
    .replace(/\s*[—–]\s*/g, ", ")
    .replace(/\s+/g, " ")
    .trim();
const semPonto = (s: string) => s.replace(/[.!;:,…]+$/, "").trim();
const comPonto = (s: string) => (/[.!?…]$/.test(s) ? s : `${s}.`);
const palavras = (s: string) => s.split(/\s+/).filter(Boolean).length;

/** Duração pelo texto falado (cerca de 2,5 palavras por segundo), arredondada para 5 s, entre 15 e 90. */
export function duracaoDoRoteiro(r: Pick<RoteiroVideo, "gancho" | "cenas" | "chamada_final">): number {
  const n = palavras([r.gancho, ...r.cenas.map((c) => c.fala), r.chamada_final].join(" "));
  return Math.min(90, Math.max(15, Math.round(n / 2.5 / 5) * 5));
}

/** Quebra um relato em até `max` falas de uma ou duas frases, sem cortar no meio da frase quando dá. */
function falasDoRelato(t: string, max: number): string[] {
  const frases = frasesDe(t).length ? frasesDe(t) : [t];
  const out: string[] = [];
  for (const f of frases) {
    const ultima = out[out.length - 1];
    if (ultima && out.length >= max) out[out.length - 1] = `${ultima} ${f}`;
    else if (ultima && palavras(ultima) + palavras(f) <= 22) out[out.length - 1] = `${ultima} ${f}`;
    else out.push(f);
  }
  return out.map((f) => corte(comPonto(linha(f)), 320)).filter(Boolean);
}

function legendaDoRoteiro(gancho: string, corpo: string[], cta: string, tags: string[]): string {
  const hashtags = tags.slice(0, 4).map((t) => `#${t}`).join(" ");
  return corte([gancho, "", ...corpo, "", cta, ...(hashtags ? ["", hashtags] : [])].join("\n").trim(), 2200);
}

const DICA_CAMERA = "Celular na vertical, na altura dos olhos, com luz de frente. Fale com as suas palavras: o roteiro é um guia, não um texto para decorar.";

type Parcial = Omit<RoteiroVideo, "id" | "agenda" | "duracao_seg">;

interface Voz {
  eu: boolean;
}
const v = (voz: Voz, eu: string, nos: string) => (voz.eu ? eu : nos);

function deHistoria(texto: string, voz: Voz, rede: RedeVideo, publico: string, tags: string[]): Parcial {
  const t = linha(texto);
  const gancho = `Teve um dia que mudou como ${v(voz, "eu enxergo", "a gente enxerga")} esse problema.`;
  const relato = falasDoRelato(t, 3);
  const cenas = [
    { fala: "Deixa eu te contar o que aconteceu.", tela: v(voz, "O dia em que mudei como vejo o problema", "O dia em que mudamos como vemos o problema") },
    ...relato.map((fala) => ({ fala })),
    { fala: `Desde então, ${v(voz, "eu olho", "a gente olha")} para isso de outro jeito.` },
  ];
  const chamada = "Já viveu algo parecido? Conta nos comentários.";
  return {
    titulo: v(voz, "Conto a história que mudou como vejo o problema", "Contamos a história que mudou como vemos o problema"),
    rede,
    gancho,
    cenas,
    chamada_final: chamada,
    legenda: legendaDoRoteiro(gancho, [corte(comPonto(t), 400)], chamada, tags),
    dica_gravacao: DICA_CAMERA,
    origem_tema: "founder",
    enderecamento: {
      objetivo: "autoridade_founder",
      publico,
      gatilho_identificacao: corte(semPonto(t), 160),
      acao_esperada: v(voz, "Seguir o founder e contar se já viveu algo parecido", "Seguir a marca e contar se já viveu algo parecido"),
    },
    padrao_referencia: referenciaDoPadrao("bastidor-founder--historia-pessoal") ?? referenciaDoPadrao("carrossel--historia-pessoal"),
    precisa_revisao: [],
  };
}

function deObjecao(texto: string, voz: Voz, rede: RedeVideo, publico: string, tags: string[]): Parcial {
  const t = linha(texto);
  const ehPergunta = /\?$/.test(t) && t.length <= 150;
  const maisOuvida = `Essa é a dúvida que ${v(voz, "eu mais ouço", "a gente mais ouve")} de cliente.`;
  const gancho = ehPergunta ? t : maisOuvida;
  const cenas = [
    ehPergunta ? { fala: maisOuvida } : { fala: corte(comPonto(t), 320), tela: corte(semPonto(t), 120) },
    { fala: "[PREENCHER: a sua resposta para essa dúvida, em duas ou três frases]", tela: "A resposta" },
    { fala: "Se essa dúvida também passa pela sua cabeça, você não é o único." },
  ];
  const chamada = "Manda a sua dúvida nos comentários ou chama para uma conversa.";
  return {
    titulo: v(voz, "Respondo a dúvida que mais ouço de cliente", "Respondemos a dúvida que mais ouvimos de cliente"),
    rede,
    gancho,
    cenas,
    chamada_final: chamada,
    legenda: legendaDoRoteiro(gancho, ehPergunta ? [maisOuvida] : [corte(comPonto(t), 300)], chamada, tags),
    dica_gravacao: "Grave como se respondesse a um cliente na sua frente. " + DICA_CAMERA,
    origem_tema: "founder",
    enderecamento: {
      objetivo: "gerar_clientes",
      publico,
      gatilho_identificacao: corte(semPonto(t), 160),
      acao_esperada: "Mandar a dúvida nos comentários ou pedir uma conversa",
    },
    padrao_referencia: referenciaDoPadrao("print-tweet--pergunta") ?? referenciaDoPadrao("imagem-unica--pergunta"),
    precisa_revisao: ["Grave a sua resposta para essa dúvida: o roteiro não responde por você."],
  };
}

function deCrenca(texto: string, voz: Voz, rede: RedeVideo, publico: string, tags: string[]): Parcial {
  const t = linha(texto);
  const gancho = `O mercado acredita numa coisa que ${v(voz, "eu acho errada", "a gente acha errada")}.`;
  const cenas = [
    { fala: "Vou direto ao ponto." },
    ...falasDoRelato(t, 2).map((fala, i) => (i === 0 ? { fala, tela: corte(semPonto(t), 120) } : { fala })),
    { fala: `Pode discordar: é a ${v(voz, "minha", "nossa")} leitura do mercado, dita sem rodeio.` },
  ];
  const chamada = "Concorda ou discorda? Comenta aqui.";
  return {
    titulo: v(voz, "Falo o que o mercado acredita e eu acho errado", "Falamos o que o mercado acredita e a gente acha errado"),
    rede,
    gancho,
    cenas,
    chamada_final: chamada,
    legenda: legendaDoRoteiro(gancho, [corte(comPonto(t), 300)], chamada, tags),
    dica_gravacao: DICA_CAMERA,
    origem_tema: "founder",
    enderecamento: {
      objetivo: "autoridade_founder",
      publico,
      gatilho_identificacao: corte(semPonto(t), 160),
      acao_esperada: v(voz, "Seguir o founder e comentar se concorda ou discorda", "Seguir a marca e comentar se concorda ou discorda"),
    },
    padrao_referencia: referenciaDoPadrao("citacao--contraintuitivo") ?? referenciaDoPadrao("print-tweet--contraintuitivo"),
    precisa_revisao: [],
  };
}

// ---------- A partir dos posts do lote ----------

/** Carrossel e lista têm cenas prontas nos slides; bastidor vira fala para a câmera. */
const PRIORIDADE_FORMATO: Record<string, number> = {
  carrossel: 0,
  "bastidor-founder": 1,
  lista: 2,
  "antes-depois": 3,
  citacao: 4,
  "print-tweet": 5,
  "imagem-unica": 6,
  "dado-impacto": 7,
};

const ehHashtags = (l: string) => /^\s*(#[\p{L}\p{N}_]+\s*)+$/u.test(l);
const ehLink = (l: string) => /https?:\/\//.test(l);

function cenasDoPost(p: PostGerado, legenda: string): { fala: string; tela?: string }[] {
  const slides = p.slides.filter((s) => (s.texto || s.titulo).trim());
  let cenas: { fala: string; tela?: string }[] = [];
  if (slides.length >= 3) {
    // Capa já é o gancho: as cenas são os slides seguintes. Com 4 ou mais, o último é o fechamento do
    // carrossel ("salva este post") e fica de fora: a chamada do vídeo é outra.
    const miolo = slides.length >= 4 ? slides.slice(1, -1) : slides.slice(1);
    cenas = miolo.slice(0, 6).map((s) => {
      const fala = linha(s.texto || s.titulo);
      const tela = s.texto && s.titulo ? linha(s.titulo) : undefined;
      return tela && tela !== fala ? { fala: corte(fala, 320), tela: corte(tela, 120) } : { fala: corte(fala, 320) };
    });
  } else {
    // A primeira linha da legenda é o gancho do post (mesma ideia do gancho do vídeo): fica de fora.
    const linhas = legenda
      .split(/\n+/)
      .map((l) => l.trim())
      .filter((l) => l && !ehHashtags(l) && !ehLink(l))
      .slice(1)
      .filter((l) => semPonto(l) !== semPonto(p.gancho));
    // O miolo da legenda sem a última linha, que costuma ser a chamada.
    const miolo = linhas.length > 2 ? linhas.slice(0, -1) : linhas;
    cenas = miolo.slice(0, 4).map((l) => ({ fala: corte(linha(l), 320) }));
    const arte = slides[0];
    if (arte && cenas.length < 4) {
      const fala = linha(arte.texto || arte.titulo);
      const tela = arte.titulo && arte.texto && semPonto(arte.titulo) !== semPonto(p.gancho) ? corte(linha(arte.titulo), 120) : undefined;
      if (fala && !cenas.some((c) => c.fala === fala) && semPonto(fala) !== semPonto(p.gancho)) cenas.unshift({ fala: corte(fala, 320), tela });
    }
  }
  cenas = cenas.filter((c) => c.fala.trim()).map((c) => (c.tela ? c : { fala: c.fala }));
  if (cenas.length < 3) cenas.unshift({ fala: "Vou direto ao ponto." });
  if (cenas.length < 3) cenas.push({ fala: `Resumindo: ${semPonto(p.gancho).replace(/^\p{Lu}/u, (c) => c.toLowerCase())}.` });
  return cenas.slice(0, 6);
}

const CHAMADA_DO_OBJETIVO: Record<string, string> = {
  gerar_clientes: "Se isso é o seu dia a dia, chama para uma conversa.",
  autoridade_founder: "Segue para ver os próximos e comenta como é aí.",
  lancar_produto: "Quer testar? Comenta aqui que eu te chamo.",
  contratar: "Conhece alguém que combina? Manda este vídeo para essa pessoa.",
  atrair_investidor: "Se faz sentido para você, me chama para conversar.",
  comunidade: "Comenta como é aí e marca quem vive o mesmo.",
};

function doPost(p: PostGerado, rede: RedeVideo, publico: string): Parcial {
  const legendaPost = p.legendas[rede === "linkedin" ? "linkedin" : "instagram"] || p.legendas[p.rede_principal] || p.gancho;
  const cenas = cenasDoPost(p, legendaPost);
  const objetivo = p.enderecamento?.objetivo ?? "autoridade_founder";
  const chamada = p.chamada_final?.trim() || CHAMADA_DO_OBJETIVO[objetivo] || CHAMADA_DO_OBJETIVO.autoridade_founder;
  const legenda = legendaPost
    .split("\n")
    .filter((l) => !ehLink(l))
    .join("\n")
    .trim();
  const formato = p.formato === "bastidor-founder" ? "bastidor" : p.formato;
  return {
    titulo: corte(`Vídeo do ${formato}: ${semPonto(p.gancho)}`, 140),
    rede,
    gancho: corte(linha(p.gancho), 220),
    cenas,
    chamada_final: chamada,
    legenda: corte(legenda || p.gancho, 2200),
    dica_gravacao: slidesViramTela(p) ? "Mostre o texto de cada cena na tela enquanto fala. " + DICA_CAMERA : DICA_CAMERA,
    origem_tema: p.origem_tema ?? "site",
    // Post sem endereçamento (só em dado antigo): o vídeo fala com o público do plano e o gatilho é o gancho.
    enderecamento: p.enderecamento ?? {
      objetivo,
      publico,
      gatilho_identificacao: corte(semPonto(linha(p.gancho)), 160),
      acao_esperada: "Comentar como isso acontece na própria rotina",
    },
    ...(p.padrao_referencia ? { padrao_referencia: p.padrao_referencia } : {}),
    precisa_revisao: [...(p.precisa_revisao ?? [])],
  };
}

const slidesViramTela = (p: PostGerado) => p.slides.length >= 3;

export interface OpcoesRoteiros {
  /** Id da análise: os roteiros saem com id `${analiseId}-v{n}`. */
  analiseId: string;
  /** Posts do lote (já com endereçamento), antes do link de destino. */
  posts: PostGerado[];
  /** Calendário dos posts: os vídeos vão para os dias livres. */
  calendario: Pick<CalendarioItem, "data">[];
  conhecimento?: ConhecimentoFounder | null;
  perfil_alvo?: Preferencias["perfil_alvo"];
  /** Público-alvo em uma frase (preferência, contexto inferido ou do site). */
  publico: string;
  redes: Rede[];
  /** Quantos roteiros (1 ou 2 normalmente). */
  max: number;
  agora?: Date;
}

/**
 * Roteiros de vídeo sem IA. Primeiro o que o founder contou (história, objeção, crença), depois os
 * melhores posts do lote (carrossel e bastidor primeiro). Nada inventado.
 */
export function roteirosLocais(op: OpcoesRoteiros): RoteiroVideo[] {
  const max = Math.max(0, op.max);
  if (!max) return [];
  const voz: Voz = { eu: op.perfil_alvo !== "empresa" };
  const redes = redesDeVideo(op.redes);
  const rede = (i: number) => redes[i % redes.length];
  const publico = corte(op.publico.trim() || "Quem vive o problema que a empresa resolve", 300);
  const tags = [...new Set(op.posts.flatMap((p) => p.hashtags).map(paraHashtag).filter((t) => t.length >= 2 && t.length <= 40))];

  const parciais: Parcial[] = [];
  const c = conhecimentoPreenchido(op.conhecimento);
  if (c?.historia) parciais.push(deHistoria(c.historia, voz, rede(parciais.length), publico, tags));
  if (c?.objecao_cliente) parciais.push(deObjecao(c.objecao_cliente, voz, rede(parciais.length), publico, tags));
  if (c?.crenca_contraria) parciais.push(deCrenca(c.crenca_contraria, voz, rede(parciais.length), publico, tags));

  if (parciais.length < max) {
    const candidatos = op.posts
      .map((p, i) => ({ p, i }))
      .filter(({ p }) => p.origem_tema !== "founder" || !c) // o que veio do founder já virou roteiro acima
      .sort((a, b) => (PRIORIDADE_FORMATO[a.p.formato] ?? 9) - (PRIORIDADE_FORMATO[b.p.formato] ?? 9) || a.i - b.i);
    for (const { p } of candidatos) {
      if (parciais.length >= max) break;
      parciais.push(doPost(p, rede(parciais.length), publico));
    }
  }

  const comId = parciais.slice(0, max).map((r, i) => ({ ...r, id: `${op.analiseId}-v${i + 1}`, duracao_seg: duracaoDoRoteiro(r) }));
  return agendarRoteiros(comId, op.calendario, op.agora).map(ordenarCampos);
}

function ordenarCampos(r: RoteiroVideo): RoteiroVideo {
  const { id, titulo, rede, duracao_seg, gancho, cenas, chamada_final, legenda, dica_gravacao, origem_tema, enderecamento, padrao_referencia, agenda, precisa_revisao } = r;
  return Object.fromEntries(
    Object.entries({ id, titulo, rede, duracao_seg, gancho, cenas, chamada_final, legenda, dica_gravacao, origem_tema, enderecamento, padrao_referencia, agenda, precisa_revisao }).filter(
      ([, x]) => x !== undefined,
    ),
  ) as unknown as RoteiroVideo;
}

export interface OpcoesGarantir {
  conhecimento?: ConhecimentoFounder | null;
  perfil_alvo?: Preferencias["perfil_alvo"];
  /** Público-alvo em uma frase; vazio usa o contexto inferido ou o público da análise. */
  publico?: string | null;
  /** Análise vinda do cache: as datas dos vídeos são refeitas a partir de amanhã. */
  reagendar?: boolean;
  agora?: Date;
}

/**
 * Toda análise sai com roteiros: os que já vieram (da IA) ficam, com data refeita se pedido;
 * sem nenhum, o motor local monta 1 ou 2 a partir do founder e dos posts.
 */
export function garantirRoteiros<A extends { id: string; posts: PostGerado[]; calendario: CalendarioItem[]; estrategia: { rede: Rede }[]; publico: string; contexto_inferido?: { publico: string }; roteiros?: RoteiroVideo[] }>(
  a: A,
  op: OpcoesGarantir = {},
): A {
  if (a.roteiros?.length) {
    if (!op.reagendar) return a;
    const vezes = new Map<number, number>();
    const ocupados: Pick<CalendarioItem, "data">[] = [...a.calendario];
    const roteiros = a.roteiros.map((r) => {
      const dia = r.agenda ? DIAS.indexOf(r.agenda.dia_semana) : -1;
      if (!r.agenda || dia < 0) {
        const [novo] = agendarRoteiros([{ ...r, rede: normalizarRedeVideo(r.rede) ?? "instagram" }], ocupados, op.agora);
        ocupados.push({ data: novo.agenda.data });
        return novo as RoteiroVideo;
      }
      const n = vezes.get(dia) ?? 0;
      vezes.set(dia, n + 1);
      const data = proximaDataDoDia(dia, op.agora, n);
      ocupados.push({ data });
      return { ...r, agenda: { ...r.agenda, data } };
    });
    return { ...a, roteiros };
  }
  const roteiros = roteirosLocais({
    analiseId: a.id,
    posts: a.posts,
    calendario: a.calendario,
    conhecimento: op.conhecimento,
    perfil_alvo: op.perfil_alvo,
    publico: op.publico?.trim() || a.contexto_inferido?.publico?.trim() || a.publico,
    redes: a.estrategia.map((e) => e.rede),
    max: quantosRoteiros(a.posts.length),
    agora: op.agora,
  });
  return { ...a, roteiros };
}
