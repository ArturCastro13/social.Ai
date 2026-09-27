import { billingMode } from "@/lib/assinatura/config";
import { privateError, privateJson } from "@/lib/auth/http";
import { createSessionClient } from "@/lib/auth/server";

export async function GET(): Promise<Response> {
  try {
    if (billingMode() !== "test") return privateJson({ enabled: false, authenticated: false });
    const client = await createSessionClient();
    const { data, error } = await client.auth.getUser();
    if (error || !data.user) return privateJson({ enabled: true, authenticated: false });
    return privateJson({ enabled: true, authenticated: true, user: { id: data.user.id, email: data.user.email } });
  } catch (error) { return privateError(error); }
}
