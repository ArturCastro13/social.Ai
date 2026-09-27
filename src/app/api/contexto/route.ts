import { z } from "zod";
import { materiaisSchema } from "@/lib/contexto/contrato";
import { conhecimentoFounderSchema } from "@/lib/motor/contrato";
import { brandParaInferencia } from "@/lib/motor/inferir";
import { provedorConfigurado } from "@/lib/llm";
import { entenderEmpresa } from "@/lib/contexto/entender";
import { ErroContexto, respostaErro } from "@/lib/contexto/erros";
import { lerCorpoLimitado, protegerOrigem, reservarContexto } from "@/lib/contexto/requisicao";
export const runtime = "nodejs";
export const maxDuration = 60;
const entrada = z.object({ brand: z.record(z.string(), z.unknown()), founder: conhecimentoFounderSchema.default({}), materiais: materiaisSchema.default([]), descricaoManual: z.string().trim().max(1200).optional(), publico: z.string().trim().max(300).optional() });
export async function POST(req: Request) {
  let liberar: (() => void) | undefined;
  try {
    protegerOrigem(req); liberar = reservarContexto(process.env.VERCEL ? req.headers.get("x-real-ip") ?? "local" : "local");
    const bytes = await lerCorpoLimitado(req, 150_000);
    let value: unknown; try { value = JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new ErroContexto("Contexto inválido."); }
    const parsed = entrada.safeParse(value);
    if (!parsed.success) throw new ErroContexto("Revise os dados e os limites dos materiais antes de analisar.");
    const brand = brandParaInferencia(parsed.data.brand);
    if (!brand) throw new ErroContexto("O perfil da empresa está incompleto. Volte e preencha a descrição.");
    const entendimento = await entenderEmpresa({ ...parsed.data, brand }, provedorConfigurado());
    return Response.json({ entendimento }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) { return respostaErro(e); } finally { liberar?.(); }
}
