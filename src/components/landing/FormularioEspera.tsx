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
            <p className="text-lg font-semibold text-salvia">Pronto. Você está entre os primeiros.</p>
            <p className="mt-1 leading-relaxed text-tinta-2">Quando o acesso abrir para testes, você fica sabendo por e-mail.</p>
          </div>
        </div>
      ) : (
        <form onSubmit={enviar} aria-label="Lista de espera" aria-busy={estado === "enviando"}>
          {/* No celular os campos empilham; a partir de sm ficam lado a lado e o botão ocupa a linha toda. */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="min-w-0">
              <label htmlFor="empresa-espera" className="mb-1.5 block text-sm font-medium">Nome da empresa</label>
              <input id="empresa-espera" name="empresa" type="text" inputMode="text" autoComplete="organization" autoCapitalize="words" enterKeyHint="next" required minLength={2} maxLength={120} placeholder="Como sua empresa se chama?" disabled={estado === "enviando"} className={campo} />
            </div>
            <div className="min-w-0">
              <label htmlFor="email-espera" className="mb-1.5 block text-sm font-medium">Seu e-mail</label>
              <input id="email-espera" name="email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="send" required maxLength={254} placeholder="voce@suaempresa.com" disabled={estado === "enviando"} aria-describedby="aviso-espera erro-espera" aria-invalid={estado === "erro" || undefined} className={campo} />
            </div>
          </div>
          <button type="submit" disabled={estado === "enviando"} className="mt-3 flex min-h-13 w-full items-center justify-center rounded-full bg-pauta px-4 py-2 text-base font-bold leading-tight min-[380px]:text-[1.0625rem] text-white transition-colors hover:bg-pauta-escura motion-reduce:transition-none disabled:cursor-wait disabled:opacity-70 sm:text-[1.1875rem]">
            {estado === "enviando" ? "Salvando…" : "Quero ser um dos primeiros a testar"}
          </button>
          <div hidden aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
          <p id="erro-espera" role="alert" className="mt-3 text-sm font-medium text-red-700 empty:mt-0">{mensagem}</p>
          <p id="aviso-espera" className="mt-3 text-[0.8125rem] leading-relaxed text-tinta-3">Ao se inscrever, você concorda em receber e-mails sobre o acesso e as novidades do social.Ai. Pode pedir para sair a qualquer momento.</p>
        </form>
      )}
    </div>
  );
}
