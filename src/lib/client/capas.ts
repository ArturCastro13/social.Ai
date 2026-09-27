import { criarImagemIA, gravarFoto } from "./artes";
import type { Analise, BrandProfile, PostGerado, TemplateId } from "@/lib/types";

// Capas automáticas: cada post de carrossel, citação ou dado ganha a capa com imagem de IA sem a pessoa pedir.
// Um registro só para a página inteira: a tela ao vivo e o painel pedindo a mesma capa recebem a mesma promessa,
// então nenhuma imagem é paga duas vezes.

export type EstadoCapa = "pintando" | "pronta" | "erro";

export const CAPA_AUTOMATICA: TemplateId[] = ["capa-gancho", "citacao", "dado-impacto"];
const MAX_SIMULTANEAS = 3;

const pedidos = new Map<string, Promise<string>>();
let ativos = 0;
const esperando: (() => void)[] = [];

async function naVez<T>(f: () => Promise<T>): Promise<T> {
  if (ativos >= MAX_SIMULTANEAS) await new Promise<void>((r) => esperando.push(r));
  ativos++;
  try {
    return await f();
  } finally {
    ativos--;
    esperando.shift()?.();
  }
}

export function precisaCapa(analise: Pick<Analise, "origem">, post: PostGerado, foto?: string | null): boolean {
  return analise.origem !== "demo" && CAPA_AUTOMATICA.includes(post.template) && !foto;
}

/** Pede a capa uma vez por post. `aoParcial` recebe a prévia borrada quando o servidor manda (E5). */
export function pedirCapa(analise: Analise, post: PostGerado, aoParcial?: (dataUrl: string) => void): Promise<string> {
  const k = `${analise.id}:${post.id}`;
  const ja = pedidos.get(k);
  if (ja) return ja;
  const p = naVez(() => criarImagemIA(analise, post, {}, 0, aoParcial)).then((r) => {
    gravarFoto(analise.id, post.id, r.url);
    return r.url;
  });
  pedidos.set(k, p);
  p.catch(() => pedidos.delete(k)); // falhou: um clique em "Criar imagem com IA" tenta de novo
  return p;
}

const CHAVE_SEM = (analiseId: string) => `socialai:sem-capa:${analiseId}`;

/** A pessoa tirou a imagem de um post: a capa automática não volta sozinha. */
export function marcarSemCapa(analiseId: string, postId: string) {
  try {
    const atual = lerSemCapa(analiseId);
    atual.add(postId);
    localStorage.setItem(CHAVE_SEM(analiseId), JSON.stringify([...atual]));
  } catch {
    /* sem armazenamento: vale só nesta visita */
  }
}

export function lerSemCapa(analiseId: string): Set<string> {
  try {
    const j = JSON.parse(localStorage.getItem(CHAVE_SEM(analiseId)) ?? "[]") as unknown;
    return new Set(Array.isArray(j) ? j.filter((x): x is string => typeof x === "string") : []);
  } catch {
    return new Set();
  }
}

/** Análise mínima enquanto a real não chega: o que a URL da arte e o pedido de capa precisam. */
export function analiseProvisoria(x: { id: string; brand: BrandProfile; posts: PostGerado[]; nicho?: string; publico?: string }): Analise {
  return {
    id: x.id,
    url: x.brand.url,
    nicho: (x.nicho ?? "saas-b2b") as Analise["nicho"],
    resumo_negocio: "",
    publico: x.publico ?? "",
    tom_de_voz: "",
    posicionamento: "",
    pilares: [],
    diagnostico: [],
    estrategia: [],
    posts: x.posts,
    calendario: [],
    brand: x.brand,
    origem: "ia",
    provedor: null,
    avisos: [],
    criadoEm: "",
  };
}
