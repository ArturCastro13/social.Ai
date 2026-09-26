import { erro, json, options } from "@/lib/http";
import { sinaisDoNicho } from "@/lib/oportunidade";
import { NICHOS, type Nicho } from "@/lib/types";
import { todosOsVirais } from "@/lib/virais";

export const OPTIONS = options;

/** Radar do nicho: frequência de cada padrão na base curada e os posts que fugiram da curva. GET /api/radar?nicho=fintech */
export async function GET(req: Request) {
  const nicho = new URL(req.url).searchParams.get("nicho") as Nicho | null;
  if (!nicho || !NICHOS.some((n) => n.id === nicho)) return erro("Informe ?nicho= com um nicho válido.", 400);
  return json(sinaisDoNicho(await todosOsVirais(), nicho));
}
