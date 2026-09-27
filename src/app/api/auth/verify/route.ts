import { z } from "zod";
import { billingMode } from "@/lib/assinatura/config";
import { privateBody, privateError, privateJson, requireAppOrigin, PrivateHttpError } from "@/lib/auth/http";
import { createSessionClient } from "@/lib/auth/server";
import { reserveFrequency } from "@/lib/workspace/frequency";

const schema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  code: z.string().regex(/^\d{6,8}$/),
});

export async function POST(request: Request): Promise<Response> {
  try {
    requireAppOrigin(request);
    if (billingMode() !== "test") throw new PrivateHttpError(503, "billing_disabled", "Assinatura indisponível.");
    const parsed = schema.safeParse(await privateBody(request));
    if (!parsed.success) throw new PrivateHttpError(400, "invalid_input", "Confira o e-mail e o código.");
    await reserveFrequency("otp_verify", parsed.data.email);
    const client = await createSessionClient();
    const { error } = await client.auth.verifyOtp({ email: parsed.data.email, token: parsed.data.code, type: "email" });
    if (error?.status === 429) throw new PrivateHttpError(429, "rate_limited", "Tente novamente mais tarde.");
    if (error) throw new PrivateHttpError(400, "invalid_code", "Código inválido ou expirado.");
    const verified = await client.auth.getUser();
    if (verified.error || !verified.data.user) throw new PrivateHttpError(401, "unauthorized", "Sessão inválida ou expirada.");
    return privateJson({ ok: true });
  } catch (error) { return privateError(error); }
}
