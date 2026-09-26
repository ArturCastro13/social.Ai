// Pós-processamento do motor local (sem IA) para respeitar as preferências do onboarding:
// formatos permitidos, proibições, para quem é o conteúdo (founder, empresa ou os dois) e frequência.
// O motor local gera candidatos a mais; aqui só filtramos, marcamos e ajustamos.
import type { Formato, Rede } from "@/lib/types";
import type { AnaliseIA } from "@/lib/engine/schema";
import { semAcento } from "@/lib/brand/nome";
import type { ExtrasPost, ObjetivoId, Preferencias } from "./contrato";
import { distribuirFrequencia, formatosDoApp, MOTOR_DO_FORMATO, postsPorSemana } from "./mapa";
import type { ResultadoMotor } from "./saida";
import { intercalar, postsDoFounder, referenciaDoPadrao } from "./local-founder";
import { ordenarPorAprendizado } from "./aprendizados";
import { objetivosEscolhidos } from "./enderecamento";

type PostIA = AnaliseIA["posts"][number];

const normal = (s: string) => semAcento(s).toLowerCase();

/** "nada de política" → "politica"; "não falo de concorrente" → "concorrente"; "sem meme" → "meme". */
export function termosProibidos(proibicoes: string[]): string[] {
  const prefixo =
    /^(?:(?:nada|nunca|jamais)\s+(?:de|sobre|com)|n[aã]o\s+(?:falo|falar|fala|posto|postar|quero|usar|uso)\s+(?:de|sobre|com)?|nunca\s+(?:falar|postar|usar)\s+(?:de|sobre)?|sem|evitar|evite|proibido|n[aã]o|nada|nunca)\s+/i;
  return [
    ...new Set(
      proibicoes
        .map((p) => normal(p.trim()).replace(prefixo, "").replace(/^(?:o|a|os|as)\s+/, "").replace(/[.!;]+$/, "").trim())
        .filter((t) => t.length >= 2),
    ),
  ];
}

function textoDoPost(p: PostIA): string {
  return normal([p.gancho, ...p.slides.flatMap((s) => [s.titulo, s.texto]), ...Object.values(p.legendas), p.hashtags.join(" ")].join(" \n "));
}

/** true se o post cita algum termo proibido (palavra inteira no começo; aceita plural e variações no fim). */
export function violaProibicao(p: PostIA, termos: string[]): boolean {
  if (!termos.length) return false;
  const t = textoDoPost(p);
  return termos.some((termo) => {
    const esc = termo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
    return new RegExp(`(?<![a-z0-9])${esc}`, "i").test(t);
  });
}

/** Formatos que combinam com voz de gente, em primeira pessoa. */
const FORMATOS_FOUNDER: Formato[] = ["bastidor-founder", "print-tweet", "citacao"];

export interface OpcoesFiltroLocal {
  quantidade: number;
  marca: string;
  /** Nota pelo que funcionou com o founder (pontuacaoAprendida). Maior sobe; empate mantém a ordem. */
  nota?: (p: PostIA) => number;
}

/**
 * Aplica as preferências à saída do motor local. Recebe candidatos a mais (gere com quantidade maior)
 * e devolve no máximo `quantidade` posts, com trilho, objetivo e precisa_revisao preenchidos.
 */
export function filtrarLocal(saida: AnaliseIA, pref: Preferencias, op: OpcoesFiltroLocal): ResultadoMotor {
  const avisos: string[] = [];
  const termos = termosProibidos(pref.proibicoes);
  const permitidos = formatosDoApp(pref.formatos_permitidos);

  let candidatos = saida.posts.filter((p) => !violaProibicao(p, termos));
  const semProibidos = candidatos;
  if (permitidos.size) {
    const noFormato = candidatos.filter((p) => permitidos.has(p.formato));
    if (noFormato.length) candidatos = noFormato;
    else avisos.push("O motor local não tem modelos para os formatos escolhidos com o texto deste site. Mostramos os formatos mais próximos; a versão com IA segue a sua escolha.");
    if (noFormato.length && noFormato.length < op.quantidade) {
      avisos.push(`Sem IA, deu para montar ${noFormato.length} ${noFormato.length === 1 ? "post" : "posts"} nos formatos escolhidos.`);
    }
  }
  if (pref.formatos_permitidos.includes("noticia_comentada") && !pref.noticias.length) {
    avisos.push("Notícia comentada precisa de notícias com link e data. Sem elas, esse formato ficou de fora.");
  }
  // O que ficou acima da mediana do founder sobe; o que ficou abaixo desce. Sem número, nada muda.
  if (op.nota) candidatos = ordenarPorAprendizado(candidatos, op.nota);
  if (saida.posts.length > semProibidos.length) {
    avisos.push("Deixamos de fora ideias que tocavam em assuntos da sua lista de nunca postaria.");
  }

  // Founder: primeiro os formatos de voz pessoal, e no máximo 1 em cada 4 posts cita o produto.
  const marca = normal(op.marca).trim();
  const citaMarca = (p: PostIA) => marca.length >= 3 && textoDoPost(p).includes(marca);
  if (pref.perfil_alvo === "founder") {
    const ordem = (p: PostIA) => (FORMATOS_FOUNDER.includes(p.formato) ? 0 : 1);
    candidatos = [...candidatos].sort((a, b) => ordem(a) - ordem(b));
    const maxMarca = Math.max(1, Math.floor(op.quantidade / 4));
    const escolhidos: PostIA[] = [];
    const sobra: PostIA[] = [];
    let comMarca = 0;
    for (const p of candidatos) {
      if (citaMarca(p) && comMarca >= maxMarca) sobra.push(p);
      else {
        if (citaMarca(p)) comMarca++;
        escolhidos.push(p);
      }
    }
    candidatos = [...escolhidos, ...sobra];
  }

  const escolhidos = objetivosEscolhidos(pref);
  const objetivos: ObjetivoId[] = escolhidos.length
    ? escolhidos
    : pref.perfil_alvo === "founder"
      ? ["autoridade_founder"]
      : ["gerar_clientes"];

  // "O que só você sabe": cada resposta vira um post, intercalado na frente (founder, outro, founder...).
  // Não passa pelo filtro de formatos: é o assunto que o founder pediu.
  const doFounder = postsDoFounder(pref.conhecimento_founder, {
    perfil_alvo: pref.perfil_alvo,
    publico: pref.publico_alvo?.trim() || saida.publico,
    redes: saida.estrategia.map((e) => e.rede),
    hashtags: saida.posts[0]?.hashtags,
    nomeFounder: pref.founder?.nome,
    marca: op.marca,
  });
  const outros = candidatos.map((post, i) => {
    const trilho: "founder" | "empresa" =
      pref.perfil_alvo === "ambos" ? (i % 2 === 0 ? "founder" : "empresa") : pref.perfil_alvo === "founder" ? "founder" : "empresa";
    const revisar: string[] = [];
    if (/confirme com o time/i.test(post.por_que)) revisar.push("Confirme se o relato bate com a experiência real antes de publicar.");
    if (post.formato === "dado-impacto") revisar.push("Confira o número no site antes de publicar.");
    if (trilho === "founder" && !FORMATOS_FOUNDER.includes(post.formato)) revisar.push("Ajuste para a primeira pessoa do founder antes de publicar.");
    const extras: ExtrasPost = {
      trilho,
      objetivo: objetivos[i % objetivos.length],
      formato_motor: MOTOR_DO_FORMATO[post.formato],
      ...(post.origem_tema ? { origem_tema: post.origem_tema } : {}),
      padrao_referencia: referenciaDoPadrao(post.padrao_inspirador) ?? (post.padrao_inspirador ? { nome: post.padrao_inspirador, fonte_url: "" } : undefined),
      precisa_revisao: revisar,
    };
    return { post, extras };
  });
  const lote = intercalar(doFounder, outros).slice(0, op.quantidade);
  const posts = lote.map((x) => x.post);
  const extrasPosts: ExtrasPost[] = lote.map((x) => x.extras);

  // Citação de post de founder: assinada pelo founder quando o nome veio no onboarding.
  const nomeFounder = pref.founder?.nome?.trim();
  const postsFinais = posts.map((p, i) =>
    nomeFounder && extrasPosts[i].trilho === "founder" && p.template === "citacao" && p.slides[0]
      ? { ...p, slides: [{ ...p.slides[0], titulo: nomeFounder }, ...p.slides.slice(1)] }
      : p,
  );

  // Frequência escolhida vira a frequência semanal por rede (o calendário segue a estratégia).
  let estrategia = saida.estrategia;
  const total = postsPorSemana(pref.frequencia_escolhida);
  if (total) {
    const redes = estrategia.map((e) => e.rede) as Rede[];
    const dist = distribuirFrequencia(redes, total);
    estrategia = estrategia.map((e) => ({ ...e, frequencia_semanal: dist.get(e.rede) ?? e.frequencia_semanal }));
  }

  return {
    analise: { ...saida, estrategia, posts: postsFinais },
    extrasPosts,
    extrasAnalise: {
      perfil_alvo: pref.perfil_alvo,
      contexto_inferido: {
        nicho: saida.nicho,
        publico: saida.publico,
        tom_resumo: saida.tom_de_voz,
        objetivos,
        confianca: "baixa",
      },
    },
    slots: null,
    avisos,
  };
}
