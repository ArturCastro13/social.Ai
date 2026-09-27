import { z } from "zod";
import { privateBody, privateError, privateJson, requireAppOrigin } from "@/lib/auth/http";
import { requireScope } from "@/lib/auth/scope";
import { saveDraft } from "@/lib/workspace/drafts";
import type { DraftBody } from "@/lib/assinatura/contrato";

export const runtime = "nodejs";
const createSchema = z.object({ expectedVersion: z.literal(0), body: z.unknown() }).strict();

export async function POST(request: Request) {
  try {
    requireAppOrigin(request);
    const scope = await requireScope();
    const parsed = createSchema.safeParse(await privateBody(request, 155_000));
    if (!parsed.success) return privateJson({ code: "invalid_draft", message: "Rascunho inválido." }, 400);
    const draft = await saveDraft(scope, { expectedVersion: 0, body: parsed.data.body as DraftBody });
    return privateJson(draft, 201);
  } catch (error) { return privateError(error); }
}
