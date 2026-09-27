import { z } from "zod";
import { CORS_HEADERS, erro, json, lerJson, options } from "@/lib/http";
import { ErroImagem, criarImagemDoPost, reservarUsoImagem } from "@/lib/imagem";
import { doPayload, payloadSchema } from "@/lib/render/payload";

// Imagem do post com IA: o Claude escreve a direção de arte, a OpenAI gera a imagem sem texto e devolvemos a URL
// pública no bucket "posts". A arte final sai de /api/render com ?foto=<url>, que põe o texto da marca por cima.
// Direção de arte (uns 5 s) mais a imagem (20 a 60 s) mais o upload: 120 s dá folga.
export const runtime = "nodejs";
export const maxDuration = 120;

const Entrada = payloadSchema.extend({
  contexto: z
    .object({
      nicho: z.string().trim().max(40).optional(),
      publico: z.string().trim().max(600).optional(),
      tom: z.string().trim().max(400).optional(),
      resumo: z.string().trim().max(1200).optional(),
    })
    .optional(),
  // "Gerar outra" manda 1, 2, 3... para a direção de arte mudar de cena.
  variacao: z.number().int().min(0).max(50).default(0),
  // Tela ao vivo: pede a resposta em NDJSON, com a prévia borrada antes da capa final.
  aoVivo: z.boolean().optional(),
});

export const OPTIONS = options;

export async function POST(req: Request) {
  const body = Entrada.safeParse(await lerJson(req));
  if (!body.success) {
    return erro("Entrada inválida. Envie { post, brand } no mesmo formato da arte e, se quiser, { contexto, variacao }.", 400, {
      detalhes: body.error.issues.slice(0, 8).map((i) => `${i.path.join(".") || "entrada"}: ${i.message}`),
    });
  }
  const { contexto, variacao } = body.data;
  const { post, brand } = doPayload(body.data);
  const ip = req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";

  if (body.data.aoVivo) {
    const cod = new TextEncoder();
    const corpo = new ReadableStream<Uint8Array>({
      async start(c) {
        const enviar = (x: unknown) => {
          try {
            c.enqueue(cod.encode(JSON.stringify(x) + "\n"));
          } catch {
            /* fechou */
          }
        };
        try {
          const r = await criarImagemDoPost({ post, brand, contexto, variacao }, { reservar: () => reservarUsoImagem(ip) }, (imagem) => enviar({ tipo: "parcial", imagem }));
          enviar({ tipo: "pronta", url: r.url, direcao: r.direcao.cena, estilo: r.direcao.estilo, origem_direcao: r.direcao.origem, cache: r.cache });
        } catch (e) {
          const status = e instanceof ErroImagem ? e.status : 500;
          if (!(e instanceof ErroImagem)) console.error("[imagem]", (e as Error).message);
          enviar({ tipo: "erro", status, mensagem: e instanceof ErroImagem ? e.message : "Não deu para criar a imagem agora. Tente de novo." });
        } finally {
          c.close();
        }
      },
    });
    return new Response(corpo, { headers: { ...CORS_HEADERS, "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-cache, no-transform", "x-accel-buffering": "no" } });
  }

  try {
    const r = await criarImagemDoPost({ post, brand, contexto, variacao }, { reservar: () => reservarUsoImagem(ip) });
    return json({ url: r.url, direcao: r.direcao.cena, estilo: r.direcao.estilo, origem_direcao: r.direcao.origem, cache: r.cache });
  } catch (e) {
    if (e instanceof ErroImagem) return erro(e.message, e.status);
    console.error("[imagem]", (e as Error).message);
    return erro("Não deu para criar a imagem agora. Tente de novo.", 500);
  }
}
