import { adaptarSlides } from "@/lib/render/adaptar";
import type { RoteiroVideo } from "@/lib/motor/contrato";
import type { Analise, BrandProfile, PostGerado, Rede, TemplateId } from "@/lib/types";

/** Texto que o founder mudou no "Customizar". Campo ausente segue o original do motor. */
export interface EdicaoPost {
  gancho?: string;
  slides?: { titulo: string; texto: string }[];
  legendas?: Partial<Record<Rede, string>>;
}

export interface Personalizacao {
  cor?: string | null;
  template?: TemplateId | null;
  edicao?: EdicaoPost | null;
  /** URL pública da imagem criada com IA (bucket "posts"). A arte a usa como fundo. */
  foto?: string | null;
}

/** Limites do payload ?d= da rota de arte (mesmos do zod de lá). Os campos de edição respeitam esses tamanhos. */
export const LIMITES_EDICAO = { gancho: 300, titulo: 300, texto: 700 } as const;

export function temEdicao(pers: Personalizacao | undefined): boolean {
  const e = pers?.edicao;
  return !!e && (e.gancho !== undefined || e.slides !== undefined || Object.keys(e.legendas ?? {}).length > 0);
}

/** O post com o texto editado aplicado. Sem edição, devolve o próprio post. */
export function postEditado(post: PostGerado, pers: Personalizacao | undefined): PostGerado {
  const e = pers?.edicao;
  if (!e || !temEdicao(pers)) return post;
  return {
    ...post,
    gancho: e.gancho ?? post.gancho,
    slides: e.slides ?? post.slides,
    legendas: { ...post.legendas, ...e.legendas },
  };
}

const TAMANHO_POR_REDE: Record<Rede, string> = { instagram: "feed", facebook: "feed", linkedin: "linkedin", x: "x" };

export function marcaMinima(b: BrandProfile) {
  // Só o que a arte precisa. Mantém a URL curta.
  return {
    nome: b.nome,
    dominio: b.dominio,
    url: b.url,
    logo: b.logo,
    handles: b.handles,
    paleta: { ...b.paleta, todas: [] },
    fontes: { titulo: b.fontes.titulo, corpo: b.fontes.corpo },
  };
}

function base64url(s: string) {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Quantas imagens o post gera com o template escolhido (se o template mudou, conta os slides readaptados). */
export function totalSlides(post: PostGerado, template: TemplateId) {
  if (template !== "capa-gancho") return 1;
  const slides = template === post.template ? post.slides : adaptarSlides(post, template);
  return Math.max(1, slides.length);
}

/**
 * URL da arte. Leva o post junto em ?d= para funcionar mesmo quando a análise não ficou salva
 * no servidor (Vercel sem Supabase). A legenda fica de fora para a URL não crescer.
 */
export function urlArte(
  analise: Analise,
  original: PostGerado,
  opts: Personalizacao & { slide?: number; tamanho?: string; base?: string } = {},
) {
  const q = new URLSearchParams();
  const editado = temEdicao(opts);
  const post = postEditado(original, opts);
  const template = opts.template ?? post.template;
  if (opts.slide) q.set("slide", String(opts.slide));
  if (opts.tamanho) q.set("tamanho", opts.tamanho);
  if (opts.template && opts.template !== post.template) q.set("template", opts.template);
  if (opts.cor && opts.cor.toLowerCase() !== analise.brand.paleta.primaria.toLowerCase()) q.set("cor", opts.cor);
  if (opts.foto) q.set("foto", opts.foto);
  // Na demo, a rota acha o post pelo id no arquivo pré-processado; os posts montados na hora
  // a partir do que o founder contou não estão lá, então vão com os dados na URL.
  // Post editado vai sempre com os dados na URL.
  if (editado || analise.origem !== "demo" || post.origem_tema === "founder") {
    const { legendas: _l, ...semLegenda } = post;
    void _l;
    q.set("d", base64url(JSON.stringify({ post: semLegenda, brand: marcaMinima(analise.brand) })));
  }
  q.set("t", template);
  // A rota procura primeiro o post pelo id (demo e análises salvas) e só depois lê ?d=. Com o id original,
  // o texto editado seria ignorado; o sufixo faz a busca falhar e a rota desenhar o que veio em ?d=.
  const idCaminho = editado ? `${post.id}-editado` : post.id;
  return `${opts.base ?? ""}/api/render/${encodeURIComponent(idCaminho)}?${q.toString()}`;
}

/** Templates que usam a imagem criada com IA (no carrossel, só a capa). Os outros seguem só com cor. */
export const TEMPLATES_COM_FOTO: TemplateId[] = ["capa-gancho", "citacao", "dado-impacto", "print-x", "bastidor"];

/** Resposta de POST /api/imagem. */
export interface ImagemCriada {
  url: string;
  direcao: string;
}

/**
 * Pede a imagem do post com IA (direção de arte do Claude, imagem da OpenAI). Leva o texto editado, para a cena
 * bater com o que vai na arte. `variacao` maior que 0 pede outra cena ("Gerar outra").
 */
export async function criarImagemIA(analise: Analise, original: PostGerado, pers: Personalizacao, variacao = 0): Promise<ImagemCriada> {
  const { legendas: _l, ...post } = postEditado(original, pers);
  void _l;
  const corte = (s: string | undefined, n: number) => (s ? s.slice(0, n) : undefined);
  let res: Response;
  try {
    res = await fetch("/api/imagem", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        post: { ...post, template: pers.template ?? post.template },
        brand: marcaMinima(analise.brand),
        contexto: {
          nicho: analise.nicho,
          publico: corte(analise.publico, 600),
          tom: corte(analise.tom_de_voz, 400),
          resumo: corte(analise.resumo_negocio, 1200),
        },
        variacao,
      }),
    });
  } catch {
    throw new Error("Sem conexão com o servidor. Confira a internet e tente de novo.");
  }
  const dados = (await res.json().catch(() => null)) as (Partial<ImagemCriada> & { erro?: string }) | null;
  if (!res.ok || !dados?.url) throw new Error(dados?.erro || "Não deu para criar a imagem agora. Tente de novo.");
  return { url: dados.url, direcao: dados.direcao ?? "" };
}

// Imagens criadas com IA ficam no navegador, por análise: recarregar a página não perde o que já foi pago.
const CHAVE_FOTOS = (analiseId: string) => `socialai:fotos:${analiseId}`;

export function lerFotos(analiseId: string): Record<string, string> {
  try {
    const j = JSON.parse(localStorage.getItem(CHAVE_FOTOS(analiseId)) ?? "null") as unknown;
    if (!j || typeof j !== "object") return {};
    return Object.fromEntries(Object.entries(j).filter(([, v]) => typeof v === "string" && /^https:\/\//.test(v)));
  } catch {
    return {};
  }
}

export function gravarFoto(analiseId: string, postId: string, url: string | null) {
  try {
    const fotos = lerFotos(analiseId);
    if (url) fotos[postId] = url;
    else delete fotos[postId];
    localStorage.setItem(CHAVE_FOTOS(analiseId), JSON.stringify(fotos));
  } catch {
    /* navegador sem armazenamento: segue só em memória */
  }
}

function nomeArquivo(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

/** Baixa todas as artes e legendas num ZIP organizado por post. */
export async function baixarZip(
  analise: Analise,
  personalizacoes: Record<string, Personalizacao>,
  onProgresso?: (feito: number, total: number) => void,
) {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  const tarefas: { pasta: string; arquivo: string; url: string }[] = [];

  analise.posts.forEach((original, i) => {
    const pers = personalizacoes[original.id] ?? {};
    const post = postEditado(original, pers);
    const template = pers.template ?? post.template;
    const pasta = `${String(i + 1).padStart(2, "0")}-${post.rede_principal}-${nomeArquivo(post.gancho)}`;
    const n = totalSlides(post, template);
    const tamanho = template === "capa-gancho" ? "feed" : TAMANHO_POR_REDE[post.rede_principal];
    for (let s = 0; s < n; s++) {
      tarefas.push({ pasta, arquivo: n > 1 ? `slide-${s + 1}.png` : "arte.png", url: urlArte(analise, original, { ...pers, slide: s, tamanho }) });
    }
    const agenda = analise.calendario.find((c) => c.post_id === post.id);
    const legendas = [
      `# ${post.gancho}`,
      agenda ? `Publicar em ${agenda.data.split("-").reverse().join("/")} (${agenda.dia_semana}) às ${agenda.horario}, no ${agenda.rede}.` : "",
      "",
      "## Instagram",
      post.legendas.instagram,
      "",
      "## LinkedIn",
      post.legendas.linkedin,
      "",
      "## X",
      post.legendas.x,
      "",
      "## Facebook",
      post.legendas.facebook,
      "",
      post.hashtags.length ? `Hashtags: ${post.hashtags.map((h) => "#" + h).join(" ")}` : "",
    ].join("\n");
    zip.file(`${pasta}/legendas.md`, legendas);
  });

  let feito = 0;
  let falhas = 0;
  const fila = [...tarefas];
  const trabalhadores = Array.from({ length: 4 }, async () => {
    while (fila.length) {
      const t = fila.shift()!;
      try {
        const res = await fetch(t.url);
        if (!res.ok) throw new Error(String(res.status));
        zip.file(`${t.pasta}/${t.arquivo}`, await res.blob());
      } catch {
        falhas++;
      }
      onProgresso?.(++feito, tarefas.length);
    }
  });
  await Promise.all(trabalhadores);
  if (falhas === tarefas.length) throw new Error("Não conseguimos baixar as artes agora. Confira a internet e tente de novo.");

  const csv = (s: string) => `"${s.replace(/"/g, "'")}"`;
  const roteiros = analise.roteiros ?? [];
  const calendario = [
    "data,dia,horario,rede,tipo,conteudo",
    ...analise.calendario.map((c) => {
      const p = analise.posts.find((x) => x.id === c.post_id);
      const texto = p ? postEditado(p, personalizacoes[p.id]).gancho : "";
      return `${c.data},${c.dia_semana},${c.horario},${c.rede},postar,${csv(texto)}`;
    }),
    ...roteiros
      .filter((r) => r.agenda)
      .map((r) => `${r.agenda!.data},${r.agenda!.dia_semana},${r.agenda!.horario},${r.rede},gravar,${csv(r.titulo)}`),
  ].join("\n");
  zip.file("calendario.csv", calendario);
  if (roteiros.length) zip.file("roteiros.md", roteirosEmTexto(roteiros));

  const blob = await zip.generateAsync({ type: "blob" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `social-ai-${nomeArquivo(analise.brand.nome)}.zip`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  return { falhas, total: tarefas.length };
}

const NOMES_REDE_VIDEO: Record<RoteiroVideo["rede"], string> = { instagram: "Instagram", linkedin: "LinkedIn", tiktok: "TikTok", youtube: "YouTube" };

/** Os roteiros de vídeo em Markdown, para ler no celular na hora de gravar. */
export function roteirosEmTexto(roteiros: RoteiroVideo[]): string {
  const blocos = roteiros.map((r, i) => {
    const quando = r.agenda ? `Publicar em ${r.agenda.data.split("-").reverse().join("/")} (${r.agenda.dia_semana}) às ${r.agenda.horario}.` : "";
    return [
      `# Vídeo ${i + 1}: ${r.titulo}`,
      `${NOMES_REDE_VIDEO[r.rede] ?? r.rede}, cerca de ${r.duracao_seg} segundos. ${quando}`.trim(),
      "",
      "## Primeiros 3 segundos",
      r.gancho,
      "",
      "## Cenas",
      ...r.cenas.map((c, k) => `${k + 1}. ${c.fala}${c.tela ? `\n   Na tela: ${c.tela}` : ""}`),
      "",
      "## Para fechar",
      r.chamada_final,
      ...(r.dica_gravacao ? ["", "## Dica de gravação", r.dica_gravacao] : []),
      "",
      "## Legenda",
      r.legenda,
      ...(r.precisa_revisao?.length ? ["", "## Revisar antes de gravar", ...r.precisa_revisao.map((x) => `- ${x}`)] : []),
    ].join("\n");
  });
  return blocos.join("\n\n---\n\n") + "\n";
}
