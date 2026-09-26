export class ErroContexto extends Error {
  constructor(message: string, public status = 400, public codigo = "entrada_invalida") { super(message); }
}
export function respostaErro(e: unknown): Response {
  const err = e instanceof ErroContexto ? e : new ErroContexto("Não foi possível processar o material. Tente novamente.", 502, "processamento");
  return Response.json({ erro: err.message, codigo: err.codigo }, {
    status: err.status, headers: { "Cache-Control": "no-store", ...(err.status === 429 ? { "Retry-After": "60" } : {}) },
  });
}
