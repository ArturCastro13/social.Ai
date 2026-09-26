// Link de destino com UTM: posts de gerar_clientes terminam com uma chamada para o link que o founder
// escolheu no onboarding. Nenhum outro rastreamento, nenhuma promessa de conversão.
import type { Analise, PostGerado, Rede } from "@/lib/types";
import { corte } from "@/lib/engine/texto-local";
import type { RoteiroVideo } from "./contrato";

export const CHAMADA_LINK = "Quer conversar sobre isso?";

/** Limite de caracteres por rede (o do X e o do LinkedIn são duros; os outros são generosos). */
const LIMITE: Record<Rede | RoteiroVideo["rede"], number> = { x: 280, linkedin: 3000, instagram: 2200, facebook: 2200, tiktok: 2200, youtube: 2200 };

/** O link com utm_source da rede, utm_medium social, utm_campaign socialai e utm_content do post. Mantém os parâmetros que já existiam. null se o link for inválido. */
export function linkComUtm(link: string, rede: Rede | RoteiroVideo["rede"], postId: string): string | null {
  let u: URL;
  try {
    u = new URL(link.trim());
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  u.searchParams.set("utm_source", rede);
  u.searchParams.set("utm_medium", "social");
  u.searchParams.set("utm_campaign", "socialai");
  u.searchParams.set("utm_content", postId);
  return u.toString();
}

/** Legenda com a chamada e o link no fim, cortando o corpo (nunca o link) para caber no limite da rede. */
function comLink(legenda: string, url: string, limite: number): string {
  if (legenda.includes(url)) return legenda; // já aplicado: idempotente
  let fecho = `${CHAMADA_LINK}\n${url}`;
  if (fecho.length + 40 > limite) fecho = url;
  if (fecho.length > limite) return legenda;
  const espaco = limite - fecho.length - 2;
  if (!legenda.trim() || espaco < 10) return fecho;
  // Tira parágrafos inteiros do fim até caber; só corta no meio se sobrar só o primeiro.
  const blocos = legenda.trim().split(/\n{2,}/);
  while (blocos.length > 1 && blocos.join("\n\n").length > espaco) blocos.pop();
  return `${corte(blocos.join("\n\n"), espaco)}\n\n${fecho}`;
}

function aplicarNoPost(p: PostGerado, link: string): PostGerado {
  if (p.enderecamento?.objetivo !== "gerar_clientes") return p;
  const legendas = { ...p.legendas };
  for (const rede of Object.keys(legendas) as Rede[]) {
    const url = linkComUtm(link, rede, p.id);
    if (!url || typeof legendas[rede] !== "string") continue;
    legendas[rede] = comLink(legendas[rede], url, LIMITE[rede] ?? 2200);
  }
  return { ...p, legendas };
}

/** Roteiro de gerar_clientes: a legenda do vídeo ganha a chamada e o link com utm_source da rede do vídeo. */
function aplicarNoRoteiro(r: RoteiroVideo, link: string): RoteiroVideo {
  if (r.enderecamento?.objetivo !== "gerar_clientes") return r;
  const url = linkComUtm(link, r.rede, r.id);
  if (!url || typeof r.legenda !== "string") return r;
  return { ...r, legenda: comLink(r.legenda, url, LIMITE[r.rede] ?? 2200) };
}

/**
 * Posts com objetivo gerar_clientes ganham, em cada legenda, a chamada e o link com UTM da rede daquela legenda.
 * Roteiros de vídeo de gerar_clientes recebem o mesmo na legenda. Os outros objetivos ficam como estão. Link inválido ou vazio: nada muda. Idempotente.
 */
export function aplicarLinkDestino(analise: Analise, link: string | null | undefined): Analise {
  if (!link?.trim() || !linkComUtm(link, "x", "teste")) return analise;
  return {
    ...analise,
    posts: analise.posts.map((p) => aplicarNoPost(p, link)),
    ...(analise.roteiros ? { roteiros: analise.roteiros.map((r) => aplicarNoRoteiro(r, link)) } : {}),
  };
}
