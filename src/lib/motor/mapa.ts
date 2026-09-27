// Tradução entre os ids do motor novo (PROMPT_MOTOR_POSTS.md) e os ids que o resto do app já usa.
import type { Formato, Nicho, Rede, TemplateId } from "@/lib/types";
import { FORMATOS_MOTOR, FREQUENCIAS, type FormatoMotor, type Frequencia } from "./contrato";

export type NichoMotor =
  | "saas_b2b" | "fintech" | "healthtech" | "edtech" | "ecommerce_dtc" | "marketing_agencias" | "servicos_locais" | "ia_dev" | "outro";

export function nichoParaMotor(n: Nicho | string | null | undefined): NichoMotor {
  const m: Record<string, NichoMotor> = {
    "saas-b2b": "saas_b2b",
    fintech: "fintech",
    healthtech: "healthtech",
    edtech: "edtech",
    "ecommerce-dtc": "ecommerce_dtc",
    "marketing-agencias": "marketing_agencias",
    "servicos-locais": "servicos_locais",
    "ia-dev": "ia_dev",
  };
  return m[String(n ?? "")] ?? "outro";
}

/** Aceita "saas_b2b", "saas-b2b", "SaaS B2B"... Devolve null se não reconhecer. */
export function nichoDoMotor(n: string | null | undefined): Nicho | null {
  const k = String(n ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");
  const m: Record<string, Nicho> = {
    saasb2b: "saas-b2b",
    saas: "saas-b2b",
    fintech: "fintech",
    healthtech: "healthtech",
    edtech: "edtech",
    ecommercedtc: "ecommerce-dtc",
    ecommerce: "ecommerce-dtc",
    dtc: "ecommerce-dtc",
    marketingagencias: "marketing-agencias",
    marketing: "marketing-agencias",
    agencia: "marketing-agencias",
    agencias: "marketing-agencias",
    servicoslocais: "servicos-locais",
    negociolocal: "servicos-locais",
    servicos: "servicos-locais",
    iadev: "ia-dev",
    devtools: "ia-dev",
    ia: "ia-dev",
  };
  return m[k] ?? null;
}

/** Formato do app que representa cada formato do motor (sem olhar o template). */
export const FORMATO_DO_MOTOR: Record<FormatoMotor, Formato> = {
  estatico: "imagem-unica",
  carrossel: "carrossel",
  noticia_comentada: "imagem-unica",
  print_de_tweet: "print-tweet",
  citacao: "citacao",
  dado_de_impacto: "dado-impacto",
  bastidor: "bastidor-founder",
};

/** Formato do motor que corresponde a cada formato do app. */
export const MOTOR_DO_FORMATO: Record<Formato, FormatoMotor> = {
  carrossel: "carrossel",
  "imagem-unica": "estatico",
  lista: "estatico",
  "antes-depois": "estatico",
  "print-tweet": "print_de_tweet",
  citacao: "citacao",
  "dado-impacto": "dado_de_impacto",
  "bastidor-founder": "bastidor",
};

/** Formatos do app que cada formato do motor permite (usado no filtro do motor local). */
export function formatosDoApp(permitidos: FormatoMotor[]): Set<Formato> {
  const s = new Set<Formato>();
  for (const f of permitidos) {
    if (f === "estatico") ["imagem-unica", "lista", "antes-depois"].forEach((x) => s.add(x as Formato));
    else if (f !== "noticia_comentada") s.add(FORMATO_DO_MOTOR[f]);
  }
  return s;
}

const IDS_MOTOR = new Set<string>(FORMATOS_MOTOR.map((f) => f.id));

/** Normaliza o formato que o modelo escreveu. Aceita ids do motor, do app e variações comuns. */
export function normalizarFormatoMotor(f: string | null | undefined): FormatoMotor | null {
  const k = String(f ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim().replace(/[\s-]+/g, "_");
  if (IDS_MOTOR.has(k)) return k as FormatoMotor;
  const m: Record<string, FormatoMotor> = {
    imagem_unica: "estatico",
    post_estatico: "estatico",
    lista: "estatico",
    antes_depois: "estatico",
    checklist: "estatico",
    print_tweet: "print_de_tweet",
    tweet: "print_de_tweet",
    print_x: "print_de_tweet",
    dado_impacto: "dado_de_impacto",
    dado: "dado_de_impacto",
    bastidor_founder: "bastidor",
    noticia: "noticia_comentada",
    carousel: "carrossel",
  };
  return m[k] ?? null;
}

/** Formato do app a partir do formato do motor e do template escolhido. */
export function formatoDoApp(fm: FormatoMotor, template: TemplateId | null): { formato: Formato; template: TemplateId } {
  switch (fm) {
    case "estatico":
      if (template === "lista" || template === "checklist") return { formato: "lista", template };
      if (template === "antes-depois") return { formato: "antes-depois", template };
      return { formato: "imagem-unica", template: template && template !== "capa-gancho" ? template : "citacao" };
    case "noticia_comentada":
      return { formato: "imagem-unica", template: template === "capa-gancho" ? "capa-gancho" : "print-x" };
    case "carrossel":
      return { formato: "carrossel", template: template === "capa-gancho" || template === "lista" || template === "checklist" ? template : "capa-gancho" };
    case "print_de_tweet":
      return { formato: "print-tweet", template: "print-x" };
    case "citacao":
      return { formato: "citacao", template: "citacao" };
    case "dado_de_impacto":
      return { formato: "dado-impacto", template: "dado-impacto" };
    case "bastidor":
      return { formato: "bastidor-founder", template: "bastidor" };
  }
}

export function normalizarRede(r: string | null | undefined): Rede | null {
  const k = String(r ?? "").toLowerCase().trim();
  if (k === "instagram" || k === "ig") return "instagram";
  if (k === "linkedin") return "linkedin";
  if (k === "x" || k === "twitter" || k === "x/twitter") return "x";
  if (k === "facebook" || k === "fb") return "facebook";
  return null;
}

export function postsPorSemana(f: Frequencia | null | undefined): number | null {
  return FREQUENCIAS.find((x) => x.id === f)?.porSemana ?? null;
}

/** Distribui um total semanal entre as redes (pelo menos 1 por rede, o resto em ordem). */
export function distribuirFrequencia(redes: Rede[], total: number): Map<Rede, number> {
  const m = new Map<Rede, number>(redes.map((r) => [r, 0]));
  if (!redes.length) return m;
  for (let i = 0; i < Math.max(total, redes.length); i++) {
    const r = redes[i % redes.length];
    m.set(r, (m.get(r) ?? 0) + 1);
  }
  return m;
}
