import { adminOk, erro, json, lerJson, options } from "@/lib/http";
import { store } from "@/lib/store";
import { todosOsVirais } from "@/lib/virais";
import { construirCatalogo } from "@/lib/virais/catalogo";
import { viralItemSchema } from "@/lib/virais/schema";

export const OPTIONS = options;

export async function GET(req: Request) {
  if (!adminOk(req)) return erro("Senha de admin incorreta.", 401);
  const itens = await todosOsVirais();
  return json({ armazenamento: store.tipo, itens, catalogo: construirCatalogo(itens) });
}

export async function POST(req: Request) {
  if (!adminOk(req)) return erro("Senha de admin incorreta.", 401);
  const body = await lerJson(req);
  const r = viralItemSchema.safeParse(body);
  if (!r.success) {
    return erro("Item inválido.", 400, { detalhes: r.error.issues.map((i) => `${i.path.join(".") || "item"}: ${i.message}`) });
  }
  if (JSON.stringify(r.data).includes("—")) return erro("Troque o travessão por vírgula ou ponto.", 400);
  const { destino } = await store.salvarViral(r.data);
  return json({ ok: true, destino, item: r.data });
}
