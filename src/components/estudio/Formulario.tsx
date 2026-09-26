"use client";

import Link from "next/link";
import { useState } from "react";
import type { PerfilAlvo, RedeArroba } from "@/lib/client/onboarding";
import { urlDoApp } from "@/lib/client/parametros";

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
  /** Caminho sem site: a marca é montada com o que a pessoa conta na tela da empresa. */
  semSite?: boolean;
}

/**
 * Tela 1 do onboarding: só o site. Redes, quem assina e o resto ficam na tela seguinte, já com o site lido.
 * `centrado` é para o topo da landing, que é centrado a partir do sm: rótulo e erro seguem o campo (à esquerda),
 * a linha do "Não tenho site" fica no meio. No celular tudo continua alinhado à esquerda.
 */
export function Formulario({ onEnviar, ocupado, centrado = false }: { onEnviar: (d: DadosFormulario) => void; ocupado: boolean; centrado?: boolean }) {
  const [d, setD] = useState<DadosFormulario>({ url: "", instagram: "", linkedin: "", x: "", facebook: "", quantidade: 6, paletaInstagram: [] });
  const [erroUrl, setErroUrl] = useState("");

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    const u = d.url.trim();
    if (!/\.[a-z]{2,}/i.test(u)) {
      setErroUrl("Coloque o endereço do site, por exemplo suaempresa.com.br.");
      return;
    }
    setErroUrl("");
    onEnviar({ ...d, url: u });
  }

  return (
    <form onSubmit={enviar} className={`w-full ${centrado ? "sm:text-left" : ""}`}>
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
          className="tocavel h-14 shrink-0 rounded-full bg-pauta px-7 text-lg font-semibold text-white transition-colors hover:bg-pauta-escura disabled:opacity-60"
        >
          {ocupado ? "Abrindo..." : "Ler meu site"}
        </button>
      </div>
      {erroUrl && (
        <p id="url-erro" className="mt-2 text-sm text-pauta-escura">
          {erroUrl}
        </p>
      )}
      <div className={`mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 ${centrado ? "sm:justify-center" : ""}`}>
        <Link
          href={urlDoApp({ url: "", semSite: true })}
          className="tocavel inline-flex h-11 items-center rounded-full border border-tinta/25 bg-white px-5 text-base font-medium text-tinta transition-colors hover:border-tinta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pauta"
        >
          Não tenho site
        </Link>
        <span className="text-sm text-tinta-3">Você conta sobre a empresa e a gente monta a pauta.</span>
      </div>
    </form>
  );
}
