import type { CheckoutStatus,Scope } from "@/lib/assinatura/contrato";
import { stripeTestConfig } from "@/lib/assinatura/config";
import { PrivateHttpError } from "@/lib/auth/http";
import { createBillingReconciler } from "./reconcile";
import { supabaseReconcileRepository } from "./reconcile-repository";
import { createStripeGateway } from "./stripe-adapter";
import type { ReconcileRepository } from "./reconcile-repository";
import type { StripeGateway } from "./contrato";

export function createCheckoutStatusService(repo:ReconcileRepository,gateway:StripeGateway,priceId:string){
 return async (scope:Scope,attemptId:string):Promise<CheckoutStatus>=>{
  const attempt=await repo.ownerForAttempt(scope,attemptId);
  if(!attempt)throw new PrivateHttpError(404,"checkout_not_found","Sessão de cobrança não encontrada.");
  let access;
  const service=createBillingReconciler(repo,gateway,priceId);
  if(attempt.sessionId){
    const session=await gateway.getCheckout(attempt.sessionId);
    if(session.customerId!==attempt.customerId||session.workspaceId!==scope.workspaceId||session.attemptId!==attemptId||session.priceId!==priceId)throw new PrivateHttpError(503,"stripe_mismatch","Sessão de cobrança inconsistente.");
    access=session.subscriptionId?await service.reconcileForOwner(scope.workspaceId,attempt.customerId,session.subscriptionId):await service.reconcileCustomer(scope.workspaceId,attempt.customerId);
  }else access=await service.reconcileCustomer(scope.workspaceId,attempt.customerId);
  return {state:access.status==="active"||access.status==="past_due"?"active":access.status==="canceled"?"canceled":access.status==="incomplete_expired"?"expired":"pending",draftId:attempt.draftId,draftVersion:attempt.draftVersion,access};
 };
}
export async function checkoutStatus(scope:Scope,attemptId:string):Promise<CheckoutStatus>{
  let config;
  try{config=stripeTestConfig();}catch{throw new PrivateHttpError(503,"billing_disabled","Cobrança indisponível.");}
  return createCheckoutStatusService(supabaseReconcileRepository,createStripeGateway(config),config.priceId)(scope,attemptId);
}
