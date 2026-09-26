import { randomBytes } from "node:crypto";
import { z } from "zod";
import { calcularNumeros } from "@/lib/entrevistas";
import { adminOk, erro, json, lerJson, MSG_SENHA, options } from "@/lib/http";
import { store } from "@/lib/store";

export const OPTIONS = options;

const txt = (n: number) => z.string().trim().max(n).nullable().optional();
const Entrada = z.object({
  id: z.string().max(40).optional(),
  entrevistador: txt(80),
  founder: txt(120),
  startup: txt(120),
  quem_cuida: txt(80),
  horas_semana: z.coerce.number().min(0).max(80).nullable().optional(),
  ja_tentou: txt(300),
  pagaria_mes: z.coerce.number().min(0).max(100000).nullable().optional(),
  ultima_vez_sem_postar: txt(1000),
  dor_nota: z.coerce.number().int().min(1).max(5).nullable().optional(),
  quer_testar: z.boolean().optional(),
  contato: txt(160),
  notas: txt(1000),
});

async function painel() {
  const [entrevistas, formulario] = await Promise.all([store.listarEntrevistas(), store.listarValidacoes().catch(() => [])]);
  return { armazenamento: store.tipo, entrevistas, numeros: calcularNumeros(entrevistas, formulario) };
}

export async function GET(req: Request) {
  if (!adminOk(req)) return erro(MSG_SENHA, 401);
  return json(await painel());
}

export async function POST(req: Request) {
  if (!adminOk(req)) return erro(MSG_SENHA, 401);
  const body = Entrada.safeParse(await lerJson(req));
  if (!body.success) return erro("Entrevista inválida.", 400, { detalhes: body.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) });
  const e = { ...body.data, id: body.data.id ?? randomBytes(5).toString("hex"), quer_testar: body.data.quer_testar ?? false };
  await store.salvarEntrevista(e);
  return json({ ok: true, id: e.id, ...(await painel()) });
}

export async function DELETE(req: Request) {
  if (!adminOk(req)) return erro(MSG_SENHA, 401);
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return erro("Informe o id.", 400);
  await store.removerEntrevista(id);
  return json({ ok: true, ...(await painel()) });
}
