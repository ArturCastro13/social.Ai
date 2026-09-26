import { z } from "zod";
import { readBrand } from "@/lib/brand";
import { erro, json, lerJson, options } from "@/lib/http";

export const maxDuration = 30;

const Entrada = z.object({
  url: z.string().min(3).max(300),
  instagram: z.string().max(200).optional(),
  linkedin: z.string().max(200).optional(),
  x: z.string().max(200).optional(),
  facebook: z.string().max(200).optional(),
  paletaInstagram: z.array(z.string().regex(/^#[0-9a-fA-F]{6}$/)).max(8).optional(),
});

export const OPTIONS = options;

export async function POST(req: Request) {
  const body = Entrada.safeParse(await lerJson(req));
  if (!body.success) return erro("Envie ao menos { url } com o endereço do site.", 400, { detalhes: body.error.issues });
  const { paletaInstagram, ...input } = body.data;
  try {
    const brand = await readBrand(input, { paletaInstagram });
    return json(brand);
  } catch (e) {
    // readBrand só lança para URL inválida; qualquer outra falha vira aviso lá dentro.
    return erro("Não entendi esse endereço. Tente algo como suaempresa.com.br.", 422, { motivo: (e as Error).message });
  }
}
