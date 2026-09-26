import { ImageResponse } from "next/og";
import { demoPorId } from "@/lib/engine/demo";
import { TEMPLATES } from "@/lib/engine/schema";
import { erro, CORS_HEADERS } from "@/lib/http";
import { adaptarSlides } from "@/lib/render/adaptar";
import { fontesDaMarca } from "@/lib/render/fonts";
import { Arte, totalDeImagens } from "@/lib/render/templates";
import { TAMANHOS, tamanhoPadrao, temaDaMarca, type Tamanho } from "@/lib/render/tema";
import { fetchLimited } from "@/lib/brand/fetch";
import { store } from "@/lib/store";
import type { Analise, BrandProfile, PostGerado, TemplateId } from "@/lib/types";

export const maxDuration = 30;

const imagens = new Map<string, Promise<string | null>>();

/** Baixa uma imagem e devolve data URI (Satori não deve depender de rede na hora de desenhar). */
function comoDataUri(url: string | null | undefined): Promise<string | null> {
  if (!url || /\.ico(\?|$)/i.test(url)) return Promise.resolve(null);
  if (url.startsWith("data:image/")) return Promise.resolve(url);
  if (!imagens.has(url)) {
    imagens.set(
      url,
      fetchLimited(url, { timeoutMs: 3500, maxBytes: 1_500_000, accept: "image/*" })
        .then(({ body, contentType }) => {
          const tipo = contentType.split(";")[0].trim() || (url.endsWith(".svg") ? "image/svg+xml" : "image/png");
          if (!/^image\/(png|jpe?g|svg\+xml|webp|gif)$/.test(tipo) || body.length < 50) return null;
          return `data:${tipo};base64,${body.toString("base64")}`;
        })
        .catch(() => null),
    );
  }
  return imagens.get(url)!;
}

/** Payload opcional ?d= (base64url de { post, brand }) para renderizar sem banco. */
function lerPayload(d: string | null): { post: PostGerado; brand: BrandProfile } | null {
  if (!d) return null;
  try {
    const obj = JSON.parse(Buffer.from(d, "base64url").toString("utf8"));
    if (obj?.post?.slides && obj?.brand?.paleta) return obj;
  } catch {
    /* payload inválido */
  }
  return null;
}

async function acharPost(postId: string): Promise<{ post: PostGerado; brand: BrandProfile } | null> {
  const analiseId = postId.replace(/-p\d+$/, "");
  const a: Analise | null = demoPorId(analiseId) ?? (await store.buscarAnalise(analiseId).catch(() => null));
  const post = a?.posts.find((p) => p.id === postId);
  return a && post ? { post, brand: a.brand } : null;
}

export async function GET(req: Request, ctx: RouteContext<"/api/render/[postId]">) {
  const { postId } = await ctx.params;
  const q = new URL(req.url).searchParams;
  const achado = (await acharPost(postId)) ?? lerPayload(q.get("d"));
  if (!achado) return erro("Post não encontrado.", 404);
  const { post, brand } = achado;

  const templateQ = q.get("template") as TemplateId | null;
  const template: TemplateId = templateQ && TEMPLATES.includes(templateQ) ? templateQ : post.template;
  const postAdaptado: PostGerado = template === post.template ? post : { ...post, template, slides: adaptarSlides(post, template) };
  const total = totalDeImagens(template, postAdaptado);
  const slide = Math.min(Math.max(0, Number(q.get("slide") ?? 0) || 0), total - 1);
  const tamanhoQ = q.get("tamanho") as Tamanho | null;
  const tamanho: Tamanho = tamanhoQ && tamanhoQ in TAMANHOS ? tamanhoQ : tamanhoPadrao(post.rede_principal, template === "capa-gancho");
  const { w, h } = TAMANHOS[tamanho];

  const [fontes, logo, foto] = await Promise.all([
    fontesDaMarca(brand.fontes.titulo, brand.fontes.corpo),
    comoDataUri(brand.logo),
    comoDataUri(q.get("foto")),
  ]);

  try {
    return new ImageResponse(
      <Arte post={postAdaptado} template={template} slide={slide} brand={brand} tema={temaDaMarca(brand, q.get("cor"))} w={w} h={h} logo={logo} foto={foto} />,
      {
        width: w,
        height: h,
        fonts: fontes,
        headers: { ...CORS_HEADERS, "cache-control": "public, max-age=3600, s-maxage=86400" },
      },
    );
  } catch (e) {
    console.error("[render]", e);
    return erro("Falha ao desenhar a arte.", 500, { motivo: (e as Error).message });
  }
}
