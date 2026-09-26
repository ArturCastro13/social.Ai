import { z } from "zod";
import { provedorConfigurado } from "@/lib/llm";
import { validarArquivo } from "@/lib/contexto/arquivos";
import { extrairMaterial } from "@/lib/contexto/extrair";
import { ErroContexto, respostaErro } from "@/lib/contexto/erros";
import { lerCorpoLimitado, protegerOrigem, reservarContexto } from "@/lib/contexto/requisicao";

export const runtime = "nodejs";
export const maxDuration = 60;
const textoSchema = z.object({ nome: z.string().trim().min(1).max(160), origem: z.enum(["notion", "granola", "outro"]), texto: z.string().trim().min(1).max(20_000) }).strict();

export async function POST(req: Request) {
  let liberar: (() => void) | undefined;
  try {
    protegerOrigem(req);
    // Localhost: shared quota. Only trust platform-provided IP when deployed on Vercel.
    liberar = reservarContexto(process.env.VERCEL ? req.headers.get("x-real-ip") ?? "local" : "local");
    const type = req.headers.get("content-type") ?? "";
    const multipart = type.startsWith("multipart/form-data;");
    if (!multipart && !type.startsWith("application/json")) throw new ErroContexto("Envie arquivo ou texto.", 415);
    const bytes = await lerCorpoLimitado(req, multipart ? 3_200_000 : 100_000);
    let input;
    if (multipart) {
      let form: FormData;
      try { form = await new Response(bytes as BodyInit, { headers: { "content-type": type } }).formData(); } catch { throw new ErroContexto("Envio de arquivo inválido."); }
      const file = form.get("arquivo");
      if (!(file instanceof File) || [...form.keys()].length !== 1 || !file.name.trim() || file.name.length > 160) throw new ErroContexto("Envie um arquivo por vez, com nome de até 160 caracteres.");
      input = { nome: file.name, origem: "arquivo" as const, arquivo: await validarArquivo(file) };
    } else {
      let json: unknown;
      try { json = JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new ErroContexto("Texto inválido."); }
      const p = textoSchema.safeParse(json);
      if (!p.success) throw new ErroContexto("Preencha o nome e um texto de até 20 mil caracteres.");
      input = p.data;
    }
    const material = await extrairMaterial(input, provedorConfigurado());
    return Response.json({ material }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) { return respostaErro(e); } finally { liberar?.(); }
}
