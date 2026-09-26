"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAdmin } from "@/components/admin/useAdmin";
import { dataArquivo, montarCsv } from "@/lib/csv";
import { COLUNAS_CSV, filtrarEspera, resumirEspera, type InscricaoEspera } from "@/lib/lista-espera";

type Dados = { itens: InscricaoEspera[]; total: number; persistente: boolean };

const quando = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
};

export function ListaEsperaAdmin() {
  const { adminFetch } = useAdmin();
  const [dados, setDados] = useState<Dados | null>(null);
  const [msg, setMsg] = useState("");
  const [busca, setBusca] = useState("");

  const buscar = useCallback(async () => {
    const r = await adminFetch("/api/admin/lista-de-espera");
    return { ok: r.ok, d: await r.json() };
  }, [adminFetch]);

  useEffect(() => {
    let vivo = true;
    const carregar = () =>
      buscar()
        .then(({ ok, d }) => {
          if (!vivo) return;
          if (ok) {
            setDados(d);
            setMsg("");
          } else setMsg(d.erro);
        })
        .catch(() => vivo && setMsg("Sem conexão. Tentando de novo em 30 segundos."));
    carregar();
    // Painel ao vivo: novas inscrições aparecem sem recarregar a página.
    const t = setInterval(carregar, 30000);
    return () => {
      vivo = false;
      clearInterval(t);
    };
  }, [buscar]);

  const itens = useMemo(() => dados?.itens ?? [], [dados]);
  const r = useMemo(() => resumirEspera(itens), [itens]);
  const visiveis = useMemo(() => filtrarEspera(itens, busca), [itens, busca]);

  function baixarCsv() {
    const csv = montarCsv(COLUNAS_CSV, itens);
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `lista-de-espera-${dataArquivo(new Date())}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-tinta-2">{dados ? `${dados.total} inscrições` : msg ? "" : "Carregando..."}</p>
      </div>

      {dados && !dados.persistente && (
        <p className="border border-pauta/40 bg-pauta/5 px-3 py-2 text-sm">
          Sem banco configurado. Nada aqui fica salvo em produção. Enquanto isso, o formulário da lista recusa inscrições. Veja WAITLIST.md para ligar o Supabase.
        </p>
      )}
      {msg && <p className="border border-pauta/40 bg-pauta/5 px-3 py-2 text-sm">{msg}</p>}

      <section className="border-2 border-tinta bg-tinta p-5 text-papel sm:p-8">
        <p className="retranca text-limao">Inscrições · ao vivo</p>
        <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-8 lg:grid-cols-4">
          <Numero valor={r.total} rotulo="no total" />
          <Numero valor={r.hoje} rotulo="hoje" />
          <Numero valor={r.semana} rotulo="nos últimos 7 dias" />
          <Numero valor={r.duplicadas} rotulo="repetidas pelo e-mail" meta={`${r.emailsUnicos} e-mails diferentes`} />
        </div>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por empresa ou e-mail"
          aria-label="Buscar por empresa ou e-mail"
          className="h-12 w-full border border-tinta/25 bg-white px-3 text-base outline-none focus:border-pauta sm:max-w-md"
        />
        <button
          type="button"
          onClick={baixarCsv}
          disabled={itens.length === 0}
          className="h-12 shrink-0 bg-pauta px-5 font-bold text-white transition hover:bg-pauta-escura disabled:opacity-50 sm:ml-auto"
        >
          Baixar CSV
        </button>
      </div>
      {busca.trim() && (
        <p className="-mt-5 text-sm text-tinta-3">
          {visiveis.length} de {itens.length}. O CSV sai com a lista inteira.
        </p>
      )}

      {dados && visiveis.length === 0 && (
        <p className="border-y border-tinta/10 py-6 text-tinta-2">{itens.length === 0 ? "Ninguém se inscreveu ainda." : "Nada encontrado com essa busca."}</p>
      )}

      {visiveis.length > 0 && (
        <>
          {/* Celular: cartões */}
          <ul className="divide-y divide-tinta/10 border-y border-tinta/10 sm:hidden">
            {visiveis.map((i, n) => (
              <li key={`${i.email}-${i.criado_em}-${n}`} className="py-3">
                <p className="font-semibold break-words">{i.empresa || "Sem nome"}</p>
                <p className="break-all font-mono text-sm">{i.email}</p>
                <p className="mt-1 text-sm text-tinta-3">
                  {quando(i.criado_em)}
                  {r.repetidos.has(i.email.trim().toLowerCase()) && <Repetido />}
                </p>
              </li>
            ))}
          </ul>
          {/* Telas largas: tabela */}
          <table className="hidden w-full border-collapse text-left sm:table">
            <thead>
              <tr className="retranca border-b-2 border-tinta text-tinta-3">
                <th className="py-2 pr-4 font-normal">Empresa</th>
                <th className="py-2 pr-4 font-normal">E-mail</th>
                <th className="py-2 font-normal">Inscrição</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-tinta/10">
              {visiveis.map((i, n) => (
                <tr key={`${i.email}-${i.criado_em}-${n}`}>
                  <td className="py-3 pr-4 font-semibold">{i.empresa || "Sem nome"}</td>
                  <td className="break-all py-3 pr-4 font-mono text-sm">
                    {i.email}
                    {r.repetidos.has(i.email.trim().toLowerCase()) && <Repetido />}
                  </td>
                  <td className="whitespace-nowrap py-3 text-sm text-tinta-2">{quando(i.criado_em)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

function Repetido() {
  return <span className="retranca ml-2 border border-pauta/40 px-1 text-[0.6rem] text-pauta">repetido</span>;
}

function Numero({ valor, rotulo, meta }: { valor: number; rotulo: string; meta?: string }) {
  return (
    <div>
      <p className="font-serif text-5xl leading-none sm:text-6xl">{valor.toLocaleString("pt-BR")}</p>
      <p className="mt-2 text-sm leading-snug text-papel/75">{rotulo}</p>
      {meta ? <p className="retranca mt-1 text-[0.6rem] text-papel/45">{meta}</p> : null}
    </div>
  );
}
