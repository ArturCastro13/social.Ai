// Imagens geradas vão para o bucket público "posts" do Supabase (supabase/schema.sql), pela API REST do Storage.
// fetch direto, com as mesmas chaves do store: fica simples de testar com fetch simulado.

export const BUCKET = "posts";

export interface Armazenamento {
  urlPublica(caminho: string): string;
  existe(caminho: string): Promise<boolean>;
  subir(caminho: string, bytes: Buffer, tipo: string): Promise<void>;
}

/** Armazenamento no Supabase, ou null quando faltam as chaves. */
export function armazenamentoSupabase(): Armazenamento | null {
  const base = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/+$/, "");
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !chave) return null;
  const caminhoUrl = (c: string) => c.split("/").map(encodeURIComponent).join("/");
  const urlPublica = (c: string) => `${base}/storage/v1/object/public/${BUCKET}/${caminhoUrl(c)}`;
  return {
    urlPublica,
    async existe(caminho) {
      try {
        const res = await fetch(urlPublica(caminho), { method: "HEAD", signal: AbortSignal.timeout(4000) });
        return res.ok;
      } catch {
        return false; // na dúvida, gera de novo
      }
    },
    async subir(caminho, bytes, tipo) {
      const res = await fetch(`${base}/storage/v1/object/${BUCKET}/${caminhoUrl(caminho)}`, {
        method: "POST",
        headers: {
          apikey: chave,
          authorization: `Bearer ${chave}`,
          "content-type": tipo,
          "cache-control": "31536000",
          "x-upsert": "true",
        },
        body: new Uint8Array(bytes),
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) throw new Error(`Storage HTTP ${res.status}`);
    },
  };
}
