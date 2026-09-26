// Perfil de marca para quem não tem site: montado só com o que o founder contou no onboarding.
// Puro (sem Node), para rodar no navegador e no servidor. Nunca inventa fato: o texto é o do founder.
import type { BrandProfile, Nicho } from "@/lib/types";

export interface EmpresaSemSite {
  nome: string;
  /** O que a empresa faz, em uma ou duas frases. */
  descricao: string;
  /** Para quem vende (opcional; também vai em preferencias.publico_alvo). */
  publico?: string;
  nicho?: Nicho;
  handles?: { instagram?: string; linkedin?: string; x?: string; facebook?: string };
  /** Cores tiradas do print do Instagram, se houver. */
  paleta?: string[];
}

/** Paleta neutra da casa quando não há site nem print do Instagram. */
const PALETA_PADRAO = { primaria: "#ff4a1c", secundaria: "#16130f", destaque: "#ffb199", fundo: "#f7f6f2", texto: "#16130f" };

export const HOST_SEM_SITE = "sem-site.social.ai";

function slug(s: string): string {
  return (
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "empresa"
  );
}

/** Hash curto e estável (djb2), para duas empresas de mesmo nome e descrição diferente não dividirem cache. */
function hashCurto(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(36).slice(0, 6);
}

export function ehSemSite(url: string | null | undefined): boolean {
  return !!url && url.includes(HOST_SEM_SITE);
}

export function brandSemSite(e: EmpresaSemSite, agora = new Date()): BrandProfile {
  const nome = e.nome.trim().slice(0, 80) || "Minha empresa";
  const descricao = e.descricao.trim().slice(0, 600);
  const publico = e.publico?.trim().slice(0, 300) ?? "";
  const id = `${slug(nome)}-${hashCurto(nome + descricao)}`;
  const url = `https://${HOST_SEM_SITE}/${id}`;
  const cores = (e.paleta ?? []).filter((c) => /^#[0-9a-f]{6}$/i.test(c));
  const paleta = cores.length
    ? { primaria: cores[0], secundaria: cores[1] ?? PALETA_PADRAO.secundaria, destaque: cores[2] ?? cores[0], fundo: PALETA_PADRAO.fundo, texto: PALETA_PADRAO.texto }
    : PALETA_PADRAO;
  const handles = Object.fromEntries(Object.entries(e.handles ?? {}).filter(([, v]) => v && v.trim())) as BrandProfile["handles"];
  const primeira = descricao.split(/(?<=[.!?])\s+/)[0] ?? "";
  return {
    url,
    dominio: `${HOST_SEM_SITE}/${id}`,
    nome,
    title: nome,
    description: descricao || null,
    og: { title: nome, description: descricao || null, image: null },
    favicon: null,
    appleTouchIcon: null,
    logo: null,
    themeColor: null,
    headings: { h1: primeira ? [primeira] : [], h2: [] },
    paragrafos: [descricao, publico && `Para quem: ${publico}`].filter(Boolean),
    redesEncontradas: {},
    handles,
    paleta: { ...paleta, todas: [] },
    fontes: { titulo: "Inter", corpo: "Inter", encontradas: [], sugeridas: true },
    avisos: ["Sem site: a marca foi montada com o que você contou. As cores são as do print do Instagram ou uma paleta neutra."],
    lidoEm: agora.toISOString(),
    ...(e.nicho ? { nicho_informado: e.nicho } : {}),
    sem_site: true,
  };
}
