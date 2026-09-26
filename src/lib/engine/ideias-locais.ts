import type { Formato, Nicho, TipoGancho } from "@/lib/types";
import type { Tema } from "./temas-locais";
import type { NumeroSite } from "./texto-local";
import { corte, frasesMaiusculas, maiuscula, minuscula } from "./texto-local";

// Banco de ideias do motor local, por formato. Cada modelo monta um post completo
// (gancho, slides no formato do template e o miolo da legenda) a partir do tema do nicho
// e do que o site diz. Modelos que dependem de dado do site (número, depoimento, frases de
// produto) devolvem null quando o dado não existe: nada é inventado.

export interface Contexto {
  marca: string;
  /** "a Omie", "o Pipefy". */
  aMarca: string;
  AMarca: string;
  daMarca: string;
  comAMarca: string;
  nicho: Nicho;
  tema: Tema;
  /** Frases de produto do site, limpas. */
  produto: string[];
  numeros: NumeroSite[];
  depoimentos: string[];
  /** Deslocamento estável por marca para variar exemplos entre empresas. */
  seed: number;
}

export type Chamada = "salvar" | "comentar" | "conhecer";

export interface Ideia {
  gancho: string;
  slides: { titulo: string; texto: string }[];
  /** 2 a 5 linhas curtas para o miolo da legenda. */
  corpo: string[];
  chamada: Chamada;
  /** Relato em primeira pessoa: o founder precisa confirmar antes de publicar. */
  revisar?: boolean;
}

export interface Modelo {
  id: string;
  formato: Formato;
  tipo: TipoGancho;
  /** Usa fato do site (promessa, número, depoimento): tem prioridade porque é mais específico. */
  usaSite?: boolean;
  gerar: (c: Contexto) => Ideia | null;
}

const pega = <T,>(lista: T[], i: number): T => lista[((i % lista.length) + lista.length) % lista.length];
const ponto = (s: string) => (/[.!?]$/.test(s) ? s : `${s}.`);
const semPonto = (s: string) => s.replace(/[.!?]+$/, "");

/** Slide final dos carrosséis: chamada e o que a marca é, com a promessa do site quando existe. */
function fechamento(c: Contexto, titulo: string) {
  const promessa = c.produto[0];
  return {
    titulo,
    texto: corte(
      promessa ? `${c.AMarca} é ${c.tema.categoria}. ${ponto(maiuscula(promessa))}` : `${c.AMarca} é ${c.tema.categoria} para ${c.tema.quem}.`,
      220,
    ),
  };
}

const CARROSSEL: Modelo[] = [
  {
    id: "carrossel-passos",
    formato: "carrossel",
    tipo: "promessa",
    gerar: (c) => {
      const t = c.tema;
      const gancho = `Como ${t.promessa}`;
      return {
        gancho,
        slides: [
          { titulo: gancho, texto: `${t.passos.length} passos para ${t.quem}` },
          ...t.passos.map(([titulo, texto], i) => ({ titulo: `${i + 1}. ${titulo}`, texto })),
          fechamento(c, "Salve para aplicar esta semana"),
        ],
        corpo: [
          `Se hoje é ${t.dor}, este post é para você.`,
          `São ${t.passos.length} passos que dá para começar esta semana, sem trocar tudo de uma vez.`,
          `O primeiro: ${minuscula(semPonto(t.passos[0][0]))}. ${t.passos[0][1]}`,
        ],
        chamada: "salvar",
      };
    },
  },
  {
    id: "carrossel-erros",
    formato: "carrossel",
    tipo: "erro-comum",
    gerar: (c) => {
      const t = c.tema;
      const erros = t.erros.slice(0, 4);
      const gancho = `${erros.length} erros comuns ${t.assuntoEm}`;
      return {
        gancho,
        slides: [
          { titulo: gancho, texto: "E o que fazer no lugar" },
          ...erros.map(([titulo, texto]) => ({ titulo, texto })),
          fechamento(c, "Qual deles você já cometeu?"),
        ],
        corpo: [
          `Nenhum desses erros parece grave no dia. O problema é somar todos no fim do mês.`,
          `Um deles: ${minuscula(erros[0][0])}. ${erros[0][1]}`,
          `Os outros ${erros.length - 1} estão no carrossel, com o que fazer no lugar.`,
        ],
        chamada: "comentar",
      };
    },
  },
  {
    id: "carrossel-mito",
    formato: "carrossel",
    tipo: "contraintuitivo",
    gerar: (c) => {
      const t = c.tema;
      return {
        gancho: t.mito,
        slides: [
          { titulo: t.mito, texto: "O que acontece na prática" },
          { titulo: "O que se acredita", texto: t.crenca[0] },
          { titulo: "O que acontece", texto: t.crenca[1] },
          { titulo: "Por onde começar", texto: `${ponto(t.passos[0][0])} ${t.passos[0][1]}` },
          fechamento(c, "Concorda ou discorda?"),
        ],
        corpo: [t.crenca[0], t.crenca[1], `Por onde começar: ${minuscula(ponto(t.passos[0][0]))}`],
        chamada: "comentar",
      };
    },
  },
  {
    id: "carrossel-porque",
    formato: "carrossel",
    tipo: "pergunta",
    gerar: (c) => {
      const t = c.tema;
      const gancho = `Por que ${t.porque}?`;
      const causas = t.erros.slice(1, 4);
      return {
        gancho,
        slides: [
          { titulo: gancho, texto: `${causas.length} motivos e um jeito de sair disso` },
          ...causas.map(([titulo, texto]) => ({ titulo, texto })),
          { titulo: "O que fazer", texto: `${ponto(t.passos[1][0])} ${t.passos[1][1]}` },
          fechamento(c, "Salve e mande para o seu time"),
        ],
        corpo: [
          `Quase nunca é falta de esforço. São hábitos pequenos que se acumulam.`,
          `Um deles: ${minuscula(causas[0][0])}.`,
          `No carrossel, os ${causas.length} motivos mais comuns e por onde começar a mudar.`,
        ],
        chamada: "salvar",
      };
    },
  },
];

const IMAGEM_UNICA: Modelo[] = [
  {
    id: "imagem-promessa-site",
    usaSite: true,
    formato: "imagem-unica",
    tipo: "promessa",
    gerar: (c) => {
      const p = c.produto.find((x) => x.length <= 110);
      if (!p) return null;
      const outra = c.produto.find((x) => x !== p);
      return {
        gancho: maiuscula(p),
        slides: [{ titulo: c.marca, texto: ponto(maiuscula(p)) }],
        corpo: [
          `Se hoje é ${c.tema.dor}, dá para simplificar.`,
          `${c.AMarca} é ${c.tema.categoria} para ${c.tema.quem}.`,
          ...(outra ? [ponto(maiuscula(outra))] : []),
        ],
        chamada: "conhecer",
      };
    },
  },
  {
    id: "imagem-erro",
    formato: "imagem-unica",
    tipo: "erro-comum",
    gerar: (c) => {
      const [titulo, texto] = pega(c.tema.erros, c.seed + 1);
      const gancho = `${titulo} custa mais caro do que parece`;
      return {
        gancho,
        slides: [{ titulo: c.marca, texto: corte(`${ponto(titulo)} ${texto}`, 160) }],
        corpo: [texto, `O que fazer no lugar: ${minuscula(ponto(pega(c.tema.passos, c.seed + 1)[0]))}`, pega(c.tema.passos, c.seed + 1)[1]],
        chamada: "salvar",
      };
    },
  },
  {
    id: "imagem-frase",
    formato: "imagem-unica",
    tipo: "contraintuitivo",
    gerar: (c) => {
      const frase = pega(c.tema.frases, c.seed + 1);
      return {
        gancho: semPonto(frase),
        slides: [{ titulo: c.marca, texto: frase }],
        corpo: [c.tema.crenca[0], c.tema.crenca[1]],
        chamada: "comentar",
      };
    },
  },
];

const PRINT_TWEET: Modelo[] = [0, 1, 2].map((k) => ({
  id: `print-opiniao-${k}`,
  formato: "print-tweet" as Formato,
  tipo: (k === 1 ? "contraintuitivo" : "polemica") as TipoGancho,
  gerar: (c: Contexto): Ideia => {
    const t = c.tema;
    const opiniao = pega(t.opinioes, c.seed + k);
    const sinal = pega(t.sinais, c.seed + k);
    const [passo, explica] = pega(t.passos, c.seed + k);
    return {
      gancho: semPonto(frasesMaiusculas(opiniao)),
      slides: [{ titulo: c.marca, texto: opiniao }],
      corpo: [
        `Um sinal de que isso acontece aí: ${minuscula(ponto(sinal))}`,
        `Primeiro passo para sair disso: ${minuscula(ponto(passo))} ${explica}`,
      ],
      chamada: "comentar",
    };
  },
}));

const CITACAO: Modelo[] = [
  {
    id: "citacao-frase",
    formato: "citacao",
    tipo: "contraintuitivo",
    gerar: (c) => {
      const frase = pega(c.tema.frases, c.seed);
      return {
        gancho: semPonto(frase),
        slides: [{ titulo: `Time ${c.daMarca}`, texto: frase }],
        corpo: [c.tema.crenca[0], c.tema.crenca[1], `Um jeito de começar: ${minuscula(ponto(pega(c.tema.passos, c.seed + 3)[0]))} ${pega(c.tema.passos, c.seed + 3)[1]}`],
        chamada: "comentar",
      };
    },
  },
  {
    id: "citacao-crenca",
    formato: "citacao",
    tipo: "curiosidade",
    gerar: (c) => {
      const frase = maiuscula(c.tema.crenca[1].replace(/^na prática,\s*/i, ""));
      return {
        gancho: semPonto(frase),
        slides: [{ titulo: `Time ${c.daMarca}`, texto: frase }],
        corpo: [c.tema.crenca[0], `Um sinal de que isso acontece aí: ${minuscula(ponto(pega(c.tema.sinais, c.seed + 2)))}`, `Um jeito de começar: ${minuscula(ponto(pega(c.tema.passos, c.seed + 2)[0]))} ${pega(c.tema.passos, c.seed + 2)[1]}`],
        chamada: "comentar",
      };
    },
  },
];

const LISTA: Modelo[] = [
  {
    id: "lista-sinais",
    formato: "lista",
    tipo: "pergunta",
    gerar: (c) => {
      const t = c.tema;
      const gancho = `${maiuscula(t.sinalDe)}? ${t.sinais.length} sinais para conferir`;
      return {
        gancho,
        slides: [{ titulo: gancho, texto: "" }, ...t.sinais.map((s) => ({ titulo: s, texto: "" }))],
        corpo: [
          `Marque quantos acontecem aí.`,
          `Dois ou mais já valem uma conversa com o time.`,
          `O primeiro passo costuma ser simples: ${minuscula(ponto(t.passos[0][0]))}`,
        ],
        chamada: "salvar",
      };
    },
  },
  {
    id: "lista-produto",
    usaSite: true,
    formato: "lista",
    tipo: "promessa",
    gerar: (c) => {
      const itens = c.produto.filter((p) => p.length <= 90).slice(0, 5);
      if (itens.length < 3) return null;
      const gancho = `${itens.length} coisas que dá para fazer ${c.comAMarca}`;
      return {
        gancho,
        slides: [{ titulo: gancho, texto: "" }, ...itens.map((p) => ({ titulo: maiuscula(p), texto: "" }))],
        corpo: [
          `Se você ainda convive com ${c.tema.dor}, vale olhar a lista com calma.`,
          `Cada item está explicado com mais detalhe no site ${c.daMarca}.`,
          `Qual deles faria mais diferença na sua rotina?`,
        ],
        chamada: "comentar",
      };
    },
  },
  {
    id: "lista-evitar",
    formato: "lista",
    tipo: "erro-comum",
    gerar: (c) => {
      const t = c.tema;
      const gancho = `O que evitar ${t.assuntoEm}`;
      const erros = t.erros.slice(0, 5);
      return {
        gancho,
        slides: [{ titulo: gancho, texto: "" }, ...erros.map(([titulo, texto]) => ({ titulo, texto: corte(texto, 90) }))],
        corpo: [
          `${erros.length} hábitos que parecem inofensivos e custam caro.`,
          `O primeiro da lista: ${minuscula(ponto(erros[0][0]))}`,
          erros[0][1],
        ],
        chamada: "salvar",
      };
    },
  },
];

const ANTES_DEPOIS: Modelo[] = [
  {
    id: "antes-depois-rotina",
    formato: "antes-depois",
    tipo: "contraintuitivo",
    gerar: (c) => {
      const tm = c.tema;
      const [passo] = pega(tm.passos, c.seed + 2);
      return {
        gancho: `${maiuscula(tm.promessa)}: o antes e o depois`,
        slides: [
          { titulo: "Antes", texto: corte(tm.antes, 110) },
          { titulo: "Depois", texto: corte(tm.depois, 110) },
        ],
        corpo: [`Antes: ${minuscula(tm.antes)}`, `Depois: ${minuscula(tm.depois)}`, `A virada não depende de esforço extra. Começa com um passo: ${minuscula(ponto(passo))}`],
        chamada: "comentar",
      };
    },
  },
  {
    id: "antes-depois-cliente",
    usaSite: true,
    formato: "antes-depois",
    tipo: "prova-social",
    gerar: (c) => {
      // Só com depoimento real do site que já fala em antes e hoje.
      for (const d of c.depoimentos) {
        const m = d.match(/antes,?\s+([^.]+?)[,.;]\s*(?:e\s+)?hoje,?\s+([^.]+)/i);
        if (!m) continue;
        const antes = maiuscula(m[1].trim());
        const depois = maiuscula(m[2].trim());
        return {
          gancho: `Um cliente ${c.daMarca} contou como era antes. E como é hoje`,
          slides: [
            { titulo: "Antes", texto: corte(ponto(antes), 110) },
            { titulo: "Hoje", texto: corte(ponto(depois), 110) },
          ],
          corpo: [`"${corte(d, 240)}"`, `Relato publicado no site ${c.daMarca}.`, `Se a sua rotina ainda é ${minuscula(semPonto(c.tema.antes))}, dá para mudar.`],
          chamada: "comentar",
        };
      }
      return null;
    },
  },
];

const DADO_IMPACTO: Modelo[] = [0, 1].map((k) => ({
  id: `dado-site-${k}`,
  formato: "dado-impacto" as Formato,
  tipo: (k === 0 ? "numero" : "prova-social") as TipoGancho,
  usaSite: true,
  gerar: (c: Contexto): Ideia | null => {
    const n = c.numeros[k];
    if (!n) return null;
    const [passo] = c.tema.passos[0];
    return {
      gancho: corte(maiuscula(n.frase), 120),
      slides: [{ titulo: n.valor, texto: corte(n.contexto, 120) }],
      corpo: [
        `É o número que está no site ${c.daMarca}, sem arredondar.`,
        `Se você ainda convive com ${c.tema.dor}, dá para começar pequeno: ${minuscula(ponto(passo))}`,
      ],
      chamada: "conhecer",
    };
  },
}));

const BASTIDOR: Modelo[] = [0, 1].map((k) => ({
  id: `bastidor-${k}`,
  formato: "bastidor-founder" as Formato,
  tipo: (k === 0 ? "historia-pessoal" : "contraintuitivo") as TipoGancho,
  gerar: (c: Contexto): Ideia => {
    const [titulo, relato] = pega(c.tema.bastidor, c.seed + k);
    return {
      gancho: titulo,
      slides: [{ titulo, texto: corte(relato, 200) }],
      corpo: [relato, `Queria ouvir de ${c.tema.quem}: isso bate com o que você vive?`],
      chamada: "comentar",
      revisar: true,
    };
  },
}));

export const MODELOS: Record<Formato, Modelo[]> = {
  carrossel: CARROSSEL,
  "imagem-unica": IMAGEM_UNICA,
  "print-tweet": PRINT_TWEET,
  citacao: CITACAO,
  lista: LISTA,
  "antes-depois": ANTES_DEPOIS,
  "dado-impacto": DADO_IMPACTO,
  "bastidor-founder": BASTIDOR,
};

/** Por que cada tipo de gancho segura a leitura (sem prometer métrica). */
export const MOTIVO_GANCHO: Record<TipoGancho, string> = {
  numero: "o número na primeira linha mostra o tamanho da coisa antes de a pessoa decidir ler",
  contraintuitivo: "contrariar uma crença comum faz quem concorda e quem discorda parar para ler",
  pergunta: "a pergunta coloca o leitor dentro da situação logo na primeira linha",
  "historia-pessoal": "relato em primeira pessoa gera identificação e mostra quem está por trás da marca",
  "erro-comum": "apontar um erro que o público reconhece dá motivo para ler até o fim e guardar",
  promessa: "promete um resultado concreto e entrega o caminho no próprio post",
  polemica: "uma posição clara convida a comentar, a favor ou contra",
  "prova-social": "mostra evidência real em vez de adjetivo",
  curiosidade: "abre uma lacuna que só fecha lendo o post",
};

export const MOTIVO_FORMATO: Record<Formato, string> = {
  carrossel: "O carrossel entrega um passo por slide, o que convida a guardar.",
  "imagem-unica": "Imagem única com uma ideia só é lida em dois segundos no feed.",
  "print-tweet": "O formato de print de post parece conversa, não anúncio.",
  citacao: "Frase curta assinada pelo time dá voz à marca sem parecer propaganda.",
  lista: "Lista numerada é fácil de escanear e de mandar para alguém.",
  "antes-depois": "O contraste lado a lado explica o valor sem precisar de texto longo.",
  "dado-impacto": "Um número real do site em destaque vale mais do que qualquer adjetivo.",
  "bastidor-founder": "Bastidor em primeira pessoa aproxima quem lê de quem constrói a empresa.",
};
