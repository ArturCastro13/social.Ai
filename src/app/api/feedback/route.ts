import { z } from "zod";
import { NOMES_FORMATO, resumirPreferencias } from "@/lib/feedback";
import { erro, json, lerJson, options } from "@/lib/http";
import { store } from "@/lib/store";
import { NICHOS, type Formato, type Nicho } from "@/lib/types";

const formato = z.enum(Object.keys(NOMES_FORMATO) as [Formato, ...Formato[]]);
const nicho = z.enum(NICHOS.map((n) => n.id) as [Nicho, ...Nicho[]]);
const id = z.string().trim().min(1).max(80);
const dominio = z.string().trim().toLowerCase().min(3).max(200);
const numero = z.number().int().min(0).max(1e9).nullable();

const Entrada = z.discriminatedUnion("tipo", [
  z.object({
    tipo: z.literal("decisao"),
    analise_id: id,
    post_id: id,
    dominio,
    nicho,
    formato,
    template: id,
    padrao: z.string().trim().max(80).default(""),
    rede: z.enum(["instagram", "linkedin", "x", "facebook"]),
    decisao: z.enum(["aprovado", "pulado"]),
  }),
  z.object({
    tipo: z.literal("resultado"),
    analise_id: id,
    post_id: id,
    dominio,
    formato,
    curtidas: numero,
    comentarios: numero,
    salvamentos: numero,
    alcance: numero,
  }),
]);

export const OPTIONS = options;

/** Decisões de aprovar/pular e resultados de posts publicados. É o que ensina o motor sobre cada marca. */
export async function POST(req: Request) {
  // Endpoint público: um registro legítimo tem poucas centenas de bytes.
  if (Number(req.headers.get("content-length") ?? 0) > 4096) return erro("Dados grandes demais.", 413);
  const body = Entrada.safeParse(await lerJson(req));
  if (!body.success) return erro("Dados inválidos.", 400);
  const { tipo, ...dados } = body.data;
  try {
    if (tipo === "decisao") await store.salvarDecisao(dados as Parameters<typeof store.salvarDecisao>[0]);
    else await store.salvarResultado(dados as Parameters<typeof store.salvarResultado>[0]);
  } catch (e) {
    console.error("[feedback]", (e as Error).message);
    return erro("Não conseguimos salvar agora.", 503);
  }
  return json({ ok: true });
}

/** Resumo por formato de uma marca: GET /api/feedback?dominio=cora.com.br */
export async function GET(req: Request) {
  const d = dominio.safeParse(new URL(req.url).searchParams.get("dominio") ?? "");
  if (!d.success) return erro("Informe ?dominio=", 400);
  try {
    const [decisoes, resultados] = await Promise.all([store.listarDecisoes(d.data), store.listarResultados(d.data)]);
    return json(resumirPreferencias(decisoes, resultados));
  } catch (e) {
    console.error("[feedback]", (e as Error).message);
    return erro("Não conseguimos ler agora.", 503);
  }
}
