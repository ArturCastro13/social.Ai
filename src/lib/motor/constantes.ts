// Listas do onboarding, sem zod, para poderem ir ao navegador sem pesar o bundle.

export const OBJETIVOS = [
  { id: "autoridade_founder", nome: "Autoridade do founder" },
  { id: "gerar_clientes", nome: "Gerar clientes" },
  { id: "lancar_produto", nome: "Lançar produto" },
  { id: "contratar", nome: "Contratar gente boa" },
  { id: "atrair_investidor", nome: "Atrair investidor" },
  { id: "comunidade", nome: "Construir comunidade" },
] as const;
export type ObjetivoId = (typeof OBJETIVOS)[number]["id"];

export const FORMATOS_MOTOR = [
  { id: "estatico", nome: "Post estático" },
  { id: "carrossel", nome: "Carrossel" },
  { id: "noticia_comentada", nome: "Notícia comentada" },
  { id: "print_de_tweet", nome: "Print de tweet" },
  { id: "citacao", nome: "Citação" },
  { id: "dado_de_impacto", nome: "Dado de impacto" },
  { id: "bastidor", nome: "Bastidor" },
] as const;
export type FormatoMotor = (typeof FORMATOS_MOTOR)[number]["id"];

export const FREQUENCIAS = [
  { id: "leve", nome: "Leve", porSemana: 3 },
  { id: "constante", nome: "Constante", porSemana: 5 },
  { id: "intenso", nome: "Intenso", porSemana: 7 },
] as const;
export type Frequencia = (typeof FREQUENCIAS)[number]["id"];

/** Réguas de 0 a 1. 0 = lado esquerdo (formal, técnico, sério, cauteloso). */
export const REGUAS_TOM = [
  { id: "formal_descontraido", esquerda: "formal", direita: "descontraído" },
  { id: "tecnico_simples", esquerda: "técnico", direita: "simples" },
  { id: "serio_humor", esquerda: "sério", direita: "bem-humorado" },
  { id: "cauteloso_provocador", esquerda: "cauteloso", direita: "provocador" },
] as const;
