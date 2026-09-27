import { describe, expect, it } from "vitest";
import { canGeneratePaid } from "@/lib/assinatura/acesso";
import type { AccessState } from "@/lib/assinatura/contrato";
import type { RemoteInvoice, RemoteSubscription, StripeGateway } from "@/lib/billing/contrato";
import { createBillingReconciler } from "@/lib/billing/reconcile";
import type { ReconcileRepository } from "@/lib/billing/reconcile-repository";

const workspaceId="aa6ef591-f218-4ea7-9943-c16d019ca357";
const customerId="cus_owner";
const paid:RemoteInvoice={id:"in_old",livemode:false,customerId,subscriptionId:"sub_1",billingReason:"subscription_create",paid:true,subscriptionItemId:"si_1",priceId:"price_monthly",lineId:"il_1",periodStart:"2026-02-01T00:00:00.000Z",periodEnd:"2026-03-01T00:00:00.000Z"};
function harness(){
  let status:RemoteSubscription["status"]="active";
  let invoices:RemoteInvoice[]=[paid];
  let now=new Date("2026-02-15T00:00:00Z");
  let generation=0;
  let held=false;
  let access:AccessState={status:"none",paidFrom:null,paidThrough:null,cancelAtPeriodEnd:false,riskHold:false};
  const grants=new Set<string>();
  const sub=():RemoteSubscription=>({id:"sub_1",livemode:false,customerId,status,priceId:"price_monthly",subscriptionItemId:"si_1",cancelAtPeriodEnd:false,periodStart:paid.periodStart,periodEnd:paid.periodEnd,latestInvoiceId:invoices.at(-1)?.id??"in_unpaid"});
  const repository:ReconcileRepository={
    async ownerForCustomer(id){return id===customerId?workspaceId:null;},async ownerForAttempt(){return null;},
    async beginEvent(){return "pending";},async finishEvent(){},async pendingEvents(){return [];},
    async claim(workspace,customer,token){if(held)return null;held=true;return {workspaceId:workspace,customerId:customer,token,generation:++generation};},
    async release(lease){if(lease.generation===generation)held=false;},
    async apply(lease,remote,invoice){if(lease.generation!==generation||!held)throw new Error("stale lease");if(invoice&&!grants.has(invoice.id)){grants.add(invoice.id);if(!access.paidThrough||invoice.periodEnd>access.paidThrough)access={...access,paidFrom:invoice.periodStart,paidThrough:invoice.periodEnd};}access={...access,status:remote.status,cancelAtPeriodEnd:remote.cancelAtPeriodEnd};},
    async hold(){access={...access,riskHold:true};},async access(){return {...access};},
  };
  const gateway:StripeGateway={
    async ensureCustomer(){throw new Error("unused");},async getCustomer(){throw new Error("unused");},async createCheckout(){throw new Error("unused");},async getCheckout(){throw new Error("unused");},async expireCheckout(){throw new Error("unused");},
    async listCurrentSubscriptions(){return status==="canceled"?[]:[sub()];},async getSubscription(){return sub();},async getInvoiceReference(){throw new Error("unused");},async getPaidInvoice(){return paid;},async listPaidInvoices(){return invoices;},
    verifyEvent(){throw new Error("unused");},async resolveRisk(){return {kind:"resolved",customerId,subscriptionIds:["sub_1"]};},async createPortal(){throw new Error("unused");},
  };
  const service=createBillingReconciler(repository,gateway,"price_monthly",async()=>{});
  return {service,setStatus:(s:RemoteSubscription["status"])=>{status=s;},setInvoices:(v:RemoteInvoice[])=>{invoices=v;},setNow:(v:Date)=>{now=v;},can:async()=>canGeneratePaid(await repository.access(workspaceId),now),grantCount:()=>grants.size};
}
describe("billing reconciliation",()=>{
  it("old paid invoice cannot reopen canceled subscription",async()=>{
    const h=harness();await h.service.reconcileSubscription("sub_1");expect(await h.can()).toBe(true);
    h.setStatus("canceled");await h.service.reconcileSubscription("sub_1");await h.service.reconcileSubscription("sub_1");
    expect(await h.can()).toBe(false);expect(h.grantCount()).toBe(1);
  });
  it("unpaid renewal preserves prior paid period but never extends it",async()=>{
    const h=harness();await h.service.reconcileSubscription("sub_1");h.setStatus("past_due");h.setInvoices([]);h.setNow(new Date("2026-03-02T00:00:00Z"));
    const access=await h.service.reconcileSubscription("sub_1");expect(access.paidThrough).toBe(paid.periodEnd);expect(await h.can()).toBe(false);
  });
  it("risk hold blocks access without canceling or refunding",async()=>{
    const h=harness();await h.service.reconcileSubscription("sub_1");await h.service.risk("refund","ch_1","evt_1");expect(await h.can()).toBe(false);
  });
});
