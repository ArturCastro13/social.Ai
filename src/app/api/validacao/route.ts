import { z } from "zod";
import { adminOk, erro, json, lerJson, MSG_SENHA, options } from "@/lib/http";
import { store } from "@/lib/store";
import { PERGUNTAS_VALIDACAO } from "@/lib/validacao";

const Entrada = z.object({
  email: z.string().trim().email().max(200).optional(),
  analise_id: z.string().max(60).optional(),
  respostas: z.record(z.string(), z.union([z.string().max(300), z.number(), z.boolean(), z.null()])),
});

export const OPTIONS = options;

export async function POST(req: Request) {
  const body = Entrada.safeParse(await lerJson(req));
  if (!body.success) return erro("Respostas inválidas.", 400);
  const validas = Object.fromEntries(
    Object.entries(body.data.respostas).filter(([k]) => PERGUNTAS_VALIDACAO.some((p) => p.id === k) || k === "comentario"),
  );
  try {
    await store.salvarValidacao({ email: body.data.email ?? null, analise_id: body.data.analise_id ?? null, respostas: validas });
  } catch (e) {
    console.error("[validacao]", (e as Error).message);
    return erro("Não conseguimos salvar agora.", 503);
  }
  return json({ ok: true });
}

/** Respostas agregadas, usadas no painel de entrevistas do time. */
export async function GET(req: Request) {
  if (!adminOk(req)) return erro(MSG_SENHA, 401);
  return json(await store.listarValidacoes());
}
