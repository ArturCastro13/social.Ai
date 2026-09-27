import { privateError,privateJson } from "@/lib/auth/http";
import { requireScope } from "@/lib/auth/scope";
import { checkoutStatus } from "@/lib/billing/status";
export const runtime="nodejs";
export async function GET(request:Request){
  try{
    const attemptId=new URL(request.url).searchParams.get("attempt");
    if(!attemptId||!/^[0-9a-f-]{36}$/i.test(attemptId))return privateJson({erro:"Sessão inválida.",codigo:"invalid_checkout"},400);
    return privateJson(await checkoutStatus(await requireScope(),attemptId));
  }catch(error){return privateError(error);}
}
