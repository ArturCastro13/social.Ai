"use client";

import { useEffect, useRef, useState } from "react";

/** Pede o e-mail uma vez antes de liberar downloads. Salva o lead no servidor. */
export function EmailGate({
  aberto,
  onFechar,
  onLiberado,
  contexto,
}: {
  aberto: boolean;
  onFechar: () => void;
  onLiberado: (email: string) => void;
  contexto: { url: string; empresa: string; analiseId: string };
}) {
  const [email, setEmail] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (aberto && !d.open) d.showModal();
    if (!aberto && d.open) d.close();
  }, [aberto]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setEnviando(true);
    try {
      const r = await fetch("/api/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, url: contexto.url, empresa: contexto.empresa, analise_id: contexto.analiseId, origem: "download" }),
      });
      if (!r.ok) throw new Error((await r.json()).erro);
      try {
        localStorage.setItem("socialai_email", email);
      } catch {
        /* navegação privada */
      }
      onLiberado(email);
    } catch (err) {
      setErro((err as Error).message || "Não deu certo. Tenta de novo?");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <dialog
      ref={ref}
      onClose={onFechar}
      className="m-auto w-[min(92vw,460px)] border-2 border-tinta bg-papel p-0 text-tinta shadow-[10px_10px_0_var(--color-tinta)] backdrop:bg-tinta/60 backdrop:backdrop-blur-sm"
    >
      <form onSubmit={enviar} className="p-6 sm:p-8">
        <p className="retranca text-pauta">Último passo</p>
        <h2 className="mt-2 font-serif text-3xl leading-tight">Para onde a gente manda seus posts?</h2>
        <p className="mt-3 text-sm leading-relaxed text-tinta-2">
          Deixe seu e-mail para baixar os posts. Você entra na lista de espera e a gente só escreve quando tiver algo útil.
        </p>
        <label className="mt-5 block">
          <span className="sr-only">E-mail</span>
          <input
            type="email"
            required
            autoFocus
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@suastartup.com.br"
            className="h-12 w-full border-2 border-tinta bg-white px-4 text-base outline-none focus:border-pauta"
          />
        </label>
        {erro && <p className="mt-2 text-sm text-pauta-escura">{erro}</p>}
        <div className="mt-5 flex items-center justify-between gap-3">
          <button type="button" onClick={onFechar} className="text-sm text-tinta-3 underline-offset-4 hover:underline">
            Agora não
          </button>
          <button disabled={enviando} className="h-12 bg-pauta px-6 font-bold text-white transition hover:bg-pauta-escura disabled:opacity-60">
            {enviando ? "Salvando..." : "Liberar download"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
