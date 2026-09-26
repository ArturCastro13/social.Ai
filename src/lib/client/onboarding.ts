// Apoio do onboarding em camadas (telas 1, 2 e 3). Tudo aqui roda no navegador e não chama IA.
import type { FormatoMotor, Frequencia, ObjetivoId, Preferencias, SugestoesOnboarding, TomDeVoz } from "@/lib/motor/contrato";

export type PerfilAlvo = Preferencias["perfil_alvo"];
export type RedeArroba = "instagram" | "linkedin" | "x";

export const PERFIS: { id: PerfilAlvo; nome: string }[] = [
  { id: "founder", nome: "Eu, founder" },
  { id: "empresa", nome: "A empresa" },
  { id: "ambos", nome: "Os dois" },
];

export const REDES_ARROBA: { id: RedeArroba; nome: string }[] = [
  { id: "instagram", nome: "Instagram" },
  { id: "linkedin", nome: "LinkedIn" },
  { id: "x", nome: "X" },
];

/** Descobre a rede pelo link colado. Um @ solto não diz a rede, então devolve null e vale o seletor. */
export function detectarRede(valor: string): RedeArroba | null {
  const v = valor.trim().toLowerCase();
  if (/linkedin\.com|^in\//.test(v)) return "linkedin";
  if (/instagram\.com|instagr\.am/.test(v)) return "instagram";
  if (/(^|\/\/|\.|^www\.)(x|twitter)\.com/.test(v)) return "x";
  return null;
}

export const PERFIS_VALIDOS = PERFIS.map((p) => p.id);

/** O que a tela 2 mostra quando /api/inferir não responde. */
export function sugestoesPadrao(perfil: PerfilAlvo): SugestoesOnboarding {
  const objetivos: ObjetivoId[] = perfil === "founder" ? ["autoridade_founder", "gerar_clientes"] : ["gerar_clientes"];
  const tom: TomDeVoz = { formal_descontraido: 0.5, tecnico_simples: 0.5, serio_humor: 0.3, cauteloso_provocador: 0.4 };
  return {
    nicho: "outro",
    objetivos,
    tom_de_voz: tom,
    exemplo_tom: fraseDoTom(tom),
    formatos: ["carrossel", "estatico", "dado_de_impacto", "bastidor"],
    frequencia: "constante",
    porque_frequencia: "Cinco por semana dá presença sem virar refém da agenda.",
  };
}

const faixa = (v: number) => (v < 0.34 ? 0 : v > 0.66 ? 2 : 1);

/**
 * Frase de exemplo montada por combinação das réguas. Cada régua mexe numa parte:
 * cauteloso/provocador decide a afirmação, técnico/simples a explicação, sério/humor o fecho
 * e formal/descontraído o jeito de falar em todas elas.
 */
export function fraseDoTom(t: TomDeVoz): string {
  const solto = t.formal_descontraido >= 0.5;
  const afirmacoes = solto
    ? [
        "Pelo que a gente vê, muita equipe ainda perde tempo com relatório feito na mão.",
        "Todo mundo ainda perde horas com relatório feito na mão.",
        "Relatório feito na mão é dinheiro jogado fora. Pronto, falei.",
      ]
    : [
        "Nossos dados indicam que parte das equipes ainda perde tempo com relatórios manuais.",
        "A maioria das equipes ainda perde horas com relatórios manuais.",
        "Relatórios manuais são o maior desperdício da sua operação.",
      ];
  const explicacoes = solto
    ? [
        "Com a API puxando e consolidando os dados sozinha, o fechamento sai em minutos.",
        "Quando os números se juntam sozinhos, o fechamento sai em minutos.",
        "Com tudo num lugar só, o que levava dias fica pronto rapidinho.",
      ]
    : [
        "Com integração via API e consolidação automática, o ciclo de fechamento cai de dias para minutos.",
        "Quando os dados se consolidam sozinhos, o fechamento cai de dias para minutos.",
        "Com tudo em um só lugar, o que levava dias fica pronto em minutos.",
      ];
  const fechos = solto ? ["", "Seu café agradece.", "Sobra tempo até para responder o grupo da família."] : ["", "Sua equipe agradece.", "E ainda sobra tempo para o cafezinho com calma."];
  return [afirmacoes[faixa(t.cauteloso_provocador)], explicacoes[faixa(t.tecnico_simples)], fechos[faixa(t.serio_humor)]]
    .filter(Boolean)
    .join(" ");
}

/** Adivinha o tipo da inspiração pelo link, só para dar uma pista ao motor. */
export function tipoDaInspiracao(url: string): "post" | "perfil" | "video" {
  const u = url.toLowerCase();
  if (/youtube\.com|youtu\.be|tiktok\.com|\/reel|vimeo\.com/.test(u)) return "video";
  if (/\/(p|posts|status|feed\/update)\//.test(u)) return "post";
  try {
    const partes = new URL(u).pathname.split("/").filter(Boolean);
    if (partes.length <= 1 || (partes[0] === "in" && partes.length <= 2) || (partes[0] === "company" && partes.length <= 2)) return "perfil";
  } catch {
    /* link inválido é filtrado antes */
  }
  return "post";
}

/** Completa o https:// e devolve null se não parecer um link. */
export function normalizarLink(v: string): string | null {
  const t = v.trim();
  if (!t) return null;
  const comProtocolo = /^https?:\/\//i.test(t) ? t : `https://${t.replace(/^\/+/, "")}`;
  try {
    const u = new URL(comProtocolo);
    return /\.[a-z]{2,}$/i.test(u.hostname) ? u.toString() : null;
  } catch {
    return null;
  }
}

// ---------- Memória local por domínio ----------

const CHAVE = (dominio: string) => `socialai:preferencias:${dominio}`;

export function lerPreferenciasSalvas(dominio: string): Preferencias | null {
  try {
    const bruto = localStorage.getItem(CHAVE(dominio));
    if (!bruto) return null;
    const p = JSON.parse(bruto) as Preferencias;
    return p && typeof p === "object" && Array.isArray(p.objetivos) ? p : null;
  } catch {
    return null;
  }
}

export function salvarPreferencias(dominio: string, p: Preferencias) {
  try {
    localStorage.setItem(CHAVE(dominio), JSON.stringify(p));
  } catch {
    /* navegador sem armazenamento: segue sem lembrar */
  }
}

export type { FormatoMotor, Frequencia, ObjetivoId, Preferencias, SugestoesOnboarding, TomDeVoz };
