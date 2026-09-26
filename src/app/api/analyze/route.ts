import { z } from "zod";
import { readBrand } from "@/lib/brand";
import { analisar, LIMITE_POSTS } from "@/lib/engine";
import { erro, json, lerJson, options } from "@/lib/http";
import type { BrandProfile } from "@/lib/types";

export const maxDuration = 120;

const handle = z.string().max(200).optional();
const Entrada = z
  .object({
    // Resultado de /api/brand. Se vier só a url, o motor lê a marca sozinho.
    brand: z.record(z.string(), z.unknown()).optional(),
    url: z.string().min(3).max(300).optional(),
    instagram: handle,
    linkedin: handle,
    x: handle,
    facebook: handle,
    quantidade: z.coerce.number().int().min(1).max(LIMITE_POSTS).default(6),
    email: z.string().email().max(200).optional(),
    forcarNovo: z.boolean().optional(),
  })
  .refine((d) => d.brand || d.url, { message: "Envie brand (de /api/brand) ou url." });

export const OPTIONS = options;

export async function POST(req: Request) {
  const body = Entrada.safeParse(await lerJson(req));
  if (!body.success) {
    return erro("Entrada inválida. Envie { brand } ou { url }, e opcionalmente { quantidade, email }.", 400, {
      detalhes: body.error.issues.map((i) => `${i.path.join(".") || "entrada"}: ${i.message}`),
    });
  }
  const d = body.data;
  let brand: BrandProfile;
  try {
    brand =
      d.brand && typeof d.brand.url === "string" && d.brand.paleta
        ? (d.brand as unknown as BrandProfile)
        : await readBrand({ url: d.url ?? String(d.brand?.url ?? ""), instagram: d.instagram, linkedin: d.linkedin, x: d.x, facebook: d.facebook });
  } catch (e) {
    return erro("Não entendi esse endereço. Tente algo como suaempresa.com.br.", 422, { motivo: (e as Error).message });
  }
  // @ digitados agora têm prioridade sobre os do perfil lido antes.
  for (const k of ["instagram", "linkedin", "x", "facebook"] as const) {
    if (d[k]) brand.handles[k] = "@" + d[k]!.replace(/^@/, "").trim();
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const analise = await analisar(brand, {
    quantidade: d.quantidade,
    email: d.email ?? null,
    identificador: d.email?.toLowerCase() ?? `ip:${ip}`,
    forcarNovo: d.forcarNovo,
  });
  return json(analise);
}
