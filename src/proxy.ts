import type { NextRequest } from "next/server";
import { refreshSession } from "@/lib/auth/proxy";

export function proxy(request: NextRequest) { return refreshSession(request); }

export const config = { matcher: ["/api/auth/:path*", "/api/assinatura/:path*", "/app/:path*"] };
