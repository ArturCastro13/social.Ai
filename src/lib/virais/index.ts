import type { Nicho, PadraoViral, ViralItem } from "@/lib/types";
import saasB2b from "../../../data/virais/saas-b2b/itens.json";
import fintech from "../../../data/virais/fintech/itens.json";
import healthtech from "../../../data/virais/healthtech/itens.json";
import edtech from "../../../data/virais/edtech/itens.json";
import ecommerce from "../../../data/virais/ecommerce-dtc/itens.json";
import marketingAgencias from "../../../data/virais/marketing-agencias/itens.json";
import servicosLocais from "../../../data/virais/servicos-locais/itens.json";
import iaDev from "../../../data/virais/ia-dev/itens.json";
import { viralItemSchema } from "./schema";
import { construirCatalogo, padroesDoNicho } from "./catalogo";
import { store } from "@/lib/store";

/** Base versionada no repositório (espelho do Supabase). */
export const BASE_ARQUIVO: Record<Nicho, ViralItem[]> = {
  "saas-b2b": saasB2b as ViralItem[],
  fintech: fintech as ViralItem[],
  healthtech: healthtech as ViralItem[],
  edtech: edtech as ViralItem[],
  "ecommerce-dtc": ecommerce as ViralItem[],
  "marketing-agencias": marketingAgencias as ViralItem[],
  "servicos-locais": servicosLocais as ViralItem[],
  "ia-dev": iaDev as ViralItem[],
};

export function itensDoArquivo(): ViralItem[] {
  return Object.values(BASE_ARQUIVO).flat();
}

/** Base completa: arquivo + o que o time cadastrou pelo /admin (Supabase ou local). Itens do banco sobrescrevem por id. */
export async function todosOsVirais(): Promise<ViralItem[]> {
  const mapa = new Map<string, ViralItem>();
  for (const it of itensDoArquivo()) mapa.set(it.id, it);
  try {
    for (const it of await store.listarVirais()) {
      if (viralItemSchema.safeParse(it).success) mapa.set(it.id, it);
    }
  } catch {
    /* sem banco: segue só com o arquivo */
  }
  return [...mapa.values()];
}

export async function catalogoAtual(): Promise<PadraoViral[]> {
  return construirCatalogo(await todosOsVirais());
}

export async function contextoViralDoNicho(nicho: Nicho, max = 10) {
  const itens = await todosOsVirais();
  const catalogo = construirCatalogo(itens);
  const padroes = padroesDoNicho(catalogo, nicho, max);
  const porId = new Map(itens.map((i) => [i.id, i]));
  return padroes.map((p) => ({
    padrao: p,
    exemplos: p.exemplos.map((id) => porId.get(id)).filter((x): x is ViralItem => !!x).slice(0, 3),
  }));
}
