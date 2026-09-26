import { adminOk, erro, json, MSG_SENHA, options } from "@/lib/http";

export const OPTIONS = options;

/** Confere a senha do time (header x-admin-password). A tela de senha do admin só abre as páginas com 200. */
export async function GET(req: Request) {
  if (!adminOk(req)) {
    // Um respiro curto a cada erro deixa tentativa em massa mais lenta.
    await new Promise((r) => setTimeout(r, 400));
    return erro(MSG_SENHA, 401);
  }
  return json({ ok: true });
}
