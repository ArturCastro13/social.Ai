import type { Scope } from "@/lib/assinatura/contrato";
import { z } from "zod";
import { billingMode } from "@/lib/assinatura/config";
import { PrivateHttpError } from "./http";
import { createSessionClient } from "./server";

export async function requireScope(): Promise<Scope> {
  // Assinatura desligada: rascunhos, status e portal ficam indisponíveis antes de tocar no Supabase.
  let ligado = false;
  try { ligado = billingMode() === "test"; } catch { /* modo inválido conta como desligado */ }
  if (!ligado) throw new PrivateHttpError(503, "billing_disabled", "Assinatura indisponível.");
  let client: Awaited<ReturnType<typeof createSessionClient>>;
  try { client = await createSessionClient(); }
  catch { throw new PrivateHttpError(503, "dependency_unavailable", "Identidade temporariamente indisponível."); }

  let userId: string | undefined;
  try {
    const { data, error } = await client.auth.getUser();
    if (error || !data.user?.id) throw new PrivateHttpError(401, "unauthorized", "Sessão inválida ou expirada.");
    userId = data.user.id;
  } catch (error) {
    if (error instanceof PrivateHttpError) throw error;
    throw new PrivateHttpError(503, "dependency_unavailable", "Identidade temporariamente indisponível.");
  }

  try {
    const { data, error } = await client.rpc("ensure_workspace");
    if (error || !z.uuid().safeParse(data).success) throw new Error("workspace unavailable");
    return { userId, workspaceId: data };
  } catch {
    throw new PrivateHttpError(503, "dependency_unavailable", "Workspace temporariamente indisponível.");
  }
}
