import { ErroContexto } from "./erros";

export function protegerOrigem(req: Request) {
  const origin = req.headers.get("origin");
  const url = new URL(req.url);
  // Next can normalize the internal hostname to localhost. The browser's Host
  // remains the actual destination and cannot be overridden by browser scripts.
  const destino = `${url.protocol}//${req.headers.get("host") ?? url.host}`;
  if ((origin && origin !== destino) || req.headers.get("sec-fetch-site") === "cross-site") throw new ErroContexto("Origem não permitida.", 403, "origem");
}
export async function lerCorpoLimitado(req: Request, max: number): Promise<Uint8Array> {
  if (Number(req.headers.get("content-length")) > max) throw new ErroContexto("Limite de tamanho excedido.", 413, "tamanho");
  const reader = req.body?.getReader();
  if (!reader) throw new ErroContexto("Envie conteúdo para leitura.");
  const chunks: Uint8Array[] = []; let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      total += value.byteLength;
      if (total > max) { await reader.cancel(); throw new ErroContexto("Limite de tamanho excedido.", 413, "tamanho"); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return new Uint8Array(Buffer.concat(chunks, total));
}

/** Local/process-scoped guard. NOT authentication or a distributed deployment quota. */
export function criarLimitador() {
  let active = 0;
  const usos = new Map<string, { start: number; count: number }>();
  return (key: string): (() => void) => {
    const now = Date.now();
    for (const [k, v] of usos) if (now - v.start >= 600_000) usos.delete(k);
    const uso = usos.get(key) ?? { start: now, count: 0 };
    if (active >= 2 || uso.count >= 15 || (!usos.has(key) && usos.size >= 1000)) throw new ErroContexto("Muitas leituras agora. Aguarde um minuto e tente novamente.", 429, "limite");
    uso.count++; usos.set(key, uso); active++;
    let released = false;
    return () => { if (!released) { active--; released = true; } };
  };
}
export const reservarContexto = criarLimitador();
