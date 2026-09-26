import type { Formato, Nicho, PadraoViral, TemplateId, TipoGancho, ViralItem } from "@/lib/types";

// Como cada formato vira arte e o que ele pede de conteúdo.
export const FORMATOS: Record<Formato, { nome: string; template: TemplateId; descricao: string }> = {
  carrossel: { nome: "Carrossel", template: "capa-gancho", descricao: "capa com gancho forte e um passo por slide, fechando com chamada" },
  "imagem-unica": { nome: "Imagem única", template: "citacao", descricao: "uma ideia só, frase grande, lida em dois segundos" },
  "print-tweet": { nome: "Print de tweet", template: "print-x", descricao: "opinião curta com cara de post nativo do X" },
  citacao: { nome: "Citação", template: "citacao", descricao: "frase de efeito do founder com nome e cargo" },
  lista: { nome: "Lista", template: "lista", descricao: "itens numerados que dão vontade de salvar" },
  "antes-depois": { nome: "Antes e depois", template: "antes-depois", descricao: "contraste direto entre o jeito velho e o novo" },
  "dado-impacto": { nome: "Dado de impacto", template: "dado-impacto", descricao: "um número enorme com uma linha de contexto" },
  "bastidor-founder": { nome: "Bastidor do founder", template: "bastidor", descricao: "relato em primeira pessoa de algo que aconteceu na empresa" },
};

export const GANCHOS: Record<TipoGancho, { nome: string; modelo: string }> = {
  numero: { nome: "Número", modelo: "[Número] [coisas] que [resultado] em [prazo]" },
  contraintuitivo: { nome: "Contraintuitivo", modelo: "Todo mundo acha que [crença comum]. Na prática, [o oposto]." },
  pergunta: { nome: "Pergunta", modelo: "Por que [situação que o público vive] ainda [problema]?" },
  "historia-pessoal": { nome: "História pessoal", modelo: "Em [momento], eu [erro ou virada]. Foi assim que [aprendizado]." },
  "erro-comum": { nome: "Erro comum", modelo: "O erro que [público] mais comete com [tema] (e como evitar)" },
  promessa: { nome: "Promessa", modelo: "Como [resultado desejado] sem [esforço temido]" },
  polemica: { nome: "Polêmica", modelo: "[Prática popular] está matando [algo que o público valoriza]." },
  "prova-social": { nome: "Prova social", modelo: "[Cliente ou número] [resultado concreto]. O que mudou foi [detalhe]." },
  curiosidade: { nome: "Curiosidade", modelo: "Ninguém fala disso sobre [tema], mas [revelação]." },
};

export function templateDoFormato(f: Formato): TemplateId {
  return FORMATOS[f]?.template ?? "capa-gancho";
}

/** Agrupa a base por formato + tipo de gancho. Padrões que se repetem vêm primeiro. */
export function construirCatalogo(itens: ViralItem[]): PadraoViral[] {
  const grupos = new Map<string, ViralItem[]>();
  for (const it of itens) {
    const k = `${it.formato}__${it.tipo_gancho}`;
    grupos.set(k, [...(grupos.get(k) ?? []), it]);
  }
  const padroes: PadraoViral[] = [];
  for (const [k, lista] of grupos) {
    const [formato, tipo] = k.split("__") as [Formato, TipoGancho];
    const f = FORMATOS[formato];
    const g = GANCHOS[tipo];
    const verificados = lista.filter((i) => i.status === "verificado");
    const base = verificados.length ? verificados : lista;
    padroes.push({
      id: `${formato}--${tipo}`,
      nome: `${f.nome} com gancho de ${g.nome.toLowerCase()}`,
      formato,
      tipo_gancho: tipo,
      descricao: `${f.descricao[0].toUpperCase()}${f.descricao.slice(1)}. ${base[0].por_que_funciona}`.slice(0, 420),
      modelo_gancho: g.modelo,
      nichos: [...new Set(lista.map((i) => i.nicho))] as Nicho[],
      frequencia: lista.length,
      exemplos: base.slice(0, 4).map((i) => i.id),
      template_sugerido: f.template,
    });
  }
  return padroes.sort((a, b) => b.frequencia - a.frequencia || a.id.localeCompare(b.id));
}

/**
 * Padrões para um nicho: primeiro os que aparecem naquele nicho, depois os fortes de outros
 * nichos para completar variedade de formato.
 */
export function padroesDoNicho(catalogo: PadraoViral[], nicho: Nicho, max = 10): PadraoViral[] {
  const doNicho = catalogo.filter((p) => p.nichos.includes(nicho));
  const outros = catalogo.filter((p) => !p.nichos.includes(nicho));
  const escolhidos: PadraoViral[] = [];
  const formatosUsados = new Set<Formato>();
  for (const p of [...doNicho, ...outros]) {
    if (escolhidos.length >= max) break;
    if (formatosUsados.has(p.formato) && escolhidos.length < 8 && doNicho.length > 8) continue;
    escolhidos.push(p);
    formatosUsados.add(p.formato);
  }
  // Se pulamos demais para diversificar, completa com o que sobrou do nicho.
  for (const p of doNicho) {
    if (escolhidos.length >= max) break;
    if (!escolhidos.includes(p)) escolhidos.push(p);
  }
  return escolhidos;
}
