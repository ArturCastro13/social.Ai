import type { BrandProfile, Formato, Nicho, PadraoViral, Rede } from "@/lib/types";
import { NICHOS } from "@/lib/types";
import { nomeDoPerfil } from "@/lib/brand/nome";
import { templateDoFormato } from "@/lib/virais/catalogo";
import type { AnaliseIA } from "./schema";
import { textoDaMarca } from "./nicho";
import { escolherTema, type Tema } from "./temas-locais";
import { MODELOS, MOTIVO_FORMATO, MOTIVO_GANCHO, type Chamada, type Contexto, type Ideia, type Modelo } from "./ideias-locais";
import {
  corte,
  depoimentosDoSite,
  ehNavegacao,
  frasesDe,
  frasesDeProduto,
  frasesDoSite,
  generoDaMarca,
  hashTexto,
  frasesMaiusculas,
  numerosDoSite,
  paraHashtag,
  PROIBIDAS,
  temProibida,
} from "./texto-local";

// Motor de regras: produz uma análise completa sem nenhuma chamada de IA.
// É o gerador do MVP enquanto não há chave de IA, e a rede de segurança quando a IA falha.
// Usa o banco de temas por nicho (temas-locais.ts), o banco de ideias por formato
// (ideias-locais.ts) e só fatos que aparecem no texto do site. Determinístico: a mesma
// marca gera sempre a mesma saída (a variação entre marcas vem do hash do domínio).

/** Diagnóstico de nicho, com base no que a base de virais mostra. Completa o diagnóstico do site. */
const DIAG_NICHO: Record<Nicho, [string, string][]> = {
  "saas-b2b": [
    ["Dê voz ao founder", "Parte dos exemplos da base de SaaS B2B vem do perfil pessoal de founders, com bastidores e opinião. Vale testar posts em primeira pessoa no LinkedIn, além da página da empresa."],
    ["Crie uma série que se repete", "Uma série fixa por semana, como um carrossel de passo a passo, ajuda quem acompanha a criar hábito. É mais fácil de manter do que inventar um formato novo a cada post."],
  ],
  fintech: [
    ["Explique o que ninguém explica", "Carrosséis que traduzem uma regra, uma taxa ou uma mudança em poucos slides aparecem com frequência na base de fintech. É conteúdo útil que a pessoa guarda."],
    ["Mostre quem está por trás", "Confiar dinheiro a uma marca nova exige confiança. Posts de founders e do time falando de decisões difíceis ajudam a construir isso."],
  ],
  healthtech: [
    ["Conte histórias, com cuidado", "Na base de healthtech, relatos de paciente e de profissional aparecem mais do que peças institucionais. Vale testar histórias reais, sempre com consentimento."],
    ["Eduque em formato fácil de guardar", "Listas e checklists curtos sobre prevenção e uso do serviço são formatos simples de manter e de compartilhar."],
  ],
  edtech: [
    ["Ensine antes de vender", "Vários posts de edtech da base entregam uma aula curta no próprio post. Vale dar uma amostra do jeito de ensinar antes de falar do curso."],
    ["Mostre a virada do aluno", "Antes e depois de alunos, com números reais que eles autorizaram mostrar, conecta direto com quem está decidindo."],
  ],
  "ecommerce-dtc": [
    ["Tenha opinião", "Vários virais de DTC da base vêm de marcas que assumem posições e falam como gente. Vale revisar se o tom atual soa mais como conversa ou como catálogo."],
    ["Faça do cliente o conteúdo", "Avaliações, fotos e perguntas de clientes viram antes e depois e listas que o público guarda, sempre com autorização."],
  ],
};

const REDES_NOME: Record<Rede, string> = { instagram: "Instagram", linkedin: "LinkedIn", x: "X", facebook: "Facebook" };

/** Rede preferida por formato: a primeira ativa com menos posts leva. */
const REDE_DO_FORMATO: Record<Formato, Rede[]> = {
  carrossel: ["instagram", "linkedin", "facebook", "x"],
  lista: ["instagram", "linkedin", "facebook", "x"],
  "print-tweet": ["x", "linkedin", "instagram", "facebook"],
  "bastidor-founder": ["linkedin", "instagram", "facebook", "x"],
  citacao: ["linkedin", "instagram", "facebook", "x"],
  "imagem-unica": ["instagram", "facebook", "linkedin", "x"],
  "antes-depois": ["instagram", "facebook", "linkedin", "x"],
  "dado-impacto": ["linkedin", "instagram", "facebook", "x"],
};

/** Ordem de reserva, depois dos formatos que aparecem nos padrões do nicho. */
const ORDEM_FORMATOS: Formato[] = [
  "carrossel", "print-tweet", "lista", "antes-depois", "bastidor-founder", "citacao", "imagem-unica", "dado-impacto",
];

const juntar = (itens: string[]) =>
  itens.length <= 1 ? (itens[0] ?? "") : `${itens.slice(0, -1).join(", ")} e ${itens[itens.length - 1]}`;

const chaveGancho = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

// ---------- Legendas ----------

const CHAMADAS: Record<Chamada, { instagram: string[]; linkedin: string[]; emoji: string }> = {
  salvar: {
    instagram: ["Salva para consultar depois e manda para quem precisa ver.", "Salva este post e volta nele quando precisar."],
    linkedin: ["Guarde para consultar depois e mande para quem cuida disso com você.", "Vale salvar e compartilhar com o time."],
    emoji: "📌",
  },
  comentar: {
    instagram: ["Conta aqui nos comentários: isso acontece aí?", "Concorda? Comenta aqui."],
    linkedin: ["Como isso funciona aí? Conta nos comentários.", "Concorda ou discorda? Quero ler a sua opinião nos comentários."],
    emoji: "👇",
  },
  conhecer: {
    instagram: ["Conheça {aMarca}: link na bio.", "Mais detalhes no link da bio."],
    linkedin: ["Conheça {aMarca} pelo site.", "Mais detalhes no site {daMarca}."],
    emoji: "👉",
  },
};

function legendas(c: Contexto, ideia: Ideia, tags: string[], i: number): AnaliseIA["posts"][number]["legendas"] {
  const troca = (s: string) => s.replace("{aMarca}", c.aMarca).replace("{daMarca}", c.daMarca);
  const ch = CHAMADAS[ideia.chamada];
  const ctaIg = troca(ch.instagram[i % ch.instagram.length]);
  const ctaLi = troca(ch.linkedin[i % ch.linkedin.length]);
  const corpo = ideia.corpo.filter(Boolean).slice(0, 5);
  const hashtags = (n: number) => tags.slice(0, n).map((t) => `#${t}`).join(" ");

  const instagram = [ideia.gancho, "", ...corpo, "", `${ctaIg} ${ch.emoji}`, "", hashtags(5)].join("\n").trim();
  const facebook = [ideia.gancho, "", ...corpo, "", `${ctaIg} ${ch.emoji}`].join("\n").trim();
  const linkedin = [ideia.gancho, "", corpo.join("\n\n"), "", ctaLi, "", hashtags(3)].join("\n").trim();

  // X: gancho e quantas linhas do miolo couberem em 260 caracteres.
  let x = ideia.gancho;
  for (const linha of corpo) {
    const prox = `${x}\n\n${linha}`;
    if (prox.length > 260) break;
    x = prox;
  }
  return { instagram, linkedin, x: corte(x, 260), facebook };
}

// ---------- Análise ----------

function publicoDoSite(tema: Tema, texto: string): string {
  const segmentos: string[] = [];
  const t = texto.toLowerCase();
  if (/\bpmes?\b|pequenas e m[ée]dias/.test(t)) segmentos.push("pequenas e médias empresas");
  if (/grandes? empresas?/.test(t)) segmentos.push("empresas grandes");
  if (/\bmeis?\b|microempreendedor/.test(t)) segmentos.push("MEIs");
  if (/aut[ôo]nom[oa]s?/.test(t)) segmentos.push("autônomos");
  if (/escrit[óo]rios? de contabilidade|contadores/.test(t)) segmentos.push("contadores");
  const base = `${tema.publico}.`;
  return segmentos.length ? `${base} O site fala direto com ${juntar(segmentos)}.` : base;
}

function tomDeVoz(c: Contexto, texto: string, frases: string[]): string {
  const informal = /(?<![\p{L}])(a gente|tá|vem cá|fala,|bora|pra)(?![\p{L}])/iu.test(texto);
  const minusculas = frases.filter((f) => /^\p{Ll}/u.test(f)).length >= 3;
  const exemplo = c.produto.find((f) => f.length >= 20 && f.length <= 70);
  const jeito = informal || minusculas
    ? "Próximo e informal, de igual para igual, como o site já faz"
    : "Direto e claro, falando com você e com foco no resultado para quem usa";
  const trecho = exemplo && (informal || minusculas) ? ` em "${exemplo}"` : "";
  const exemploRede = frasesMaiusculas(c.tema.opinioes[c.seed % c.tema.opinioes.length]);
  return corte(`${jeito}${trecho}. Nas redes, dá para ter mais opinião, sem jargão. Exemplo: "${exemploRede}"`, 300);
}

function diagnostico(c: Contexto, b: BrandProfile, frases: string[]): AnaliseIA["diagnostico"] {
  const itens: { titulo: string; texto: string }[] = [];

  const h1 = b.headings.h1[0] ? frasesDe(b.headings.h1[0]).join(" ") : "";
  if (h1 && (ehNavegacao(h1) || temProibida(h1))) {
    itens.push({ titulo: "A página abre sem uma promessa clara", texto: `O título principal do site apresenta o menu ou a empresa, não o que muda para quem compra. Nas redes, a primeira linha precisa falar de ${c.tema.dor} e de como sair disso.` });
  } else if (h1 && h1.length <= 120) {
    const falaDeAcao = /^(venda|crie|controle|gerencie|automatize|receba|reduza|organize|tenha|ganhe|pague|cobre|aprenda|cuide|escute|viva|monte)(?![\p{L}])/iu.test(h1);
    itens.push(
      falaDeAcao
        ? { titulo: "A promessa do site já fala de ação", texto: `A página abre com "${h1.replace(/[.!]+$/, "")}". É um bom ponto de partida: nas redes, mostre o antes e o depois dessa promessa na rotina de ${c.tema.quem}.` }
        : { titulo: "O site descreve o produto, os posts precisam mostrar a consequência", texto: `A página abre com "${h1.replace(/[.!]+$/, "")}". Nas redes, a primeira linha precisa falar do que muda para ${c.tema.quem}, como sair de ${c.tema.dor}, e só depois do produto.` },
    );
  }

  if (c.numeros.length) {
    itens.push({ titulo: "Há prova concreta no site", texto: `O site mostra "${c.numeros[0].frase}". Número real vale mais do que adjetivo: use em post de dado e repita na bio, sem arredondar para cima.` });
  } else {
    itens.push({ titulo: "Faltam provas concretas no texto do site", texto: "Não encontramos números de resultado no texto lido. Sem isso, os posts se apoiam em ensino e opinião; quando houver um caso real autorizado, ele vira um bom post de prova." });
  }

  if (c.depoimentos.length) {
    itens.push({ titulo: "Os relatos de clientes estão parados no site", texto: `O site tem ${c.depoimentos.length > 1 ? `${c.depoimentos.length} relatos` : "um relato"} de cliente em primeira pessoa. Com autorização, cada um rende um antes e depois ou uma citação nas redes.` });
  }

  if (frases.some((f) => PROIBIDAS.test(f))) {
    itens.push({ titulo: "O texto do site usa palavras de anúncio", texto: `Algumas frases do site usam verbos grandes de mudança que qualquer concorrente poderia usar. Nas redes, troque por o que muda na prática para ${c.tema.quem}: menos tempo, menos erro, menos custo.` });
  }

  const handles = (Object.keys(REDES_NOME) as Rede[]).filter((r) => b.handles[r]);
  if (!handles.length) {
    itens.push({ titulo: "Redes sem ligação com o site", texto: "Não encontramos links de redes sociais no site. Colocar os perfis no rodapé ajuda quem chega pelo Google a seguir a marca." });
  } else if (c.nicho === "saas-b2b" && !handles.includes("linkedin")) {
    itens.push({ titulo: "Falta o LinkedIn para uma empresa B2B", texto: `Achamos ${juntar(handles.map((r) => REDES_NOME[r]))}, mas não o LinkedIn, que é onde se lê sobre trabalho e onde decisões de compra B2B costumam começar.` });
  }

  for (const [titulo, texto] of DIAG_NICHO[c.nicho]) if (itens.length < 5) itens.push({ titulo, texto });
  return itens.slice(0, 5).map((d) => ({ titulo: corte(d.titulo, 120), texto: corte(d.texto, 600) }));
}

function estrategiaPorRede(c: Contexto, redes: Rede[]): AnaliseIA["estrategia"] {
  const t = c.tema;
  const foco: Record<Rede, string> = {
    linkedin: `Voz do founder e do time: bastidor e opinião sobre ${t.assunto}, com um carrossel de passo a passo por semana para ${t.quem}.`,
    instagram: `Carrosséis e listas feitos para ${t.quem} guardar, mais antes e depois, sempre com a identidade visual ${c.daMarca}.`,
    x: `Opiniões curtas sobre ${t.assunto} e conversa com quem responde, no tom de gente falando.`,
    facebook: `Reaproveitar os posts que forem melhor no Instagram, com legenda um pouco mais explicada.`,
  };
  const freq: Record<Rede, number> = { linkedin: 3, instagram: 3, x: 4, facebook: 2 };
  return redes.slice(0, 4).map((rede) => ({ rede, frequencia_semanal: freq[rede], foco: corte(foco[rede], 300) }));
}

// ---------- Posts ----------

function escolherPadrao(padroes: PadraoViral[], nicho: Nicho, formato: Formato, tipo: string): PadraoViral | null {
  const doNicho = padroes.filter((p) => p.nichos.includes(nicho));
  return (
    doNicho.find((p) => p.formato === formato && p.tipo_gancho === tipo) ??
    doNicho.find((p) => p.formato === formato) ??
    padroes.find((p) => p.formato === formato && p.tipo_gancho === tipo) ??
    padroes.find((p) => p.formato === formato) ??
    null
  );
}

function porQue(p: PadraoViral | null, m: Modelo, ideia: Ideia, nicho: Nicho): string {
  const nomeNicho = NICHOS.find((n) => n.id === nicho)?.nome ?? nicho;
  const gancho = MOTIVO_GANCHO[m.tipo];
  const base = p
    ? p.tipo_gancho === m.tipo
      ? `Segue o padrão "${p.nome}" da base de ${nomeNicho}: ${gancho}.`
      : `Segue o formato do padrão "${p.nome}" da base de ${nomeNicho}, com gancho de outro tipo: ${gancho}.`
    : `Formato incluído para variar a grade: ${gancho}.`;
  const revisar = ideia.revisar ? " Confirme com o time se o relato bate com a experiência real antes de publicar." : "";
  return corte(`${base} ${MOTIVO_FORMATO[m.formato]}${revisar}`, 400);
}

export function analiseLocal(b: BrandProfile, nicho: Nicho, padroes: PadraoViral[], quantidade: number, redesAtivas: Rede[]): AnaliseIA {
  const marca = nomeDoPerfil(b);
  const texto = textoDaMarca(b);
  const tema = escolherTema(texto, nicho);
  const frases = frasesDoSite(b);
  const genero = generoDaMarca(texto, marca);
  const seed = hashTexto(b.dominio || marca);

  const c: Contexto = {
    marca,
    aMarca: `${genero} ${marca}`,
    AMarca: `${genero.toUpperCase()} ${marca}`,
    daMarca: `${genero === "a" ? "da" : "do"} ${marca}`,
    comAMarca: `com ${genero} ${marca}`,
    nicho,
    tema,
    produto: frasesDeProduto(frases),
    numeros: numerosDoSite(frases),
    depoimentos: depoimentosDoSite(b),
    seed,
  };

  const tagMarca = paraHashtag(marca);
  const tags = [...new Set([...(tagMarca.length >= 3 && tagMarca.length <= 30 ? [tagMarca] : []), ...tema.tags].map(paraHashtag).filter(Boolean))];

  const redes: Rede[] = redesAtivas.length ? redesAtivas : ["linkedin", "instagram"];

  // Formatos: os que aparecem nos padrões do nicho, na ordem da base, com o carrossel na frente.
  // Dado de impacto só entra com número real do site.
  let formatos = [...new Set([...padroes.map((p) => p.formato), ...ORDEM_FORMATOS])];
  if (!c.numeros.length) formatos = formatos.filter((f) => f !== "dado-impacto");
  formatos = ["carrossel" as Formato, ...formatos.filter((f) => f !== "carrossel")];

  const usados = new Set<string>();
  const ganchos = new Set<string>();
  const porRede = new Map<Rede, number>();
  const posts: AnaliseIA["posts"] = [];

  for (let rodada = 0; posts.length < quantidade && rodada < 6; rodada++) {
    for (const f of formatos) {
      if (posts.length >= quantidade) break;
      // Modelos do formato: primeiro os que usam fato do site, depois os de tipo de gancho que aparece na base do nicho.
      const tiposDaBase = padroes.filter((p) => p.formato === f).map((p) => p.tipo_gancho);
      const candidatos = MODELOS[f]
        .filter((m) => !usados.has(m.id))
        .map((m, i) => ({ m, ordem: (m.usaSite ? 0 : 20) + (tiposDaBase.includes(m.tipo) ? 0 : 10) + ((i + seed) % MODELOS[f].length) / 10 }))
        .sort((a, b) => a.ordem - b.ordem)
        .map((x) => x.m);
      for (const m of candidatos) {
        usados.add(m.id);
        const ideia = m.gerar(c);
        if (!ideia || ganchos.has(chaveGancho(ideia.gancho))) continue;
        ganchos.add(chaveGancho(ideia.gancho));

        // Rede: preferência do formato pesa, mas a rede com menos posts ganha espaço.
        const preferidas = REDE_DO_FORMATO[f].filter((r) => redes.includes(r));
        const nota = (r: Rede) => (porRede.get(r) ?? 0) + preferidas.indexOf(r) * 0.75;
        const rede = [...preferidas].sort((a, b2) => nota(a) - nota(b2))[0] ?? redes[0];
        porRede.set(rede, (porRede.get(rede) ?? 0) + 1);

        const padrao = escolherPadrao(padroes, nicho, f, m.tipo);
        posts.push({
          rede_principal: rede,
          formato: f,
          template: templateDoFormato(f),
          gancho: corte(ideia.gancho, 220),
          slides: ideia.slides.slice(0, 8).map((s) => ({ titulo: corte(s.titulo, 200), texto: corte(s.texto, 600) })),
          legendas: legendas(c, ideia, tags, posts.length),
          hashtags: tags.slice(0, 5),
          padrao_inspirador: padrao?.id ?? "",
          por_que: porQue(padrao, m, ideia, nicho),
        });
        break;
      }
    }
  }

  const promessa = c.produto[0];
  const testeGratis = /teste gr[áa]tis|experimente gr[áa]tis|gr[áa]tis por \d+ dias|crie sua loja gr[áa]tis|1º m[êe]s gr[áa]tis/i.test(texto);
  const lojasFisicas = tema.nicho === "ecommerce-dtc" && /farm[áa]cias|lojas f[íi]sicas|nas lojas/i.test(texto);
  const resumo = [
    `${c.AMarca} é ${tema.categoria} para ${tema.quem}.`,
    promessa ? `No site, a promessa principal é: ${promessa.charAt(0).toLowerCase() + promessa.slice(1)}.` : "",
    `Modelo de receita provável: ${tema.receita}${lojasFisicas ? ", e também em lojas físicas, segundo o site" : ""}.`,
    testeGratis ? "O site oferece uso grátis como porta de entrada." : "",
  ]
    .filter(Boolean)
    .join(" ");

  const posicionamento = promessa
    ? `Para ${tema.quem}, ${c.aMarca} é ${tema.categoria}. A promessa: ${promessa.charAt(0).toLowerCase() + promessa.slice(1)}.`
    : `Para ${tema.quem}, ${c.aMarca} é ${tema.categoria} que tira da rotina ${tema.dor}.`;

  return {
    nicho,
    resumo_negocio: corte(resumo, 600),
    publico: corte(publicoDoSite(tema, texto), 500),
    tom_de_voz: tomDeVoz(c, texto, frases),
    posicionamento: corte(posicionamento, 240),
    pilares: tema.pilares.map(([nome, descricao]) => ({ nome, descricao })),
    diagnostico: diagnostico(c, b, frases),
    estrategia: estrategiaPorRede(c, redes),
    posts,
  };
}
