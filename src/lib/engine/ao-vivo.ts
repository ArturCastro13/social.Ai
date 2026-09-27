// Geração ao vivo: lê o JSON do motor enquanto ele chega e solta cada post assim que ele fecha.

export interface LeituraParcial {
  /** Posts completos, cada um como o texto JSON do objeto. */
  prontos: string[];
  /** Post aberto que ainda está sendo escrito, com o gancho quando o campo já fechou. */
  escrevendo: { indice: number; gancho: string | null } | null;
}

/**
 * Acha o array "posts" e devolve os objetos que já fecharam, na ordem. Não depende do fim da resposta: conta
 * chaves e respeita aspas e escapes, então chave dentro de texto não confunde a contagem.
 */
export function lerPostsParciais(texto: string): LeituraParcial {
  const achado = /"posts"\s*:\s*\[/.exec(texto);
  if (!achado) return { prontos: [], escrevendo: null };
  const prontos: string[] = [];
  let profundidade = 0;
  let dentroDeTexto = false;
  let escape = false;
  let comeco = -1;
  for (let i = achado.index + achado[0].length; i < texto.length; i++) {
    const c = texto[i];
    if (dentroDeTexto) {
      if (escape) escape = false;
      else if (c === "\\") escape = true;
      else if (c === '"') dentroDeTexto = false;
      continue;
    }
    if (c === '"') dentroDeTexto = true;
    else if (c === "{") {
      if (profundidade === 0) comeco = i;
      profundidade++;
    } else if (c === "}") {
      profundidade--;
      if (profundidade === 0 && comeco >= 0) {
        prontos.push(texto.slice(comeco, i + 1));
        comeco = -1;
      }
    } else if (c === "]" && profundidade === 0) {
      return { prontos, escrevendo: null }; // o array de posts acabou
    }
  }
  return { prontos, escrevendo: comeco >= 0 ? { indice: prontos.length, gancho: ganchoParcial(texto.slice(comeco)) } : null };
}

/** O gancho do post aberto, se o campo já fechou. */
export function ganchoParcial(objetoAberto: string): string | null {
  const m = /"gancho"\s*:\s*"((?:[^"\\]|\\.)*)"/.exec(objetoAberto);
  if (!m) return null;
  try {
    return JSON.parse(`"${m[1]}"`) as string;
  } catch {
    return null;
  }
}
