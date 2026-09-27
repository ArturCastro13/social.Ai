import { billingWebhookError,processStripeEvent } from "@/lib/billing/events";
import { privateJson } from "@/lib/auth/http";
import { PrivateHttpError } from "@/lib/auth/http";
import { lerCorpoLimitado } from "@/lib/contexto/requisicao";
export const runtime="nodejs";
export async function POST(request:Request){
  try{
    let raw:string;
    try{raw=new TextDecoder("utf-8",{fatal:true}).decode(await lerCorpoLimitado(request,65536));}
    catch(error){if(error&&typeof error==="object"&&"status" in error&&error.status===413)throw new PrivateHttpError(413,"body_too_large","Evento grande demais.");throw new PrivateHttpError(400,"invalid_body","Evento inválido.");}
    const result=await processStripeEvent(raw,request.headers.get("stripe-signature")??"");
    return privateJson({received:true,result});
  }catch(error){return billingWebhookError(error);}
}
