// Saída do motor novo (Parte 3 de PROMPT_MOTOR_POSTS.md): schema tolerante e adaptador para o formato
// que o painel e o renderizador já entendem (AnaliseIA + extras).
import { z } from "zod";
import type { Analise, BrandProfile, CalendarioItem, Nicho, PadraoViral, Rede, TemplateId } from "@/lib/types";
import { enderecamentoIASchema, TEMPLATES, semTravessao, type AnaliseIA } from "@/lib/engine/schema";
import { hojeEmSaoPaulo } from "@/lib/engine/calendario";
import { corte } from "@/lib/engine/texto-local";
import type { ExtrasAnalise, ExtrasPost, Preferencias } from "./contrato";
import { completarEnderecamento, objetivosDoRodizio, publicoAlvoDoSite, REVISAR_PUBLICO, type ContextoEnderecamento } from "./enderecamento";
import {
  distribuirFrequencia,
  formatoDoApp,
  nichoDoMotor,
  normalizarFormatoMotor,
  normalizarRede,
  postsPorSemana,
} from "./mapa";

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

export const postMotorSchema = z
  .object({
    post_id: txt(40),
    trilho: z.enum(["founder", "empresa"]).optional().catch(undefined),
    rede: txt(20),
    formato: txt(40),
    template: txt(40),
    objetivo: txt(60),
    enderecamento: enderecamentoIASchema,
    padrao_referencia: z.object({ nome: txt(120), fonte_url: txt(500) }).catch({ nome: "", fonte_url: "" }),
    gancho: txt(400),
    slides_ou_arte: lista(slideSchema, 8),
    legenda: txt(3000),
    hashtags: lista(txt(40), 12),
    chamada_final: txt(300),
    por_que_funciona: txt(600),
    precisa_revisao: lista(txt(200), 6),
  })
  .refine((p) => p.gancho.length > 0, { message: "post sem gancho" });

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
  o_que_aprendi: txt(800),
  avisos: lista(txt(300), 8),
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

export interface ResultadoMotor {
  analise: AnaliseIA;
  extrasPosts: ExtrasPost[];
  extrasAnalise: ExtrasAnalise;
  /** Calendário do modelo, só quando veio coerente; senão null e o calendário é montado pelas janelas. */
  slots: SlotMotor[] | null;
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

function diaDaSemana(s: string): number | null {
  const k = s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/-?feira/, "").trim();
  return DIAS[k] ?? DIAS[k.slice(0, 3)] ?? null;
}

function horarioValido(s: string): string | null {
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
function slotsCoerentes(saida: SaidaMotor, idsPosts: string[], redesPosts: Rede[]): SlotMotor[] | null {
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
    out.push({ indice: i, dia, horario, rede: normalizarRede(s.rede) ?? redesPosts[i], fonte: s.fonte || "teste" });
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

/** Converte a saída do modelo no formato AnaliseIA (validável por analiseIASchema) mais os extras do motor. */
export function saidaParaAnaliseIA(saidaBruta: SaidaMotor, op: OpcoesAdaptador): ResultadoMotor {
  const saida = semTravessao(saidaBruta);
  const pref = op.preferencias ?? null;
  const perfil = pref?.perfil_alvo ?? "empresa";
  const redes = op.redes.length ? op.redes : (["linkedin", "instagram"] as Rede[]);
  const padraoPorNome = new Map<string, string>();
  for (const p of op.padroes ?? []) {
    padraoPorNome.set(p.nome.toLowerCase(), p.id);
    padraoPorNome.set(p.id.toLowerCase(), p.id);
  }

  const posts = saida.posts.slice(0, op.quantidade);
  const extrasPosts: ExtrasPost[] = [];
  // Endereçamento: o que o modelo não mandou é completado aqui (rodízio de objetivos, público da
  // preferência ou do contexto inferido, gatilho do gancho) e o post vai para revisão.
  const ctxEnd: ContextoEnderecamento = {
    objetivos: objetivosDoRodizio(pref),
    publico: pref?.publico_alvo?.trim() || saida.contexto_inferido.publico || publicoAlvoDoSite(op.brand),
    gatilho: "gancho",
    marca: op.brand.nome || undefined,
    marcarRevisao: true,
  };
  const analisePosts: AnaliseIA["posts"] = posts.map((p, i) => {
    const rede = normalizarRede(p.rede) ?? redes[i % redes.length];
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
    // "ambos": sem trilho informado, o post vai para o trilho com menos posts até aqui.
    const nFounder = extrasPosts.filter((e) => e.trilho === "founder").length;
    const trilho = perfil === "ambos" ? (p.trilho ?? (nFounder <= i - nFounder ? "founder" : "empresa")) : perfil;
    const { enderecamento, completou } = completarEnderecamento(
      p.enderecamento,
      { gancho, slides, legenda: p.legenda, chamada_final: p.chamada_final, objetivo: p.objetivo },
      i,
      ctxEnd,
    );
    if (completou && !revisar.includes(REVISAR_PUBLICO)) revisar.push(REVISAR_PUBLICO);
    extrasPosts.push({
      trilho,
      objetivo: p.objetivo || enderecamento.objetivo,
      enderecamento,
      formato_motor: fm,
      padrao_referencia: nomePadrao || p.padrao_referencia.fonte_url ? { nome: nomePadrao, fonte_url: p.padrao_referencia.fonte_url } : undefined,
      chamada_final: p.chamada_final || undefined,
      precisa_revisao: revisar,
    });
    return {
      rede_principal: rede,
      formato,
      template,
      gancho,
      slides: slides.slice(0, 8),
      legendas: legendasPorRede(rede, p.legenda, gancho, hashtags),
      hashtags,
      padrao_inspirador: corte(padraoPorNome.get(nomePadrao.toLowerCase()) ?? nomePadrao, 80),
      por_que: corte(p.por_que_funciona, 400),
    };
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

  const slots = slotsCoerentes(saida, saida.posts.map((p) => p.post_id), analisePosts.map((p) => p.rede_principal));

  return {
    analise,
    extrasPosts,
    extrasAnalise: {
      contexto_inferido: { nicho: ci.nicho || nicho, publico: ci.publico, tom_resumo: ci.tom_resumo, objetivos: ci.objetivos, confianca: ci.confianca },
      por_rede: saida.estrategia.por_rede.filter((r) => r.rede && r.papel),
      comentario_frequencia: saida.calendario.comentario_frequencia || undefined,
      o_que_aprendi: saida.o_que_aprendi || undefined,
      perfil_alvo: perfil,
    },
    slots,
    avisos: saida.avisos.filter(Boolean),
  };
}

/** Junta os extras na análise já finalizada (ids prontos) e usa o calendário do modelo quando ele veio coerente. */
export function aplicarExtras(analise: Analise, r: ResultadoMotor, agora = new Date()): Analise {
  const extrasPosts = semTravessao(r.extrasPosts);
  const extrasAnalise = semTravessao(r.extrasAnalise);
  const posts = analise.posts.map((p, i) => ({ ...p, ...(extrasPosts[i] ?? {}) }));
  const slots = r.slots?.filter((s) => s.indice < posts.length) ?? null;
  return {
    ...analise,
    ...extrasAnalise,
    posts,
    calendario: slots && slots.length === posts.length ? calendarioDosSlots(slots, posts.map((p) => p.id), agora) : analise.calendario,
    avisos: [...analise.avisos, ...semTravessao(r.avisos)],
  };
}
