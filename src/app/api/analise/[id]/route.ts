import { demoPorId } from "@/lib/engine/demo";
import { erro, json, options } from "@/lib/http";
import { store } from "@/lib/store";

export const OPTIONS = options;

export async function GET(_req: Request, ctx: RouteContext<"/api/analise/[id]">) {
  const { id } = await ctx.params;
  const a = demoPorId(id) ?? (await store.buscarAnalise(id).catch(() => null));
  if (!a) return erro("Análise não encontrada. Ela pode ter expirado se o Supabase não estiver configurado.", 404);
  return json(a);
}
