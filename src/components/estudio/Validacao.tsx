"use client";

import { useState } from "react";
import { PERGUNTAS_VALIDACAO } from "@/lib/validacao";

/** Cinco perguntas rápidas oferecidas depois do resultado. Alimenta os números do pitch. */
export function Validacao({ analiseId, email }: { analiseId: string; email: string | null }) {
  const [resp, setResp] = useState<Record<string, string>>({});
  const [comentario, setComentario] = useState("");
  const [estado, setEstado] = useState<"aberto" | "enviando" | "enviado">("aberto");
  const respondidas = PERGUNTAS_VALIDACAO.filter((p) => resp[p.id]).length;

  async function enviar() {
    setEstado("enviando");
    try {
      await fetch("/api/validacao", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email ?? undefined, analise_id: analiseId, respostas: { ...resp, comentario: comentario || null } }),
      });
    } finally {
      setEstado("enviado");
    }
  }

  if (estado === "enviado") {
    return (
      <div className="border-2 border-tinta bg-limao p-6 sm:p-8">
        <p className="retranca">Recebido</p>
        <p className="mt-2 font-serif text-3xl leading-tight">Valeu demais. Isso ajuda a gente a construir o que você realmente usaria.</p>
      </div>
    );
  }

  return (
    <div className="border-2 border-tinta bg-white p-5 sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="retranca text-pauta">Um minuto, cinco perguntas</p>
          <h3 className="mt-1 font-serif text-3xl leading-tight">Ajuda a gente a entender sua rotina?</h3>
        </div>
        <p className="font-mono text-sm text-tinta-3">{respondidas}/5</p>
      </div>
      <div className="mt-6 space-y-6">
        {PERGUNTAS_VALIDACAO.map((p, i) => (
          <fieldset key={p.id}>
            <legend className="text-base font-semibold">
              <span className="mr-2 font-mono text-sm text-tinta-3">{i + 1}.</span>
              {p.pergunta}
            </legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {p.opcoes.map((o) => (
                <button
                  key={o}
                  type="button"
                  aria-pressed={resp[p.id] === o}
                  onClick={() => setResp({ ...resp, [p.id]: o })}
                  className={`border px-3 py-2 text-sm transition ${p.tipo === "escala" ? "w-12" : ""} ${resp[p.id] === o ? "border-tinta bg-tinta text-papel" : "border-tinta/25 hover:border-tinta"}`}
                >
                  {o}
                </button>
              ))}
            </div>
          </fieldset>
        ))}
        <label className="block">
          <span className="text-base font-semibold">Quer contar mais alguma coisa? (opcional)</span>
          <textarea
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            rows={2}
            maxLength={300}
            className="mt-2 w-full border border-tinta/25 bg-papel/50 p-3 text-sm outline-none focus:border-pauta"
          />
        </label>
      </div>
      <button
        type="button"
        onClick={enviar}
        disabled={respondidas < 3 || estado === "enviando"}
        className="mt-6 h-12 w-full bg-tinta font-bold text-papel transition hover:bg-pauta disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto sm:px-8"
      >
        {estado === "enviando" ? "Enviando..." : "Enviar respostas"}
      </button>
    </div>
  );
}
