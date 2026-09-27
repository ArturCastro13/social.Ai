import { privateError, privateJson, requireAppOrigin, PrivateHttpError } from "@/lib/auth/http";
import { createSessionClient } from "@/lib/auth/server";

export async function POST(request: Request): Promise<Response> {
  try {
    requireAppOrigin(request);
    const client = await createSessionClient();
    const { error } = await client.auth.signOut();
    if (error) throw new PrivateHttpError(503, "dependency_unavailable", "Não foi possível encerrar a sessão.");
    return privateJson({ ok: true });
  } catch (error) { return privateError(error); }
}
