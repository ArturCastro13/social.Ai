"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { SenhaAdmin } from "@/components/admin/AdminShell";
import { useAdmin } from "@/components/admin/useAdmin";
import { NICHOS, type Nicho, type PadraoViral, type ViralItem } from "@/lib/types";

const FORMATOS = ["carrossel", "imagem-unica", "print-tweet", "citacao", "lista", "antes-depois", "dado-impacto", "bastidor-founder"];
const GANCHOS = ["numero", "contraintuitivo", "pergunta", "historia-pessoal", "erro-comum", "promessa", "polemica", "prova-social", "curiosidade"];
const REDES = ["linkedin", "instagram", "x", "facebook"];

const vazio = (nicho: Nicho, n: number): ViralItem => ({
  id: `${nicho}-${String(n).padStart(2, "0")}`,
  nicho,
  rede: "linkedin",
  formato: "carrossel",
  tipo_gancho: "numero",
  texto_gancho: "",
  estrutura: ["Slide 1: ", "Slide 2: ", "Slide 3: "],
  padrao_visual: { fundo: "", contraste: "alto", densidade_texto: "media", uso_rosto: false },
  por_que_funciona: "",
  autor_ou_marca: null,
  link_fonte: null,
  metricas: { curtidas: null, comentarios: null, compartilhamentos: null, visualizacoes: null, observacao: "a preencher pelo time" },
  status: "a verificar",
});

const nomeNicho = (n: string) => NICHOS.find((x) => x.id === n)?.nome ?? n;
const campo =
  "w-full border border-tinta/20 bg-papel px-3 py-2 text-sm outline-none transition focus:border-pauta focus:bg-white";

export function ViraisAdmin() {
  const { senha, setSenha, adminFetch } = useAdmin();
  const [itens, setItens] = useState<ViralItem[]>([]);
  const [catalogo, setCatalogo] = useState<PadraoViral[]>([]);
  const [armazenamento, setArmazenamento] = useState("");
  const [filtroNicho, setFiltroNicho] = useState<string>("todos");
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [editando, setEditando] = useState<ViralItem | null>(null);
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [carregando, setCarregando] = useState(true);

  const buscar = useCallback(async () => {
    const r = await adminFetch("/api/admin/virais");
    return { ok: r.ok, d: await r.json() };
  }, [adminFetch]);

  const aplicar = useCallback(({ ok, d }: { ok: boolean; d: { erro?: string; itens: ViralItem[]; catalogo: PadraoViral[]; armazenamento: string } }) => {
    if (!ok) setMsg({ tipo: "erro", texto: d.erro ?? "Erro ao carregar." });
    else {
      setItens(d.itens);
      setCatalogo(d.catalogo);
      setArmazenamento(d.armazenamento);
    }
    setCarregando(false);
  }, []);

  const carregar = useCallback(async () => aplicar(await buscar()), [aplicar, buscar]);

  useEffect(() => {
    let vivo = true;
    buscar().then((res) => vivo && aplicar(res));
    return () => {
      vivo = false;
    };
  }, [buscar, aplicar]);

  const filtrados = useMemo(
    () =>
      itens.filter(
        (i) => (filtroNicho === "todos" || i.nicho === filtroNicho) && (filtroStatus === "todos" || i.status === filtroStatus),
      ),
    [itens, filtroNicho, filtroStatus],
  );

  const verificados = itens.filter((i) => i.status === "verificado").length;

  async function salvar(item: ViralItem) {
    setMsg(null);
    const r = await adminFetch("/api/admin/virais", { method: "POST", body: JSON.stringify(item) });
    const d = await r.json();
    if (!r.ok) {
      setMsg({ tipo: "erro", texto: `${d.erro} ${(d.detalhes ?? []).join(" · ")}` });
      return false;
    }
    setMsg({ tipo: "ok", texto: `Salvo em ${d.destino}.` });
    await carregar();
    return true;
  }

  function novo() {
    const nicho = (filtroNicho !== "todos" ? filtroNicho : "saas-b2b") as Nicho;
    const n = itens.filter((i) => i.nicho === nicho).length + 1;
    setEditando(vazio(nicho, n));
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
      <section>
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-tinta/15 pb-4">
          <div className="flex flex-wrap gap-2">
            {["todos", ...NICHOS.map((n) => n.id)].map((n) => (
              <button
                key={n}
                onClick={() => setFiltroNicho(n)}
                className={`retranca border px-3 py-1.5 transition ${filtroNicho === n ? "border-tinta bg-tinta text-papel" : "border-tinta/20 hover:border-tinta"}`}
              >
                {n === "todos" ? "Todos" : nomeNicho(n)}
              </button>
            ))}
          </div>
          <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} className="retranca border border-tinta/20 bg-papel px-2 py-1.5">
            <option value="todos">Qualquer status</option>
            <option value="a verificar">A verificar</option>
            <option value="verificado">Verificado</option>
          </select>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-tinta-2">
            {carregando ? "Carregando..." : `${filtrados.length} de ${itens.length} itens. ${verificados} verificados no total.`}
            {armazenamento && <span className="retranca ml-2 text-tinta-3">salvando em: {armazenamento === "local" ? "arquivo do repositório" : "Supabase"}</span>}
          </p>
          <div className="flex items-center gap-4">
            <SenhaAdmin senha={senha} setSenha={setSenha} />
            <button onClick={novo} className="bg-pauta px-4 py-2 text-sm font-semibold text-papel transition hover:bg-pauta-escura">
              + Novo item
            </button>
          </div>
        </div>

        {msg && (
          <p className={`mt-4 border-l-4 px-3 py-2 text-sm ${msg.tipo === "ok" ? "border-salvia bg-salvia/10" : "border-pauta bg-pauta/10"}`}>{msg.texto}</p>
        )}

        <ul className="mt-6 divide-y divide-tinta/10 border-y border-tinta/10">
          {filtrados.map((i) => (
            <li key={i.id} className="group grid gap-2 py-4 sm:grid-cols-[1fr_auto] sm:items-start">
              <button onClick={() => setEditando(i)} className="text-left">
                <p className="retranca text-tinta-3">
                  {i.id} · {nomeNicho(i.nicho)} · {i.rede} · {i.formato} · {i.tipo_gancho}
                </p>
                <p className="mt-1 font-medium leading-snug group-hover:text-pauta">{i.texto_gancho}</p>
                <p className="mt-1 text-xs text-tinta-3">
                  {i.autor_ou_marca ?? "padrão sem autor"}
                  {i.metricas.curtidas !== null && ` · ${i.metricas.curtidas.toLocaleString("pt-BR")} reações`}
                  {i.link_fonte ? "" : " · sem fonte"}
                </p>
              </button>
              <div className="flex items-center gap-2">
                {i.link_fonte && (
                  <a href={i.link_fonte} target="_blank" rel="noreferrer" className="retranca text-tinta-3 underline-offset-4 hover:text-pauta hover:underline">
                    fonte ↗
                  </a>
                )}
                {i.status === "verificado" ? (
                  <span className="retranca bg-salvia px-2 py-1 text-papel">verificado</span>
                ) : (
                  <button
                    onClick={() => (i.link_fonte ? salvar({ ...i, status: "verificado" }) : setEditando(i))}
                    title={i.link_fonte ? "Abri a fonte e ela confirma" : "Precisa de link da fonte antes"}
                    className="retranca border border-dashed border-tinta/40 px-2 py-1 hover:border-salvia hover:text-salvia"
                  >
                    a verificar
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <aside className="lg:sticky lg:top-20 lg:self-start">
        {editando ? (
          <Editor key={editando.id} item={editando} onCancelar={() => setEditando(null)} onSalvar={async (it) => (await salvar(it)) && setEditando(null)} />
        ) : (
          <div className="prova border border-tinta/15 bg-papel-2 p-5">
            <p className="retranca text-pauta">Catálogo de padrões</p>
            <p className="mt-1 text-sm text-tinta-2">É isto que o motor usa. Recalcula sozinho a cada item salvo.</p>
            <ol className="mt-4 space-y-3">
              {catalogo.slice(0, 12).map((p) => (
                <li key={p.id} className="flex items-baseline justify-between gap-3 text-sm">
                  <span>{p.nome}</span>
                  <span className="font-mono text-xs text-tinta-3">{p.frequencia}×</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </aside>
    </div>
  );
}

function Editor({ item, onCancelar, onSalvar }: { item: ViralItem; onCancelar: () => void; onSalvar: (i: ViralItem) => void }) {
  const [v, setV] = useState<ViralItem>(item);
  const set = <K extends keyof ViralItem>(k: K, val: ViralItem[K]) => setV((x) => ({ ...x, [k]: val }));
  const numOuNull = (s: string) => (s.trim() === "" ? null : Math.max(0, Math.round(Number(s.replace(/\D/g, "")))));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSalvar({ ...v, estrutura: v.estrutura.filter((s) => s.trim()) });
      }}
      className="prova space-y-3 border border-tinta bg-white p-5 shadow-[6px_6px_0_var(--color-tinta)]"
    >
      <div className="flex items-center justify-between">
        <p className="retranca text-pauta">{v.id}</p>
        <button type="button" onClick={onCancelar} className="retranca text-tinta-3 hover:text-tinta">fechar ✕</button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <select className={campo} value={v.nicho} onChange={(e) => set("nicho", e.target.value as Nicho)}>
          {NICHOS.map((n) => <option key={n.id} value={n.id}>{n.nome}</option>)}
        </select>
        <select className={campo} value={v.rede} onChange={(e) => set("rede", e.target.value as ViralItem["rede"])}>
          {REDES.map((n) => <option key={n}>{n}</option>)}
        </select>
        <select className={campo} value={v.formato} onChange={(e) => set("formato", e.target.value as ViralItem["formato"])}>
          {FORMATOS.map((n) => <option key={n}>{n}</option>)}
        </select>
        <select className={campo} value={v.tipo_gancho} onChange={(e) => set("tipo_gancho", e.target.value as ViralItem["tipo_gancho"])}>
          {GANCHOS.map((n) => <option key={n}>{n}</option>)}
        </select>
      </div>
      <textarea className={campo} rows={2} placeholder="Texto do gancho" value={v.texto_gancho} onChange={(e) => set("texto_gancho", e.target.value)} required />
      <textarea
        className={campo}
        rows={4}
        placeholder="Estrutura, um slide por linha"
        value={v.estrutura.join("\n")}
        onChange={(e) => set("estrutura", e.target.value.split("\n"))}
      />
      <textarea className={campo} rows={2} placeholder="Por que funciona" value={v.por_que_funciona} onChange={(e) => set("por_que_funciona", e.target.value)} />
      <input className={campo} placeholder="Autor ou marca (vazio se for padrão)" value={v.autor_ou_marca ?? ""} onChange={(e) => set("autor_ou_marca", e.target.value || null)} />
      <input className={campo} placeholder="Link da fonte (https://...)" value={v.link_fonte ?? ""} onChange={(e) => set("link_fonte", e.target.value || null)} />
      <input
        className={campo}
        placeholder="Fundo e visual (ex.: fundo escuro, texto branco)"
        value={v.padrao_visual.fundo}
        onChange={(e) => set("padrao_visual", { ...v.padrao_visual, fundo: e.target.value })}
      />
      <fieldset className="border border-dashed border-tinta/30 p-3">
        <legend className="retranca px-1 text-tinta-3">Métricas só se você viu o número</legend>
        <div className="grid grid-cols-2 gap-2">
          {(["curtidas", "comentarios", "compartilhamentos", "visualizacoes"] as const).map((k) => (
            <input
              key={k}
              className={campo}
              inputMode="numeric"
              placeholder={k}
              value={v.metricas[k] ?? ""}
              onChange={(e) => set("metricas", { ...v.metricas, [k]: numOuNull(e.target.value) })}
            />
          ))}
        </div>
        <input
          className={`${campo} mt-2`}
          placeholder="Onde leu o número e quando"
          value={v.metricas.observacao}
          onChange={(e) => set("metricas", { ...v.metricas, observacao: e.target.value })}
        />
      </fieldset>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={v.status === "verificado"} onChange={(e) => set("status", e.target.checked ? "verificado" : "a verificar")} />
        Abri a fonte e ela confirma o gancho e o formato
      </label>
      <button className="w-full bg-tinta py-3 font-semibold text-papel transition hover:bg-pauta">Salvar item</button>
    </form>
  );
}
