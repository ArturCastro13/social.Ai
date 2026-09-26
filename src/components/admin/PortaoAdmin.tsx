"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { CHAVE_SENHA } from "./useAdmin";

type Estado = "conferindo" | "fechado" | "aberto";

async function confere(senha: string): Promise<boolean> {
  const r = await fetch("/api/admin/verificar", { headers: { "x-admin-password": senha }, cache: "no-store" });
  return r.ok;
}

function lerSalva(): string {
  try {
    return localStorage.getItem(CHAVE_SENHA) ?? "";
  } catch {
    return "";
  }
}

/**
 * Tela de senha antes de qualquer página do admin. Nada da página aparece sem a senha certa; os dados
 * continuam protegidos no servidor (cada rota confere o header). A senha certa fica no navegador para a próxima visita.
 */
export function PortaoAdmin({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<Estado>("conferindo");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const campo = useRef<HTMLInputElement>(null);

  // Senha salva de uma visita anterior (ou ambiente local sem senha): entra direto se ainda valer.
  useEffect(() => {
    let vivo = true;
    confere(lerSalva())
      .then((ok) => vivo && setEstado(ok ? "aberto" : "fechado"))
      .catch(() => vivo && setEstado("fechado"));
    return () => {
      vivo = false;
    };
  }, []);

  useEffect(() => {
    if (estado === "fechado") campo.current?.focus();
  }, [estado]);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    if (!senha || enviando) return;
    setEnviando(true);
    setErro("");
    try {
      if (await confere(senha)) {
        try {
          localStorage.setItem(CHAVE_SENHA, senha);
        } catch {
          /* navegação privada: vale só nesta aba */
        }
        setEstado("aberto");
      } else {
        setErro("Senha incorreta. Confira e tente de novo.");
        // Mantém o texto selecionado: digitar de novo já substitui, sem apagar o que a pessoa começou.
        requestAnimationFrame(() => campo.current?.select());
      }
    } catch {
      setErro("Sem conexão. Tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  function sair() {
    try {
      localStorage.removeItem(CHAVE_SENHA);
    } catch {
      /* ignora */
    }
    setSenha("");
    setEstado("fechado");
  }

  if (estado === "aberto") {
    return (
      <>
        <div className="flex justify-end">
          <button type="button" onClick={sair} className="retranca min-h-11 px-2 text-tinta-3 hover:text-pauta focus-visible:outline-2 focus-visible:outline-pauta">
            Sair
          </button>
        </div>
        {children}
      </>
    );
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center py-10">
      {estado === "conferindo" ? (
        <p className="retranca text-tinta-3" role="status">
          Conferindo acesso
        </p>
      ) : (
        <form onSubmit={entrar} className="w-full max-w-sm">
          <p className="retranca text-pauta">Área interna do time</p>
          <h1 className="mt-2 font-serif text-4xl leading-tight">Senha do time</h1>
          <p className="mt-2 text-tinta-2">Digite a senha e aperte Enter.</p>
          <label htmlFor="senha-admin" className="sr-only">
            Senha do time
          </label>
          <input
            ref={campo}
            id="senha-admin"
            type="password"
            autoComplete="current-password"
            enterKeyHint="go"
            value={senha}
            onChange={(e) => {
              setSenha(e.target.value);
              if (erro) setErro("");
            }}
            aria-invalid={!!erro}
            aria-describedby={erro ? "senha-admin-erro" : undefined}
            className="mt-6 h-12 w-full border border-tinta/30 bg-white px-4 text-base outline-none focus:border-pauta"
          />
          {erro && (
            <p id="senha-admin-erro" role="alert" className="mt-2 text-sm text-pauta-escura">
              {erro}
            </p>
          )}
          <button
            type="submit"
            disabled={!senha || enviando}
            className="mt-4 h-12 w-full bg-tinta font-semibold text-papel transition-colors hover:bg-tinta-2 disabled:opacity-50"
          >
            {enviando ? "Conferindo" : "Entrar"}
          </button>
        </form>
      )}
    </div>
  );
}
