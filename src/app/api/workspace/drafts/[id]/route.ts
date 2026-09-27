import { z } from "zod";
import { privateBody, privateError, privateJson, requireAppOrigin } from "@/lib/auth/http";
import { requireScope } from "@/lib/auth/scope";
import { deleteDraft, loadDraft, saveDraft } from "@/lib/workspace/drafts";
import type { DraftBody } from "@/lib/assinatura/contrato";

export const runtime = "nodejs";
const patchSchema = z.object({ expectedVersion: z.number().int().positive(), body: z.unknown() }).strict();

type DraftRouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: DraftRouteContext) {
  try {
    const scope = await requireScope();
    const { id } = await ctx.params;
    return privateJson(await loadDraft(scope, id));
  } catch (error) { return privateError(error); }
}

export async function PATCH(request: Request, ctx: DraftRouteContext) {
  try {
    requireAppOrigin(request);
    const scope = await requireScope();
    const { id } = await ctx.params;
    const parsed = patchSchema.safeParse(await privateBody(request, 155_000));
    if (!parsed.success) return privateJson({ code: "invalid_draft", message: "Rascunho inválido." }, 400);
    return privateJson(await saveDraft(scope, { id, expectedVersion: parsed.data.expectedVersion, body: parsed.data.body as DraftBody }));
  } catch (error) { return privateError(error); }
}

export async function DELETE(request: Request, ctx: DraftRouteContext) {
  try {
    requireAppOrigin(request);
    const scope = await requireScope();
    const { id } = await ctx.params;
    await deleteDraft(scope, id);
    return privateJson({ ok: true });
  } catch (error) { return privateError(error); }
}
