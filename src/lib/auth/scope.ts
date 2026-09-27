import type { Scope } from "@/lib/assinatura/contrato";
import { z } from "zod";
import { PrivateHttpError } from "./http";
import { createSessionClient } from "./server";

export async function requireScope(): Promise<Scope> {
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
