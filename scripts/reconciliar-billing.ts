import { stripeTestConfig } from "../src/lib/assinatura/config";
import { loadEnvConfig } from "@next/env";
import { applyVerifiedEvent } from "../src/lib/billing/events";
import { supabaseReconcileRepository } from "../src/lib/billing/reconcile-repository";
import { createStripeGateway } from "../src/lib/billing/stripe-adapter";

async function main(){
  if(process.argv.slice(2).join(" ")!=="--test --pending")throw new Error("Uso: npx tsx scripts/reconciliar-billing.ts --test --pending");
  loadEnvConfig(process.cwd(),true);
  const config=stripeTestConfig();
  const gateway=createStripeGateway(config);
  const pending=await supabaseReconcileRepository.pendingEvents();
  let processed=0;
  for(const row of pending){
    await applyVerifiedEvent({eventId:row.eventId,type:row.type,objectId:row.objectId,livemode:false},supabaseReconcileRepository,gateway,config.priceId);
    processed++;
  }
  process.stdout.write(`Billing sandbox: ${processed} evento(s) reconciliado(s).\n`);
}
main().catch(()=>{process.stderr.write("Reconciliação indisponível; verifique a configuração e tente novamente.\n");process.exitCode=1;});
