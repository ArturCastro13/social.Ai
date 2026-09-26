// Motor local (sem IA) para "O que só você sabe": cada resposta do founder vira um post, de forma
// determinística. Nada é inventado: o texto do post é a resposta do founder mais frases neutras de ligação.
// - problema do cliente: carrossel quando o texto tem 3 frases ou mais (uma por slide); senão imagem única
//   com gancho de erro comum. Objetivo gerar_clientes.
// - objeção do cliente: gancho de pergunta, print de tweet, objetivo gerar_clientes
// - diferencial: antes e depois quando há problema contado ("antes" = o problema, "depois" = o diferencial);
//   sem problema, imagem única com a frase do diferencial. Objetivo gerar_clientes. Nunca cita concorrente.
// - crença contrária (versão anterior da tela): gancho contraintuitivo, citação, objetivo autoridade_founder
// - história (versão anterior da tela): bastidor do founder, objetivo autoridade_founder
import type { Formato, PadraoViral, Rede, TemplateId, TipoGancho, ViralItem } from "@/lib/types";
import type { AnaliseIA } from "@/lib/engine/schema";
import { corte, maiuscula, paraHashtag } from "@/lib/engine/texto-local";
import { construirCatalogo } from "@/lib/virais/catalogo";
import { itensDoArquivo } from "@/lib/virais";
import { conhecimentoPreenchido, type ConhecimentoFounder, type ExtrasPost, type ObjetivoId, type Preferencias } from "./contrato";
import { MOTOR_DO_FORMATO } from "./mapa";

type PostIA = AnaliseIA["posts"][number];

export interface PostFounder {
  post: PostIA;
  extras: ExtrasPost;
}

export interface OpcoesFounder {
  perfil_alvo: Preferencias["perfil_alvo"];
  /** Público-alvo em uma frase (preferência ou inferido do site). */
  publico: string;
  /** Redes do plano; o post vai para a primeira que combina com o formato. */
  redes: Rede[];
  /** Hashtags da análise (as do motor local ou da demo). Só as válidas, em minúsculas e sem acento, são usadas. */
  hashtags?: string[];
  /** Nome do founder, para assinar a citação. */
  nomeFounder?: string;
  marca: string;
}

// ---------- Catálogo ----------

let catalogoCache: { padroes: Map<string, PadraoViral>; itens: Map<string, ViralItem> } | null = null;

function catalogo() {
  if (!catalogoCache) {
    const itens = itensDoArquivo();
    catalogoCache = {
      padroes: new Map(construirCatalogo(itens).map((p) => [p.id, p])),
      itens: new Map(itens.map((i) => [i.id, i])),
    };
  }
  return catalogoCache;
}

/**
 * Nome do padrão e link da fonte do primeiro exemplo verificado, pela base curada do repositório.
 * undefined quando o id não existe no catálogo.
 */
export function referenciaDoPadrao(id: string | undefined): { nome: string; fonte_url: string } | undefined {
  if (!id) return undefined;
  const { padroes, itens } = catalogo();
  const p = padroes.get(id);
  if (!p) return undefined;
  const verificado = p.exemplos.map((e) => itens.get(e)).find((i) => i?.status === "verificado" && i.link_fonte);
  return { nome: p.nome, fonte_url: verificado?.link_fonte ?? "" };
}

/** Primeiro id que existe no catálogo, na ordem de preferência. */
function padraoExistente(ids: string[]): PadraoViral | null {
  const { padroes } = catalogo();
  for (const id of ids) {
    const p = padroes.get(id);
    if (p) return p;
  }
  return null;
}

// ---------- Texto ----------

/** Resposta do founder em uma linha só (quebras viram espaço), sem travessão. */
const linha = (s: string) =>
  s
    .replace(/\s*[—–]\s*/g, ", ")
    .replace(/\s+/g, " ")
    .trim();
const semPonto = (s: string) => s.replace(/[.!;:,…]+$/, "").trim();
const comPonto = (s: string) => (/[.!?…]$/.test(s) ? s : `${s}.`);

interface Voz {
  eu: boolean;
}
/** Primeira pessoa do singular (founder) ou "a gente" (empresa). */
const v = (voz: Voz, eu: string, nos: string) => (voz.eu ? eu : nos);

const REDES_DO_FORMATO: Record<Formato, Rede[]> = {
  "print-tweet": ["x", "linkedin", "instagram", "facebook"],
  citacao: ["linkedin", "instagram", "facebook", "x"],
  "bastidor-founder": ["linkedin", "instagram", "facebook", "x"],
  carrossel: ["instagram", "linkedin", "facebook", "x"],
  lista: ["instagram", "linkedin", "facebook", "x"],
  "imagem-unica": ["instagram", "facebook", "linkedin", "x"],
  "antes-depois": ["instagram", "facebook", "linkedin", "x"],
  "dado-impacto": ["linkedin", "instagram", "facebook", "x"],
};

interface Rascunho {
  chave: keyof ConhecimentoFounder;
  formato: Formato;
  template: TemplateId;
  tipo: TipoGancho;
  padroes: string[];
  objetivo: ObjetivoId;
  gancho: string;
  slides: { titulo: string; texto: string }[];
  /** 2 a 5 linhas curtas do miolo da legenda. */
  corpo: string[];
  ctaInstagram: string;
  ctaLinkedin: string;
  gatilho: string;
  acao: string;
  motivo: string;
  revisar: string[];
}

function legendas(r: Rascunho, tags: string[]): PostIA["legendas"] {
  const hashtags = (n: number) => tags.slice(0, n).map((t) => `#${t}`).join(" ");
  const instagram = [r.gancho, "", ...r.corpo, "", r.ctaInstagram, "", hashtags(5)].join("\n").trim();
  const facebook = [r.gancho, "", ...r.corpo, "", r.ctaInstagram].join("\n").trim();
  const linkedin = [r.gancho, "", r.corpo.join("\n\n"), "", r.ctaLinkedin, "", hashtags(3)].join("\n").trim();
  let x = r.gancho;
  for (const l of r.corpo) {
    const prox = `${x}\n\n${l}`;
    if (prox.length > 260) break;
    x = prox;
  }
  return { instagram, linkedin, x: corte(x, 260), facebook };
}

function objecao(texto: string, voz: Voz): Rascunho {
  const t = linha(texto);
  const ehPergunta = /\?$/.test(t) && t.length <= 200;
  const cabeNoGancho = t.length <= 150;
  const maisOuvida = `É a dúvida que ${v(voz, "eu mais ouço", "a gente mais ouve")} de cliente.`;
  const gancho = ehPergunta ? t : cabeNoGancho ? `"${semPonto(t)}". ${maisOuvida}` : `A dúvida que ${v(voz, "eu mais ouço", "a gente mais ouve")} de cliente:`;
  // O que o gancho já disse não se repete no miolo.
  const corpo = [
    ...(ehPergunta ? [maisOuvida] : cabeNoGancho ? [] : [corte(comPonto(t), 300)]),
    "Se ela também passa pela sua cabeça, você não é o único.",
    "Vale uma conversa franca antes de decidir.",
  ];
  return {
    chave: "objecao_cliente",
    formato: "print-tweet",
    template: "print-x",
    tipo: "pergunta",
    padroes: ["print-tweet--pergunta", "print-tweet--erro-comum", "imagem-unica--pergunta", "imagem-unica--erro-comum"],
    objetivo: "gerar_clientes",
    gancho,
    slides: [{ titulo: "", texto: corte(comPonto(t), 260) }],
    corpo,
    ctaInstagram: "Manda a sua dúvida nos comentários ou no direct.",
    ctaLinkedin: "Essa dúvida também aparece aí? Conta nos comentários.",
    gatilho: corte(semPonto(t), 160),
    acao: "Mandar a dúvida nos comentários ou pedir uma conversa",
    motivo: "a dúvida real que o cliente traz vira a primeira linha, e quem tem a mesma dúvida se reconhece antes de rolar a tela.",
    revisar: ["Acrescente a sua resposta para essa dúvida antes de publicar."],
  };
}

/** Frases do texto (ponto, exclamação ou interrogação seguidos de espaço), sem as vazias. */
const frasesDoTexto = (t: string) =>
  t
    .split(/(?<=[.!?…])\s+/)
    .map((f) => f.trim())
    .filter(Boolean);

const FECHO_PROBLEMA = "Se isso é o seu dia a dia, você não é o único.";

function problema(texto: string, voz: Voz): Rascunho {
  const t = linha(texto);
  const frases = frasesDoTexto(t);
  // Carrossel só com o que o founder escreveu: 3 a 6 frases de tamanho de slide, uma por slide.
  const carrossel = frases.length >= 3 && frases.length <= 6 && frases.every((f) => f.length <= 220 && f.split(/\s+/).length >= 3);
  const resolve = v(voz, "eu resolvo", "a gente resolve");
  const cabeNoGancho = t.length <= 140 && frases.length === 1;
  const gancho = cabeNoGancho ? `${maiuscula(semPonto(t))}. Isso é a sua rotina?` : `O problema que ${resolve}, do jeito que ele acontece.`;
  const comum = {
    chave: "problema_cliente" as const,
    tipo: "erro-comum" as const,
    objetivo: "gerar_clientes" as const,
    gancho,
    ctaInstagram: "Se isso é a sua rotina, comenta aqui ou manda no direct.",
    ctaLinkedin: "Isso acontece aí também? Conta nos comentários.",
    gatilho: corte(semPonto(t), 160),
    acao: "Comentar se vive esse problema ou pedir uma conversa",
    motivo: "descrever o problema do jeito que o cliente vive faz quem passa por ele se reconhecer na primeira linha.",
    revisar: [] as string[],
  };
  if (carrossel) {
    return {
      ...comum,
      formato: "carrossel",
      template: "capa-gancho",
      padroes: ["carrossel--erro-comum", "carrossel--pergunta", "imagem-unica--erro-comum"],
      slides: [
        { titulo: `O problema que ${resolve}`, texto: "Do jeito que ele acontece." },
        ...frases.map((f, i) => ({ titulo: String(i + 1), texto: corte(comPonto(f), 220) })),
        { titulo: "Salva para lembrar", texto: "E manda para quem vive o mesmo problema." },
      ],
      corpo: [...frases.slice(0, 3).map((f) => corte(comPonto(f), 200)), FECHO_PROBLEMA].slice(0, 4),
    };
  }
  return {
    ...comum,
    formato: "imagem-unica",
    template: "citacao",
    padroes: ["imagem-unica--erro-comum", "imagem-unica--pergunta", "carrossel--erro-comum"],
    slides: [{ titulo: v(voz, "O problema que eu resolvo", "O problema que a gente resolve"), texto: corte(comPonto(t), 160) }],
    corpo: [...(cabeNoGancho ? [] : [corte(comPonto(t), 300)]), FECHO_PROBLEMA, "Vale conversar sobre isso."],
  };
}

function diferencial(texto: string, voz: Voz, problemaDoCliente?: string): Rascunho {
  const t = linha(texto);
  const antes = problemaDoCliente ? linha(problemaDoCliente) : "";
  const comum = {
    chave: "diferencial" as const,
    objetivo: "gerar_clientes" as const,
    gancho: "Por que o cliente escolhe a gente e não outra opção.",
    ctaInstagram: "Quer ver a diferença na prática? Chama no direct.",
    ctaLinkedin: v(voz, "Faz sentido para você? Me chama para conversar.", "Faz sentido para você? Chama a gente para conversar."),
    gatilho: corte(semPonto(antes || t), 160),
    acao: "Pedir uma conversa para ver a diferença na prática",
    revisar: [] as string[],
  };
  if (antes) {
    // Antes = o problema com as palavras do founder; depois = o diferencial. Sem nome de concorrente.
    return {
      ...comum,
      formato: "antes-depois",
      template: "antes-depois",
      tipo: "contraintuitivo",
      padroes: ["antes-depois--contraintuitivo", "antes-depois--prova-social", "antes-depois--historia-pessoal"],
      slides: [
        { titulo: "Antes", texto: corte(comPonto(antes), 110) },
        { titulo: "Depois", texto: corte(comPonto(t), 110) },
      ],
      corpo: [`Antes: ${corte(comPonto(antes), 200)}`, `Com a gente: ${corte(comPonto(t), 240)}`],
      motivo: "o contraste entre o problema e o jeito da empresa mostra a diferença sem precisar falar de ninguém.",
    };
  }
  return {
    ...comum,
    formato: "imagem-unica",
    template: "citacao",
    tipo: "promessa",
    padroes: ["imagem-unica--promessa", "imagem-unica--prova-social", "citacao--curiosidade"],
    slides: [{ titulo: v(voz, "Por que me escolhem", "Por que escolhem a gente"), texto: corte(comPonto(t), 160) }],
    corpo: [corte(comPonto(t), 300), "É isso que o cliente leva quando escolhe a gente."],
    motivo: "dizer em uma frase por que o cliente escolhe a empresa ajuda quem está comparando opções a decidir.",
  };
}

function crenca(texto: string, voz: Voz, assinatura: string): Rascunho {
  const t = linha(texto);
  return {
    chave: "crenca_contraria",
    formato: "citacao",
    template: "citacao",
    tipo: "contraintuitivo",
    padroes: ["citacao--contraintuitivo", "print-tweet--contraintuitivo", "imagem-unica--polemica"],
    objetivo: "autoridade_founder",
    gancho: `O mercado acredita numa coisa que ${v(voz, "eu acho errada", "a gente acha errada")}.`,
    slides: [{ titulo: assinatura, texto: corte(comPonto(t), 160) }],
    corpo: [corte(comPonto(t), 300), `Pode discordar: é a ${v(voz, "minha", "nossa")} leitura do mercado, dita sem rodeio.`],
    ctaInstagram: "Concorda ou discorda? Comenta aqui.",
    ctaLinkedin: "Você concorda ou discorda? Quero ler a sua opinião nos comentários.",
    gatilho: corte(semPonto(t), 160),
    acao: v(voz, "Seguir o founder e comentar se concorda ou discorda", "Seguir a marca e comentar se concorda ou discorda"),
    motivo: "contrariar uma crença do mercado faz quem pensa igual parar e quem pensa diferente comentar.",
    revisar: [],
  };
}

function historia(texto: string, voz: Voz): Rascunho {
  const t = linha(texto);
  return {
    chave: "historia",
    formato: "bastidor-founder",
    template: "bastidor",
    tipo: "historia-pessoal",
    padroes: ["bastidor-founder--historia-pessoal", "carrossel--historia-pessoal"],
    objetivo: "autoridade_founder",
    gancho: `Teve um momento que mudou como ${v(voz, "eu enxergo", "a gente enxerga")} esse problema.`,
    // Template bastidor: título em primeira pessoa com até 12 palavras, relato de até 200 caracteres.
    slides: [{ titulo: v(voz, "O dia em que mudei como vejo o problema", "O dia em que mudamos como vemos o problema"), texto: corte(comPonto(t), 200) }],
    corpo: [corte(comPonto(t), 400), `Desde então, ${v(voz, "eu olho", "a gente olha")} para isso de outro jeito.`],
    ctaInstagram: "Já viveu algo parecido? Conta aqui.",
    ctaLinkedin: "Você já passou por algo parecido? Conta nos comentários.",
    gatilho: corte(semPonto(t), 160),
    acao: v(voz, "Seguir o founder e contar se já viveu algo parecido", "Seguir a marca e contar se já viveu algo parecido"),
    motivo: "relato em primeira pessoa de uma virada real mostra quem está por trás da empresa e gera identificação.",
    revisar: [],
  };
}

/**
 * Um post por resposta preenchida, na ordem problema, objeção, diferencial, crença, história.
 * Lista vazia sem respostas.
 * Todos saem com origem_tema "founder" e endereçamento completo.
 */
export function postsDoFounder(conhecimento: ConhecimentoFounder | null | undefined, op: OpcoesFounder): PostFounder[] {
  const c = conhecimentoPreenchido(conhecimento);
  if (!c) return [];
  const voz: Voz = { eu: op.perfil_alvo !== "empresa" };
  const trilho: "founder" | "empresa" = op.perfil_alvo === "empresa" ? "empresa" : "founder";
  const assinatura = op.nomeFounder?.trim() || (voz.eu ? (op.marca ? `Founder, ${op.marca}` : "Founder") : op.marca || "A gente");
  const tags = [...new Set((op.hashtags ?? []).map(paraHashtag).filter((t) => t.length >= 2 && t.length <= 40))];
  const redes = op.redes.length ? op.redes : (["linkedin", "instagram"] as Rede[]);

  const rascunhos: Rascunho[] = [];
  if (c.problema_cliente) rascunhos.push(problema(c.problema_cliente, voz));
  if (c.objecao_cliente) rascunhos.push(objecao(c.objecao_cliente, voz));
  if (c.diferencial) rascunhos.push(diferencial(c.diferencial, voz, c.problema_cliente));
  if (c.crenca_contraria) rascunhos.push(crenca(c.crenca_contraria, voz, assinatura));
  if (c.historia) rascunhos.push(historia(c.historia, voz));

  const usadas = new Map<Rede, number>();
  return rascunhos.map((r) => {
    const preferidas = REDES_DO_FORMATO[r.formato].filter((x) => redes.includes(x));
    const nota = (x: Rede) => (usadas.get(x) ?? 0) + preferidas.indexOf(x) * 0.75;
    const rede = [...preferidas].sort((a, b) => nota(a) - nota(b))[0] ?? redes[0];
    usadas.set(rede, (usadas.get(rede) ?? 0) + 1);

    const padrao = padraoExistente(r.padroes);
    const porQue = padrao
      ? `Segue o padrão "${padrao.nome}" da base curada: ${r.motivo} O assunto veio do que você contou.`
      : `Assunto tirado do que você contou: ${r.motivo}`;
    const post: PostIA = {
      rede_principal: rede,
      formato: r.formato,
      template: r.template,
      gancho: corte(r.gancho, 220),
      slides: r.slides,
      legendas: legendas(r, tags),
      hashtags: tags.slice(0, 5),
      padrao_inspirador: padrao?.id ?? "",
      por_que: corte(porQue, 400),
      origem_tema: "founder",
    };
    const extras: ExtrasPost = {
      trilho,
      objetivo: r.objetivo,
      enderecamento: {
        objetivo: r.objetivo,
        publico: corte(op.publico.trim() || "Quem vive o problema que a empresa resolve", 300),
        gatilho_identificacao: r.gatilho,
        acao_esperada: r.acao,
      },
      formato_motor: MOTOR_DO_FORMATO[r.formato],
      origem_tema: "founder",
      padrao_referencia: referenciaDoPadrao(padrao?.id),
      precisa_revisao: r.revisar,
    };
    return { post, extras };
  });
}

/** Intercala founder e o resto: founder, outro, founder, outro... O que sobrar de um lado vai no fim. */
export function intercalar<T>(founder: T[], outros: T[]): T[] {
  const out: T[] = [];
  for (let i = 0; i < Math.max(founder.length, outros.length); i++) {
    if (i < founder.length) out.push(founder[i]);
    if (i < outros.length) out.push(outros[i]);
  }
  return out;
}
