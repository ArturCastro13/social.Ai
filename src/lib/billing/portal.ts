import type { Scope } from "@/lib/assinatura/contrato";
import { stripeTestConfig } from "@/lib/assinatura/config";
import { PrivateHttpError } from "@/lib/auth/http";
import type { BillingRepository, StripeGateway } from "./contrato";
import { supabaseBillingRepository } from "./repository";
import { createStripeGateway } from "./stripe-adapter";

export function createPortalService(repository: BillingRepository, gateway: StripeGateway, config: { origin: string; portalConfigurationId?: string }) {
  return async (scope: Scope): Promise<{ url: string }> => {
    if (!config.portalConfigurationId) throw new PrivateHttpError(503, "portal_unavailable", "Portal indisponível.");
    const row = await repository.customer(scope);
    if (!row?.customerId || row.recoveryRequired || row.workspaceId !== scope.workspaceId) throw new PrivateHttpError(404, "billing_customer_missing", "Cliente de cobrança não encontrado.");
    const remote = await gateway.getCustomer(row.customerId);
    if (remote.livemode !== false || remote.workspaceId !== scope.workspaceId) throw new PrivateHttpError(503, "stripe_mismatch", "Cliente de cobrança inconsistente.");
    return gateway.createPortal(row.customerId, scope.workspaceId, config.portalConfigurationId, `${config.origin}/app/billing`);
  };
}

export async function openPortal(scope: Scope): Promise<{ url: string }> {
  let config;
  try { config = stripeTestConfig(); } catch { throw new PrivateHttpError(503, "billing_disabled", "Cobrança indisponível."); }
  return createPortalService(supabaseBillingRepository, createStripeGateway(config), config)(scope);
}
