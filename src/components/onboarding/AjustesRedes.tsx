"use client";

import { useRef, useState } from "react";
import type { RedeArroba } from "@/lib/client/onboarding";
import { CampoArroba } from "./ui";

export interface Redes {
  empresa: { valor: string; rede: RedeArroba };
  facebook: string;
  quantidade: number;
  paletaInstagram: string[];
}

const QUANTIDADES = [3, 6, 9, 12];

/** Bloco da tela 2 com os @ da empresa e do founder e as opções extras (quantidade, Facebook, print do Instagram). */
export function AjustesRedes({
  redes,
  onChange,
  founder,
  onFounder,
  titulo,
}: {
  redes: Redes;
  onChange: (r: Redes) => void;
  founder: { valor: string; rede: RedeArroba };
  onFounder: (f: { valor: string; rede: RedeArroba }) => void;
  titulo: string;
}) {
  const [abrirMais, setAbrirMais] = useState(false);
  const [lendoPrint, setLendoPrint] = useState(false);
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
      onChange({ ...redes, paletaInstagram: cores.slice(0, 5) });
    } catch {
      onChange({ ...redes, paletaInstagram: [] });
    } finally {
      URL.revokeObjectURL(url);
      setLendoPrint(false);
    }
  }

  return (
    <fieldset>
      <legend className={titulo}>Suas redes</legend>
      <p className="mt-1 text-sm text-tinta-3">Quanto mais @ você colocar, mais a pauta se parece com você.</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <CampoArroba
          id="ajuste-empresa"
          rotulo="@ da empresa"
          valor={redes.empresa.valor}
          rede={redes.empresa.rede}
          onChange={(valor, rede) => onChange({ ...redes, empresa: { valor, rede } })}
        />
        <CampoArroba
          id="ajuste-founder"
          rotulo="@ do founder"
          valor={founder.valor}
          rede={founder.rede}
          onChange={(valor, rede) => onFounder({ valor, rede })}
          placeholder="@voce ou link do perfil"
        />
      </div>

      <button
        type="button"
        onClick={() => setAbrirMais((v) => !v)}
        aria-expanded={abrirMais}
        className="mt-4 text-sm text-tinta-2 underline decoration-tinta/30 underline-offset-4 hover:text-tinta hover:decoration-tinta"
      >
        {abrirMais ? "Menos opções" : "Mais opções (quantidade, Facebook, print do Instagram)"}
      </button>

      {abrirMais && (
        <div className="mt-4 grid gap-4 border-t border-tinta/10 pt-4">
          <div className="flex flex-wrap items-center gap-1.5 text-sm" role="group" aria-label="Quantidade de posts">
            <span className="mr-1.5 text-tinta-2">Posts</span>
            {QUANTIDADES.map((q) => (
              <button
                type="button"
                key={q}
                onClick={() => onChange({ ...redes, quantidade: q })}
                aria-pressed={redes.quantidade === q}
                className={`h-9 w-10 rounded-full border tabular-nums transition-colors ${redes.quantidade === q ? "border-tinta bg-tinta text-papel" : "border-tinta/20 hover:border-tinta"}`}
              >
                {q}
              </button>
            ))}
          </div>
          <label className="block">
            <span className="text-sm text-tinta-2">Facebook da empresa</span>
            <input
              value={redes.facebook}
              onChange={(e) => onChange({ ...redes, facebook: e.target.value })}
              placeholder="facebook.com/..."
              autoCapitalize="none"
              spellCheck={false}
              className="mt-1 h-11 w-full rounded-full border border-tinta/20 bg-white px-4 text-base outline-none transition-colors focus:border-tinta focus-visible:outline-none"
            />
          </label>
          <div>
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
              className="flex w-full items-center justify-between gap-3 rounded-2xl border border-tinta/20 bg-white px-4 py-3 text-left text-sm transition-colors hover:border-tinta"
            >
              <span className="text-tinta-2">
                <span className="font-medium text-tinta">Print do grid do Instagram (opcional).</span> As cores são lidas no seu navegador, a imagem não
                sai daqui.
              </span>
              <span className="flex shrink-0 gap-1">
                {lendoPrint ? (
                  <span className="animate-pisca">lendo</span>
                ) : redes.paletaInstagram.length ? (
                  redes.paletaInstagram.map((c) => <span key={c} className="h-6 w-6 rounded-full border border-tinta/20" style={{ background: c }} />)
                ) : (
                  <span className="underline underline-offset-4">escolher</span>
                )}
              </span>
            </button>
          </div>
        </div>
      )}
    </fieldset>
  );
}
