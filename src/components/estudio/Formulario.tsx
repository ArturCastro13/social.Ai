"use client";

import { useRef, useState } from "react";
import { CampoArroba, Chip } from "@/components/onboarding/ui";
import { PERFIS, type PerfilAlvo, type RedeArroba } from "@/lib/client/onboarding";

export interface DadosFormulario {
  url: string;
  instagram: string;
  linkedin: string;
  x: string;
  facebook: string;
  quantidade: number;
  paletaInstagram: string[];
  /** Tela 1: para quem é o conteúdo. Sem valor, a tela 2 assume "a empresa". */
  perfil?: PerfilAlvo;
  /** @ ou link do founder, com a rede detectada ou escolhida. */
  founder?: string;
  redeFounder?: RedeArroba;
}

const QUANTIDADES = [3, 6, 9, 12];

/** Tela 1 do onboarding: site, para quem é e os @. O resto a gente tira do site na tela seguinte. */
export function Formulario({ onEnviar, ocupado }: { onEnviar: (d: DadosFormulario) => void; ocupado: boolean }) {
  const [d, setD] = useState<DadosFormulario>({ url: "", instagram: "", linkedin: "", x: "", facebook: "", quantidade: 6, paletaInstagram: [] });
  const [perfil, setPerfil] = useState<PerfilAlvo>("empresa");
  const [empresa, setEmpresa] = useState<{ valor: string; rede: RedeArroba }>({ valor: "", rede: "instagram" });
  const [founder, setFounder] = useState<{ valor: string; rede: RedeArroba }>({ valor: "", rede: "linkedin" });
  const [abrirRedes, setAbrirRedes] = useState(false);
  const [lendoPrint, setLendoPrint] = useState(false);
  const [erroUrl, setErroUrl] = useState("");
  const inputArquivo = useRef<HTMLInputElement>(null);

  async function lerPrint(arquivo: File) {
    setLendoPrint(true);
    const url = URL.createObjectURL(arquivo);
    try {
      const { Vibrant } = await import("node-vibrant/browser");
      const p = await Vibrant.from(url).getPalette();
      const cores = [p.Vibrant, p.DarkVibrant, p.Muted, p.LightVibrant, p.DarkMuted]
        .filter((s): s is NonNullable<typeof s> => !!s)
        .sort((a, b) => b.population - a.population)
        .map((s) => s.hex.toLowerCase());
      setD((x) => ({ ...x, paletaInstagram: cores.slice(0, 5) }));
    } catch {
      setD((x) => ({ ...x, paletaInstagram: [] }));
    } finally {
      URL.revokeObjectURL(url);
      setLendoPrint(false);
    }
  }

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    const u = d.url.trim();
    if (!/\.[a-z]{2,}/i.test(u)) {
      setErroUrl("Coloque o endereço do site, por exemplo suaempresa.com.br.");
      return;
    }
    setErroUrl("");
    const arrobaEmpresa = empresa.valor.trim();
    onEnviar({
      ...d,
      url: u,
      instagram: empresa.rede === "instagram" ? arrobaEmpresa : "",
      linkedin: empresa.rede === "linkedin" ? arrobaEmpresa : "",
      x: empresa.rede === "x" ? arrobaEmpresa : "",
      perfil,
      founder: founder.valor.trim() || undefined,
      redeFounder: founder.valor.trim() ? founder.rede : undefined,
    });
  }

  return (
    <form onSubmit={enviar} className="w-full">
      <label htmlFor="url" className="text-sm font-medium text-tinta-2">
        Endereço do site
      </label>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row">
        <input
          id="url"
          inputMode="url"
          autoComplete="url"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="suaempresa.com.br"
          value={d.url}
          onChange={(e) => setD({ ...d, url: e.target.value })}
          aria-invalid={!!erroUrl}
          aria-describedby={erroUrl ? "url-erro" : undefined}
          className="h-14 w-full min-w-0 rounded-full border border-tinta/25 bg-white px-6 text-lg sm:flex-1 text-tinta outline-none transition-colors placeholder:text-tinta-3/70 focus:border-tinta focus:shadow-[inset_0_0_0_1px_var(--color-tinta)] focus-visible:outline-none"
        />
        <button
          type="submit"
          disabled={ocupado}
          className="h-14 shrink-0 rounded-full bg-pauta px-7 text-lg font-semibold text-white transition-colors hover:bg-pauta-escura disabled:opacity-60"
        >
          {ocupado ? "Abrindo..." : "Ler meu site"}
        </button>
      </div>
      {erroUrl && (
        <p id="url-erro" className="mt-2 text-sm text-pauta-escura">
          {erroUrl}
        </p>
      )}

      <fieldset className="mt-6">
        <legend className="text-sm font-medium text-tinta-2">Esse conteúdo é para quem?</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {PERFIS.map((p) => (
            <Chip key={p.id} ativo={perfil === p.id} onClick={() => setPerfil(p.id)}>
              {p.nome}
            </Chip>
          ))}
        </div>
      </fieldset>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <CampoArroba id="arroba-empresa" rotulo="@ da empresa" valor={empresa.valor} rede={empresa.rede} onChange={(valor, rede) => setEmpresa({ valor, rede })} />
        <CampoArroba
          id="arroba-founder"
          rotulo="@ do founder"
          valor={founder.valor}
          rede={founder.rede}
          onChange={(valor, rede) => setFounder({ valor, rede })}
          placeholder="@voce ou link do perfil"
        />
      </div>
      <p className="mt-2 text-sm text-tinta-3">Quanto mais @ você colocar, mais a pauta se parece com você.</p>

      <div className="mt-4 text-sm">
        <button
          type="button"
          onClick={() => setAbrirRedes((v) => !v)}
          aria-expanded={abrirRedes}
          className="text-tinta-2 underline decoration-tinta/30 underline-offset-4 hover:text-tinta hover:decoration-tinta"
        >
          {abrirRedes ? "Menos opções" : "Mais opções (quantidade, Facebook, print do Instagram)"}
        </button>
      </div>

      {abrirRedes && (
        <div className="mt-5 grid gap-3 border-t border-tinta/10 pt-5 sm:grid-cols-2">
          <fieldset className="flex items-center gap-1.5 text-sm sm:col-span-2">
            <legend className="sr-only">Quantidade de posts</legend>
            <span className="mr-1.5 text-tinta-2">Posts</span>
            {QUANTIDADES.map((q) => (
              <button
                type="button"
                key={q}
                onClick={() => setD({ ...d, quantidade: q })}
                aria-pressed={d.quantidade === q}
                className={`h-9 w-10 border tabular-nums transition-colors ${d.quantidade === q ? "border-tinta bg-tinta text-papel" : "border-tinta/20 hover:border-tinta"}`}
              >
                {q}
              </button>
            ))}
          </fieldset>
          <label className="block sm:col-span-2">
            <span className="text-sm text-tinta-2">Facebook da empresa</span>
            <input
              value={d.facebook}
              onChange={(e) => setD({ ...d, facebook: e.target.value })}
              placeholder="facebook.com/..."
              autoCapitalize="none"
              spellCheck={false}
              className="mt-1 h-11 w-full rounded-full border border-tinta/20 bg-white px-4 text-base outline-none transition-colors focus:border-tinta focus-visible:outline-none"
            />
          </label>
          <div className="sm:col-span-2">
            <input
              ref={inputArquivo}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && lerPrint(e.target.files[0])}
            />
            <button
              type="button"
              onClick={() => inputArquivo.current?.click()}
              className="flex w-full items-center justify-between gap-3 border border-tinta/20 bg-white px-4 py-3 text-left text-sm transition-colors hover:border-tinta"
            >
              <span className="text-tinta-2">
                <span className="font-medium text-tinta">Print do grid do Instagram (opcional).</span> As cores são lidas no seu navegador, a imagem não
                sai daqui.
              </span>
              <span className="flex shrink-0 gap-1">
                {lendoPrint ? (
                  <span className="animate-pisca">lendo</span>
                ) : d.paletaInstagram.length ? (
                  d.paletaInstagram.map((c) => <span key={c} className="h-6 w-6 border border-tinta/20" style={{ background: c }} />)
                ) : (
                  <span className="underline underline-offset-4">escolher</span>
                )}
              </span>
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
