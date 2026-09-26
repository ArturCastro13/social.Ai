import { z } from "zod";
import { erro, json, lerJson, options } from "@/lib/http";
import { store } from "@/lib/store";

const Entrada = z.object({
  email: z.string().trim().email().max(200),
  nome: z.string().trim().max(120).optional(),
  empresa: z.string().trim().max(160).optional(),
  url: z.string().trim().max(300).optional(),
  analise_id: z.string().trim().max(60).optional(),
  plano: z.string().trim().max(40).optional(),
  origem: z.enum(["download", "lista-espera", "validacao"]).default("download"),
});

export const OPTIONS = options;

/** Captura de e-mail antes do download e inscrições na lista de espera. */
export async function POST(req: Request) {
  const body = Entrada.safeParse(await lerJson(req));
  if (!body.success) return erro("Confere o e-mail? Parece que faltou alguma coisa.", 400);
  try {
    await store.salvarLead(body.data);
  } catch (e) {
    console.error("[leads]", (e as Error).message);
    return erro("Não conseguimos salvar agora. Tenta de novo em instantes.", 503);
  }
  return json({ ok: true });
}
