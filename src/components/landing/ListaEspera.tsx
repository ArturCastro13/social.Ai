"use client";

import { useEffect, useState } from "react";

export function ListaEspera({ planos }: { planos: string[] }) {
  const [email, setEmail] = useState("");
  const [plano, setPlano] = useState(planos[1] ?? planos[0]);
  const [estado, setEstado] = useState<"livre" | "enviando" | "ok" | "erro">("livre");

  // Os botões dos cartões de plano avisam qual foi escolhido.
  useEffect(() => {
    const ler = (e: Event) => setPlano((e as CustomEvent<string>).detail);
    window.addEventListener("escolher-plano", ler);
    return () => window.removeEventListener("escolher-plano", ler);
  }, []);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setEstado("enviando");
    const r = await fetch("/api/leads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, plano, origem: "lista-espera" }),
    }).catch(() => null);
    setEstado(r?.ok ? "ok" : "erro");
  }

  if (estado === "ok") {
    return (
      <div className="border-2 border-tinta bg-limao p-6 sm:p-8">
        <p className="font-serif text-3xl leading-tight">Você está na lista do plano {plano}. A gente avisa quando abrir.</p>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="grid gap-4 border-2 border-dashed border-tinta/40 p-5 sm:grid-cols-[1fr_auto_auto] sm:items-end sm:p-6">
      <label className="block">
        <span className="retranca text-tinta-3">Seu e-mail</span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="voce@suastartup.com.br"
          className="mt-1 h-12 w-full border-2 border-tinta bg-white px-4 outline-none focus:border-pauta"
        />
      </label>
      <label className="block">
        <span className="retranca text-tinta-3">Plano</span>
        <select value={plano} onChange={(e) => setPlano(e.target.value)} className="mt-1 h-12 w-full border-2 border-tinta bg-white px-3 sm:w-40">
          {planos.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
      </label>
      <button disabled={estado === "enviando"} className="h-12 bg-tinta px-6 font-bold text-papel transition hover:bg-pauta disabled:opacity-60">
        {estado === "enviando" ? "Enviando..." : "Quero entrar"}
      </button>
      {estado === "erro" && <p className="text-sm text-pauta-escura sm:col-span-3">Não deu certo agora. Tenta de novo?</p>}
    </form>
  );
}

export function BotaoPlano({ plano, className, children }: { plano: string; className: string; children: React.ReactNode }) {
  return (
    <a
      href="#lista-espera"
      onClick={() => window.dispatchEvent(new CustomEvent("escolher-plano", { detail: plano }))}
      className={className}
    >
      {children}
    </a>
  );
}
