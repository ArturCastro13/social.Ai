/** Lê uma resposta NDJSON linha a linha, chamando `aoItem` para cada objeto. Linha cortada entre pedaços é juntada. */
export async function lerLinhasJson<T>(res: Response, aoItem: (item: T) => void): Promise<void> {
  if (!res.body) throw new Error("A resposta veio sem corpo.");
  const leitor = res.body.getReader();
  const decodificador = new TextDecoder();
  let resto = "";
  try {
    for (;;) {
      const { value, done } = await leitor.read();
      resto += decodificador.decode(value ?? new Uint8Array(), { stream: !done });
      const linhas = resto.split("\n");
      resto = linhas.pop() ?? "";
      for (const l of linhas) if (l.trim()) aoItem(JSON.parse(l) as T);
      if (done) break;
    }
    if (resto.trim()) aoItem(JSON.parse(resto) as T);
  } finally {
    leitor.releaseLock();
  }
}
