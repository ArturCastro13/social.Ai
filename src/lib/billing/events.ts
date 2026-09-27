import { stripeTestConfig } from "@/lib/assinatura/config";
import { PrivateHttpError, privateJson } from "@/lib/auth/http";
import { createBillingReconciler } from "./reconcile";
import { supabaseReconcileRepository } from "./reconcile-repository";
import { createStripeGateway, StripeEvidenceError } from "./stripe-adapter";
import type { StripeGateway, VerifiedEvent } from "./contrato";
import type { ReconcileRepository } from "./reconcile-repository";

const relevant=new Set(["checkout.session.completed","invoice.paid","invoice.payment_failed","invoice.payment_action_required","customer.subscription.updated","customer.subscription.deleted","customer.subscription.paused","customer.subscription.resumed","charge.refunded","charge.dispute.created"]);
export async function processStripeEvent(rawBody:string,signature:string):Promise<"processed"|"duplicate"|"ignored">{
  let config;
  try{config=stripeTestConfig();}catch{throw new PrivateHttpError(503,"billing_disabled","Cobrança indisponível.");}
  if(Buffer.byteLength(rawBody,"utf8")>65536)throw new PrivateHttpError(413,"body_too_large","Evento grande demais.");
  const gateway=createStripeGateway(config);
  const event=gateway.verifyEvent(rawBody,signature,config.webhookSecret);
  const repo=supabaseReconcileRepository;
  const state=await repo.beginEvent(event);
  if(state!=="pending")return "duplicate";
  return applyVerifiedEvent(event,repo,gateway,config.priceId);
}
export async function applyVerifiedEvent(event:VerifiedEvent,repo:ReconcileRepository,gateway:StripeGateway,priceId:string):Promise<"processed"|"ignored">{
  if(!relevant.has(event.type)){await repo.finishEvent(event.eventId,"ignored");return "ignored";}
  const service=createBillingReconciler(repo,gateway,priceId);
  if(event.type==="charge.refunded"||event.type==="charge.dispute.created"){
    const outcome=await service.risk(event.type==="charge.refunded"?"refund":"dispute",event.objectId,event.eventId);
    await repo.finishEvent(event.eventId,outcome);
    return "processed";
  }
  if(event.type==="checkout.session.completed"){
    const session=await gateway.getCheckout(event.objectId);
    if(session.status!=="complete")throw new StripeEvidenceError("checkout_not_complete");
    const workspace=await repo.ownerForCustomer(session.customerId);
    if(!workspace||workspace!==session.workspaceId||session.priceId!==priceId)throw new StripeEvidenceError("wrong_checkout_owner");
    await service.reconcileCustomer(workspace,session.customerId);
  }else if(event.type.startsWith("invoice.")){
    const invoice=await gateway.getInvoiceReference(event.objectId);
    const subscription=await gateway.getSubscription(invoice.subscriptionId);
    if(invoice.customerId!==subscription.customerId||subscription.priceId!==priceId)throw new StripeEvidenceError("wrong_invoice_owner");
    await service.reconcileSubscription(invoice.subscriptionId);
  }else await service.reconcileSubscription(event.objectId);
  await repo.finishEvent(event.eventId,"processed");
  return "processed";
}
export function billingWebhookError(error:unknown):Response{
  if(error instanceof PrivateHttpError)return privateJson({erro:error.message,codigo:error.code},error.status);
  if(error instanceof StripeEvidenceError&&["invalid_signature","invalid_event"].includes(error.code))return privateJson({erro:"Evento Stripe inválido.",codigo:error.code},400);
  return privateJson({erro:"Cobrança temporariamente indisponível.",codigo:"dependency_unavailable"},503);
}
