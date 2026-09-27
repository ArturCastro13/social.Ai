import sharp from "sharp";

// Imagem pela API REST da OpenAI (POST /v1/images/generations), com fetch: uma chamada só não justifica o SDK.
// Padrão gpt-image-2 em qualidade medium, paisagem 1536x1024: US$ 0,041 por imagem na tabela oficial
// (developers.openai.com/api/docs/guides/image-generation, "Calculating costs"). high custa US$ 0,165.
// Sai em JPEG porque o Satori, que compõe a arte, não lê WebP.

export const MODELO_PADRAO = "gpt-image-2";
export const QUALIDADE_PADRAO = "medium";
/** Paisagem: a capa creator usa a faixa de cima (cerca de 1,6:1) e o horizontal usa a metade esquerda. */
export const TAMANHO_IMAGEM = "1536x1024";
/** Teto do arquivo: a rota de arte só baixa até 1,5 MB. */
export const MAX_BYTES = 1_400_000;

const QUALIDADES = ["low", "medium", "high"] as const;
export type Qualidade = (typeof QUALIDADES)[number];

export function configImagem(): { modelo: string; qualidade: Qualidade } {
  const q = (process.env.OPENAI_IMAGE_QUALITY || "").toLowerCase() as Qualidade;
  return {
    modelo: (process.env.OPENAI_IMAGE_MODEL || "").trim() || MODELO_PADRAO,
    qualidade: QUALIDADES.includes(q) ? q : QUALIDADE_PADRAO,
  };
}

/** Erro com status HTTP e mensagem que pode ir para a tela. */
export class ErroImagem extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export const MSG_MODERACAO =
  "O gerador de imagens recusou este pedido pelas regras de conteúdo dele. Mude o texto do post em Customizar ou tente Gerar outra.";
export const MSG_OCUPADO = "O gerador de imagens está ocupado agora. Tente de novo daqui a alguns minutos.";

export interface ImagemGerada {
  bytes: Buffer;
  tipo: "image/jpeg";
  uso: { entrada: number; saida: number };
}

/** Traduz a falha da OpenAI numa mensagem para o founder. O corpo do erro nunca vai para a tela. */
export function erroDaOpenAI(status: number, corpo: string): ErroImagem {
  let code = "";
  try {
    const j = JSON.parse(corpo) as { error?: { code?: string | null; type?: string } };
    code = `${j.error?.code ?? ""} ${j.error?.type ?? ""}`;
  } catch {
    /* corpo não é JSON */
  }
  if (/moderation|content_policy|safety/i.test(code) || (status === 400 && /moderation|safety system/i.test(corpo))) {
    return new ErroImagem(MSG_MODERACAO, 422);
  }
  if (status === 429 || status >= 500) return new ErroImagem(MSG_OCUPADO, 503);
  if (status === 401 || status === 403) return new ErroImagem("A chave da OpenAI foi recusada. Confira OPENAI_API_KEY.", 503);
  return new ErroImagem("Não deu para criar a imagem agora. Tente de novo.", 502);
}

/** Lê o SSE da geração com prévia: chama `aoParcial` a cada prévia e devolve a imagem final e o uso. */
export async function lerEventosSse(res: Response, aoParcial: (b64: string) => void): Promise<{ b64: string; uso: { entrada: number; saida: number } }> {
  if (!res.body) throw new ErroImagem("O gerador de imagens respondeu vazio. Tente de novo.", 502);
  const leitor = res.body.getReader();
  const dec = new TextDecoder();
  let resto = "";
  let final: { b64: string; uso: { entrada: number; saida: number } } | null = null;
  const tratar = (bloco: string) => {
    const dados = bloco
      .split("\n")
      .filter((l) => l.startsWith("data:"))
      .map((l) => l.slice(5).trim())
      .join("");
    if (!dados) return;
    const j = JSON.parse(dados) as { type?: string; b64_json?: string; usage?: { input_tokens?: number; output_tokens?: number } };
    if (j.type === "image_generation.partial_image" && j.b64_json) aoParcial(j.b64_json);
    if (j.type === "image_generation.completed" && j.b64_json) final = { b64: j.b64_json, uso: { entrada: j.usage?.input_tokens ?? 0, saida: j.usage?.output_tokens ?? 0 } };
  };
  for (;;) {
    const { value, done } = await leitor.read();
    resto += dec.decode(value ?? new Uint8Array(), { stream: !done });
    const blocos = resto.split("\n\n");
    resto = blocos.pop() ?? "";
    blocos.forEach(tratar);
    if (done) break;
  }
  if (resto.trim()) tratar(resto);
  if (!final) throw new ErroImagem("O gerador de imagens parou no meio. Tente de novo.", 502);
  return final;
}

/** Gera uma imagem retrato. Registra só modelo, tokens e tempo; nunca a chave nem o prompt. */
export async function gerarImagemOpenAI(
  prompt: string,
  op: { chave: string; modelo: string; qualidade: Qualidade; timeoutMs?: number; aoParcial?: (b64: string) => void },
): Promise<ImagemGerada> {
  const inicio = Date.now();
  let res: Response;
  try {
    res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${op.chave}` },
      body: JSON.stringify({
        model: op.modelo,
        prompt,
        n: 1,
        size: TAMANHO_IMAGEM,
        quality: op.qualidade,
        output_format: "jpeg",
        output_compression: 85,
        moderation: "auto",
        ...(op.aoParcial ? { stream: true, partial_images: 1 } : {}),
      }),
      signal: AbortSignal.timeout(op.timeoutMs ?? 100_000),
    });
  } catch (e) {
    console.error("[imagem] openai sem resposta", op.modelo, (e as Error).name);
    throw new ErroImagem(MSG_OCUPADO, 503);
  }
  if (!res.ok) {
    const corpo = await res.text().catch(() => "");
    console.error(`[imagem] openai HTTP ${res.status} ${op.modelo} ${Date.now() - inicio}ms`);
    throw erroDaOpenAI(res.status, corpo);
  }
  const { b64, uso: usoFinal } = op.aoParcial
    ? await lerEventosSse(res, op.aoParcial)
    : await (async () => {
        const data = (await res.json()) as { data?: { b64_json?: string }[]; usage?: { input_tokens?: number; output_tokens?: number } };
        const b = data.data?.[0]?.b64_json;
        if (!b) throw new ErroImagem("O gerador de imagens respondeu vazio. Tente de novo.", 502);
        return { b64: b, uso: { entrada: data.usage?.input_tokens ?? 0, saida: data.usage?.output_tokens ?? 0 } };
      })();
  let bytes: Buffer = Buffer.from(b64, "base64");
  // Arquivo grande demais para a rota de arte: recomprime até caber.
  for (const q of [78, 68, 58]) {
    if (bytes.length <= MAX_BYTES) break;
    bytes = await sharp(bytes).jpeg({ quality: q, mozjpeg: true }).toBuffer();
  }
  const uso = usoFinal;
  console.info(`[imagem] openai ${op.modelo} ${op.qualidade} entrada=${uso.entrada} saida=${uso.saida} ${Date.now() - inicio}ms ${Math.round(bytes.length / 1024)}KB`);
  return { bytes, tipo: "image/jpeg", uso };
}
