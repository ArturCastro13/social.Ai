// Geração ao vivo: lê o JSON do motor enquanto ele chega e solta cada post assim que ele fecha.
import type { EventoDoMotor } from "@/lib/motor/contrato";
import { checarNumeros, limparFormato } from "@/lib/motor/checar-numeros";
import { contextoDosPosts, postDoMotor, postMotorSchema, type ContextoPosts, type OpcoesAdaptador } from "@/lib/motor/saida";
import type { PostGerado } from "@/lib/types";
import { extrairJson, postDaSaida, postIASchema, semTravessao } from "./schema";

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

export interface ConfigOuvinte {
  /** Id da análise: os posts saem com o id final (`${id}-p1`). */
  id: string;
  quantidade: number;
  adaptador: OpcoesAdaptador;
  /** Números das fontes, para a mesma checagem do fim da análise. */
  fontes: Set<string>;
  temFounder: boolean;
  emitir: (e: EventoDoMotor) => void;
}

/** Recebe o texto do modelo aos pedaços e emite o post que está sendo escrito e cada post pronto, já checado. */
export function criarOuvinteAoVivo(c: ConfigOuvinte): { receber: (delta: string) => void } {
  const ctx = contextoDosPosts(c.adaptador);
  const trilhos: ("founder" | "empresa")[] = [];
  let texto = "";
  let emitidos = 0;
  let aviso = { indice: -1, gancho: null as string | null };
  return {
    receber(delta) {
      texto += delta;
      // Só relê quando algo pode ter fechado: um objeto (}) ou um campo de texto (").
      if (!/[}"]/.test(delta)) return;
      const { prontos, escrevendo } = lerPostsParciais(texto);
      while (emitidos < prontos.length && emitidos < c.quantidade) {
        const indice = emitidos++;
        const post = previaDoPost(prontos[indice], indice, trilhos, ctx, c);
        if (post) c.emitir({ tipo: "post", indice, post, previa: true });
      }
      if (escrevendo && escrevendo.indice < c.quantidade && (escrevendo.indice !== aviso.indice || escrevendo.gancho !== aviso.gancho)) {
        aviso = escrevendo;
        c.emitir({ tipo: "escrevendo", indice: escrevendo.indice, gancho: escrevendo.gancho });
      }
    },
  };
}

function previaDoPost(json: string, indice: number, trilhos: ("founder" | "empresa")[], ctx: ContextoPosts, c: ConfigOuvinte): PostGerado | null {
  let bruto: unknown;
  try {
    bruto = extrairJson(json);
  } catch {
    return null;
  }
  const p = postMotorSchema.safeParse(bruto);
  if (!p.success) return null;
  const { post, extras } = postDoMotor(p.data, indice, trilhos, ctx);
  trilhos.push(extras.trilho ?? "empresa");
  const valido = postIASchema.safeParse(post);
  if (!valido.success) return null;
  const base: PostGerado = { ...postDaSaida(semTravessao(valido.data), c.id, indice), ...semTravessao(extras) };
  const [limpo] = limparFormato([base], c.temFounder);
  return checarNumeros([limpo], undefined, c.fontes).posts[0];
}
