import { appOrigin } from "@/lib/assinatura/config";
import { lerCorpoLimitado, protegerOrigem } from "@/lib/contexto/requisicao";

export class PrivateHttpError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string) { super(message); }
}

export function privateJson(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: { "cache-control": "private, no-store, max-age=0", "x-content-type-options": "nosniff" } });
}

export function privateError(error: unknown): Response {
  if (error instanceof PrivateHttpError) return privateJson({ erro: error.message, codigo: error.code }, error.status);
  return privateJson({ erro: "Serviço temporariamente indisponível.", codigo: "dependency_unavailable" }, 503);
}

export function requireAppOrigin(request: Request): void {
  let expected: string;
  try { expected = appOrigin(); } catch { throw new PrivateHttpError(503, "dependency_unavailable", "Serviço temporariamente indisponível."); }
  const origin = request.headers.get("origin");
  try { protegerOrigem(request); } catch { throw new PrivateHttpError(403, "invalid_origin", "Origem não permitida."); }
  if (origin !== expected) throw new PrivateHttpError(403, "invalid_origin", "Origem não permitida.");
}

export async function privateBody(request: Request, maxLength = 2048): Promise<unknown> {
  let raw: string;
  try { raw = new TextDecoder("utf-8", { fatal: true }).decode(await lerCorpoLimitado(request, maxLength)); }
  catch (error) { if (error && typeof error === "object" && "status" in error && error.status === 413) throw new PrivateHttpError(413, "body_too_large", "Dados grandes demais."); throw new PrivateHttpError(400, "invalid_body", "Dados inválidos."); }
  try { return JSON.parse(raw) as unknown; } catch { throw new PrivateHttpError(400, "invalid_body", "Dados inválidos."); }
}
