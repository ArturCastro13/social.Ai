import { adminOk, erro, json, MSG_SENHA, options } from "@/lib/http";
import type { InscricaoEspera } from "@/lib/lista-espera";
import { store } from "@/lib/store";

export const OPTIONS = options;

const ORIGEM = "lista-de-espera";

/** Inscrições da lista de espera, mais novas primeiro. Não junta e-mails repetidos: a página mostra quantos são. */
export async function GET(req: Request) {
  if (!adminOk(req)) return erro(MSG_SENHA, 401);
  let leads;
  try {
    leads = await store.listarLeads(ORIGEM);
  } catch (e) {
    console.error("[admin/lista-de-espera]", e);
    return erro("Não foi possível ler a lista agora. Tente de novo em instantes.", 500);
  }
  const itens: InscricaoEspera[] = leads
    .filter((l) => l.origem === ORIGEM)
    .map((l) => ({ empresa: l.empresa ?? "", email: l.email, criado_em: l.criado_em }))
    .sort((a, b) => (Date.parse(b.criado_em) || 0) - (Date.parse(a.criado_em) || 0));
  return json({ itens, total: itens.length, armazenamento: store.tipo, persistente: store.tipo === "supabase" });
}
