import { appOrigin } from "@/lib/assinatura/config";

export class PrivateHttpError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string) { super(message); }
}

export function privateJson(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: { "cache-control": "private, no-store, max-age=0", "x-content-type-options": "nosniff" } });
}

export function privateError(error: unknown): Response {
  if (error instanceof PrivateHttpError) return privateJson({ code: error.code, message: error.message }, error.status);
  return privateJson({ code: "dependency_unavailable", message: "Serviço temporariamente indisponível." }, 503);
}

export function requireAppOrigin(request: Request): void {
  let expected: string;
  try { expected = appOrigin(); } catch { throw new PrivateHttpError(503, "dependency_unavailable", "Serviço temporariamente indisponível."); }
  const origin = request.headers.get("origin");
  if (origin !== expected) throw new PrivateHttpError(403, "invalid_origin", "Origem não permitida.");
}

export async function privateBody(request: Request, maxLength = 2048): Promise<unknown> {
  if (Number(request.headers.get("content-length") || 0) > maxLength) throw new PrivateHttpError(413, "body_too_large", "Dados grandes demais.");
  let raw: string;
  try { raw = await request.text(); } catch { throw new PrivateHttpError(400, "invalid_body", "Dados inválidos."); }
  if (raw.length > maxLength) throw new PrivateHttpError(413, "body_too_large", "Dados grandes demais.");
  try { return JSON.parse(raw) as unknown; } catch { throw new PrivateHttpError(400, "invalid_body", "Dados inválidos."); }
}
