import { describe,expect,it } from "vitest";
import type { Scope,AccessState } from "@/lib/assinatura/contrato";
import type { StripeGateway } from "@/lib/billing/contrato";
import type { ReconcileRepository } from "@/lib/billing/reconcile-repository";
import { createCheckoutStatusService } from "@/lib/billing/status";

const scope:Scope={userId:"user_1",workspaceId:"aa6ef591-f218-4ea7-9943-c16d019ca357"};
const attemptId="6287fd79-437d-42e7-a119-6818ffaf78a5";
const access:AccessState={status:"none",paidFrom:null,paidThrough:null,cancelAtPeriodEnd:false,riskHold:false};
function fixture(){
  let customerId="cus_owner";let remoteCalls=0;
  const repo:ReconcileRepository={
    async ownerForCustomer(){return scope.workspaceId;},async ownerForAttempt(s,id){return s.userId===scope.userId&&id===attemptId?{customerId:"cus_owner",sessionId:"cs_test_1",draftId:"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",draftVersion:1}:null;},
    async beginEvent(){return "pending";},async finishEvent(){},async pendingEvents(){return [];},
    async claim(workspace,customer,token){return {workspaceId:workspace,customerId:customer,token,generation:1};},async release(){},async apply(){},async hold(){},async access(){return access;},
  };
  const gateway:StripeGateway={
    async ensureCustomer(){throw new Error("unused");},async getCustomer(){throw new Error("unused");},async createCheckout(){throw new Error("unused");},
    async getCheckout(){remoteCalls++;return {id:"cs_test_1",url:null,livemode:false,status:"complete",subscriptionId:null,customerId,workspaceId:scope.workspaceId,attemptId,priceId:"price_monthly",expiresAt:"2026-10-01T00:00:00Z"};},
    async expireCheckout(){throw new Error("unused");},async listCurrentSubscriptions(){remoteCalls++;return [];},async getSubscription(){throw new Error("unused");},
    async getInvoiceReference(){throw new Error("unused");},async getPaidInvoice(){throw new Error("unused");},async listPaidInvoices(){return [];},verifyEvent(){throw new Error("unused");},async resolveRisk(){return {kind:"unresolved",customerId:null};},async createPortal(){throw new Error("unused");},
  };
  return {status:createCheckoutStatusService(repo,gateway,"price_monthly"),calls:()=>remoteCalls,wrongCustomer:()=>{customerId="cus_other";}};
}
describe("checkout status",()=>{
  it("fetches current Stripe state and does not grant from completed Checkout",async()=>{
    const h=fixture();const result=await h.status(scope,attemptId);expect(h.calls()).toBeGreaterThan(0);expect(result.state).toBe("pending");expect(result.access.paidThrough).toBeNull();
  });
  it("rejects session Customer mismatch and foreign owner",async()=>{
    const h=fixture();h.wrongCustomer();await expect(h.status(scope,attemptId)).rejects.toMatchObject({code:"stripe_mismatch"});
    await expect(h.status({...scope,userId:"other"},attemptId)).rejects.toMatchObject({status:404});
  });
});
