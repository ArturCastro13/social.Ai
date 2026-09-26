// Contratos compartilhados entre motor (/api), base de virais e interface.

export type Nicho = "saas-b2b" | "fintech" | "healthtech" | "edtech" | "ecommerce-dtc";

export const NICHOS: { id: Nicho; nome: string }[] = [
  { id: "saas-b2b", nome: "SaaS B2B" },
  { id: "fintech", nome: "Fintech" },
  { id: "healthtech", nome: "Healthtech" },
  { id: "edtech", nome: "Edtech" },
  { id: "ecommerce-dtc", nome: "E-commerce / DTC" },
];

export type Rede = "instagram" | "linkedin" | "x" | "facebook";

export type Formato =
  | "carrossel"
  | "imagem-unica"
  | "print-tweet"
  | "citacao"
  | "lista"
  | "antes-depois"
  | "dado-impacto"
  | "bastidor-founder";

export type TipoGancho =
  | "numero"
  | "contraintuitivo"
  | "pergunta"
  | "historia-pessoal"
  | "erro-comum"
  | "promessa"
  | "polemica"
  | "prova-social"
  | "curiosidade";

export type StatusVerificacao = "verificado" | "a verificar";

/** Métrica sem dado verificado fica null. Nunca inventar número. */
export interface MetricasViral {
  curtidas: number | null;
  comentarios: number | null;
  compartilhamentos: number | null;
  visualizacoes: number | null;
  observacao: string; // ex.: "a preencher pelo time"
}

export interface ViralItem {
  id: string;
  nicho: Nicho;
  rede: Rede;
  formato: Formato;
  tipo_gancho: TipoGancho;
  texto_gancho: string;
  estrutura: string[]; // slide a slide (ou blocos, se imagem única)
  padrao_visual: {
    fundo: string;
    contraste: "alto" | "medio" | "baixo";
    densidade_texto: "baixa" | "media" | "alta";
    uso_rosto: boolean;
  };
  por_que_funciona: string;
  autor_ou_marca: string | null;
  link_fonte: string | null;
  metricas: MetricasViral;
  status: StatusVerificacao;
  notas_curadoria?: string;
}

export interface PadraoViral {
  id: string;
  nome: string;
  formato: Formato;
  tipo_gancho: TipoGancho;
  descricao: string;
  modelo_gancho: string; // ex.: "[Número] coisas que ninguém te conta sobre [tema]"
  nichos: Nicho[];
  frequencia: number; // quantos itens da base seguem o padrão
  exemplos: string[]; // ids de ViralItem
  template_sugerido: TemplateId;
}

// ---------- Leitor de marca ----------

export interface BrandInput {
  url: string;
  instagram?: string;
  linkedin?: string;
  x?: string;
  facebook?: string;
}

export interface BrandColor {
  hex: string;
  fonte: "css" | "theme-color" | "og-image" | "logo" | "instagram-print" | "fallback";
  peso: number;
}

export interface BrandProfile {
  url: string;
  dominio: string;
  nome: string;
  title: string | null;
  description: string | null;
  og: { title: string | null; description: string | null; image: string | null };
  favicon: string | null;
  appleTouchIcon: string | null;
  logo: string | null;
  themeColor: string | null;
  headings: { h1: string[]; h2: string[] };
  paragrafos: string[];
  redesEncontradas: Partial<Record<Rede | "youtube" | "tiktok", string>>;
  handles: Omit<BrandInput, "url">;
  paleta: {
    primaria: string;
    secundaria: string;
    destaque: string;
    fundo: string;
    texto: string;
    todas: BrandColor[];
  };
  fontes: {
    titulo: string;
    corpo: string;
    encontradas: string[];
    sugeridas: boolean;
  };
  avisos: string[];
  lidoEm: string;
}

// ---------- Motor de análise ----------

export type TemplateId =
  | "capa-gancho"
  | "lista"
  | "citacao"
  | "dado-impacto"
  | "print-x"
  | "bastidor"
  | "antes-depois"
  | "checklist";

export interface PostGerado {
  id: string;
  rede_principal: Rede;
  formato: Formato;
  template: TemplateId;
  gancho: string;
  slides: { titulo: string; texto: string }[];
  legendas: Record<Rede, string>;
  hashtags: string[];
  padrao_inspirador: string; // id de PadraoViral
  por_que: string;
}

export interface EstrategiaRede {
  rede: Rede;
  frequencia_semanal: number;
  foco: string;
}

export interface CalendarioItem {
  data: string; // YYYY-MM-DD
  dia_semana: string;
  horario: string; // HH:mm
  rede: Rede;
  post_id: string;
}

export interface Analise {
  id: string;
  url: string;
  nicho: Nicho;
  resumo_negocio: string;
  publico: string;
  tom_de_voz: string;
  posicionamento: string;
  pilares: { nome: string; descricao: string }[];
  diagnostico: { titulo: string; texto: string }[];
  estrategia: EstrategiaRede[];
  posts: PostGerado[];
  calendario: CalendarioItem[];
  brand: BrandProfile;
  origem: "ia" | "demo" | "cache";
  provedor: string | null;
  criadoEm: string;
}
