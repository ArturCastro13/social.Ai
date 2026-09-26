import type { DadosFormulario } from "@/components/estudio/Formulario";

const REDES = ["instagram", "linkedin", "x", "facebook"] as const;
const QUANTIDADES = [3, 6, 9, 12];

/** Monta o endereço da página do app com o site, as redes e as preferências do formulário. */
export function urlDoApp(d: Partial<DadosFormulario> & { url: string }): string {
  const q = new URLSearchParams({ url: d.url.trim() });
  for (const r of REDES) {
    const v = d[r]?.trim();
    if (v) q.set(r, v);
  }
  if (d.quantidade && d.quantidade !== 6) q.set("n", String(d.quantidade));
  if (d.paletaInstagram?.length) q.set("cores", d.paletaInstagram.map((c) => c.replace("#", "")).join(","));
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
  return {
    url,
    instagram: um(b.instagram),
    linkedin: um(b.linkedin),
    x: um(b.x),
    facebook: um(b.facebook),
    quantidade: QUANTIDADES.includes(n) ? n : 6,
    paletaInstagram: cores,
  };
}
