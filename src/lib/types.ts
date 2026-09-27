// Contratos compartilhados entre motor (/api), base de virais e interface.
import type { ExtrasAnalise, ExtrasPost } from "@/lib/motor/contrato";

/** Os nichos da biblioteca de virais. A ordem aparece nas telas. */
export const IDS_NICHO = ["saas-b2b", "fintech", "healthtech", "edtech", "ecommerce-dtc", "marketing-agencias", "servicos-locais", "ia-dev"] as const;

export type Nicho = (typeof IDS_NICHO)[number];

export const NICHOS: { id: Nicho; nome: string }[] = [
  { id: "saas-b2b", nome: "SaaS B2B" },
  { id: "fintech", nome: "Fintech" },
  { id: "healthtech", nome: "Healthtech" },
  { id: "edtech", nome: "Edtech" },
  { id: "ecommerce-dtc", nome: "E-commerce / DTC" },
  { id: "marketing-agencias", nome: "Marketing e agências" },
  { id: "servicos-locais", nome: "Serviços e negócio local" },
  { id: "ia-dev", nome: "IA e tech para devs" },
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
  /** Números com rótulo e depoimentos lidos do site. Opcional: perfis antigos e marcas sem site não têm. */
  provas?: string[];
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
  /** Sem site: nicho escolhido pelo founder, que vale mais que o palpite pelo texto. */
  nicho_informado?: Nicho;
  /** Perfil montado com o que o founder contou, sem ler site nenhum. */
  sem_site?: boolean;
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

/** Campos de ExtrasPost são opcionais: demo e cache antigos continuam válidos. */
export interface PostGerado extends ExtrasPost {
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
  /** Motor novo: de onde veio o horário ("sua audiência", "hipótese do nicho" ou "teste"). */
  fonte?: string;
}

/** Campos de ExtrasAnalise são opcionais: demo e cache antigos continuam válidos. */
export interface Analise extends ExtrasAnalise {
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
  /** ia: escrita pelo LLM agora. cache: análise repetida da mesma URL. demo: exemplo pré-processado. local: motor de regras sem IA. */
  origem: "ia" | "demo" | "cache" | "local";
  provedor: string | null;
  avisos: string[];
  criadoEm: string;
}
