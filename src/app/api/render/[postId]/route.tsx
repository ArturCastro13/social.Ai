import { ImageResponse } from "next/og";
import { z } from "zod";
import { fetchLimited } from "@/lib/brand/fetch";
import { demoPorId } from "@/lib/engine/demo";
import { TEMPLATES, templateValido } from "@/lib/engine/schema";
import { CORS_HEADERS, erro } from "@/lib/http";
import { adaptarSlides } from "@/lib/render/adaptar";
import { fontesDaMarca } from "@/lib/render/fonts";
import { Arte, totalDeImagens } from "@/lib/render/templates";
import { TAMANHOS, tamanhoPadrao, temaDaMarca, type Tamanho } from "@/lib/render/tema";
import { store } from "@/lib/store";
import type { BrandProfile, PostGerado, TemplateId } from "@/lib/types";
import { formatoSchema, redeSchema } from "@/lib/virais/schema";

export const maxDuration = 30;

// Cache pequeno de imagens baixadas (logo e foto), só com sucessos, para não crescer sem limite.
const LIMITE_CACHE = 60;
const imagens = new Map<string, string>();

async function comoDataUri(url: string | null | undefined): Promise<string | null> {
  if (!url || url.length > 2000 || /\.ico(\?|$)/i.test(url)) return null;
  if (url.startsWith("data:image/")) return url.length < 1_500_000 ? url : null;
  const salvo = imagens.get(url);
  if (salvo) return salvo;
  try {
    const { body, contentType } = await fetchLimited(url, { timeoutMs: 3500, maxBytes: 1_500_000, accept: "image/*" });
    const tipo = contentType.split(";")[0].trim() || (url.endsWith(".svg") ? "image/svg+xml" : "image/png");
    if (!/^image\/(png|jpe?g|svg\+xml|webp|gif)$/.test(tipo) || body.length < 50) return null;
    const uri = `data:${tipo};base64,${body.toString("base64")}`;
    if (imagens.size >= LIMITE_CACHE) imagens.delete(imagens.keys().next().value!);
    imagens.set(url, uri);
    return uri;
  } catch {
    return null;
  }
}

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const texto = (n: number) => z.string().max(n).default("");

/** Payload ?d= vem do cliente: valida tudo e aplica padrões, para o Satori nunca receber lixo. */
const payloadSchema = z.object({
  post: z.object({
    id: z.string().max(80),
    rede_principal: redeSchema,
    formato: formatoSchema,
    template: z.string().max(30),
    gancho: texto(300),
    slides: z.array(z.object({ titulo: texto(300), texto: texto(700) })).min(1).max(8),
    hashtags: z.array(z.string().max(40)).max(12).default([]),
    padrao_inspirador: texto(80),
    por_que: texto(400),
  }),
  brand: z.object({
    nome: z.string().min(1).max(80),
    dominio: z.string().max(120).default(""),
    url: z.string().max(300).default(""),
    logo: z.string().max(2000).nullable().default(null),
    handles: z.record(z.string(), z.string().max(120).optional()).default({}),
    paleta: z.object({ primaria: hex, secundaria: hex, destaque: hex, fundo: hex, texto: hex }),
    fontes: z.object({ titulo: z.string().max(60).default("Inter"), corpo: z.string().max(60).default("Inter") }).default({ titulo: "Inter", corpo: "Inter" }),
  }),
});

function lerPayload(d: string | null): { post: PostGerado; brand: BrandProfile } | null {
  if (!d || d.length > 16_000) return null;
  try {
    const r = payloadSchema.safeParse(JSON.parse(Buffer.from(d, "base64url").toString("utf8")));
    if (!r.success) return null;
    const { post, brand } = r.data;
    return {
      post: { ...post, template: templateValido(post.template, post.formato), legendas: { instagram: "", linkedin: "", x: "", facebook: "" } },
      brand: { ...brand, paleta: { ...brand.paleta, todas: [] } } as unknown as BrandProfile,
    };
  } catch {
    return null;
  }
}

async function acharPost(postId: string): Promise<{ post: PostGerado; brand: BrandProfile } | null> {
  const analiseId = postId.replace(/-p\d+$/, "");
  const a = demoPorId(analiseId) ?? (await store.buscarAnalise(analiseId).catch(() => null));
  const post = a?.posts.find((p) => p.id === postId);
  return a && post ? { post, brand: a.brand } : null;
}

export async function GET(req: Request, ctx: RouteContext<"/api/render/[postId]">) {
  const { postId } = await ctx.params;
  const q = new URL(req.url).searchParams;
  const achado = (await acharPost(postId)) ?? lerPayload(q.get("d"));
  if (!achado) return erro("Post não encontrado.", 404);
  const { brand } = achado;
  const post: PostGerado = { ...achado.post, template: templateValido(achado.post.template, achado.post.formato) };

  const templateQ = q.get("template") as TemplateId | null;
  const template: TemplateId = templateQ && TEMPLATES.includes(templateQ) ? templateQ : post.template;
  const slidesBase = post.slides.length ? post.slides : [{ titulo: post.gancho, texto: "" }];
  const postAdaptado: PostGerado =
    template === post.template ? { ...post, slides: slidesBase } : { ...post, template, slides: adaptarSlides({ ...post, slides: slidesBase }, template) };
  const total = Math.max(1, totalDeImagens(template, postAdaptado));
  const slide = Math.min(Math.max(0, Math.floor(Number(q.get("slide") ?? 0)) || 0), total - 1);
  const tamanhoQ = q.get("tamanho");
  const tamanho: Tamanho = tamanhoQ && Object.hasOwn(TAMANHOS, tamanhoQ) ? (tamanhoQ as Tamanho) : tamanhoPadrao(post.rede_principal, template === "capa-gancho");
  const { w, h } = TAMANHOS[tamanho];

  try {
    const [fontes, logo, foto] = await Promise.all([
      fontesDaMarca(brand.fontes?.titulo ?? "Inter", brand.fontes?.corpo ?? "Inter"),
      comoDataUri(brand.logo),
      comoDataUri(q.get("foto")),
    ]);
    // O ImageResponse desenha em stream; gerar o PNG aqui dentro deixa qualquer falha cair no catch.
    const png = await new ImageResponse(
      <Arte post={postAdaptado} template={template} slide={slide} brand={brand} tema={temaDaMarca(brand, q.get("cor"))} w={w} h={h} logo={logo} foto={foto} />,
      { width: w, height: h, fonts: fontes },
    ).arrayBuffer();
    return new Response(png, {
      headers: { ...CORS_HEADERS, "content-type": "image/png", "cache-control": "public, max-age=3600, s-maxage=86400" },
    });
  } catch (e) {
    console.error("[render]", postId, (e as Error).message);
    return erro("Falha ao desenhar a arte.", 500);
  }
}
