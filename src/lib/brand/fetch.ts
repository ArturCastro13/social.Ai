const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

export class FetchError extends Error {
  constructor(
    message: string,
    public kind: "timeout" | "bloqueado" | "http" | "rede" | "invalido" | "grande",
    public status?: number,
  ) {
    super(message);
  }
}

/** Normaliza o que o usuário digitou ("site.com.br", "http://...") para uma URL https. */
export function normalizeUrl(input: string): string {
  let s = input.trim();
  if (!s) throw new FetchError("URL vazia", "invalido");
  if (!/^https?:\/\//i.test(s)) s = "https://" + s;
  const u = new URL(s);
  if (!u.hostname.includes(".")) throw new FetchError("URL sem domínio", "invalido");
  u.hash = "";
  return u.toString();
}

/** Bloqueia endereços internos para o servidor não virar proxy para a rede privada. */
export function isPrivateHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".internal") || h.endsWith(".local")) return true;
  if (h.includes(":")) return h === "::1" || h === "::" || /^(fc|fd|fe80)/.test(h);
  const ip = h.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (!ip) return false;
  const [a, b] = [+ip[1], +ip[2]];
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
}

interface Opts {
  timeoutMs?: number;
  maxBytes?: number;
  accept?: string;
}

export async function fetchLimited(url: string, opts: Opts = {}): Promise<{ body: Buffer; finalUrl: string; contentType: string }> {
  const { timeoutMs = 8000, maxBytes = 3_000_000, accept = "text/html,application/xhtml+xml,*/*;q=0.8" } = opts;
  const u = new URL(url);
  if (!/^https?:$/.test(u.protocol) || isPrivateHost(u.hostname)) throw new FetchError("Endereço não permitido", "invalido");

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: { "user-agent": UA, accept, "accept-language": "pt-BR,pt;q=0.9,en;q=0.7" },
    });
  } catch (e) {
    clearTimeout(timer);
    if ((e as Error).name === "AbortError") throw new FetchError("Tempo esgotado", "timeout");
    throw new FetchError("Falha de rede: " + (e as Error).message, "rede");
  }
  try {
    if (isPrivateHost(new URL(res.url || url).hostname)) throw new FetchError("Redirecionou para endereço interno", "invalido");
    if (res.status === 403 || res.status === 429 || res.status === 503) {
      throw new FetchError(`O site recusou a leitura (HTTP ${res.status})`, "bloqueado", res.status);
    }
    if (!res.ok) throw new FetchError(`HTTP ${res.status}`, "http", res.status);
    const reader = res.body?.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    if (reader) {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > maxBytes) {
          await reader.cancel();
          break; // devolve o que já leu: para HTML, o começo basta
        }
        chunks.push(value);
      }
    }
    return {
      body: Buffer.concat(chunks),
      finalUrl: res.url || url,
      contentType: res.headers.get("content-type") ?? "",
    };
  } catch (e) {
    if ((e as Error).name === "AbortError") throw new FetchError("Tempo esgotado", "timeout");
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
