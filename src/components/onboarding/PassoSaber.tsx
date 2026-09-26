"use client";

import { useEffect, useRef } from "react";
import { PERGUNTAS_FOUNDER } from "@/lib/client/onboarding";
import type { ConhecimentoFounder } from "@/lib/motor/contrato";
import { BotaoGravar } from "./ui";
import { useDitado } from "./useDitado";

export type Saber = Required<{ [K in keyof ConhecimentoFounder]: string }>;
export const SABER_VAZIO: Saber = { objecao_cliente: "", crenca_contraria: "", historia: "" };

const LIMITE = 600;
const CAMPO =
  "mt-3 w-full rounded-2xl border border-tinta/20 bg-white px-4 py-3 text-base leading-relaxed outline-none transition-colors placeholder:text-tinta-3/70 focus:border-tinta focus-visible:outline-none";

/**
 * Passo "O que só você sabe": três perguntas curtas, por texto ou voz. É o que nenhuma IA genérica
 * tira do site. Nada é obrigatório e o "Pular por agora" fica sempre à vista.
 */
export function PassoSaber({
  saber,
  onChange,
  onContinuar,
  lendo,
  espera,
  onVoltar,
}: {
  saber: Saber;
  onChange: (s: Saber) => void;
  /** `usar` false quando a pessoa pulou: o que estiver escrito fica guardado, mas não vai para o motor. */
  onContinuar: (usar: boolean) => void;
  /** Domínio que ainda está sendo lido em segundo plano, para avisar que a espera está sendo aproveitada. */
  lendo?: string | null;
  /** Frase pronta no lugar do "a gente lê {domínio}", para o caminho sem site. */
  espera?: string | null;
  /** Volta para a tela anterior (caminho sem site). */
  onVoltar?: () => void;
}) {
  const voz = useDitado(60);
  const atual = useRef(saber);
  useEffect(() => {
    atual.current = saber;
  }, [saber]);
  const respondidas = PERGUNTAS_FOUNDER.filter((p) => saber[p.id].trim()).length;

  return (
    <div className="animate-subir">
      {onVoltar && (
        <button
          type="button"
          onClick={() => {
            voz.parar();
            onVoltar();
          }}
          className="mb-4 text-sm text-tinta-2 underline decoration-tinta/30 underline-offset-4 hover:text-tinta hover:decoration-tinta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pauta"
        >
          Voltar para a empresa
        </button>
      )}
      <p className="text-sm font-medium text-pauta-escura">Passo principal</p>
      <h1 className="mt-2 text-balance font-display text-3xl font-semibold leading-[1.1] tracking-[-0.03em] sm:text-4xl">O que só você sabe</h1>
      <p className="mt-3 text-lg leading-relaxed text-tinta-2">Isso é o que o ChatGPT não sabe sobre a sua empresa. Uma ou duas linhas bastam{voz.temVoz ? ", e dá para responder falando" : ""}.</p>
      {(espera || lendo) && (
        <p className="mt-2 text-sm text-tinta-3" role="status" aria-live="polite">
          {espera ?? `Enquanto isso, a gente lê ${lendo}.`} <span className="inline-block animate-pisca text-pauta">▍</span>
        </p>
      )}

      <div className="mt-8 space-y-7 rounded-3xl border border-tinta/10 bg-white p-5 shadow-[0_30px_60px_-40px_rgba(22,19,15,.35)] sm:p-8">
        {PERGUNTAS_FOUNDER.map((p, i) => {
          const gravando = voz.gravando === p.id;
          return (
            <div key={p.id}>
              <div className="flex items-start justify-between gap-3">
                <label htmlFor={`saber-${p.id}`} className="font-display text-lg font-semibold leading-snug tracking-[-0.01em]">
                  <span className="mr-1.5 text-tinta-3">{i + 1}.</span>
                  {p.pergunta}
                </label>
                {voz.temVoz && (
                  <BotaoGravar
                    gravando={gravando}
                    relogio={voz.relogio}
                    temTexto={!!saber[p.id]}
                    rotulo={`a resposta ${i + 1}`}
                    onClick={() =>
                      gravando ? voz.parar() : voz.gravar(p.id, atual.current[p.id], (t) => onChange({ ...atual.current, [p.id]: t }), LIMITE)
                    }
                  />
                )}
              </div>
              <textarea
                id={`saber-${p.id}`}
                rows={2}
                maxLength={LIMITE}
                value={saber[p.id]}
                onChange={(e) => onChange({ ...saber, [p.id]: e.target.value })}
                placeholder={p.exemplo}
                className={CAMPO}
              />
              {voz.aviso?.id === p.id && (
                <p className="mt-2 text-sm text-pauta-escura" role="alert">
                  {voz.aviso.texto}
                </p>
              )}
            </div>
          );
        })}
        <p className="sr-only" aria-live="polite">
          {voz.gravando ? "Gravando" : ""}
        </p>
      </div>

      {/* Barra fixa no celular: o "Pular por agora" nunca some da tela. */}
      <div className="sticky bottom-0 z-10 -mx-4 mt-6 flex items-center gap-4 border-t border-tinta/10 bg-papel/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:mt-8 sm:border-0 sm:bg-transparent sm:p-0">
        <button
          type="button"
          disabled={!respondidas}
          onClick={() => {
            voz.parar();
            onContinuar(true);
          }}
          className="h-12 flex-1 rounded-full bg-pauta px-7 text-base font-semibold text-white transition-colors hover:bg-pauta-escura focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinta disabled:cursor-not-allowed disabled:opacity-40 sm:h-14 sm:flex-none sm:text-lg"
        >
          Continuar
        </button>
        <button
          type="button"
          onClick={() => {
            voz.parar();
            onContinuar(false);
          }}
          className="shrink-0 text-sm font-medium text-tinta-2 underline decoration-tinta/30 underline-offset-4 hover:text-tinta hover:decoration-tinta"
        >
          Pular por agora
        </button>
      </div>
    </div>
  );
}
