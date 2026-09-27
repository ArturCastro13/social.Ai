// Saída do motor novo (Parte 3 de PROMPT_MOTOR_POSTS.md): schema tolerante e adaptador para o formato
// que o painel e o renderizador já entendem (AnaliseIA + extras).
import { z } from "zod";
import type { Analise, BrandProfile, CalendarioItem, Nicho, PadraoViral, Rede, TemplateId } from "@/lib/types";
import { enderecamentoIASchema, TEMPLATES, semTravessao, type AnaliseIA } from "@/lib/engine/schema";
import { hojeEmSaoPaulo } from "@/lib/engine/calendario";
import { corte } from "@/lib/engine/texto-local";
import { ORIGENS_TEMA, type ExtrasAnalise, type ExtrasPost, type OrigemTema, type Preferencias, type RoteiroVideo } from "./contrato";
import { completarEnderecamento, objetivosDoRodizio, publicoAlvoDoSite, REVISAR_PUBLICO, type ContextoEnderecamento } from "./enderecamento";
import {
  distribuirFrequencia,
  formatoDoApp,
  nichoDoMotor,
  normalizarFormatoMotor,
  normalizarRede,
  postsPorSemana,
} from "./mapa";
import { limparBenchmark } from "./benchmark";
import { agendarRoteiros, duracaoDoRoteiro, FONTE_HIPOTESE, normalizarRedeVideo, proximaDataDoDia, quantosRoteiros, redesDeVideo } from "./roteiros-locais";

// ---------- Schema tolerante ----------

/** Texto que nunca falha: número vira texto, qualquer outra coisa vira "". Corta no máximo. */
const txt = (max: number) =>
  z
    .preprocess((v) => (typeof v === "string" ? v : typeof v === "number" ? String(v) : ""), z.string())
    .transform((s) => s.trim().slice(0, max));

/** Lista que nunca falha: itens inválidos são descartados e o excesso é cortado. */
function lista<T extends z.ZodType>(item: T, max: number) {
  return z
    .preprocess((v) => (Array.isArray(v) ? v : []), z.array(z.unknown()))
    .transform((arr) =>
      arr
        .map((x) => item.safeParse(x))
        .filter((r) => r.success)
        .map((r) => r.data as z.output<T>)
        .slice(0, max),
    );
}

const num = z.coerce.number().catch(0);

const pontoSchema = z
  .object({ ponto: txt(160), evidencia: txt(600) })
  .refine((p) => p.ponto.length > 0);

const slideSchema = z.union([
  z.object({ titulo: txt(200), texto: txt(600) }),
  z.string().transform((s) => ({ titulo: "", texto: s.trim().slice(0, 600) })),
]);

/** "Fundador", "Notícia", "SITE" viram o id certo; ausente ou desconhecido vira "site". Nunca falha. */
export function normalizarOrigemTema(v: unknown): OrigemTema {
  if (typeof v !== "string") return "site";
  const k = v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  if ((ORIGENS_TEMA as readonly string[]).includes(k)) return k as OrigemTema;
  if (/founder|fundador|conhecimento|transcri|audio/.test(k)) return "founder";
  if (/noticia/.test(k)) return "noticia";
  if (/nicho|padrao|referencia/.test(k)) return "nicho";
  return "site";
}

export const postMotorSchema = z
  .object({
    post_id: txt(40),
    trilho: z.enum(["founder", "empresa"]).optional().catch(undefined),
    rede: txt(20),
    formato: txt(40),
    template: txt(40),
    objetivo: txt(60),
    origem_tema: z.unknown().optional().transform(normalizarOrigemTema),
    enderecamento: enderecamentoIASchema,
    padrao_referencia: z.object({ nome: txt(120), fonte_url: txt(500) }).catch({ nome: "", fonte_url: "" }),
    gancho: txt(400),
    slides_ou_arte: lista(slideSchema, 8),
    legenda: txt(3000),
    hashtags: lista(txt(40), 12),
    chamada_final: txt(300),
    por_que_funciona: txt(600),
    padrao_viral: z
      .object({ nome: txt(120), origem: z.enum(["ao_vivo", "biblioteca"]).catch("biblioteca") })
      .catch({ nome: "", origem: "biblioteca" as const }),
    destaque: txt(120),
    direcao_capa: z
      .object({ cena: txt(900), estilo: z.enum(["fotografia", "ilustracao-3d", "ilustracao-flat"]).catch("fotografia") })
      .catch({ cena: "", estilo: "fotografia" as const }),
    precisa_revisao: lista(txt(200), 6),
  })
  .refine((p) => p.gancho.length > 0, { message: "post sem gancho" });

const cenaSchema = z
  .union([
    z.object({ fala: txt(400), tela: txt(160) }),
    z.string().transform((s) => ({ fala: s.trim().slice(0, 400), tela: "" })),
  ])
  .refine((c) => c.fala.length > 0);

/** Roteiro de vídeo como o modelo mandou. Inválido (sem gancho ou com menos de 2 cenas) é descartado, nunca derruba a análise. */
export const roteiroMotorSchema = z
  .object({
    roteiro_id: txt(40),
    titulo: txt(160),
    rede: txt(20),
    duracao_seg: num,
    gancho: txt(300),
    cenas: lista(cenaSchema, 6),
    chamada_final: txt(300),
    legenda: txt(2200),
    dica_gravacao: txt(300),
    objetivo: txt(60),
    origem_tema: z.unknown().optional().transform(normalizarOrigemTema),
    enderecamento: enderecamentoIASchema,
    padrao_referencia: z.object({ nome: txt(120), fonte_url: txt(500) }).catch({ nome: "", fonte_url: "" }),
    agenda: z.object({ dia: txt(30), horario: txt(30), fonte: txt(80) }).catch({ dia: "", horario: "", fonte: "" }),
    precisa_revisao: lista(txt(200), 6),
  })
  .refine((r) => r.gancho.length > 0 && r.cenas.length >= 2, { message: "roteiro sem gancho ou cenas" });

export const saidaMotorSchema = z.object({
  diagnostico: z
    .object({ problemas: lista(pontoSchema, 3), oportunidades: lista(pontoSchema, 3) })
    .catch({ problemas: [], oportunidades: [] }),
  contexto_inferido: z
    .object({
      nicho: txt(40),
      publico: txt(500),
      tom_resumo: txt(300),
      objetivos: lista(txt(60), 4),
      confianca: z.enum(["alta", "media", "baixa"]).catch("media"),
    })
    .catch({ nicho: "", publico: "", tom_resumo: "", objetivos: [], confianca: "media" }),
  estrategia: z
    .object({
      posicionamento_em_uma_frase: txt(300),
      pilares: lista(z.object({ nome: txt(80), porque: txt(400) }).refine((p) => p.nome.length > 0), 4),
      por_rede: lista(z.object({ rede: txt(20), papel: txt(300) }), 4),
    })
    .catch({ posicionamento_em_uma_frase: "", pilares: [], por_rede: [] }),
  calendario: z
    .object({
      frequencia_semana: lista(z.object({ rede: txt(20), posts: num }), 4),
      slots: lista(z.object({ dia: txt(30), horario: txt(30), rede: txt(20), post_id: txt(40), fonte: txt(80) }), 60),
      comentario_frequencia: txt(400),
    })
    .catch({ frequencia_semana: [], slots: [], comentario_frequencia: "" }),
  posts: lista(postMotorSchema, 12).refine((p) => p.length > 0, { message: "nenhum post válido" }),
  /** Ausente ou inválido vira lista vazia; o motor local completa depois. */
  roteiros: lista(roteiroMotorSchema, 4),
  aprendizados: z
    .object({ funcionou: lista(txt(400), 5), nao_funcionou: lista(txt(400), 5), ajuste: txt(600) })
    .catch({ funcionou: [], nao_funcionou: [], ajuste: "" }),
  o_que_aprendi: txt(800),
  avisos: lista(txt(300), 8),
  /** O que a página pública de cada concorrente informado mostra. Ausente ou inválido vira lista vazia. */
  benchmark_concorrentes: lista(
    z
      .object({ url: txt(500), nome: txt(120), formatos: lista(txt(60), 6), angulos: lista(txt(160), 6), oportunidade: txt(400) })
      .refine((b) => b.url.length > 0),
    3,
  ),
});

export type SaidaMotor = z.infer<typeof saidaMotorSchema>;

// ---------- Resultado intermediário (IA ou motor local com filtros) ----------

export interface SlotMotor {
  /** Índice do post em analise.posts. */
  indice: number;
  dia: number; // 0 = domingo
  horario: string; // HH:mm
  rede: Rede;
  fonte: string;
}

/** Roteiro do modelo já normalizado, antes de ganhar id e data (o id vem da análise final). */
export interface RoteiroMotor extends Omit<RoteiroVideo, "id" | "agenda"> {
  /** Dia (0 = domingo) e horário que o modelo sugeriu; null quando não veio válido. */
  slot: { dia: number; horario: string; fonte: string } | null;
}

export interface ResultadoMotor {
  analise: AnaliseIA;
  extrasPosts: ExtrasPost[];
  extrasAnalise: ExtrasAnalise;
  /** Calendário do modelo, só quando veio coerente; senão null e o calendário é montado pelas janelas. */
  slots: SlotMotor[] | null;
  /** Roteiros de vídeo do modelo. Vazio ou ausente: o motor local monta os seus em analisar. */
  roteiros?: RoteiroMotor[];
  avisos: string[];
}

export interface OpcoesAdaptador {
  brand: BrandProfile;
  palpite: Nicho;
  quantidade: number;
  redes: Rede[];
  preferencias?: Preferencias | null;
  /** Para trocar o nome do padrão pelo id do catálogo quando o modelo citar um padrão da base. */
  padroes?: PadraoViral[];
  /** Dia e horário com dado real do founder ("2|19:00", 0 = domingo). Só neles a fonte pode ser "sua audiência". */
  horariosComDado?: string[];
}

/** "sua audiência" só vale num slot com dado real do founder; sem isso, vira hipótese do nicho. */
export function fonteDoSlot(fonte: string, dia: number, horario: string, comDado: Set<string>, padrao: string): string {
  const f = fonte.trim();
  if (/audi/i.test(f)) return comDado.has(`${dia}|${horario}`) ? "sua audiência" : "hipótese do nicho";
  return f || padrao;
}

// ---------- Legendas por rede ----------

const semHashtags = (s: string) =>
  s
    .split("\n")
    .filter((l) => !/^\s*(#[\p{L}\p{N}_]+\s*)+$/u.test(l))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

function ate(s: string, palavras: number): string {
  const p = s.split(/(\s+)/);
  let n = 0;
  let out = "";
  for (const x of p) {
    if (/\S/.test(x)) n++;
    if (n > palavras) return out.trim().replace(/[,;:]$/, "") + "…";
    out += x;
  }
  return out.trim();
}

/** A rede do post recebe a legenda do modelo; as outras recebem uma adaptação simples. X sempre cabe em 280. */
export function legendasPorRede(rede: Rede, legenda: string, gancho: string, hashtags: string[]): AnaliseIA["posts"][number]["legendas"] {
  const base = legenda || gancho;
  const limpa = semHashtags(base) || gancho;
  const tags = hashtags.slice(0, 5).map((h) => `#${h}`).join(" ");
  const instagram = rede === "instagram" ? base : [limpa, tags].filter(Boolean).join("\n\n");
  const linkedin = rede === "linkedin" ? base : limpa;
  const facebook = rede === "facebook" ? base : ate(limpa, 100);
  let x = rede === "x" ? semHashtags(base) : "";
  if (!x || x.length > 280) {
    x = gancho;
    for (const linha of limpa.split(/\n+/).slice(1)) {
      const prox = `${x}\n\n${linha.trim()}`;
      if (!linha.trim() || prox.length > 270) break;
      x = prox;
    }
  }
  return {
    instagram: corte(instagram, 2200) || gancho,
    linkedin: corte(linkedin, 3000) || gancho,
    x: corte(x, 280) || corte(gancho, 280),
    facebook: corte(facebook, 2200) || gancho,
  };
}

// ---------- Calendário do modelo ----------

const DIAS: Record<string, number> = {
  domingo: 0, dom: 0,
  segunda: 1, seg: 1,
  terca: 2, ter: 2,
  quarta: 3, qua: 3,
  quinta: 4, qui: 4,
  sexta: 5, sex: 5,
  sabado: 6, sab: 6,
};
const DIAS_NOME = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

export function diaDaSemana(s: string): number | null {
  const k = s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/-?feira/, "").trim();
  return DIAS[k] ?? DIAS[k.slice(0, 3)] ?? null;
}

export function horarioValido(s: string): string | null {
  const m = s.match(/(\d{1,2})\s*(?:[:h]\s*(\d{2}))?/i);
  if (m) {
    const h = Number(m[1]);
    const min = Number(m[2] ?? 0);
    if (h <= 23 && min <= 59) return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
  }
  const k = s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (/manha/.test(k)) return "09:00";
  if (/almoco/.test(k)) return "12:00";
  if (/tarde/.test(k)) return "15:00";
  if (/noite/.test(k)) return "19:00";
  return null;
}

/**
 * Slots coerentes: todo slot aponta para um post (pelo post_id ou pela posição, "p2" ou "2"),
 * dia e horário válidos, e todo post do lote tem exatamente um slot. Senão null.
 */
function slotsCoerentes(saida: SaidaMotor, idsPosts: string[], redesPosts: Rede[], comDado: Set<string>): SlotMotor[] | null {
  const total = redesPosts.length;
  const idx = new Map<string, number>();
  idsPosts.forEach((id, i) => {
    if (id && !idx.has(id.toLowerCase())) idx.set(id.toLowerCase(), i);
  });
  const indice = (id: string): number | undefined => {
    const direto = idx.get(id.toLowerCase());
    if (direto !== undefined) return direto;
    const n = id.match(/^\s*(?:p|post[\s_-]*)?(\d{1,2})\s*$/i);
    return n ? Number(n[1]) - 1 : undefined;
  };
  const out: SlotMotor[] = [];
  const cobertos = new Set<number>();
  for (const s of saida.calendario.slots) {
    const i = indice(s.post_id);
    if (i !== undefined && i >= total && i < idsPosts.length) continue; // post cortado pela quantidade
    const dia = diaDaSemana(s.dia);
    const horario = horarioValido(s.horario);
    if (i === undefined || i < 0 || i >= total || dia === null || !horario || cobertos.has(i)) return null;
    cobertos.add(i);
    out.push({ indice: i, dia, horario, rede: normalizarRede(s.rede) ?? redesPosts[i], fonte: fonteDoSlot(s.fonte, dia, horario, comDado, "teste") });
  }
  return cobertos.size === total && total > 0 ? out : null;
}

/** Datas reais para os slots: a partir de amanhã (Brasília), o mesmo dia da semana repetido cai na semana seguinte. */
export function calendarioDosSlots(slots: SlotMotor[], ids: string[], agora = new Date()): CalendarioItem[] {
  const amanha = new Date(hojeEmSaoPaulo(agora).getTime() + 86_400_000);
  const vezes = new Map<number, number>();
  const itens = slots.map((s) => {
    const primeira = (s.dia - amanha.getUTCDay() + 7) % 7;
    const n = vezes.get(s.dia) ?? 0;
    vezes.set(s.dia, n + 1);
    const d = new Date(amanha.getTime() + (primeira + 7 * n) * 86_400_000);
    return {
      data: d.toISOString().slice(0, 10),
      dia_semana: DIAS_NOME[s.dia],
      horario: s.horario,
      rede: s.rede,
      post_id: ids[s.indice],
      fonte: s.fonte,
    };
  });
  return itens.sort((a, b) => (a.data + a.horario).localeCompare(b.data + b.horario));
}

// ---------- Adaptador ----------

const PILARES_RESERVA: [string, string][] = [
  ["Problema do cliente", "Posts que nomeiam a dor que o produto resolve, com exemplos do dia a dia de quem compra."],
  ["Bastidor e opinião", "O que o time aprende construindo a empresa, contado em primeira pessoa e com posição clara."],
  ["Prova e resultado", "Casos, números e relatos reais, só quando existirem e estiverem autorizados."],
];

const DIAG_RESERVA: [string, string][] = [
  ["Ainda não sabemos o que já funcionou com o seu público", "Registre curtidas, comentários e alcance dos posts publicados. O próximo lote aprende com isso."],
  ["Horários ainda são hipótese", "Sem dados da sua audiência, os horários do calendário são pontos de partida para teste. Revise depois de 2 semanas."],
  ["Mais contexto deixa a pauta mais parecida com você", "Adicione o @ das redes e grave 1 minuto contando sobre a empresa."],
];

const texto = (s: string, reserva: string) => (s && s.trim() ? s.trim() : reserva);

/** O que todo post do lote precisa para virar post do app: perfil, redes, endereçamento e padrões conhecidos. */
export interface ContextoPosts {
  perfil: "founder" | "empresa" | "ambos";
  redes: Rede[];
  ctxEnd: ContextoEnderecamento;
  padraoPorNome: Map<string, string>;
}

export function contextoDosPosts(op: OpcoesAdaptador, publicoInferido = ""): ContextoPosts {
  const pref = op.preferencias ?? null;
  const padraoPorNome = new Map<string, string>();
  for (const p of op.padroes ?? []) {
    padraoPorNome.set(p.nome.toLowerCase(), p.id);
    padraoPorNome.set(p.id.toLowerCase(), p.id);
  }
  return {
    perfil: pref?.perfil_alvo ?? "empresa",
    redes: op.redes.length ? op.redes : ["linkedin", "instagram"],
    // Endereçamento: o que o modelo não mandou é completado (rodízio de objetivos, público da preferência ou do
    // contexto inferido, gatilho do gancho) e o post vai para revisão.
    ctxEnd: {
      objetivos: objetivosDoRodizio(pref),
      publico: pref?.publico_alvo?.trim() || publicoInferido || publicoAlvoDoSite(op.brand),
      gatilho: "gancho",
      marca: op.brand.nome || undefined,
      marcarRevisao: true,
    },
    padraoPorNome,
  };
}

type PostMotor = z.output<typeof postMotorSchema>;

const palavraNormal = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

/** O destaque só vale se for um trecho seguido do título da capa, de 1 a 6 palavras. Senão, sai vazio. */
export function destaqueValido(destaque: string, titulo: string): string {
  const alvo = destaque.split(/\s+/).map(palavraNormal).filter(Boolean);
  const palavras = titulo.split(/\s+/).map(palavraNormal);
  if (!alvo.length || alvo.length > 6) return "";
  for (let i = 0; i + alvo.length <= palavras.length; i++) {
    if (alvo.every((a, k) => palavras[i + k] === a)) return destaque.trim();
  }
  return "";
}

/**
 * Um post do modelo no formato do app, mais os extras do motor. `trilhosAntes` são os trilhos dos posts anteriores
 * do lote: no perfil "ambos", o post sem trilho vai para o lado com menos posts até aqui.
 */
export function postDoMotor(
  p: PostMotor,
  i: number,
  trilhosAntes: ("founder" | "empresa")[],
  c: ContextoPosts,
): { post: AnaliseIA["posts"][number]; extras: ExtrasPost } {
  const rede = normalizarRede(p.rede) ?? c.redes[i % c.redes.length];
  const fm = normalizarFormatoMotor(p.formato) ?? (p.slides_ou_arte.length > 1 ? "carrossel" : "estatico");
  const tpl = TEMPLATES.includes(p.template as TemplateId) ? (p.template as TemplateId) : null;
  const { formato, template } = formatoDoApp(fm, tpl);
  const gancho = corte(p.gancho, 220);
  const slides = p.slides_ou_arte.length ? p.slides_ou_arte : [{ titulo: gancho, texto: "" }];
  const hashtags = p.hashtags.map((h) => h.replace(/^#/, "").replace(/\s+/g, "")).filter(Boolean);
  const nomePadrao = p.padrao_referencia.nome;
  const revisar = [...p.precisa_revisao];
  const todoTexto = [p.gancho, p.legenda, ...slides.flatMap((s) => [s.titulo, s.texto])].join(" ");
  if (/\[PREENCHER/i.test(todoTexto) && !revisar.length) revisar.push("Há um [PREENCHER] no texto: complete antes de publicar.");
  const nFounder = trilhosAntes.filter((t) => t === "founder").length;
  const trilho = c.perfil === "ambos" ? (p.trilho ?? (nFounder <= i - nFounder ? "founder" : "empresa")) : c.perfil;
  const { enderecamento, completou } = completarEnderecamento(
    p.enderecamento,
    { gancho, slides, legenda: p.legenda, chamada_final: p.chamada_final, objetivo: p.objetivo },
    i,
    c.ctxEnd,
  );
  if (completou && !revisar.includes(REVISAR_PUBLICO)) revisar.push(REVISAR_PUBLICO);
  return {
    post: {
      rede_principal: rede,
      formato,
      template,
      gancho,
      slides: slides.slice(0, 8),
      legendas: legendasPorRede(rede, p.legenda, gancho, hashtags),
      hashtags,
      padrao_inspirador: corte(c.padraoPorNome.get(nomePadrao.toLowerCase()) ?? nomePadrao, 80),
      por_que: corte(p.por_que_funciona, 400),
    },
    extras: {
      trilho,
      objetivo: p.objetivo || enderecamento.objetivo,
      enderecamento,
      formato_motor: fm,
      origem_tema: p.origem_tema,
      padrao_referencia: nomePadrao || p.padrao_referencia.fonte_url ? { nome: nomePadrao, fonte_url: p.padrao_referencia.fonte_url } : undefined,
      chamada_final: p.chamada_final || undefined,
      precisa_revisao: revisar,
      ...(p.padrao_viral.nome ? { padrao_viral: p.padrao_viral } : {}),
      ...(destaqueValido(p.destaque, slides[0]?.titulo || gancho) ? { destaque: p.destaque.trim() } : {}),
      ...(p.direcao_capa.cena ? { direcao_capa: p.direcao_capa } : {}),
    },
  };
}

/** Converte a saída do modelo no formato AnaliseIA (validável por analiseIASchema) mais os extras do motor. */
export function saidaParaAnaliseIA(saidaBruta: SaidaMotor, op: OpcoesAdaptador): ResultadoMotor {
  const saida = semTravessao(saidaBruta);
  const pref = op.preferencias ?? null;
  const c = contextoDosPosts(op, saida.contexto_inferido.publico);
  const posts = saida.posts.slice(0, op.quantidade);
  const extrasPosts: ExtrasPost[] = [];
  const analisePosts: AnaliseIA["posts"] = posts.map((p, i) => {
    const r = postDoMotor(p, i, extrasPosts.map((e) => e.trilho ?? "empresa"), c);
    extrasPosts.push(r.extras);
    return r.post;
  });

  const nicho = nichoDoMotor(saida.contexto_inferido.nicho) ?? op.palpite;

  const pilares = saida.estrategia.pilares.map((p) => ({ nome: corte(p.nome, 60), descricao: corte(texto(p.porque, p.nome), 300) }));
  for (const [nome, descricao] of PILARES_RESERVA) {
    if (pilares.length >= 3) break;
    if (!pilares.some((p) => p.nome.toLowerCase() === nome.toLowerCase())) pilares.push({ nome, descricao });
  }

  const diagnostico = [...saida.diagnostico.problemas, ...saida.diagnostico.oportunidades]
    .slice(0, 5)
    .map((d) => ({ titulo: corte(d.ponto, 120), texto: corte(texto(d.evidencia, d.ponto), 600) }));
  for (const [titulo, t] of DIAG_RESERVA) {
    if (diagnostico.length >= 3) break;
    diagnostico.push({ titulo, texto: t });
  }

  // Estratégia por rede: frequência do calendário do modelo e papel de cada rede.
  const papel = new Map<Rede, string>();
  for (const r of saida.estrategia.por_rede) {
    const rr = normalizarRede(r.rede);
    if (rr && r.papel) papel.set(rr, r.papel);
  }
  const freq = new Map<Rede, number>();
  for (const f of saida.calendario.frequencia_semana) {
    const rr = normalizarRede(f.rede);
    if (rr) freq.set(rr, Math.min(14, Math.max(0, Math.round(f.posts))));
  }
  if (!freq.size) {
    const redesUsadas = [...new Set(analisePosts.map((p) => p.rede_principal))];
    const total = postsPorSemana(pref?.frequencia_escolhida) ?? redesUsadas.length * 3;
    for (const [r, n] of distribuirFrequencia(redesUsadas, total)) freq.set(r, n);
  }
  const estrategia = [...freq.entries()]
    .slice(0, 4)
    .map(([rede, n]) => ({ rede, frequencia_semanal: n, foco: corte(papel.get(rede) ?? "Rede do plano: posts do calendário abaixo, com horários para testar.", 300) }));

  const ci = saida.contexto_inferido;
  const posicionamento = texto(saida.estrategia.posicionamento_em_uma_frase, op.brand.headings.h1[0] || op.brand.description || op.brand.nome);
  const analise: AnaliseIA = {
    nicho,
    resumo_negocio: corte(texto([posicionamento, ci.publico && `Público: ${ci.publico}`].filter(Boolean).join(" "), op.brand.nome), 600),
    publico: corte(texto(ci.publico, "Público a confirmar com o founder."), 500),
    tom_de_voz: corte(texto(ci.tom_resumo, "Tom a confirmar com o founder."), 300),
    posicionamento: corte(posicionamento, 240),
    pilares: pilares.slice(0, 4),
    diagnostico,
    estrategia,
    posts: analisePosts,
  };

  const comDado = new Set(op.horariosComDado ?? []);
  const slots = slotsCoerentes(saida, saida.posts.map((p) => p.post_id), analisePosts.map((p) => p.rede_principal), comDado);
  const roteiros = roteirosDoModelo(saida, c.redes, c.ctxEnd, comDado).slice(0, quantosRoteiros(op.quantidade));
  const ap = saida.aprendizados;
  const aprendizados = ap.funcionou.length || ap.nao_funcionou.length || ap.ajuste ? ap : undefined;
  // Só concorrentes que o founder informou, sem número nem frase de desempenho.
  const benchmark = limparBenchmark(saida.benchmark_concorrentes, pref?.concorrentes ?? []);

  return {
    analise,
    extrasPosts,
    extrasAnalise: {
      contexto_inferido: { nicho: ci.nicho || nicho, publico: ci.publico, tom_resumo: ci.tom_resumo, objetivos: ci.objetivos, confianca: ci.confianca },
      por_rede: saida.estrategia.por_rede.filter((r) => r.rede && r.papel),
      comentario_frequencia: saida.calendario.comentario_frequencia || undefined,
      o_que_aprendi: saida.o_que_aprendi || undefined,
      perfil_alvo: c.perfil,
      ...(aprendizados ? { aprendizados } : {}),
      ...(benchmark.length ? { benchmark_concorrentes: benchmark } : {}),
    },
    slots,
    roteiros,
    avisos: saida.avisos.filter(Boolean),
  };
}

function roteirosDoModelo(saida: SaidaMotor, redes: Rede[], ctxEnd: ContextoEnderecamento, comDado: Set<string>): RoteiroMotor[] {
  const redesVideo = redesDeVideo(redes);
  return saida.roteiros.map((r, i) => {
    const gancho = corte(r.gancho, 220);
    const cenas = r.cenas.map((c) => (c.tela ? { fala: c.fala, tela: c.tela } : { fala: c.fala }));
    const legendaBase = r.legenda || [gancho, ...cenas.map((c) => c.fala), r.chamada_final].filter(Boolean).join("\n\n");
    const { enderecamento, completou } = completarEnderecamento(
      r.enderecamento,
      { gancho, slides: cenas.map((c) => ({ titulo: c.tela ?? "", texto: c.fala })), legenda: legendaBase, chamada_final: r.chamada_final, objetivo: r.objetivo },
      i,
      ctxEnd,
    );
    const chamada = r.chamada_final || `${enderecamento.acao_esperada.replace(/[.!]+$/, "")}.`;
    const revisar = [...r.precisa_revisao];
    const todoTexto = [gancho, legendaBase, chamada, ...cenas.flatMap((c) => [c.fala, c.tela ?? ""])].join(" ");
    if (/\[PREENCHER/i.test(todoTexto) && !revisar.length) revisar.push("Há um [PREENCHER] no roteiro: complete antes de gravar.");
    if (completou && !revisar.includes(REVISAR_PUBLICO)) revisar.push(REVISAR_PUBLICO);
    const dia = diaDaSemana(r.agenda.dia);
    const horario = horarioValido(r.agenda.horario);
    const duracao = r.duracao_seg >= 15 && r.duracao_seg <= 90 ? Math.round(r.duracao_seg) : duracaoDoRoteiro({ gancho, cenas, chamada_final: chamada });
    const nomePadrao = r.padrao_referencia.nome;
    return {
      titulo: corte(r.titulo || gancho, 140),
      rede: normalizarRedeVideo(r.rede) ?? redesVideo[i % redesVideo.length],
      duracao_seg: duracao,
      gancho,
      cenas,
      chamada_final: corte(chamada, 300),
      legenda: corte(legendaBase, 2200),
      ...(r.dica_gravacao ? { dica_gravacao: r.dica_gravacao } : {}),
      origem_tema: r.origem_tema,
      enderecamento,
      ...(nomePadrao || r.padrao_referencia.fonte_url
        ? { padrao_referencia: { nome: nomePadrao, fonte_url: r.padrao_referencia.fonte_url } }
        : {}),
      precisa_revisao: revisar,
      slot: dia !== null && horario ? { dia, horario, fonte: fonteDoSlot(r.agenda.fonte, dia, horario, comDado, FONTE_HIPOTESE) } : null,
    };
  });
}

/**
 * Roteiros do modelo com id `${analise.id}-v{n}` e data real: o dia da semana que o modelo pediu cai na
 * próxima ocorrência a partir de amanhã (como calendarioDosSlots); sem dia válido, vai para um dia livre.
 */
export function roteirosFinais(roteiros: RoteiroMotor[], analiseId: string, calendario: Pick<CalendarioItem, "data">[], agora = new Date()): RoteiroVideo[] {
  const vezes = new Map<number, number>();
  const comData = roteiros.map(({ slot, ...r }, i) => {
    const id = `${analiseId}-v${i + 1}`;
    if (!slot) return { ...r, id, agenda: undefined };
    const n = vezes.get(slot.dia) ?? 0;
    vezes.set(slot.dia, n + 1);
    const data = proximaDataDoDia(slot.dia, agora, n);
    return { ...r, id, agenda: { data, dia_semana: DIAS_NOME[slot.dia], horario: slot.horario, fonte: slot.fonte } };
  });
  const ocupados = [...calendario, ...comData.flatMap((r) => (r.agenda ? [{ data: r.agenda.data }] : []))];
  const semData = agendarRoteiros(comData.filter((r) => !r.agenda), ocupados, agora);
  let j = 0;
  return comData.map((r) => (r.agenda ? (r as RoteiroVideo) : semData[j++]));
}

/** Junta os extras na análise já finalizada (ids prontos) e usa o calendário do modelo quando ele veio coerente. */
export function aplicarExtras(analise: Analise, r: ResultadoMotor, agora = new Date()): Analise {
  const extrasPosts = semTravessao(r.extrasPosts);
  const extrasAnalise = semTravessao(r.extrasAnalise);
  const posts = analise.posts.map((p, i) => ({ ...p, ...(extrasPosts[i] ?? {}) }));
  const slots = r.slots?.filter((s) => s.indice < posts.length) ?? null;
  const calendario = slots && slots.length === posts.length ? calendarioDosSlots(slots, posts.map((p) => p.id), agora) : analise.calendario;
  const roteiros = r.roteiros?.length ? semTravessao(roteirosFinais(r.roteiros, analise.id, calendario, agora)) : undefined;
  return {
    ...analise,
    ...extrasAnalise,
    posts,
    calendario,
    ...(roteiros ? { roteiros } : {}),
    avisos: [...analise.avisos, ...semTravessao(r.avisos)],
  };
}
