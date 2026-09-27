// Custo em dólar a partir das linhas "[ia] ..." e "[imagem] openai ..." do log do servidor.
// Preços por milhão de tokens (confira nas páginas de preço antes de uma validação paga):
// Sonnet 5: US$ 2 entrada, 10 saída. Haiku 4.5: 1 e 5. Cache lido: 10% da entrada; gravado: 125%.
// Busca na web: US$ 10 por mil. gpt-image-2: 5 por milhão de entrada e 40 por milhão de saída de imagem.
const CLAUDE: [RegExp, { entrada: number; saida: number }][] = [
  [/sonnet-5/, { entrada: 2, saida: 10 }],
  [/haiku-4-5/, { entrada: 1, saida: 5 }],
];
const IMAGEM = { entrada: 5, saida: 40 };
const BUSCA = 0.01;

export interface ItemCusto { tipo: string; modelo: string; dolares: number }

export function custoDoLog(texto: string): { total: number; itens: ItemCusto[]; desconhecidos: string[] } {
  const itens: ItemCusto[] = [];
  const desconhecidos: string[] = [];
  const M = 1e6;
  for (const linha of texto.split("\n")) {
    const c = linha.match(/\[ia\] (\S+) (\S+) entrada=(\d+) saida=(\d+)(?: buscas=(\d+))?(?: cache_lido=(\d+) cache_gravado=(\d+))?/);
    if (c) {
      const [, tipo, modelo, ent, sai, bus, lido, grav] = c;
      const preco = CLAUDE.find(([re]) => re.test(modelo))?.[1];
      if (!preco) desconhecidos.push(modelo);
      const p = preco ?? CLAUDE[0][1];
      const dolares = (+ent * p.entrada + +sai * p.saida + +(lido ?? 0) * p.entrada * 0.1 + +(grav ?? 0) * p.entrada * 1.25) / M + +(bus ?? 0) * BUSCA;
      itens.push({ tipo, modelo, dolares });
      continue;
    }
    const i = linha.match(/\[imagem\] openai (\S+) \S+ entrada=(\d+) saida=(\d+)/);
    if (i) itens.push({ tipo: "imagem", modelo: i[1], dolares: (+i[2] * IMAGEM.entrada + +i[3] * IMAGEM.saida) / M });
  }
  return { total: itens.reduce((s, x) => s + x.dolares, 0), itens, desconhecidos };
}
