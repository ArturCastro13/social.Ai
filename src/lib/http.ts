import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

// CORS aberto: a interface recriada na Adapta chama esta API de outro domínio.
export const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "content-type, x-admin-password",
};

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: CORS_HEADERS });
}

export function erro(mensagem: string, status = 400, extra: Record<string, unknown> = {}) {
  return json({ erro: mensagem, ...extra }, status);
}

export function options() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function lerJson<T = unknown>(req: Request): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}

/**
 * Páginas /admin: exigem o header x-admin-password igual a ADMIN_PASSWORD.
 * Sem senha configurada, só ficam abertas em desenvolvimento local; em produção ficam fechadas.
 */
export function adminOk(req: Request): boolean {
  const senha = process.env.ADMIN_PASSWORD;
  if (!senha) return !process.env.VERCEL && process.env.NODE_ENV !== "production";
  const enviada = Buffer.from(req.headers.get("x-admin-password") ?? "");
  const esperada = Buffer.from(senha);
  return enviada.length === esperada.length && timingSafeEqual(enviada, esperada);
}

export const MSG_SENHA = process.env.ADMIN_PASSWORD
  ? "Senha de admin incorreta. Digite a senha no campo do topo."
  : "Área do time fechada: defina ADMIN_PASSWORD na Vercel (veja DEPLOY.md).";
