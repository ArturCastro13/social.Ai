import { z } from "zod";
import { erro, json, lerJson, options } from "@/lib/http";
import { provedorConfigurado } from "@/lib/llm";
import { brandParaInferencia } from "@/lib/motor/inferir";
import { buscarConcorrentes, pesquisaGuardada, reservarUsoConcorrentes } from "@/lib/motor/concorrentes";
import { contextoConfirmadoSchema } from "@/lib/contexto/contrato";

// Disparada assim que o site é lido, enquanto o founder responde as perguntas: concorrentes conferidos e,
// com Claude, a pesquisa de mercado na web (o que eles publicam e o que está em alta no nicho).
// Sem IA, a base curada do nicho. Nunca devolve erro por falha de IA ou de rede.
export const maxDuration = 90;

const Entrada = z.object({
  // Resultado de /api/brand, ou o perfil montado para empresa sem site.
  brand: z.record(z.string(), z.unknown()),
  publico: z.string().trim().max(300).optional(),
  contexto: contextoConfirmadoSchema.optional(),
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
  if (body.data.contexto && body.data.contexto.empresa !== brand.dominio) return erro("O contexto pertence a outra empresa.", 400);

  const guardada = await pesquisaGuardada(brand, body.data.publico, body.data.contexto);
  if (guardada) return json(guardada);

  const ip = req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const llm = provedorConfigurado("pesquisa");
  try {
    const resposta = await buscarConcorrentes(brand, {
      publico: body.data.publico,
      contexto: body.data.contexto,
      // Passou do limite do dia: só a base curada, sem gastar IA.
      llm: llm && reservarUsoConcorrentes(ip) ? llm : null,
    });
    return json(resposta);
  } catch (e) {
    console.error("[concorrentes]", (e as Error).message);
    return json({ sugestoes: [] });
  }
}
