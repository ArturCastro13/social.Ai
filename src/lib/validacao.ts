// Formulário curto de validação de dor, mostrado depois do resultado.
export const PERGUNTAS_VALIDACAO = [
  {
    id: "quem_cuida",
    pergunta: "Quem cuida do marketing da sua empresa hoje?",
    tipo: "opcoes",
    opcoes: ["Eu mesmo, sozinho", "Alguém do time, no tempo que sobra", "Freelancer ou agência", "Ninguém, está parado"],
  },
  {
    id: "horas_semana",
    pergunta: "Quantas horas por semana isso te toma?",
    tipo: "opcoes",
    opcoes: ["Menos de 1 hora", "De 1 a 3 horas", "De 3 a 6 horas", "Mais de 6 horas"],
  },
  {
    id: "dor",
    pergunta: "De 1 a 5, quanto te incomoda não postar com constância?",
    tipo: "escala",
    opcoes: ["1", "2", "3", "4", "5"],
  },
  {
    id: "usaria",
    pergunta: "Você postaria os posts que o social.Ai gerou para você?",
    tipo: "opcoes",
    opcoes: ["Sim, do jeito que estão", "Sim, com pequenos ajustes", "Só alguns", "Não"],
  },
  {
    id: "pagaria",
    pergunta: "Quanto pagaria por mês para ter isso toda semana?",
    tipo: "opcoes",
    opcoes: ["Nada", "Até R$ 50", "De R$ 50 a R$ 150", "De R$ 150 a R$ 400", "Mais de R$ 400"],
  },
] as const;
