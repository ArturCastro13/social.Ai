import type { LLM } from "@/lib/llm";
import { extrairJson } from "@/lib/engine/schema";

// O Haiku olha a capa antes de ela ir para a tela: modelo de imagem às vezes desenha letra ou logo mesmo proibido.
// Custa uns US$ 0,002 por imagem (a imagem é reduzida para cerca de 1.500 tokens).

export const SISTEMA_CONFERIR = `Você confere imagens que vão virar capa de post de uma marca. Responda só com JSON: {"ok": true, "motivo": ""}.
"ok" é false se a imagem tiver qualquer letra, palavra, número, logotipo, marca d'água, tela com interface legível ou rosto humano em close. Texto borrado ou falso também conta. Em "motivo", diga em poucas palavras o que achou.
Caso contrário, "ok" é true e "motivo" fica vazio.`;

/** Veredito da conferência. Sem IA ou com falha, aprova: na dúvida não gastamos outra imagem. */
export async function conferirImagem(bytes: Buffer, llm: LLM | null): Promise<{ ok: boolean; motivo: string }> {
  if (!llm?.gerarComAnexos) return { ok: true, motivo: "" };
  try {
    const txt = await llm.gerarComAnexos(SISTEMA_CONFERIR, "Confira esta imagem.", [{ mime: "image/jpeg", dadosBase64: bytes.toString("base64") }]);
    const j = extrairJson(txt) as { ok?: unknown; motivo?: unknown };
    return { ok: j.ok !== false, motivo: typeof j.motivo === "string" ? j.motivo.slice(0, 200) : "" };
  } catch (e) {
    console.error("[imagem] conferência", (e as Error).message.slice(0, 120));
    return { ok: true, motivo: "" };
  }
}
