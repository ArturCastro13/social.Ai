import type { BrandProfile, Nicho, PadraoViral, Rede, TemplateId } from "@/lib/types";
import type { AnaliseIA } from "./schema";

// Motor de regras: produz uma análise completa sem nenhuma chamada de IA.
// Usa só o que o site diz. É o plano B quando não há chave ou a IA falha.

interface PerfilNicho {
  publico: string;
  tom: string;
  pilares: [string, string][];
  diag: [string, string][];
  opinioes: string[];
  capas: string[];
  antes: string;
  depois: string;
  cta: string;
}

const EXTRA: Record<Nicho, Pick<PerfilNicho, "opinioes" | "capas" | "antes" | "depois" | "cta">> = {
  "saas-b2b": {
    opinioes: [
      "a maioria dos processos da sua empresa não está desenhada em lugar nenhum. está no email de alguém.",
      "ferramenta boa não é a que tem mais funções. é a que o time continua usando depois do primeiro mês.",
    ],
    capas: ["O custo escondido do jeito antigo", "4 sinais de que sua operação travou"],
    antes: "Planilha paralela, e-mail perdido e ninguém sabe onde o pedido parou.",
    depois: "Um fluxo claro, cada pessoa sabendo o que é com ela.",
    cta: "Comenta qual processo mais te trava hoje.",
  },
  fintech: {
    opinioes: [
      "pagar tarifa para movimentar o próprio dinheiro ainda é normal pra muita gente. não deveria ser.",
      "o financeiro da maioria das pequenas empresas é o dono, às 23h, com uma planilha aberta.",
    ],
    capas: ["O que seu banco não te explica", "4 decisões de dinheiro que ninguém te ensinou"],
    antes: "Tarifa em tudo, burocracia e atendimento que demora dias.",
    depois: "Dinheiro organizado no app, sem letra miúda.",
    cta: "Salva e manda para quem cuida do financeiro.",
  },
  healthtech: {
    opinioes: [
      "cuidar da saúde não deveria parecer uma maratona de telefonemas e salas de espera.",
      "o melhor momento de cuidar é antes do problema aparecer. o sistema ainda é desenhado para depois.",
    ],
    capas: ["O que muda quando o cuidado vem antes", "4 dúvidas que todo mundo tem e ninguém pergunta"],
    antes: "Ligação, fila, espera e nenhum acompanhamento depois da consulta.",
    depois: "Cuidado contínuo, com gente que conhece o seu histórico.",
    cta: "Salva e compartilha com quem precisa ler isso.",
  },
  edtech: {
    opinioes: [
      "decorar para a prova não é aprender. é alugar o conteúdo por uma semana.",
      "ninguém desiste de estudar por preguiça. desiste porque não vê progresso.",
    ],
    capas: ["Aprenda isso em 1 minuto", "4 erros que fazem você estudar mais e aprender menos"],
    antes: "Horas de estudo, anotação bonita e a sensação de não sair do lugar.",
    depois: "Menos horas, método claro e progresso que dá para ver.",
    cta: "Salva para revisar antes da prova.",
  },
  "ecommerce-dtc": {
    opinioes: [
      "cliente não compra produto. compra a versão de si mesmo que vai usar o produto.",
      "a melhor propaganda de uma marca ainda é a foto que o cliente tira sem ninguém pedir.",
    ],
    capas: ["O detalhe que ninguém repara (mas faz toda diferença)", "4 perguntas que nossos clientes mais fazem"],
    antes: "Compra por impulso, produto parado na gaveta.",
    depois: "Poucos produtos certos, usados todo dia.",
    cta: "Conta aqui qual você escolheria.",
  },
};

const PERFIL_BASE: Record<Nicho, { publico: string; tom: string; pilares: [string, string][]; diag: [string, string][] }> = {
  "saas-b2b": {
    publico: "gestores e donos de empresa que perdem tempo com processo manual e querem previsibilidade sem contratar mais gente",
    tom: "Claro, prático e confiante. Fala de resultado de operação, sem jargão de TI.",
    pilares: [
      ["Dor da operação", "Mostrar o custo escondido do jeito antigo de trabalhar, com situações que o gestor reconhece."],
      ["Como se faz", "Ensinar o passo a passo de resolver o problema, mesmo antes de falar do produto."],
      ["Bastidor do founder", "Decisões, erros e aprendizados de quem está construindo a empresa."],
    ],
    diag: [
      ["Os fortes do nicho falam de resultado, não de funcionalidade", "Nos SaaS B2B que mais engajam, o post abre com a consequência para o negócio (tempo, dinheiro, erro evitado) e só depois mostra o como. O site ainda apresenta o produto pelo que ele faz, não pelo que ele muda na rotina de quem compra."],
      ["Founder aparece, marca acompanha", "Na base de virais, os posts de founder no LinkedIn superam a página da empresa com o mesmo conteúdo. Vale ter uma voz em primeira pessoa com bastidores e opinião."],
      ["Falta um formato que se repete", "Quem cresce no nicho tem uma série reconhecível, como carrosséis de passo a passo ou listas de erros comuns. Uma série fixa por semana cria hábito no público."],
    ],
  },
  fintech: {
    publico: "pessoas e pequenas empresas cansadas de taxa, burocracia e atendimento de banco tradicional",
    tom: "Direto, transparente e um pouco provocador. Explica dinheiro sem economês.",
    pilares: [
      ["Dinheiro sem letra miúda", "Traduzir taxas, regras e produtos financeiros em linguagem simples."],
      ["Contra o jeito antigo", "Comparar a experiência com o banco tradicional, sempre com fatos."],
      ["Confiança", "Mostrar segurança, regulação e gente real por trás do produto."],
    ],
    diag: [
      ["O nicho ganha atenção com contraste", "Fintechs que viralizam colocam o banco tradicional como antagonista e mostram o antes e depois com clareza. O site explica o produto, mas ainda não assume uma posição forte contra algo."],
      ["Explicar é o conteúdo mais salvo", "Carrosséis que explicam uma regra, uma taxa ou uma mudança regulatória em poucos slides são os mais salvos e compartilhados no nicho."],
      ["Confiança precisa de rosto", "Nos exemplos fortes, founders e time aparecem falando de decisões difíceis. Isso reduz o medo natural de confiar dinheiro a uma marca nova."],
    ],
  },
  healthtech: {
    publico: "pessoas e empresas que querem cuidar da saúde sem a experiência fria e demorada do sistema tradicional",
    tom: "Acolhedor, responsável e humano. Explica saúde com cuidado e sem alarmismo.",
    pilares: [
      ["Cuidado na prática", "Histórias e situações reais de cuidado, sempre com consentimento e sem expor ninguém."],
      ["Saúde explicada", "Conteúdo educativo curto, revisado por profissional, que tira dúvida comum."],
      ["Por dentro da operação", "Como o time trabalha, quem são os profissionais e por que as decisões são tomadas."],
    ],
    diag: [
      ["Histórias vencem institucional", "Na base de virais do nicho, relatos de paciente e de profissional engajam bem mais que peças institucionais. O site ainda fala mais de estrutura do que de pessoas."],
      ["Opinião clínica gera conversa", "Founders de saúde que publicam uma opinião clara sobre o setor, com argumento, geram debate e autoridade."],
      ["Educação precisa ser fácil de salvar", "Listas e checklists curtos sobre prevenção e uso do serviço são o formato mais compartilhado."],
    ],
  },
  edtech: {
    publico: "estudantes e profissionais que querem aprender algo que muda sua carreira ou nota, sem perder tempo",
    tom: "Motivador, próximo e bem-humorado. Fala como um bom professor fala no intervalo.",
    pilares: [
      ["Aprenda em 1 minuto", "Um conceito útil por post, explicado de forma que dê para aplicar hoje."],
      ["Histórias de virada", "Trajetórias de alunos e do time, com antes e depois concretos."],
      ["Opinião sobre educação", "Posições claras sobre como se aprende de verdade, que provocam comentário."],
    ],
    diag: [
      ["Os fortes do nicho ensinam antes de vender", "Os posts de maior alcance em edtech entregam uma aula curta no próprio post. O site vende o curso, mas o conteúdo ainda não dá uma amostra do jeito de ensinar."],
      ["Humor e personagem funcionam", "Marcas de educação que criaram uma voz com personalidade viralizam com frequência. Vale definir um jeito próprio de falar e manter."],
      ["Prova de transformação", "Antes e depois de alunos, com números reais que eles autorizaram mostrar, é o formato que mais converte no nicho."],
    ],
  },
  "ecommerce-dtc": {
    publico: "consumidores que compram online, valorizam marca com propósito e decidem pela experiência e pela prova de outros clientes",
    tom: "Próximo, com personalidade e sem medo de opinião. Fala como amiga que entende do assunto.",
    pilares: [
      ["Produto na vida real", "Uso real do produto, com detalhe que só quem usa percebe."],
      ["Bastidor da marca", "Como o produto é feito, decisões do founder, erros e acertos."],
      ["Comunidade", "Clientes, comentários e cocriação transformados em conteúdo."],
    ],
    diag: [
      ["Marcas DTC fortes têm opinião", "Os virais do nicho vêm de marcas que brincam com críticas, assumem posições e falam como gente. O site é bonito, mas o tom ainda é mais catálogo que conversa."],
      ["Bastidor do founder vende", "Posts do founder contando decisões difíceis e números da operação geram muito engajamento no LinkedIn e levam gente para a loja."],
      ["Cliente é o melhor conteúdo", "Depoimentos, fotos e perguntas de clientes viram antes e depois e listas que o público salva."],
    ],
  },
};

const PERFIL_NICHO: Record<Nicho, PerfilNicho> = Object.fromEntries(
  (Object.keys(PERFIL_BASE) as Nicho[]).map((n) => [n, { ...PERFIL_BASE[n], ...EXTRA[n] }]),
) as Record<Nicho, PerfilNicho>;

const corte = (s: string, n: number) => (s.length <= n ? s : s.slice(0, n - 1).replace(/[\s,;:.]+\S*$/, "") + "…");
const primeiraFrase = (s: string) => (s.match(/^[^.!?]+[.!?]/)?.[0] ?? s).trim();

function frasesDoSite(b: BrandProfile): string[] {
  return [...b.headings.h1, ...b.headings.h2, ...b.paragrafos.map(primeiraFrase), b.description ?? ""]
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter((s) => s.length > 12 && s.length < 180 && !/cookie|javascript|©|todos os direitos/i.test(s))
    .filter((s, i, arr) => arr.indexOf(s) === i);
}

function numerosDoSite(b: BrandProfile): { numero: string; contexto: string }[] {
  const out: { numero: string; contexto: string }[] = [];
  for (const f of [...b.headings.h1, ...b.headings.h2, ...b.paragrafos, b.description ?? ""]) {
    const m = f.match(/((?:\+|mais de )?\d[\d.,]*\s?(?:%|mil|milhões|milhão|mi|bi|x|k)?)/i);
    if (m && /\d{2,}|%|mil|milh|x\b/i.test(m[1]) && f.length < 200) out.push({ numero: m[1].trim(), contexto: f.trim() });
  }
  return out;
}

function legendas(nome: string, gancho: string, corpo: string[], cta: string, tags: string[]) {
  const linhas = corpo.filter(Boolean).slice(0, 4);
  const base = [gancho, "", ...linhas, "", cta].join("\n");
  const tagsTxt = tags.map((t) => `#${t}`).join(" ");
  return {
    instagram: `${base}\n\n${tagsTxt}`.trim(),
    linkedin: `${[gancho, "", ...linhas].join("\n")}\n\n${cta.replace("link na bio", `site da ${nome}`)}\n\n${tags.slice(0, 3).map((t) => `#${t}`).join(" ")}`.trim(),
    x: corte(`${gancho} ${linhas[0] ?? ""}`, 260),
    facebook: base,
  };
}

export function analiseLocal(b: BrandProfile, nicho: Nicho, padroes: PadraoViral[], quantidade: number, redesAtivas: Rede[]): AnaliseIA {
  const perfil = PERFIL_NICHO[nicho];
  const nome = b.nome;
  const frases = frasesDoSite(b);
  const numeros = numerosDoSite(b);
  const promessa = b.headings.h1[0] ?? b.og.title ?? b.title ?? `${nome} resolve um problema real`;
  const descricao = b.description ?? b.paragrafos[0] ?? promessa;
  const tagNome = nome.toLowerCase().replace(/[^a-z0-9]/g, "");
  const tagsNicho: Record<Nicho, string[]> = {
    "saas-b2b": ["gestao", "produtividade", "saas"],
    fintech: ["financas", "fintech", "dinheiro"],
    healthtech: ["saude", "healthtech", "cuidado"],
    edtech: ["educacao", "carreira", "estudos"],
    "ecommerce-dtc": ["marca", "lojaonline", "novidade"],
  };
  const tags = [tagNome, ...tagsNicho[nicho]].filter(Boolean);

  const redes: Rede[] = redesAtivas.length ? redesAtivas : ["linkedin", "instagram"];
  const estrategia = redes.map((rede) => ({
    rede,
    frequencia_semanal: rede === "linkedin" ? 3 : rede === "instagram" ? 3 : rede === "x" ? 4 : 2,
    foco:
      rede === "linkedin"
        ? "Voz do founder: bastidores, opinião sobre o setor e aprendizados. Carrossel uma vez por semana."
        : rede === "instagram"
          ? "Carrosséis educativos e antes e depois, com a identidade visual da marca sempre igual."
          : rede === "x"
            ? "Opiniões curtas e observações do dia a dia do mercado, conversando com quem comenta."
            : "Reaproveitar os melhores posts do Instagram com legenda mais explicada.",
  }));

  // Sequência de formatos: segue os padrões do nicho, pulando dado de impacto se o site não tem número.
  const fila = padroes.filter((p) => p.template_sugerido !== "dado-impacto" || numeros.length > 0);
  const posts: AnaliseIA["posts"] = [];
  for (let i = 0; i < quantidade; i++) {
    const p = fila[i % fila.length];
    const rede = p.formato === "print-tweet" && redes.includes("x") ? "x" : redes[i % redes.length];
    const f = (k: number) => frases[(i + k) % Math.max(frases.length, 1)] ?? promessa;
    const t = p.template_sugerido as TemplateId;
    let gancho = "";
    let slides: { titulo: string; texto: string }[] = [];
    const cta = rede === "instagram" ? `${perfil.cta} Mais no link na bio.` : `${perfil.cta} Conheça a ${nome}.`;

    const curta = (x: string) => x.length <= 70;
    switch (t) {
      case "capa-gancho": {
        const h1 = primeiraFrase(promessa).replace(/\.$/, "");
        gancho = i === 0 && curta(h1) ? h1 : perfil.capas[i % perfil.capas.length];
        const passos = frases.filter((x) => x !== promessa).slice(0, 4);
        slides = [
          { titulo: gancho, texto: corte(descricao, 110) },
          ...passos.map((x, k) => ({ titulo: `${k + 1}.`, texto: corte(x, 200) })),
          { titulo: `Isso é a ${nome}.`, texto: perfil.cta },
        ];
        break;
      }
      case "lista":
      case "checklist": {
        const itens = frases.filter((x) => x.length <= 70).slice(0, 5);
        gancho = t === "lista" ? `${Math.max(3, itens.length)} motivos para conhecer a ${nome}` : `Checklist: ${perfil.pilares[1][0].toLowerCase()}`;
        slides = [{ titulo: gancho, texto: "" }, ...itens.map((x) => ({ titulo: x.replace(/\.$/, ""), texto: "" }))];
        break;
      }
      case "citacao": {
        const opcoes = frases.filter((x) => x.length <= 150);
        gancho = primeiraFrase(opcoes[i % Math.max(opcoes.length, 1)] ?? promessa);
        slides = [{ titulo: nome, texto: gancho }];
        break;
      }
      case "dado-impacto": {
        const n = numeros[i % numeros.length];
        gancho = corte(n.contexto, 120);
        slides = [{ titulo: n.numero, texto: corte(n.contexto, 120) }];
        break;
      }
      case "print-x": {
        gancho = perfil.opinioes[i % perfil.opinioes.length];
        slides = [{ titulo: "", texto: gancho }];
        break;
      }
      case "bastidor": {
        gancho = `Por que existe a ${nome}`;
        slides = [{ titulo: gancho, texto: corte(descricao, 190) }];
        break;
      }
      case "antes-depois": {
        gancho = `Antes e depois da ${nome}`;
        slides = [
          { titulo: "Antes", texto: perfil.antes },
          { titulo: "Depois", texto: perfil.depois },
        ];
        break;
      }
    }
    posts.push({
      rede_principal: rede,
      formato: p.formato,
      template: t,
      gancho,
      slides,
      legendas: legendas(nome, gancho, [i % 2 ? corte(descricao, 180) : "", f(1), f(2)].filter((x) => x && x !== gancho), cta, tags),
      hashtags: tags.slice(0, 4),
      padrao_inspirador: p.id,
      por_que: `Segue o padrão "${p.nome}", que aparece ${p.frequencia} vezes na base de virais.`,
    });
  }

  return {
    nicho,
    resumo_negocio: corte(`${nome}: ${descricao}`, 400),
    publico: perfil.publico.charAt(0).toUpperCase() + perfil.publico.slice(1) + ".",
    tom_de_voz: perfil.tom,
    posicionamento: corte(`Para ${perfil.publico.split(" que ")[0]}, a ${nome} é ${primeiraFrase(promessa).replace(/\.$/, "").toLowerCase()}.`, 230),
    pilares: perfil.pilares.map(([n, d]) => ({ nome: n, descricao: d })),
    diagnostico: [
      ...perfil.diag.map(([titulo, texto]) => ({ titulo, texto })),
      ...(Object.values(b.handles).filter(Boolean).length === 0
        ? [{ titulo: "Redes sem ligação com o site", texto: "Não encontramos links de redes sociais no site. Colocar os perfis no rodapé ajuda quem chega pelo Google a seguir a marca." }]
        : []),
    ].slice(0, 5),
    estrategia,
    posts,
  };
}
