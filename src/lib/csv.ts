/** Marca de ordem de bytes: faz o Excel abrir o arquivo como UTF-8 e mostrar os acentos certos. */
export const BOM = "﻿";

/** Uma célula de CSV. Aspas dobradas, e entre aspas quando precisa. Fórmulas viram texto. */
export function celulaCsv(valor: unknown): string {
  let s = valor == null ? "" : String(valor);
  // Planilhas executam células que começam com = + - @. Um apóstrofo na frente deixa como texto.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n;]/.test(s) || s !== s.trim() ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Monta o CSV com cabeçalho, linhas separadas por CRLF e BOM no começo. */
export function montarCsv<T extends object>(colunas: readonly (keyof T & string)[], linhas: readonly T[]): string {
  const corpo = [colunas.join(","), ...linhas.map((l) => colunas.map((c) => celulaCsv(l[c])).join(","))];
  return BOM + corpo.join("\r\n") + "\r\n";
}

/** Data local no formato AAAA-MM-DD, para nome de arquivo. */
export function dataArquivo(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
