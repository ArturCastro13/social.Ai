import { NextResponse, type NextRequest } from "next/server";
import { billingMode } from "@/lib/assinatura/config";
import { refreshSession } from "@/lib/auth/proxy";

// Com a assinatura desligada (o padrão em produção), o proxy não faz nada: nem Supabase, nem cookies, nem cache-control.
// Valor inválido também não pode derrubar o /app: nesse caso ele só deixa passar.
export function proxy(request: NextRequest) {
  let modo: string;
  try {
    modo = billingMode();
  } catch {
    return NextResponse.next();
  }
  return modo === "test" ? refreshSession(request) : NextResponse.next();
}

export const config = { matcher: ["/api/auth/:path*", "/api/assinatura/:path*", "/app/:path*"] };
