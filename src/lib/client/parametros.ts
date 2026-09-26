import type { DadosFormulario } from "@/components/estudio/Formulario";
import { PERFIS_VALIDOS, REDES_ARROBA, type PerfilAlvo, type RedeArroba } from "@/lib/client/onboarding";

const REDES = ["instagram", "linkedin", "x", "facebook"] as const;
const QUANTIDADES = [3, 6, 9, 12];

/**
 * Monta o endereço da página do app com o site, as redes e as preferências do formulário.
 * `direto` pula a tela de ajustes e gera na hora (usado nos exemplos prontos).
 */
export function urlDoApp(d: Partial<DadosFormulario> & { url: string }, direto = false): string {
  const q = new URLSearchParams({ url: d.url.trim() });
  for (const r of REDES) {
    const v = d[r]?.trim();
    if (v) q.set(r, v);
  }
  if (d.quantidade && d.quantidade !== 6) q.set("n", String(d.quantidade));
  if (d.paletaInstagram?.length) q.set("cores", d.paletaInstagram.map((c) => c.replace("#", "")).join(","));
  if (d.perfil) q.set("para", d.perfil);
  if (d.founder?.trim()) {
    q.set("founder", d.founder.trim());
    if (d.redeFounder) q.set("frede", d.redeFounder);
  }
  if (direto) q.set("ir", "1");
  return `/app?${q.toString()}`;
}

type Busca = Record<string, string | string[] | undefined>;
const um = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.slice(0, 300) ?? "";

/** Lê os parâmetros da página do app. Sem url, devolve null e a página mostra o formulário. */
export function dadosDaBusca(b: Busca): DadosFormulario | null {
  const url = um(b.url).trim();
  if (!/\.[a-z]{2,}/i.test(url)) return null;
  const n = Number(um(b.n));
  const cores = um(b.cores)
    .split(",")
    .filter((c) => /^[0-9a-f]{6}$/i.test(c))
    .slice(0, 5)
    .map((c) => `#${c.toLowerCase()}`);
  const para = um(b.para) as PerfilAlvo;
  const frede = um(b.frede) as RedeArroba;
  return {
    url,
    instagram: um(b.instagram),
    linkedin: um(b.linkedin),
    x: um(b.x),
    facebook: um(b.facebook),
    quantidade: QUANTIDADES.includes(n) ? n : 6,
    paletaInstagram: cores,
    perfil: PERFIS_VALIDOS.includes(para) ? para : undefined,
    founder: um(b.founder).trim() || undefined,
    redeFounder: REDES_ARROBA.some((r) => r.id === frede) ? frede : undefined,
  };
}

/** Veio de um exemplo pronto: gera direto, sem a tela de ajustes. */
export const diretoDaBusca = (b: Busca) => um(b.ir) === "1";
