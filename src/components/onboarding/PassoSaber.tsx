"use client";

import { useEffect, useRef, useState } from "react";
import { PERGUNTAS_FOUNDER } from "@/lib/client/onboarding";
import type { ConhecimentoFounder } from "@/lib/motor/contrato";
import { BotaoGravar } from "./ui";
import { useDitado } from "./useDitado";

export type Saber = Required<{ [K in keyof ConhecimentoFounder]: string }>;
export const SABER_VAZIO: Saber = { problema_cliente: "", objecao_cliente: "", diferencial: "", crenca_contraria: "", historia: "" };

const LIMITE = 600;
const CAMPO =
  "mt-3 w-full rounded-2xl border border-tinta/20 bg-white px-4 py-3 text-base leading-relaxed outline-none transition-colors placeholder:text-tinta-3/70 focus:border-tinta focus-visible:outline-none";

/**
 * Passo "O que só você sabe": três perguntas diretas sobre o negócio (problema, dúvida antes da compra
 * e diferencial), por texto ou voz. Nada é obrigatório e o "Pular por agora" fica sempre à vista.
 * As chaves antigas (crenca_contraria, historia) continuam no estado, mas não aparecem aqui.
 * Uma pergunta por vez: a próxima só abre depois que a anterior foi respondida, para não assustar.
 */
export function PassoSaber({
  saber,
  onChange,
  onContinuar,
  lendo,
  espera,
  onVoltar,
  semSite,
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
  semSite?: boolean;
}) {
  const voz = useDitado(60);
  const atual = useRef(saber);
  useEffect(() => {
    atual.current = saber;
  }, [saber]);
  const respondidas = PERGUNTAS_FOUNDER.filter((p) => saber[p.id].trim()).length;
  const total = PERGUNTAS_FOUNDER.length;
  // Quantas perguntas estão abertas. Começa com as já respondidas (respostas salvas) mais uma.
  const ultimaRespondida = (s: Saber) => PERGUNTAS_FOUNDER.reduce((u, p, i) => (s[p.id].trim() ? i : u), -1);
  const [abertas, setAbertas] = useState(() => Math.min(total, ultimaRespondida(saber) + 2));
  // Respostas salvas chegam depois de montar (o site ainda estava sendo lido): abre até elas.
  const ultima = ultimaRespondida(saber);
  if (ultima >= abertas) setAbertas(Math.min(total, ultima + 2));
  const foco = useRef<string | null>(null);
  useEffect(() => {
    if (!foco.current) return;
    document.getElementById(`saber-${foco.current}`)?.focus();
    foco.current = null;
  }, [abertas]);

  function proxima(i: number) {
    if (i + 1 >= total || !saber[PERGUNTAS_FOUNDER[i].id].trim()) return;
    voz.parar();
    foco.current = PERGUNTAS_FOUNDER[i + 1].id;
    setAbertas((a) => Math.max(a, i + 2));
  }

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
      <h1 className="mt-2 text-balance font-display text-3xl font-semibold leading-[1.1] tracking-[-0.03em] sm:text-4xl">Três perguntas sobre o seu negócio</h1>
      <p className="mt-3 text-lg leading-relaxed text-tinta-2">
        {semSite ? "Isso é o que nenhuma IA acha sozinha." : "Isso é o que nenhuma IA acha no seu site."} Uma ou duas linhas bastam
        {voz.temVoz ? ", e dá para responder falando" : ""}.
      </p>
      {(espera || lendo) && (
        <p className="mt-2 text-sm text-tinta-3" role="status" aria-live="polite">
          {espera ?? `Enquanto isso, a gente lê ${lendo}.`} <span className="inline-block animate-pisca text-pauta">▍</span>
        </p>
      )}

      <div className="mt-8 flex items-center gap-3" aria-hidden>
        <div className="flex gap-1.5">
          {PERGUNTAS_FOUNDER.map((p, i) => (
            <span key={p.id} className={`h-1.5 w-8 rounded-full transition-colors duration-500 ${i < abertas ? (saber[p.id].trim() ? "bg-pauta" : "bg-tinta/40") : "bg-tinta/10"}`} />
          ))}
        </div>
        <span className="text-sm tabular-nums text-tinta-3">
          {Math.min(abertas, total)} de {total}
        </span>
      </div>

      <div className="mt-3 space-y-7 rounded-3xl border border-tinta/10 bg-white p-5 shadow-[0_30px_60px_-40px_rgba(22,19,15,.35)] sm:p-8">
        {PERGUNTAS_FOUNDER.slice(0, abertas).map((p, i) => {
          const gravando = voz.gravando === p.id;
          const atualAberta = i === abertas - 1;
          return (
            <div key={p.id} className={i > 0 ? "animate-subir" : ""}>
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
                onKeyDown={(e) => {
                  // Enter passa para a próxima pergunta; Shift+Enter quebra a linha.
                  if (e.key === "Enter" && !e.shiftKey && atualAberta && i + 1 < total && saber[p.id].trim()) {
                    e.preventDefault();
                    proxima(i);
                  }
                }}
                placeholder={p.exemplo}
                className={CAMPO}
              />
              {atualAberta && i + 1 < total && saber[p.id].trim() && (
                <button
                  type="button"
                  onClick={() => proxima(i)}
                  className="tocavel animate-subir mt-3 inline-flex h-10 items-center gap-2 rounded-full bg-tinta px-4 text-sm font-semibold text-papel hover:bg-tinta-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pauta"
                >
                  Próxima pergunta <span aria-hidden>→</span>
                </button>
              )}
              {voz.aviso?.id === p.id && (
                <p className="mt-2 text-sm text-pauta-escura" role="alert">
                  {voz.aviso.texto}
                </p>
              )}
            </div>
          );
        })}
        <p className="sr-only" aria-live="polite">
          {voz.gravando ? "Gravando" : `Pergunta ${Math.min(abertas, total)} de ${total}`}
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
          // Enquanto há pergunta por abrir, "Próxima pergunta" é a ação principal e o Continuar fica discreto.
          className={`tocavel h-12 flex-1 rounded-full px-7 text-base font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinta disabled:cursor-not-allowed disabled:opacity-40 sm:h-14 sm:flex-none sm:text-lg ${
            abertas >= total ? "bg-pauta text-white hover:bg-pauta-escura" : "border border-tinta/20 bg-white text-tinta hover:border-tinta"
          }`}
        >
          {abertas >= total ? "Continuar" : "Continuar assim"}
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
