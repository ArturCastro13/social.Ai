"use client";

import type { ReactNode } from "react";
import { detectarRede, REDES_ARROBA, type RedeArroba } from "@/lib/client/onboarding";

/** Chip clicável que liga e desliga. Mesmo desenho dos botões de quantidade do formulário. */
export function Chip({
  ativo,
  onClick,
  children,
  disabled,
  titulo,
}: {
  ativo: boolean;
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
  titulo?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      disabled={disabled}
      title={titulo}
      className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-4 py-1.5 text-left text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pauta disabled:cursor-not-allowed disabled:opacity-40 ${
        ativo ? "border-tinta bg-tinta text-papel" : "border-tinta/20 bg-white text-tinta-2 hover:border-tinta hover:text-tinta"
      }`}
    >
      {children}
    </button>
  );
}

/** Campo de @ que aceita Instagram, LinkedIn ou X. Se colar o link, a rede é detectada; se for só o @, vale o seletor. */
export function CampoArroba({
  id,
  rotulo,
  valor,
  rede,
  onChange,
  placeholder = "@suamarca ou link do perfil",
}: {
  id: string;
  rotulo: string;
  valor: string;
  rede: RedeArroba;
  onChange: (valor: string, rede: RedeArroba) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-sm text-tinta-2">
        {rotulo} <span className="text-tinta-3">(opcional)</span>
      </label>
      <div className="mt-1 flex h-11 w-full min-w-0 items-center rounded-full border border-tinta/20 bg-white transition-colors focus-within:border-tinta">
        <input
          id={id}
          value={valor}
          onChange={(e) => onChange(e.target.value, detectarRede(e.target.value) ?? rede)}
          placeholder={placeholder}
          autoCapitalize="none"
          autoComplete="off"
          spellCheck={false}
          className="h-full min-w-0 flex-1 rounded-l-full bg-transparent pl-4 text-base outline-none focus-visible:outline-none"
        />
        <select
          value={rede}
          onChange={(e) => onChange(valor, e.target.value as RedeArroba)}
          aria-label={`Rede do ${rotulo.toLowerCase()}`}
          className="h-full shrink-0 rounded-r-full border-l border-tinta/10 bg-transparent pl-2 pr-3 text-sm text-tinta-2 focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-pauta"
        >
          {REDES_ARROBA.map((r) => (
            <option key={r.id} value={r.id}>
              {r.nome}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

/** Botão de gravar voz de um campo. Mostra o relógio enquanto grava. */
export function BotaoGravar({
  gravando,
  relogio,
  temTexto,
  onClick,
  rotulo,
}: {
  gravando: boolean;
  relogio: string;
  temTexto: boolean;
  onClick: () => void;
  /** Nome do campo, para leitor de tela. */
  rotulo: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={gravando}
      aria-label={gravando ? `Parar de gravar ${rotulo}` : `Gravar ${rotulo}`}
      className={`inline-flex h-9 shrink-0 items-center gap-2 rounded-full px-3.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pauta ${
        gravando ? "bg-tinta text-papel" : "border border-tinta/20 bg-white hover:border-tinta"
      }`}
    >
      <span className={`h-2.5 w-2.5 rounded-full bg-pauta ${gravando ? "animate-pisca" : ""}`} aria-hidden />
      {gravando ? `Parar ${relogio}` : temTexto ? "Gravar mais" : "Gravar"}
    </button>
  );
}
