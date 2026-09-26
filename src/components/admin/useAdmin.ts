"use client";

import { useCallback, useEffect, useState } from "react";

const CHAVE = "socialai_admin_senha";

/** fetch com a senha de admin (guardada no navegador) no header. */
export function useAdmin() {
  const [senha, setSenhaState] = useState("");
  useEffect(() => {
    // Lido depois da hidratação para não divergir do HTML do servidor.
    let salva = "";
    try {
      salva = localStorage.getItem(CHAVE) ?? "";
    } catch {
      /* navegação privada */
    }
    if (salva) queueMicrotask(() => setSenhaState(salva));
  }, []);
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
