import { z } from "zod";
import { readBrand } from "@/lib/brand";
import { ehSemSite } from "@/lib/brand/sem-site";
import { analisar, LIMITE_POSTS } from "@/lib/engine";
import { adminOk, erro, json, lerJson, options } from "@/lib/http";
import { preferenciasSchema } from "@/lib/motor/contrato";
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
    // Onboarding em camadas (src/lib/motor/contrato.ts). Validado à parte para a mensagem de erro ser clara.
    preferencias: z.unknown().optional(),
  })
  .refine((d) => d.brand || d.url, { message: "Envie brand (de /api/brand) ou url." });

// O perfil de marca pode vir de outra interface (ex.: a recriada na Adapta). Confere o mínimo que o motor usa.
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const BrandMinimo = z.object({
  url: z.string().url(),
  dominio: z.string().min(3),
  nome: z.string().min(1).max(120),
  headings: z.object({ h1: z.array(z.string()), h2: z.array(z.string()) }),
  paragrafos: z.array(z.string()),
  handles: z.record(z.string(), z.string().optional()),
  paleta: z.object({ primaria: hex, secundaria: hex, destaque: hex, fundo: hex, texto: hex }),
  fontes: z.object({ titulo: z.string(), corpo: z.string() }),
  avisos: z.array(z.string()),
});

export const OPTIONS = options;

export async function POST(req: Request) {
  const body = Entrada.safeParse(await lerJson(req));
  if (!body.success) {
    return erro("Entrada inválida. Envie { brand } ou { url }, e opcionalmente { quantidade, email }.", 400, {
      detalhes: body.error.issues.map((i) => `${i.path.join(".") || "entrada"}: ${i.message}`),
    });
  }
  const d = body.data;
  let preferencias;
  if (d.preferencias !== undefined && d.preferencias !== null) {
    const p = preferenciasSchema.safeParse(d.preferencias);
    if (!p.success) {
      return erro("As preferências vieram em um formato que o motor não entende. Confira os campos abaixo e tente de novo.", 400, {
        detalhes: p.error.issues.map((i) => `preferencias.${i.path.join(".") || "(raiz)"}: ${i.message}`),
      });
    }
    preferencias = p.data;
  }
  let brand: BrandProfile;
  try {
    const recebido = d.brand ? BrandMinimo.safeParse(d.brand) : null;
    if (recebido?.success) brand = { ...(d.brand as unknown as BrandProfile), ...recebido.data } as BrandProfile;
    else {
      const url = d.url ?? (typeof d.brand?.url === "string" ? d.brand.url : "");
      if (!url) return erro("O objeto brand veio incompleto. Envie o resultado de /api/brand ou só a url.", 400);
      // Marca sem site não tem página para ler: o perfil precisa vir inteiro do onboarding.
      if (ehSemSite(url)) return erro("Os dados da empresa sem site vieram incompletos. Volte e preencha nome e descrição de novo.", 400);
      brand = await readBrand({ url, instagram: d.instagram, linkedin: d.linkedin, x: d.x, facebook: d.facebook });
    }
  } catch (e) {
    return erro("Não entendi esse endereço. Tente algo como suaempresa.com.br.", 422, { motivo: (e as Error).message });
  }
  // @ digitados agora têm prioridade sobre os do perfil lido antes.
  brand = { ...brand, handles: { ...brand.handles } };
  for (const k of ["instagram", "linkedin", "x", "facebook"] as const) {
    if (d[k]) brand.handles[k] = "@" + d[k]!.replace(/^@/, "").trim();
  }

  const ip = req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  let analise;
  try {
    analise = await analisar(brand, {
      quantidade: d.quantidade,
      email: d.email ?? null,
      identificadores: [`ip:${ip}`, ...(d.email ? [d.email.toLowerCase()] : [])],
      // Ignorar o cache custa uma chamada de IA: só o time pode pedir.
      forcarNovo: d.forcarNovo && adminOk(req),
      // Os @ do founder vão só no contexto do motor, não nos handles da marca.
      preferencias,
    });
  } catch (e) {
    console.error("[analyze]", (e as Error).message);
    return erro("O motor tropeçou nesta análise. Tente de novo ou use um dos exemplos.", 500);
  }
  return json(analise);
}
