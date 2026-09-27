import { randomUUID } from "node:crypto";
import type { AccessState } from "@/lib/assinatura/contrato";
import { PrivateHttpError } from "@/lib/auth/http";
import type { RemoteSubscription, StripeGateway } from "./contrato";
import type { Lease, ReconcileRepository } from "./reconcile-repository";
import { StripeEvidenceError } from "./stripe-adapter";

const busy = () => new PrivateHttpError(503,"billing_busy","Cobrança ocupada. Tente novamente.");
const mismatch = () => new PrivateHttpError(503,"stripe_mismatch","Dados de cobrança inconsistentes.");
const pause = (ms:number) => new Promise<void>(resolve=>setTimeout(resolve,ms));
const isCurrent=(s:RemoteSubscription)=>s.status!=="canceled"&&s.status!=="incomplete_expired";

export function createBillingReconciler(repository:ReconcileRepository,gateway:StripeGateway,priceId:string, wait=pause) {
  async function withLease<T>(workspaceId:string,customerId:string,fn:(lease:Lease)=>Promise<T>):Promise<T> {
    for(let i=0;i<8;i++){
      const lease=await repository.claim(workspaceId,customerId,randomUUID());
      if(!lease){await wait(80);continue;}
      try{return await fn(lease);}finally{await repository.release(lease);}
    }
    throw busy();
  }
  async function reconcileLocked(lease:Lease, subscriptionId:string, knownCurrent?:RemoteSubscription[]):Promise<AccessState> {
    let current:RemoteSubscription[];
    try { current=knownCurrent??await gateway.listCurrentSubscriptions(lease.customerId); }
    catch(error){
      if(!(error instanceof StripeEvidenceError))throw error;
      await repository.hold(lease,"inconsistent_subscription");
      return repository.access(lease.workspaceId);
    }
    if(current.some(s=>s.customerId!==lease.customerId||s.priceId!==priceId||s.livemode!==false))throw mismatch();
    if(current.filter(isCurrent).length>1){await repository.hold(lease,"duplicate_subscription");return repository.access(lease.workspaceId);}
    const soleCurrent=current.find(isCurrent);
    if(soleCurrent&&soleCurrent.id!==subscriptionId)return reconcileLocked(lease,soleCurrent.id,current);
    const sub=await gateway.getSubscription(subscriptionId);
    if(sub.customerId!==lease.customerId||sub.priceId!==priceId||sub.livemode!==false)throw mismatch();
    // Current Stripe state is authoritative for status; paid history is independently verified.
    const invoices=await gateway.listPaidInvoices(sub.id);
    for(const invoice of invoices){
      if(invoice.customerId!==lease.customerId||invoice.subscriptionId!==sub.id||invoice.priceId!==priceId||invoice.subscriptionItemId!==sub.subscriptionItemId||invoice.livemode!==false||invoice.paid!==true||!(["subscription_create","subscription_cycle"] as string[]).includes(invoice.billingReason))throw mismatch();
      await repository.apply(lease,sub,invoice);
    }
    await repository.apply(lease,sub);
    return repository.access(lease.workspaceId);
  }
  async function reconcileSubscription(subscriptionId:string):Promise<AccessState>{
    const sub=await gateway.getSubscription(subscriptionId);
    const workspaceId=await repository.ownerForCustomer(sub.customerId);
    if(!workspaceId)throw mismatch();
    return withLease(workspaceId,sub.customerId,lease=>reconcileLocked(lease,subscriptionId));
  }
  async function reconcileForOwner(workspaceId:string,customerId:string,subscriptionId:string):Promise<AccessState>{
    return withLease(workspaceId,customerId,lease=>reconcileLocked(lease,subscriptionId));
  }
  async function reconcileCustomer(workspaceId:string,customerId:string):Promise<AccessState>{
    return withLease(workspaceId,customerId,async lease=>{
      let subs:RemoteSubscription[];
      try{subs=await gateway.listCurrentSubscriptions(customerId);}
      catch(error){if(!(error instanceof StripeEvidenceError))throw error;await repository.hold(lease,"inconsistent_subscription");return repository.access(workspaceId);}
      if(subs.some(s=>s.customerId!==customerId||s.priceId!==priceId))throw mismatch();
      const active=subs.filter(isCurrent);
      if(active.length>1){await repository.hold(lease,"duplicate_subscription");return repository.access(workspaceId);}
      if(active.length===1)return reconcileLocked(lease,active[0].id,subs);
      const prior=await repository.access(workspaceId);
      if(prior.status==="active"||prior.status==="past_due"||prior.status==="unpaid")await repository.hold(lease,"missing_current_subscription");
      return repository.access(workspaceId);
    });
  }
  async function risk(kind:"refund"|"dispute",objectId:string,eventId:string):Promise<"processed"|"risk_unresolved">{
    const resolution=await gateway.resolveRisk(kind,objectId);
    const workspaceId=resolution.customerId?await repository.ownerForCustomer(resolution.customerId):null;
    if(!workspaceId||!resolution.customerId)return "risk_unresolved";
    return withLease(workspaceId,resolution.customerId,async lease=>{
      if(resolution.kind==="unresolved") {await repository.hold(lease,"unresolved_risk",eventId);return "risk_unresolved";}
      for(const id of resolution.subscriptionIds){
        const sub=await gateway.getSubscription(id);
        if(sub.customerId!==lease.customerId||sub.priceId!==priceId)throw mismatch();
        await repository.hold(lease,kind,eventId,id);
      }
      return "processed";
    });
  }
  return {reconcileSubscription,reconcileForOwner,reconcileCustomer,risk};
}
