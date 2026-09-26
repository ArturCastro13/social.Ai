"use client";

import { useCallback, useEffect, useState } from "react";
import { AvisoTemporario, SenhaAdmin } from "@/components/admin/AdminShell";
import { useAdmin } from "@/components/admin/useAdmin";
import { JA_TENTOU, QUEM_CUIDA, type NumerosPitch } from "@/lib/entrevistas";
import type { Entrevista } from "@/lib/store";

const vazia = (): Entrevista => ({
  id: "",
  entrevistador: "",
  founder: "",
  startup: "",
  quem_cuida: null,
  horas_semana: null,
  ja_tentou: "",
  pagaria_mes: null,
  ultima_vez_sem_postar: "",
  dor_nota: null,
  quer_testar: false,
  contato: "",
  notas: "",
});

const fmt = (n: number | null, casas = 0) => (n === null ? "–" : n.toLocaleString("pt-BR", { maximumFractionDigits: casas }));
const campo = "h-12 w-full border border-tinta/25 bg-white px-3 text-base outline-none focus:border-pauta";

export function EntrevistasAdmin() {
  const { senha, setSenha, adminFetch } = useAdmin();
  const [dados, setDados] = useState<{ entrevistas: Entrevista[]; numeros: NumerosPitch; armazenamento: string } | null>(null);
  const [f, setF] = useState<Entrevista>(vazia);
  const [msg, setMsg] = useState("");
  const [salvando, setSalvando] = useState(false);

  const buscar = useCallback(async () => {
    const r = await adminFetch("/api/admin/entrevistas");
    return { ok: r.ok, d: await r.json() };
  }, [adminFetch]);

  useEffect(() => {
    let vivo = true;
    const carregar = () =>
      buscar().then(({ ok, d }) => {
        if (!vivo) return;
        if (ok) setDados(d);
        else setMsg(d.erro);
      });
    carregar();
    // Painel ao vivo: o time registra em vários celulares ao mesmo tempo.
    const t = setInterval(carregar, 15000);
    return () => {
      vivo = false;
      clearInterval(t);
    };
  }, [buscar]);

  useEffect(() => {
    try {
      const nome = localStorage.getItem("socialai_entrevistador");
      if (nome) queueMicrotask(() => setF((x) => ({ ...x, entrevistador: nome })));
    } catch {
      /* ignora */
    }
  }, []);

  const set = <K extends keyof Entrevista>(k: K, v: Entrevista[K]) => setF((x) => ({ ...x, [k]: v }));
  const tentou = new Set((f.ja_tentou ?? "").split(",").map((s) => s.trim()).filter(Boolean));

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setMsg("");
    const r = await adminFetch("/api/admin/entrevistas", { method: "POST", body: JSON.stringify({ ...f, id: f.id || undefined }) });
    const d = await r.json();
    setSalvando(false);
    if (!r.ok) {
      setMsg(`${d.erro} ${(d.detalhes ?? []).join(" · ")}`);
      return;
    }
    try {
      localStorage.setItem("socialai_entrevistador", f.entrevistador ?? "");
    } catch {
      /* ignora */
    }
    setDados(d);
    setF({ ...vazia(), entrevistador: f.entrevistador });
    setMsg("Entrevista salva. Próximo founder!");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function remover(id: string) {
    if (!window.confirm("Remover esta entrevista?")) return;
    const r = await adminFetch(`/api/admin/entrevistas?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (r.ok) setDados(await r.json());
  }

  const n = dados?.numeros;

  return (
    <div className="space-y-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-tinta-2">
          {dados ? `${dados.entrevistas.length} entrevistas registradas` : "Carregando..."}
          {dados && <span className="retranca ml-2 text-tinta-3">salvando em: {dados.armazenamento === "local" ? "arquivo local" : "Supabase"}</span>}
        </p>
        <SenhaAdmin senha={senha} setSenha={setSenha} />
      </div>

      <AvisoTemporario armazenamento={dados?.armazenamento ?? ""} />
      {msg && !dados && <p className="border-l-4 border-pauta bg-pauta/10 px-3 py-2 text-sm">{msg}</p>}

      {/* Números do pitch */}
      <section className="border-2 border-tinta bg-tinta p-5 text-papel sm:p-8">
        <p className="retranca text-limao">Números para o pitch · ao vivo</p>
        <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-8 lg:grid-cols-4">
          <Numero valor={fmt(n?.total ?? 0)} rotulo="founders ouvidos" meta="meta: 10" />
          <Numero valor={n?.pctSozinhos === null || !n ? "–" : `${n.pctSozinhos}%`} rotulo="cuidam do marketing sem ninguém dedicado" meta={n ? `${n.sozinhos} de ${n.total}` : ""} />
          <Numero valor={n?.mediaHoras == null ? "–" : `${fmt(n.mediaHoras, 1)}h`} rotulo="por semana, em média" />
          <Numero valor={n?.medianaPagaria == null ? "–" : `R$ ${fmt(n.medianaPagaria)}`} rotulo="pagariam por mês (mediana)" meta={n?.faixaPagaria ? `faixa R$ ${fmt(n.faixaPagaria[0])} a R$ ${fmt(n.faixaPagaria[1])}` : ""} />
          <Numero valor={n?.dorMedia == null ? "–" : fmt(n.dorMedia, 1)} rotulo="nota média de dor (1 a 5)" />
          <Numero valor={fmt(n?.pagariamAlgo ?? 0)} rotulo="pagariam alguma coisa" />
          <Numero valor={fmt(n?.querTestar ?? 0)} rotulo="quiseram testar na hora" />
          <Numero valor={fmt(n?.formulario.total ?? 0)} rotulo="respostas do formulário do site" meta={n?.formulario.total ? `${n.formulario.postariam} publicariam os posts` : ""} />
        </div>
        {n && Object.keys(n.jaTentou).length > 0 && (
          <div className="mt-8 border-t border-papel/15 pt-5">
            <p className="retranca text-papel/60">O que já tentaram</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {Object.entries(n.jaTentou)
                .sort((a, b) => b[1] - a[1])
                .map(([k, v]) => (
                  <span key={k} className="border border-papel/25 px-2 py-1 text-sm">
                    {k} <span className="font-mono text-limao">{v}</span>
                  </span>
                ))}
            </div>
          </div>
        )}
        {n && n.frases.length > 0 && (
          <div className="mt-8 border-t border-papel/15 pt-5">
            <p className="retranca text-papel/60">A última vez que deixaram de postar</p>
            <ul className="mt-3 space-y-3">
              {n.frases.slice(0, 5).map((fr, i) => (
                <li key={i} className="font-serif text-xl italic leading-snug">
                  “{fr.texto}” <span className="not-italic font-sans text-sm text-papel/50">· {fr.founder}{fr.startup ? `, ${fr.startup}` : ""}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Formulário */}
      <form onSubmit={salvar} className="prova space-y-6 border-2 border-tinta bg-white p-5 sm:p-8">
        <div className="flex items-center justify-between">
          <p className="retranca text-pauta">{f.id ? "Editando entrevista" : "Nova entrevista"}</p>
          {f.id && (
            <button type="button" onClick={() => setF({ ...vazia(), entrevistador: f.entrevistador })} className="retranca text-tinta-3">
              cancelar edição
            </button>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <input className={campo} placeholder="Seu nome (entrevistador)" value={f.entrevistador ?? ""} onChange={(e) => set("entrevistador", e.target.value)} />
          <input className={campo} placeholder="Nome do founder" value={f.founder ?? ""} onChange={(e) => set("founder", e.target.value)} />
          <input className={campo} placeholder="Startup" value={f.startup ?? ""} onChange={(e) => set("startup", e.target.value)} />
        </div>

        <Pergunta n={1} texto="Quem cuida do marketing hoje?">
          <Chips opcoes={QUEM_CUIDA} ativo={(o) => f.quem_cuida === o} onToggle={(o) => set("quem_cuida", f.quem_cuida === o ? null : o)} />
        </Pergunta>

        <Pergunta n={2} texto="Quantas horas por semana isso toma?">
          <div className="flex flex-wrap items-center gap-2">
            {[0, 1, 2, 4, 6, 10].map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => set("horas_semana", h)}
                className={`h-11 min-w-12 border px-3 font-mono text-sm ${f.horas_semana === h ? "border-tinta bg-tinta text-papel" : "border-tinta/25"}`}
              >
                {h}h
              </button>
            ))}
            <input
              inputMode="decimal"
              className="h-11 w-24 border border-tinta/25 px-3 font-mono"
              placeholder="outro"
              value={f.horas_semana ?? ""}
              onChange={(e) => set("horas_semana", e.target.value === "" ? null : Number(e.target.value.replace(",", ".")))}
            />
          </div>
        </Pergunta>

        <Pergunta n={3} texto="O que já tentou?">
          <Chips
            opcoes={JA_TENTOU}
            ativo={(o) => tentou.has(o)}
            onToggle={(o) => {
              const s = new Set(tentou);
              if (s.has(o)) s.delete(o);
              else s.add(o);
              set("ja_tentou", [...s].join(", "));
            }}
          />
        </Pergunta>

        <Pergunta n={4} texto="Quanto pagaria por mês? (o número que a pessoa disse)">
          <div className="flex items-center gap-2">
            <span className="font-mono">R$</span>
            <input
              inputMode="numeric"
              className={`${campo} max-w-40 font-mono`}
              placeholder="0"
              value={f.pagaria_mes ?? ""}
              onChange={(e) => set("pagaria_mes", e.target.value === "" ? null : Number(e.target.value.replace(/\D/g, "")))}
            />
          </div>
        </Pergunta>

        <Pergunta n={5} texto="Última vez que deixou de postar, e por quê? (as palavras da pessoa)">
          <textarea rows={3} className="w-full border border-tinta/25 p-3 text-base outline-none focus:border-pauta" value={f.ultima_vez_sem_postar ?? ""} onChange={(e) => set("ultima_vez_sem_postar", e.target.value)} />
        </Pergunta>

        <div className="grid gap-5 sm:grid-cols-2">
          <Pergunta n={6} texto="Nota de dor (1 a 5)">
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((d) => (
                <button key={d} type="button" onClick={() => set("dor_nota", d)} className={`h-11 w-11 border font-mono ${f.dor_nota === d ? "border-pauta bg-pauta text-white" : "border-tinta/25"}`}>
                  {d}
                </button>
              ))}
            </div>
          </Pergunta>
          <Pergunta n={7} texto="Quis testar na hora?">
            <button
              type="button"
              onClick={() => set("quer_testar", !f.quer_testar)}
              className={`h-11 border px-4 font-semibold ${f.quer_testar ? "border-salvia bg-salvia text-papel" : "border-tinta/25"}`}
            >
              {f.quer_testar ? "Sim, quis testar ✓" : "Não / não perguntei"}
            </button>
          </Pergunta>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <input className={campo} placeholder="Contato (e-mail ou @), se topou" value={f.contato ?? ""} onChange={(e) => set("contato", e.target.value)} />
          <input className={campo} placeholder="Notas" value={f.notas ?? ""} onChange={(e) => set("notas", e.target.value)} />
        </div>
        {msg && <p className="border-l-4 border-salvia bg-salvia/10 px-3 py-2 text-sm">{msg}</p>}
        <button disabled={salvando} className="h-14 w-full bg-pauta text-lg font-bold text-white transition hover:bg-pauta-escura disabled:opacity-60">
          {salvando ? "Salvando..." : f.id ? "Salvar alterações" : "Salvar entrevista"}
        </button>
      </form>

      {/* Lista */}
      <section>
        <p className="retranca text-tinta-3">Registradas</p>
        <ul className="mt-3 divide-y divide-tinta/10 border-y border-tinta/10">
          {dados?.entrevistas.map((e) => (
            <li key={e.id} className="flex items-start justify-between gap-4 py-3">
              <button type="button" className="text-left" onClick={() => setF(e)}>
                <p className="font-semibold">
                  {e.founder || "Sem nome"} {e.startup && <span className="font-normal text-tinta-2">· {e.startup}</span>}
                </p>
                <p className="text-sm text-tinta-2">
                  {e.quem_cuida ?? "?"} · {e.horas_semana ?? "?"}h/sem · R$ {e.pagaria_mes ?? "?"} · dor {e.dor_nota ?? "?"}
                  {e.entrevistador ? ` · por ${e.entrevistador}` : ""}
                </p>
              </button>
              <button type="button" onClick={() => remover(e.id)} className="retranca shrink-0 text-tinta-3 hover:text-pauta">
                remover
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Numero({ valor, rotulo, meta }: { valor: string; rotulo: string; meta?: string }) {
  return (
    <div>
      <p className="font-serif text-5xl leading-none sm:text-6xl">{valor}</p>
      <p className="mt-2 text-sm leading-snug text-papel/75">{rotulo}</p>
      {meta ? <p className="retranca mt-1 text-[0.6rem] text-papel/45">{meta}</p> : null}
    </div>
  );
}

function Pergunta({ n, texto, children }: { n: number; texto: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-2 font-semibold">
        <span className="mr-2 font-mono text-sm text-pauta">{n}</span>
        {texto}
      </legend>
      {children}
    </fieldset>
  );
}

function Chips({ opcoes, ativo, onToggle }: { opcoes: readonly string[]; ativo: (o: string) => boolean; onToggle: (o: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {opcoes.map((o) => (
        <button
          key={o}
          type="button"
          aria-pressed={ativo(o)}
          onClick={() => onToggle(o)}
          className={`h-11 border px-3 text-sm transition ${ativo(o) ? "border-tinta bg-tinta text-papel" : "border-tinta/25 hover:border-tinta"}`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}
