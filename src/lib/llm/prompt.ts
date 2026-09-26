import type { BrandProfile, Nicho, PadraoViral, ViralItem } from "@/lib/types";
import { GUIA_TEMPLATES } from "@/lib/engine/schema";
import { NICHOS } from "@/lib/types";

export interface ContextoPrompt {
  brand: BrandProfile;
  palpite: Nicho;
  padroes: { padrao: PadraoViral; exemplos: ViralItem[] }[];
  quantidade: number;
  redes: string[];
}

// Parte fixa do prompt: fica igual entre chamadas (ajuda cache de prompt nos provedores).
export const SISTEMA = `Você é o CMO de uma startup brasileira e escreve como um estrategista de marketing experiente, não como um robô.
Seu trabalho: ler o que a empresa diz sobre si no site, entender o negócio, comparar com padrões de posts que performam no nicho dela e entregar estratégia e posts estáticos prontos para publicar.

Regras de escrita, sem exceção:
1. Português do Brasil, natural, frases curtas, como um founder falaria. Nada de "no mundo de hoje", "descubra", "revolucione", "potencialize", "alavancar", "jornada", "sinergia", "incrível".
2. Nunca use o caractere travessão. Use vírgula, ponto ou dois-pontos.
3. Nunca invente fatos sobre a empresa: números, clientes, prêmios, investimento, depoimentos. Só use o que está no texto do site. Se não houver número real, não use o formato dado-impacto.
4. Legendas com cara de gente: primeira linha é o gancho, depois 2 a 5 linhas curtas, uma chamada para ação no fim. Emojis no máximo 1 ou 2, e só no Instagram e Facebook. LinkedIn sem hashtags em excesso (no máximo 3). X com até 260 caracteres.
5. Cada post precisa ter um motivo para existir: ensinar algo, provocar uma opinião, mostrar bastidor ou provar valor. Varie formatos.
6. Responda só com JSON válido, sem comentários e sem texto fora do JSON.`;

function resumoMarca(b: BrandProfile): string {
  const partes = [
    `Nome: ${b.nome}`,
    `Site: ${b.url}`,
    b.title && `Título da página: ${b.title}`,
    b.description && `Descrição: ${b.description}`,
    b.headings.h1.length && `Títulos principais (h1): ${b.headings.h1.join(" | ")}`,
    b.headings.h2.length && `Subtítulos (h2): ${b.headings.h2.slice(0, 8).join(" | ")}`,
    b.paragrafos.length && `Trechos do site:\n- ${b.paragrafos.slice(0, 6).join("\n- ")}`,
    `Redes informadas: ${Object.entries(b.handles).filter(([, v]) => v).map(([k, v]) => `${k} ${v}`).join(", ") || "nenhuma"}`,
  ].filter(Boolean);
  return partes.join("\n").slice(0, 4500);
}

function resumoPadroes(ctx: ContextoPrompt): string {
  return ctx.padroes
    .map(({ padrao: p, exemplos }) => {
      const ex = exemplos
        .map((e) => `    exemplo (${e.rede}${e.autor_ou_marca ? `, ${e.autor_ou_marca}` : ""}): "${e.texto_gancho}" | estrutura: ${e.estrutura.slice(0, 4).join(" / ")}`)
        .join("\n");
      return `- id "${p.id}": ${p.nome}. Modelo de gancho: ${p.modelo_gancho}. Template: ${p.template_sugerido}. Aparece ${p.frequencia}x na base.\n${ex}`;
    })
    .join("\n");
}

export function montarPrompt(ctx: ContextoPrompt): string {
  const nichos = NICHOS.map((n) => `"${n.id}" (${n.nome})`).join(", ");
  const guia = Object.entries(GUIA_TEMPLATES)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join("\n");
  return `# Empresa
${resumoMarca(ctx.brand)}

# Padrões que performam no nicho (base curada pelo time; use como referência de estrutura, nunca copie texto)
Palpite inicial de nicho: "${ctx.palpite}". Confirme ou corrija entre: ${nichos}.
${resumoPadroes(ctx)}

# Templates de arte disponíveis e o que cada um espera em "slides"
${guia}

# Tarefa
Gere exatamente ${ctx.quantidade} posts. Redes com @ informado têm prioridade: ${ctx.redes.join(", ") || "linkedin e instagram"}.
Distribua os posts entre as redes da estratégia e use pelo menos 3 formatos diferentes quando houver 3 ou mais posts.
Cada post indica em "padrao_inspirador" o id do padrão acima que o inspirou.
O diagnóstico compara o que os posts fortes do nicho fazem com o que esta empresa comunica hoje pelo site e pelas redes: seja específico e honesto, sem elogio vazio.

Formato da resposta (JSON):
{
  "nicho": "um dos ids de nicho",
  "resumo_negocio": "2 ou 3 frases: o que vende e como ganha dinheiro",
  "publico": "quem compra, com dor e contexto",
  "tom_de_voz": "3 adjetivos e uma frase de como soa",
  "posicionamento": "uma frase: para quem, o que é, por que é diferente",
  "pilares": [{"nome": "", "descricao": ""}, {"nome": "", "descricao": ""}, {"nome": "", "descricao": ""}],
  "diagnostico": [{"titulo": "", "texto": ""}],
  "estrategia": [{"rede": "linkedin|instagram|x|facebook", "frequencia_semanal": 3, "foco": ""}],
  "posts": [{
    "rede_principal": "linkedin|instagram|x|facebook",
    "formato": "carrossel|imagem-unica|print-tweet|citacao|lista|antes-depois|dado-impacto|bastidor-founder",
    "template": "um dos templates acima",
    "gancho": "",
    "slides": [{"titulo": "", "texto": ""}],
    "legendas": {"instagram": "", "linkedin": "", "x": "", "facebook": ""},
    "hashtags": ["sem #, no máximo 5"],
    "padrao_inspirador": "id do padrão",
    "por_que": "uma frase dizendo por que esse post deve performar"
  }]
}`;
}
