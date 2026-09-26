import { z } from "zod";
import { erro, json, lerJson, options } from "@/lib/http";
import { provedorConfigurado } from "@/lib/llm";
import { brandParaInferencia } from "@/lib/motor/inferir";
import { reservarUsoConcorrentes, sugerirConcorrentes } from "@/lib/motor/concorrentes";

// Tela de ajustes: sugestões de concorrentes para acompanhar. Uma chamada pequena de IA com os sites
// conferidos, ou a base curada do nicho. Nunca devolve erro por falha de IA ou de rede.
export const maxDuration = 20;

const Entrada = z.object({
  // Resultado de /api/brand, ou o perfil montado para empresa sem site.
  brand: z.record(z.string(), z.unknown()),
  publico: z.string().trim().max(300).optional(),
});

export const OPTIONS = options;

export async function POST(req: Request) {
  const body = Entrada.safeParse(await lerJson(req));
  if (!body.success) {
    return erro("Entrada inválida. Envie { brand } com o resultado de /api/brand e, se quiser, { publico }.", 400, {
      detalhes: body.error.issues.map((i) => `${i.path.join(".") || "entrada"}: ${i.message}`),
    });
  }
  const brand = brandParaInferencia(body.data.brand);
  if (!brand) return erro("O objeto brand veio incompleto. Envie o resultado de /api/brand ou os dados da empresa sem site.", 400);

  const ip = req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const llm = provedorConfigurado();
  try {
    const sugestoes = await sugerirConcorrentes(brand, {
      publico: body.data.publico,
      // Passou do limite do dia: só a base curada, sem gastar IA.
      llm: llm && reservarUsoConcorrentes(ip) ? llm : null,
    });
    return json({ sugestoes });
  } catch (e) {
    console.error("[concorrentes]", (e as Error).message);
    return json({ sugestoes: [] });
  }
}
