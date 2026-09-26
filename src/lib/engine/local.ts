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
      "a maioria dos processos da sua empresa não está desenhada em lugar nenhum. está no e-mail de alguém.",
      "ferramenta boa não é a que tem mais funções. é a que o time continua usando depois do primeiro mês.",
    ],
    capas: ["O custo escondido do jeito antigo", "O que muda quando o processo sai da planilha"],
    antes: "Planilha paralela, e-mail perdido e ninguém sabe onde o pedido parou.",
    depois: "Um fluxo claro, cada pessoa sabendo o que é com ela.",
    cta: "Comenta qual processo mais te trava hoje.",
  },
  fintech: {
    opinioes: [
      "pagar tarifa para movimentar o próprio dinheiro ainda é normal para muita gente. não deveria ser.",
      "o financeiro da maioria das pequenas empresas é o dono, às 23h, com uma planilha aberta.",
    ],
    capas: ["O que seu banco não te explica", "Dinheiro de empresa sem letra miúda"],
    antes: "Tarifa em tudo, burocracia e atendimento que demora dias.",
    depois: "Dinheiro organizado no app, sem letra miúda.",
    cta: "Salva e manda para quem cuida do financeiro.",
  },
  healthtech: {
    opinioes: [
      "cuidar da saúde não deveria parecer uma maratona de telefonemas e salas de espera.",
      "o melhor momento de cuidar é antes do problema aparecer. o sistema ainda é desenhado para depois.",
    ],
    capas: ["O que muda quando o cuidado vem antes", "Saúde explicada sem pressa"],
    antes: "Ligação, fila, espera e nenhum acompanhamento depois da consulta.",
    depois: "Cuidado contínuo, com gente que conhece o seu histórico.",
    cta: "Salva e compartilha com quem precisa ler isso.",
  },
  edtech: {
    opinioes: [
      "decorar para a prova não é aprender. é alugar o conteúdo por uma semana.",
      "ninguém desiste de estudar por preguiça. desiste porque não vê progresso.",
    ],
    capas: ["Aprenda isso em 1 minuto", "Estudar menos horas e aprender mais"],
    antes: "Horas de estudo, anotação bonita e a sensação de não sair do lugar.",
    depois: "Menos horas, método claro e progresso que dá para ver.",
    cta: "Salva para revisar antes da prova.",
  },
  "ecommerce-dtc": {
    opinioes: [
      "cliente não compra produto. compra a versão de si mesmo que vai usar o produto.",
      "a melhor propaganda de uma marca ainda é a foto que o cliente tira sem ninguém pedir.",
    ],
    capas: ["O detalhe em que ninguém repara", "Do jeito que é feito, de verdade"],
    antes: "Compra por impulso, produto parado na gaveta.",
    depois: "Poucos produtos certos, usados todo dia.",
    cta: "Conta aqui qual você escolheria.",
  },
};

const PERFIL_BASE: Record<Nicho, { publico: string; tom: string; pilares: [string, string][]; diag: [string, string][] }> = {
  "saas-b2b": {
    publico: "gestores e donos de empresa que perdem tempo com processo manual e querem previsibilidade sem contratar mais gente",
    tom: "Fala de resultado de operação com clareza e confiança, sem jargão de TI.",
    pilares: [
      ["Dor da operação", "Mostrar o custo escondido do jeito antigo de trabalhar, com situações que o gestor reconhece."],
      ["Como se faz", "Ensinar o passo a passo de resolver o problema, mesmo antes de falar do produto."],
      ["Bastidor do founder", "Decisões, erros e aprendizados de quem está construindo a empresa."],
    ],
    diag: [
      ["Abra pela consequência, não pela funcionalidade", "Vários posts de SaaS B2B da base abrem com o efeito no negócio (tempo, dinheiro, erro evitado) e só depois mostram o como. Vale revisar se a comunicação atual segue essa ordem."],
      ["Dê voz ao founder", "Parte dos exemplos da base vem do perfil pessoal de founders, com bastidores e opinião. Vale testar posts em primeira pessoa no LinkedIn, além da página da empresa."],
      ["Crie uma série que se repete", "Uma série fixa por semana, como um carrossel de passo a passo, ajuda quem acompanha a criar hábito. É mais fácil de manter do que inventar um formato novo a cada post."],
    ],
  },
  fintech: {
    publico: "pessoas e pequenas empresas cansadas de taxa, burocracia e atendimento de banco tradicional",
    tom: "Explica dinheiro sem economês, com transparência e uma pitada de provocação.",
    pilares: [
      ["Dinheiro sem letra miúda", "Traduzir taxas, regras e produtos financeiros em linguagem simples."],
      ["Contra o jeito antigo", "Comparar a experiência com o banco tradicional, sempre com fatos."],
      ["Confiança", "Mostrar segurança, regulação e gente real por trás do produto."],
    ],
    diag: [
      ["Use o contraste a seu favor", "Vários virais de fintech da base colocam o banco tradicional como antagonista e mostram a diferença numa imagem só. Vale testar uma comparação direta, sempre com fatos que a marca pode provar."],
      ["Explique o que ninguém explica", "Carrosséis que traduzem uma regra, uma taxa ou uma mudança em poucos slides aparecem com frequência na base. É conteúdo útil que a pessoa guarda."],
      ["Mostre quem está por trás", "Confiar dinheiro a uma marca nova exige confiança. Posts de founders e do time falando de decisões difíceis ajudam a construir isso."],
    ],
  },
  healthtech: {
    publico: "pessoas e empresas que querem cuidar da saúde sem a experiência fria e demorada do sistema tradicional",
    tom: "Explica saúde com cuidado e sem alarmismo, perto de quem lê.",
    pilares: [
      ["Cuidado na prática", "Histórias e situações reais de cuidado, sempre com consentimento e sem expor ninguém."],
      ["Saúde explicada", "Conteúdo educativo curto, revisado por profissional, que tira dúvida comum."],
      ["Por dentro da operação", "Como o time trabalha, quem são os profissionais e por que as decisões são tomadas."],
    ],
    diag: [
      ["Conte histórias, com cuidado", "Na base de healthtech, relatos de paciente e de profissional aparecem mais do que peças institucionais. Vale testar histórias reais, sempre com consentimento."],
      ["Tenha uma opinião sobre o setor", "Founders de saúde que publicam uma posição clara, com argumento, aparecem entre os exemplos da base. Opinião gera conversa e autoridade."],
      ["Eduque em formato fácil de guardar", "Listas e checklists curtos sobre prevenção e uso do serviço são formatos simples de manter e de compartilhar."],
    ],
  },
  edtech: {
    publico: "estudantes e profissionais que querem aprender algo que muda sua carreira ou nota, sem perder tempo",
    tom: "Fala como um bom professor fala no intervalo: perto, animado e com humor.",
    pilares: [
      ["Aprenda em 1 minuto", "Um conceito útil por post, explicado de forma que dê para aplicar hoje."],
      ["Histórias de virada", "Trajetórias de alunos e do time, com antes e depois concretos."],
      ["Opinião sobre educação", "Posições claras sobre como se aprende de verdade, que provocam comentário."],
    ],
    diag: [
      ["Ensine antes de vender", "Vários posts de edtech da base entregam uma aula curta no próprio post. Vale dar uma amostra do jeito de ensinar antes de falar do curso."],
      ["Defina uma voz com personalidade", "Marcas de educação com uma voz reconhecível aparecem entre os exemplos da base. Vale escolher um jeito próprio de falar e manter."],
      ["Mostre a transformação", "Antes e depois de alunos, com números reais que eles autorizaram mostrar, é um formato que conecta direto com quem está decidindo."],
    ],
  },
  "ecommerce-dtc": {
    publico: "consumidores que compram online, valorizam marca com propósito e decidem pela experiência e pela prova de outros clientes",
    tom: "Fala como uma amiga que entende do assunto, com personalidade e sem medo de opinião.",
    pilares: [
      ["Produto na vida real", "Uso real do produto, com detalhe que só quem usa percebe."],
      ["Bastidor da marca", "Como o produto é feito, decisões do founder, erros e acertos."],
      ["Comunidade", "Clientes, comentários e cocriação transformados em conteúdo."],
    ],
    diag: [
      ["Tenha opinião", "Vários virais de DTC da base vêm de marcas que brincam com críticas, assumem posições e falam como gente. Vale revisar se o tom atual soa mais como conversa ou como catálogo."],
      ["Leve o founder para o LinkedIn", "Parte dos exemplos da base são posts de founders contando decisões e números da operação. É um canal que muitas marcas DTC ainda não usam."],
      ["Faça do cliente o conteúdo", "Depoimentos, fotos e perguntas de clientes viram antes e depois e listas que o público guarda."],
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
    linkedin: `${[gancho, "", ...linhas].join("\n")}\n\n${cta.replace("link na bio", "site")}\n\n${tags.slice(0, 3).map((t) => `#${t}`).join(" ")}`.trim(),
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
  // Sem número real no site, sem dado de impacto. Sem pelo menos 3 frases curtas, sem lista.
  const frasesCurtas = frases.filter((x) => x.length <= 70).length;
  const filtrados = padroes.filter(
    (p) =>
      (p.template_sugerido !== "dado-impacto" || numeros.length > 0) &&
      (!["lista", "checklist"].includes(p.template_sugerido) || frasesCurtas >= 3),
  );
  const fila = filtrados.length ? filtrados : padroes.filter((p) => p.template_sugerido === "citacao" || p.template_sugerido === "print-x");
  const posts: AnaliseIA["posts"] = [];
  for (let i = 0; i < quantidade; i++) {
    const p = fila[i % fila.length];
    const rede = p.formato === "print-tweet" && redes.includes("x") ? "x" : redes[i % redes.length];
    const f = (k: number) => frases[(i + k) % Math.max(frases.length, 1)] ?? promessa;
    const t = p.template_sugerido as TemplateId;
    let gancho = "";
    let slides: { titulo: string; texto: string }[] = [];
    const cta = rede === "instagram" ? `${perfil.cta} Mais no link na bio.` : `${perfil.cta} Conheça ${nome}.`;

    const curta = (x: string) => x.length <= 70;
    switch (t) {
      case "capa-gancho": {
        const h1 = primeiraFrase(promessa).replace(/\.$/, "");
        gancho = i === 0 && curta(h1) ? h1 : perfil.capas[i % perfil.capas.length];
        const passos = frases.filter((x) => x !== promessa).slice(0, 4);
        slides = [
          { titulo: gancho, texto: corte(descricao, 110) },
          ...passos.map((x, k) => ({ titulo: `${k + 1}.`, texto: corte(x, 200) })),
          { titulo: `Isso é ${nome}.`, texto: perfil.cta },
        ];
        break;
      }
      case "lista":
      case "checklist": {
        const itens = frases.filter((x) => x.length <= 70).slice(0, 5);
        gancho = t === "lista" ? `${itens.length} motivos para conhecer ${nome}` : "Antes de escolher, confira";
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
        gancho = `Por que ${nome} existe`;
        slides = [{ titulo: gancho, texto: corte(descricao, 190) }];
        break;
      }
      case "antes-depois": {
        gancho = `Antes e depois: ${nome}`;
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
    posicionamento: corte(`Para ${perfil.publico.split(" que ")[0]}, ${nome}: ${primeiraFrase(promessa).replace(/\.$/, "")}.`, 230),
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
