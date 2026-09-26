"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

export function FormularioEspera() {
  const [estado, setEstado] = useState<"inicial" | "enviando" | "sucesso" | "erro">("inicial");
  const [mensagem, setMensagem] = useState("");
  const confirmacao = useRef<HTMLDivElement>(null);

  // O formulário some depois do envio: o foco vai para a confirmação para ninguém ficar perdido na página.
  useEffect(() => {
    if (estado === "sucesso") confirmacao.current?.focus();
  }, [estado]);

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

  const campo = "min-h-12 w-full min-w-0 rounded-full border border-tinta/20 bg-white px-5 text-base text-tinta placeholder:text-tinta-3/80 focus:border-tinta disabled:opacity-60 aria-[invalid=true]:border-red-700";

  return (
    <div id="inscricao" className="mt-6 scroll-mt-24 sm:mt-8">
      {estado === "sucesso" ? (
        <div ref={confirmacao} tabIndex={-1} role="status" className="flex gap-4 rounded-2xl border border-salvia/25 bg-salvia/5 p-5 focus:outline-none sm:p-6">
          <span aria-hidden className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-salvia text-sm font-bold text-white">✓</span>
          <div>
            <p className="text-lg font-semibold text-salvia">Você está na lista.</p>
            <p className="mt-1 leading-relaxed text-tinta-2">Vamos entrar em contato por e-mail quando o acesso estiver disponível.</p>
          </div>
        </div>
      ) : (
        <form onSubmit={enviar} aria-label="Lista de espera" aria-busy={estado === "enviando"}>
          <label htmlFor="empresa-espera" className="mb-1.5 block text-sm font-medium">Nome da empresa</label>
          <input id="empresa-espera" name="empresa" type="text" inputMode="text" autoComplete="organization" autoCapitalize="words" enterKeyHint="next" required minLength={2} maxLength={120} placeholder="Como sua empresa se chama?" disabled={estado === "enviando"} className={`${campo} mb-3`} />
          <label htmlFor="email-espera" className="mb-1.5 block text-sm font-medium">Seu e-mail</label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input id="email-espera" name="email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="send" required maxLength={254} placeholder="voce@suaempresa.com" disabled={estado === "enviando"} aria-describedby="aviso-espera erro-espera" aria-invalid={estado === "erro" || undefined} className={`${campo} sm:flex-1`} />
            <button type="submit" disabled={estado === "enviando"} className="min-h-12 shrink-0 rounded-full bg-pauta px-6 text-[1.1875rem] font-bold text-white transition-colors hover:bg-pauta-escura motion-reduce:transition-none disabled:cursor-wait disabled:opacity-70">
              {estado === "enviando" ? "Salvando…" : "Quero entrar na lista"}
            </button>
          </div>
          <div hidden aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
          <p id="erro-espera" role="alert" className="mt-3 text-sm font-medium text-red-700 empty:mt-0">{mensagem}</p>
          <p id="aviso-espera" className="mt-3 text-[0.8125rem] leading-relaxed text-tinta-3">Ao se inscrever, você concorda em receber e-mails sobre o acesso e as novidades do social.Ai. Pode pedir para sair a qualquer momento.</p>
        </form>
      )}
    </div>
  );
}
