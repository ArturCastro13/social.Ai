import { z } from "zod";
import { templateValido } from "@/lib/engine/schema";
import type { BrandProfile, PostGerado } from "@/lib/types";
import { formatoSchema, redeSchema } from "@/lib/virais/schema";

// Post e marca que o cliente manda para desenhar a arte (?d= de /api/render) e para criar a imagem (/api/imagem).
// Mora aqui, fora das rotas, porque as duas usam o mesmo formato.

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const texto = (n: number) => z.string().max(n).default("");

/** Valida tudo e aplica padrões, para o Satori e a IA nunca receberem lixo. */
export const payloadSchema = z.object({
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
    destaque: z.string().max(160).optional(),
    direcao_capa: z.object({ cena: z.string().max(900), estilo: z.enum(["fotografia", "ilustracao-3d", "ilustracao-flat"]) }).optional(),
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

export type Payload = z.infer<typeof payloadSchema>;

/** Completa o que o payload não traz (legendas, paleta.todas) para virar post e marca de verdade. */
export function doPayload({ post, brand }: Payload): { post: PostGerado; brand: BrandProfile } {
  return {
    post: { ...post, template: templateValido(post.template, post.formato), legendas: { instagram: "", linkedin: "", x: "", facebook: "" } },
    brand: { ...brand, paleta: { ...brand.paleta, todas: [] } } as unknown as BrandProfile,
  };
}
