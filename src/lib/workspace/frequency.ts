import { createHmac } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { PrivateHttpError } from "@/lib/auth/http";
import { createSessionClient } from "@/lib/auth/server";
import type { Scope } from "@/lib/assinatura/contrato";

type Action = "otp_send" | "otp_verify" | "checkout" | "provider";
const POLICY: Record<Action, { windowSeconds: number; limit: number }> = {
  otp_send: { windowSeconds: 3600, limit: 5 },
  otp_verify: { windowSeconds: 3600, limit: 10 },
  checkout: { windowSeconds: 3600, limit: 5 },
  provider: { windowSeconds: 3600, limit: 30 },
};

function unavailable(): never { throw new PrivateHttpError(503, "dependency_unavailable", "Serviço temporariamente indisponível."); }

/** Only the HMAC digest reaches SQL; no email or IP appears in the ledger. */
export async function reserveFrequency(action: Action, identity: string, scope?: Scope): Promise<void> {
  const secret = process.env.FREQUENCY_HMAC_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret || Buffer.byteLength(secret, "utf8") < 32 || !url || !key) unavailable();
  if (scope) {
    try {
      const client = await createSessionClient();
      const { data, error } = await client.auth.getUser();
      if (error || data.user?.id !== scope.userId || identity !== scope.workspaceId) unavailable();
    } catch { return unavailable(); }
  } else if (action === "checkout" || action === "provider") unavailable();
  const identityHash = createHmac("sha256", secret).update(`${action}:${identity.trim().toLowerCase()}`).digest("hex");
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.rpc("reserve_workspace_frequency", {
    p_action: action, p_identity_hash: identityHash,
    p_window_seconds: POLICY[action].windowSeconds, p_limit: POLICY[action].limit,
  });
  if (error || typeof data !== "boolean") unavailable();
  if (!data) throw new PrivateHttpError(429, "rate_limited", "Tente novamente mais tarde.");
}

export function reserveCheckoutFrequency(scope: Scope) { return reserveFrequency("checkout", scope.workspaceId, scope); }
export function reserveProviderFrequency(scope: Scope) { return reserveFrequency("provider", scope.workspaceId, scope); }
