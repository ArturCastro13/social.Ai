import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";

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
  if (!u.hostname.replace(/\.+$/, "").includes(".")) throw new FetchError("URL sem domínio", "invalido");
  if (isPrivateHost(u.hostname)) throw new FetchError("Endereço interno não pode ser lido", "invalido");
  u.hash = "";
  return u.toString();
}

// Faixas que o servidor nunca deve acessar: rede privada, loopback, link-local, reservadas e CGNAT.
const BLOQUEADOS = new BlockList();
for (const [rede, bits] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8], ["169.254.0.0", 16], ["172.16.0.0", 12],
  ["192.0.0.0", 24], ["192.0.2.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24],
  ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4],
] as const) BLOQUEADOS.addSubnet(rede, bits, "ipv4");
for (const [rede, bits] of [["::", 128], ["::1", 128], ["fc00::", 7], ["fe80::", 10], ["ff00::", 8], ["64:ff9b::", 96], ["2001:db8::", 32]] as const)
  BLOQUEADOS.addSubnet(rede, bits, "ipv6");

function ipBloqueado(ip: string): boolean {
  const v = isIP(ip);
  if (v === 4) return BLOQUEADOS.check(ip, "ipv4");
  if (v === 6) {
    // IPv4 mapeado em IPv6 (::ffff:127.0.0.1 ou ::ffff:7f00:1)
    const mapeado = ip.toLowerCase().match(/^::ffff:(?:(\d+\.\d+\.\d+\.\d+)|([0-9a-f]{1,4}):([0-9a-f]{1,4}))$/);
    if (mapeado) {
      const v4 = mapeado[1] ?? [parseInt(mapeado[2], 16) >> 8, parseInt(mapeado[2], 16) & 255, parseInt(mapeado[3], 16) >> 8, parseInt(mapeado[3], 16) & 255].join(".");
      return BLOQUEADOS.check(v4, "ipv4");
    }
    return BLOQUEADOS.check(ip, "ipv6");
  }
  return true;
}

/** Checagem só pelo nome (sem DNS): nomes internos óbvios e IPs literais. */
export function isPrivateHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.+$/, "");
  if (!h || h === "localhost" || /\.(localhost|internal|local|lan|home|corp)$/.test(h)) return true;
  if (isIP(h)) return ipBloqueado(h);
  return false;
}

/** Resolve o DNS e recusa se qualquer endereço for interno (pega nip.io e afins). */
async function garantirPublico(hostname: string) {
  if (isPrivateHost(hostname)) throw new FetchError("Endereço não permitido", "invalido");
  const h = hostname.replace(/^\[|\]$/g, "").replace(/\.+$/, "");
  if (isIP(h)) return;
  let enderecos: { address: string }[];
  try {
    enderecos = await lookup(h, { all: true });
  } catch {
    throw new FetchError("Domínio não encontrado", "rede");
  }
  if (!enderecos.length || enderecos.some((e) => ipBloqueado(e.address))) throw new FetchError("Endereço não permitido", "invalido");
}

interface Opts {
  timeoutMs?: number;
  maxBytes?: number;
  accept?: string;
}

export async function fetchLimited(url: string, opts: Opts = {}): Promise<{ body: Buffer; finalUrl: string; contentType: string }> {
  const { timeoutMs = 8000, maxBytes = 3_000_000, accept = "text/html,application/xhtml+xml,*/*;q=0.8" } = opts;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let res: Response;
  let atual = url;
  try {
    // Redirecionamento manual: cada salto passa pela checagem de endereço interno.
    for (let salto = 0; ; salto++) {
      const u = new URL(atual);
      if (!/^https?:$/.test(u.protocol)) throw new FetchError("Endereço não permitido", "invalido");
      await garantirPublico(u.hostname);
      res = await fetch(atual, {
        signal: ctrl.signal,
        redirect: "manual",
        headers: { "user-agent": UA, accept, "accept-language": "pt-BR,pt;q=0.9,en;q=0.7" },
      });
      const destino = res.status >= 300 && res.status < 400 ? res.headers.get("location") : null;
      if (!destino) break;
      if (salto >= 4) throw new FetchError("Redirecionamentos demais", "http", res.status);
      await res.body?.cancel();
      atual = new URL(destino, atual).toString();
    }
  } catch (e) {
    clearTimeout(timer);
    if (e instanceof FetchError) throw e;
    if ((e as Error).name === "AbortError") throw new FetchError("Tempo esgotado", "timeout");
    throw new FetchError("Falha de rede: " + (e as Error).message, "rede");
  }
  try {
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
      finalUrl: atual,
      contentType: res.headers.get("content-type") ?? "",
    };
  } catch (e) {
    if ((e as Error).name === "AbortError") throw new FetchError("Tempo esgotado", "timeout");
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
