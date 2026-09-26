import { z } from "zod";
import { readBrand } from "@/lib/brand";
import { ehSemSite } from "@/lib/brand/sem-site";
import { erro, json, lerJson, options } from "@/lib/http";
import { brandParaInferencia, inferirSugestoes } from "@/lib/motor/inferir";
import type { BrandProfile } from "@/lib/types";

// Tela 2 do onboarding: sugestões de nicho, objetivos, tom, formatos e frequência, sem IA.
export const maxDuration = 30;

const Entrada = z
  .object({
    // Resultado de /api/brand. Se vier só a url, a marca é lida aqui.
    brand: z.record(z.string(), z.unknown()).optional(),
    url: z.string().min(3).max(300).optional(),
  })
  .refine((d) => d.brand || d.url, { message: "Envie brand (de /api/brand) ou url." });

export const OPTIONS = options;

export async function POST(req: Request) {
  const body = Entrada.safeParse(await lerJson(req));
  if (!body.success) {
    return erro("Entrada inválida. Envie { brand } com o resultado de /api/brand ou { url } com o endereço do site.", 400, {
      detalhes: body.error.issues.map((i) => `${i.path.join(".") || "entrada"}: ${i.message}`),
    });
  }
  const d = body.data;
  let brand: BrandProfile | null = d.brand ? brandParaInferencia(d.brand) : null;
  if (!brand) {
    const url = d.url ?? (typeof d.brand?.url === "string" ? d.brand.url : "");
    if (!url) return erro("O objeto brand veio incompleto. Envie o resultado de /api/brand ou só a url.", 400);
    if (ehSemSite(url)) return erro("Os dados da empresa sem site vieram incompletos. Volte e preencha nome e descrição de novo.", 400);
    try {
      brand = await readBrand({ url });
    } catch (e) {
      return erro("Não entendi esse endereço. Tente algo como suaempresa.com.br.", 422, { motivo: (e as Error).message });
    }
  }
  return json(inferirSugestoes(brand));
}
