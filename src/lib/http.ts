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
