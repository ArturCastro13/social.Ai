"use client";

import { useCallback, useState } from "react";

export const CHAVE_SENHA = "socialai_admin_senha";
const CHAVE = CHAVE_SENHA;

/** fetch com a senha de admin (guardada no navegador) no header. */
export function useAdmin() {
  // As páginas do admin só montam depois da tela de senha, que roda no navegador: dá para ler a senha salva
  // já no primeiro render, sem uma primeira busca com senha vazia.
  const [senha, setSenhaState] = useState(() => {
    if (typeof window === "undefined") return "";
    try {
      return localStorage.getItem(CHAVE) ?? "";
    } catch {
      return "";
    }
  });
  const setSenha = (s: string) => {
    setSenhaState(s);
    try {
      localStorage.setItem(CHAVE, s);
    } catch {
      /* ignora */
    }
  };
  const adminFetch = useCallback(
    (url: string, init: RequestInit = {}) =>
      fetch(url, {
        ...init,
        headers: { "content-type": "application/json", "x-admin-password": senha, ...(init.headers ?? {}) },
      }),
    [senha],
  );
  return { senha, setSenha, adminFetch };
}
