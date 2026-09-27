import { z } from "zod";
import { privateBody, privateError, privateJson, requireAppOrigin } from "@/lib/auth/http";
import { requireScope } from "@/lib/auth/scope";
import { startCheckout } from "@/lib/billing/checkout";

export const runtime = "nodejs";
const schema = z.object({ draftId: z.uuid(), draftVersion: z.number().int().positive() }).strict();

export async function POST(request: Request) {
  try {
    requireAppOrigin(request);
    const scope = await requireScope();
    const parsed = schema.safeParse(await privateBody(request));
    if (!parsed.success) return privateJson({ erro: "Rascunho inválido.", codigo: "invalid_checkout" }, 400);
    return privateJson(await startCheckout(scope, parsed.data));
  } catch (error) { return privateError(error); }
}
