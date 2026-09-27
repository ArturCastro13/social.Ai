import { NICHOS, type BrandProfile, type Nicho } from "@/lib/types";

// Palpite de nicho sem IA, por palavras-chave no texto do site. A chamada de IA confirma ou corrige.
const PALAVRAS: Record<Nicho, string[]> = {
  "saas-b2b": [
    "saas", "software", "plataforma", "automação", "automacao", "workflow", "crm", "erp", "api", "integração",
    "gestão", "gestao", "dashboard", "b2b", "equipes", "times", "produtividade", "no-code", "agentes de ia",
    "processos", "empresas", "vendas", "atendimento", "sistema",
  ],
  fintech: [
    "conta digital", "conta pj", "cartão", "cartao", "pix", "banco", "crédito", "credito", "pagamento", "boleto",
    "investimento", "empréstimo", "emprestimo", "financeiro", "taxas", "maquininha", "cobrança", "cobranca",
    "rendimento", "fatura", "câmbio", "cambio", "seguro",
  ],
  healthtech: [
    "saúde", "saude", "médico", "medico", "paciente", "consulta", "clínica", "clinica", "plano de saúde",
    "telemedicina", "exame", "bem-estar", "terapia", "psicólogo", "psicologo", "hospital", "cuidado", "receita",
    "enfermagem", "nutri",
  ],
  edtech: [
    "curso", "aula", "aluno", "estudante", "ensino", "educação", "educacao", "enem", "vestibular", "faculdade",
    "pós", "certificado", "aprender", "aprendizado", "professor", "escola", "formação", "formacao", "bootcamp",
    "trilha", "mentoria", "inglês", "ingles", "idiomas", "ielts", "toefl", "english assessment",
  ],
  "ecommerce-dtc": [
    "loja", "frete", "comprar", "carrinho", "produto", "coleção", "colecao", "moda", "roupa", "skincare",
    "cosmético", "cosmetico", "pele", "entrega", "desconto", "cupom", "kit", "vegano", "sustentável", "look",
    "tamanho", "estoque", "adicionar ao carrinho",
  ],
  "marketing-agencias": [
    "agência", "agencia", "marketing digital", "tráfego pago", "trafego pago", "social media", "branding", "gestão de redes",
    "assessoria de marketing", "growth", "inbound", "lançamento", "lancamento", "infoproduto", "copywriting", "anúncios",
    "anuncios", "funil", "leads",
  ],
  "servicos-locais": [
    "clínica de estética", "clinica de estetica", "estética", "estetica", "odontologia", "dentista", "academia", "personal",
    "salão", "salao", "barbearia", "restaurante", "cardápio", "cardapio", "advocacia", "advogado", "contabilidade",
    "agende", "agendamento", "unidade", "bairro", "horário de funcionamento", "horario de funcionamento",
  ],
  "ia-dev": [
    "inteligência artificial", "inteligencia artificial", "ia generativa", "llm", "machine learning", "modelo de linguagem",
    "desenvolvedores", "devs", "developer", "sdk", "open source", "github", "deploy", "agente de ia", "agentes", "prompt",
    "gpu", "dev tools",
  ],
};

export function textoDaMarca(b: BrandProfile): string {
  return [b.title, b.description, b.og.title, b.og.description, ...b.headings.h1, ...b.headings.h2, ...b.paragrafos]
    .filter(Boolean)
    .join(" \n ");
}

export function palpiteNicho(b: BrandProfile): { nicho: Nicho; pontuacao: Record<Nicho, number> } {
  const texto = textoDaMarca(b).toLowerCase();
  const pontuacao = {} as Record<Nicho, number>;
  for (const [nicho, palavras] of Object.entries(PALAVRAS) as [Nicho, string[]][]) {
    pontuacao[nicho] = palavras.reduce((acc, p) => {
      // Whole words (with plural s), never `api` inside an unrelated word.
      const fonte = nicho === "healthtech" ? texto.replace(/exames? de ingl[êe]s/g, "avaliação de idioma") : texto;
      const n = [...fonte.matchAll(new RegExp(`(?<![\\p{L}\\p{N}])${p}s?(?![\\p{L}\\p{N}])`, "gu"))].length;
      return acc + Math.min(n, 4) * (p.includes(" ") ? 2 : 1);
    }, 0);
  }
  // Sem site, o founder escolheu o nicho: vale mais que o palpite pelo texto (uma ou duas frases).
  const informado = NICHOS.find((n) => n.id === b.nicho_informado)?.id;
  if (informado) return { nicho: informado, pontuacao };
  // Empate: um nicho específico ganha de saas-b2b, que é o genérico (ex.: plataforma de e-commerce).
  const nicho = (Object.entries(pontuacao) as [Nicho, number][]).sort(
    (a, b) => b[1] - a[1] || Number(a[0] === "saas-b2b") - Number(b[0] === "saas-b2b"),
  )[0];
  return { nicho: nicho[1] > 0 ? nicho[0] : "saas-b2b", pontuacao };
}
