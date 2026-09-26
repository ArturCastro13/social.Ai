import { z } from "zod";
import { store } from "@/lib/store";

const entrada = z.object({
  nome: z.string().trim().min(2).max(120),
  empresa: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(254),
  website: z.string().max(200).optional().default(""),
});

export async function POST(request: Request) {
  if (Number(request.headers.get("content-length") ?? 0) > 2048) {
    return Response.json({ erro: "Dados grandes demais." }, { status: 413 });
  }
  let raw: string;
  try { raw = await request.text(); } catch {
    return Response.json({ erro: "Não foi possível ler os dados." }, { status: 400 });
  }
  if (raw.length > 2048) return Response.json({ erro: "Dados grandes demais." }, { status: 413 });
  let body: unknown;
  try { body = JSON.parse(raw); } catch {
    return Response.json({ erro: "Dados inválidos." }, { status: 400 });
  }
  const resultado = entrada.safeParse(body);
  if (!resultado.success || resultado.data.website) {
    return Response.json({ erro: "Confira seu nome, o nome da empresa e seu e-mail." }, { status: 400 });
  }
  // O armazenamento local do MVP pode ser efêmero e esconder falhas de escrita.
  // Uma inscrição só é confirmada quando há persistência no banco configurado.
  if (store.tipo !== "supabase") {
    return Response.json({ erro: "As inscrições estão temporariamente indisponíveis. Tente novamente em breve." }, { status: 503 });
  }
  try {
    await store.salvarLead({ nome: resultado.data.nome, email: resultado.data.email, empresa: resultado.data.empresa, origem: "lista-de-espera" });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ erro: "Não conseguimos salvar seu e-mail agora. Tente novamente." }, { status: 503 });
  }
}
