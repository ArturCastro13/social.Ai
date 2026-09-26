"use client";

import { useRef, useState } from "react";

export interface DadosFormulario {
  url: string;
  instagram: string;
  linkedin: string;
  x: string;
  facebook: string;
  quantidade: number;
  paletaInstagram: string[];
}

const QUANTIDADES = [3, 6, 9, 12];

const REDES: { k: "instagram" | "linkedin" | "x" | "facebook"; rotulo: string; ph: string }[] = [
  { k: "instagram", rotulo: "Instagram", ph: "@suamarca" },
  { k: "linkedin", rotulo: "LinkedIn", ph: "linkedin.com/company/..." },
  { k: "x", rotulo: "X", ph: "@suamarca" },
  { k: "facebook", rotulo: "Facebook", ph: "facebook.com/..." },
];

export function Formulario({
  onEnviar,
  ocupado,
  exemplos,
  onExemplo,
}: {
  onEnviar: (d: DadosFormulario) => void;
  ocupado: boolean;
  exemplos: { nome: string; dominio: string; cor: string }[];
  onExemplo: (dominio: string) => void;
}) {
  const [d, setD] = useState<DadosFormulario>({ url: "", instagram: "", linkedin: "", x: "", facebook: "", quantidade: 6, paletaInstagram: [] });
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
      setErroUrl("Coloca o endereço do site, tipo suaempresa.com.br");
      return;
    }
    setErroUrl("");
    onEnviar({ ...d, url: u });
  }

  return (
    <form onSubmit={enviar} className="w-full">
      <label htmlFor="url" className="retranca text-tinta-3">
        Endereço do site da sua startup
      </label>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-stretch">
        <div className="relative flex-1">
          <input
            id="url"
            inputMode="url"
            autoComplete="url"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="suaempresa.com.br"
            value={d.url}
            onChange={(e) => setD({ ...d, url: e.target.value })}
            className="h-16 w-full border-2 border-tinta bg-white px-5 font-serif text-2xl italic text-tinta shadow-[5px_5px_0_var(--color-tinta)] outline-none transition placeholder:text-tinta/30 focus:shadow-[5px_5px_0_var(--color-pauta)] sm:text-3xl"
          />
        </div>
        <button
          type="submit"
          disabled={ocupado}
          className="group h-16 shrink-0 border-2 border-tinta bg-pauta px-7 text-lg font-bold text-white shadow-[5px_5px_0_var(--color-tinta)] transition hover:-translate-y-0.5 hover:shadow-[7px_7px_0_var(--color-tinta)] active:translate-y-0.5 active:shadow-[2px_2px_0_var(--color-tinta)] disabled:opacity-60"
        >
          {ocupado ? "Trabalhando..." : (
            <>
              Gerar minha pauta <span className="inline-block transition group-hover:translate-x-1">→</span>
            </>
          )}
        </button>
      </div>
      {erroUrl && <p className="mt-2 text-sm font-medium text-pauta-escura">{erroUrl}</p>}

      <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
        <fieldset className="flex items-center gap-2">
          <legend className="sr-only">Quantidade de posts</legend>
          <span className="retranca text-tinta-3">Posts</span>
          {QUANTIDADES.map((q) => (
            <button
              type="button"
              key={q}
              onClick={() => setD({ ...d, quantidade: q })}
              aria-pressed={d.quantidade === q}
              className={`h-9 w-10 border font-mono text-sm transition ${d.quantidade === q ? "border-tinta bg-tinta text-papel" : "border-tinta/25 hover:border-tinta"}`}
            >
              {q}
            </button>
          ))}
        </fieldset>
        <button
          type="button"
          onClick={() => setAbrirRedes((v) => !v)}
          aria-expanded={abrirRedes}
          className="retranca text-tinta-2 underline decoration-pauta decoration-2 underline-offset-4 hover:text-pauta"
        >
          {abrirRedes ? "− esconder redes" : "+ adicionar @ das redes"}
        </button>
      </div>

      {abrirRedes && (
        <div className="mt-4 grid gap-3 border-t border-dashed border-tinta/25 pt-4 sm:grid-cols-2">
          {REDES.map((r) => (
            <label key={r.k} className="block">
              <span className="retranca text-tinta-3">{r.rotulo}</span>
              <input
                value={d[r.k]}
                onChange={(e) => setD({ ...d, [r.k]: e.target.value })}
                placeholder={r.ph}
                autoCapitalize="none"
                spellCheck={false}
                className="mt-1 h-11 w-full border border-tinta/25 bg-white/70 px-3 text-base outline-none focus:border-pauta"
              />
            </label>
          ))}
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
              className="flex w-full items-center justify-between gap-3 border border-dashed border-tinta/40 bg-papel-2/60 px-4 py-3 text-left text-sm transition hover:border-pauta"
            >
              <span>
                <strong className="font-semibold">Tem um print do grid do seu Instagram?</strong>{" "}
                <span className="text-tinta-2">A gente tira as cores dele aqui no seu navegador, sem subir a imagem.</span>
              </span>
              <span className="flex shrink-0 gap-1">
                {lendoPrint ? (
                  <span className="retranca animate-pisca">lendo</span>
                ) : d.paletaInstagram.length ? (
                  d.paletaInstagram.map((c) => <span key={c} className="h-6 w-6 border border-tinta/20" style={{ background: c }} />)
                ) : (
                  <span className="retranca text-pauta">escolher</span>
                )}
              </span>
            </button>
          </div>
        </div>
      )}

      {exemplos.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <span className="text-sm text-tinta-2">Sem site à mão? Veja um exemplo:</span>
          {exemplos.map((ex) => (
            <button
              key={ex.dominio}
              type="button"
              disabled={ocupado}
              onClick={() => onExemplo(ex.dominio)}
              className="inline-flex items-center gap-2 border border-tinta/20 bg-white/60 px-3 py-1.5 text-sm transition hover:border-tinta disabled:opacity-50"
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: ex.cor }} />
              {ex.nome}
            </button>
          ))}
        </div>
      )}
    </form>
  );
}
