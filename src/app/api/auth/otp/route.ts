import { z } from "zod";
import { billingMode } from "@/lib/assinatura/config";
import { privateBody, privateError, privateJson, requireAppOrigin, PrivateHttpError } from "@/lib/auth/http";
import { createSessionClient } from "@/lib/auth/server";
import { reserveFrequency } from "@/lib/workspace/frequency";

const schema = z.object({ email: z.string().trim().toLowerCase().email().max(254), captchaToken: z.string().min(1).max(4096).optional() }).strict();

export async function POST(request: Request): Promise<Response> {
  try {
    requireAppOrigin(request);
    if (billingMode() !== "test") throw new PrivateHttpError(503, "billing_disabled", "Assinatura indisponível.");
    const parsed = schema.safeParse(await privateBody(request));
    if (!parsed.success) throw new PrivateHttpError(400, "invalid_input", "Confira seu e-mail.");
    await reserveFrequency("otp_send", parsed.data.email);
    const client = await createSessionClient();
    const { error } = await client.auth.signInWithOtp({ email: parsed.data.email, options: {
      shouldCreateUser: true, ...(parsed.data.captchaToken ? { captchaToken: parsed.data.captchaToken } : {}),
    } });
    if (error?.status === 429) throw new PrivateHttpError(429, "rate_limited", "Tente novamente mais tarde.");
    // Supabase may distinguish a missing account from an accepted address.
    // Return the same public result for either case; keep explicit rate limiting.
    return privateJson({ ok: true, message: "Se o endereço puder receber códigos, enviaremos um e-mail." });
  } catch (error) { return privateError(error); }
}
