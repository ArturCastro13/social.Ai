"use client";

import { useState, type FormEvent } from "react";

export function FormularioEspera() {
  const [estado, setEstado] = useState<"inicial" | "enviando" | "sucesso" | "erro">("inicial");
  const [mensagem, setMensagem] = useState("");

  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (estado === "enviando") return;
    const dados = new FormData(event.currentTarget);
    setEstado("enviando");
    setMensagem("");
    try {
      const resposta = await fetch("/api/lista-de-espera", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ empresa: dados.get("empresa"), email: dados.get("email"), website: dados.get("website") }),
      });
      const resultado = await resposta.json();
      if (!resposta.ok || resultado.ok !== true) throw new Error(resultado.erro || "Não foi possível salvar. Tente novamente.");
      setEstado("sucesso");
    } catch (erro) {
      setMensagem(erro instanceof Error && erro.message !== "Failed to fetch" ? erro.message : "Confira sua conexão e tente novamente.");
      setEstado("erro");
    }
  }

  return (
    <div id="inscricao" className="mt-8 scroll-mt-28">
      {estado === "sucesso" ? (
        <div role="status" className="rounded-2xl border border-salvia/25 bg-salvia/5 p-6">
          <p className="text-lg font-semibold text-salvia">Você está na lista.</p>
          <p className="mt-2 leading-relaxed text-tinta-2">Vamos entrar em contato por e-mail quando o acesso estiver disponível.</p>
        </div>
      ) : (
        <form onSubmit={enviar} aria-label="Lista de espera" aria-busy={estado === "enviando"}>
          <label htmlFor="empresa-espera" className="mb-2 block text-sm font-medium">Nome da empresa</label>
          <input id="empresa-espera" name="empresa" autoComplete="organization" required minLength={2} maxLength={120} placeholder="Como sua empresa se chama?" disabled={estado === "enviando"} className="mb-4 min-h-13 w-full rounded-2xl border border-tinta/20 bg-white px-5 text-base disabled:opacity-60" />
          <label htmlFor="email-espera" className="mb-2 block text-sm font-medium">Seu e-mail</label>
          <div className="flex flex-col gap-3">
            <input id="email-espera" name="email" type="email" autoComplete="email" required maxLength={254} placeholder="voce@suaempresa.com" disabled={estado === "enviando"} aria-describedby="aviso-espera erro-espera" aria-invalid={estado === "erro" || undefined} className="min-h-13 min-w-0 rounded-full border border-tinta/20 bg-white px-5 text-base disabled:opacity-60 sm:flex-1" />
            <button type="submit" disabled={estado === "enviando"} className="min-h-13 shrink-0 rounded-full bg-pauta px-6 py-3 font-semibold text-tinta transition-colors hover:bg-pauta-escura hover:text-white motion-reduce:transition-none disabled:cursor-wait disabled:opacity-70">
              {estado === "enviando" ? "Salvando…" : "Quero entrar na lista"}
            </button>
          </div>
          <div hidden aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
          <p id="aviso-espera" className="mt-3 text-xs leading-relaxed text-tinta-3">Ao se inscrever, você concorda em receber e-mails sobre o acesso e as novidades do social.Ai. Pode pedir para sair a qualquer momento.</p>
          <p id="erro-espera" role="alert" className="mt-2 text-sm text-red-700">{mensagem}</p>
        </form>
      )}
    </div>
  );
}
