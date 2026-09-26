"use client";
import React, { useEffect, useId, useRef, useState } from "react";
import { contextoConfirmadoSchema, entendimentoSchema, type ContextoConfirmado, type Entendimento } from "@/lib/contexto/contrato";
import { resumoManual, type EntradaEntendimento } from "@/lib/contexto/base";
import { NICHOS } from "@/lib/types";
import { BOTAO_CONTEXTO, CAMPO_CONTEXTO } from "./MateriaisEmpresa";

export function ResumoNegocio({ entrada, revisao, chaveEntrada, pendente, confirmado, onInvalidar, onConfirmar }: {
  entrada: EntradaEntendimento; revisao: number; chaveEntrada: string; pendente: boolean; confirmado: boolean;
  onInvalidar: () => void; onConfirmar: (c: ContextoConfirmado) => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState<Entendimento>(() => resumoManual(entrada));
  const [editou, setEditou] = useState(false), [ocupado, setOcupado] = useState(false), [erro, setErro] = useState("");
  const [baseChave, setBaseChave] = useState(chaveEntrada);
  const [paleta, setPaleta] = useState({ primaria: entrada.brand.paleta.primaria, secundaria: entrada.brand.paleta.secundaria, destaque: entrada.brand.paleta.destaque });
  const [paletaAplicada, setPaletaAplicada] = useState("");
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => { controller.current?.abort(); }, [chaveEntrada]);
  const cores = entrada.materiais.flatMap(m => m.cores.map(c => ({ ...c, nome: m.nome })));
  const chaveCores = JSON.stringify(cores);
  function editar(update: Partial<Entendimento>) {
    controller.current?.abort(); setDraft(v => ({ ...v, ...update, fonte: "manual", evidencias: [] })); setEditou(true); onInvalidar();
  }
  async function analisar() {
    controller.current?.abort(); const ctrl = new AbortController(); controller.current = ctrl;
    setOcupado(true); setErro(""); onInvalidar();
    const timer = setTimeout(() => ctrl.abort(), 55_000);
    try {
      const res = await fetch("/api/contexto", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...entrada, ...(editou ? { descricaoManual: draft.negocio, publico: draft.publico } : {}) }), signal: ctrl.signal });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro || "Não consegui analisar. Você pode revisar manualmente.");
      if (ctrl.signal.aborted) return;
      setDraft(entendimentoSchema.parse(data.entendimento)); setBaseChave(chaveEntrada); setEditou(false);
    } catch (e) {
      if (!ctrl.signal.aborted) setErro(e instanceof Error ? e.message : "Revise manualmente ou tente novamente.");
    } finally { clearTimeout(timer); if (controller.current === ctrl) setOcupado(false); }
  }
  function confirmar() {
    if (pendente || ocupado) return;
    const c = contextoConfirmadoSchema.safeParse({ versao: 1, empresa: entrada.brand.dominio, revisao, entendimento: draft, materiais: entrada.materiais, ...(paletaAplicada === chaveCores && cores.length ? { paleta } : {}) });
    if (!c.success) { setErro(c.error.issues[0]?.message || "Revise o contexto antes de confirmar."); return; }
    setErro(""); setBaseChave(chaveEntrada); onConfirmar(c.data);
  }
  return <section id="contexto-empresa" aria-labelledby={`${id}-titulo`} className="min-w-0 scroll-mt-24">
    <h2 id={`${id}-titulo`} className="font-display text-lg font-semibold tracking-[-0.01em]">Antes dos concorrentes, confira o seu negócio</h2>
    <p className="mt-1 text-sm text-tinta-3">Juntamos site, suas respostas e materiais. Você confirma o contexto que vai orientar os posts.</p>
    <p role="status" className="mt-3 text-sm text-tinta-2">{confirmado ? "Contexto confirmado. As próximas sugestões usam estes dados." : draft.fonte === "ia" ? "Resumo feito com IA. Confira antes de confirmar." : "Revisão manual. Este resumo ainda não foi analisado por IA."}</p>
    {baseChave !== chaveEntrada && <p className="mt-2 text-sm text-pauta-escura">Os dados mudaram. Suas edições foram mantidas; analise novamente ou revise e confirme.</p>}
    <div className="mt-3 space-y-3">
      <label className="block text-sm">O que a empresa faz<textarea className={`mt-1 ${CAMPO_CONTEXTO}`} rows={3} maxLength={1200} value={draft.negocio} onChange={e => editar({ negocio: e.target.value })} /></label>
      <label className="block text-sm">Mercado ou segmento<input className={`mt-1 ${CAMPO_CONTEXTO}`} maxLength={200} value={draft.segmento} onChange={e => editar({ segmento: e.target.value })} placeholder="Ex.: preparação para avaliações de inglês" /></label>
      <label className="block text-sm">Público confirmado<input className={`mt-1 ${CAMPO_CONTEXTO}`} maxLength={300} value={draft.publico} onChange={e => editar({ publico: e.target.value })} /></label>
      <label className="block text-sm">Categoria de referência<select className={`mt-1 ${CAMPO_CONTEXTO}`} value={draft.nicho} onChange={e => editar({ nicho: e.target.value as Entendimento["nicho"] })}><option value="outro">Outro / ainda não definido</option>{NICHOS.map(n => <option key={n.id} value={n.id}>{n.nome}</option>)}</select></label>
    </div>
    {draft.duvidas.length > 0 && <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-tinta-3">{draft.duvidas.map((d, i) => <li key={i}>{d}</li>)}</ul>}
    {draft.evidencias.length > 0 && <details className="mt-3 text-sm"><summary className="min-h-10 cursor-pointer py-2 underline">Ver fontes do resumo</summary>{draft.evidencias.map((e, i) => <p key={i} className="mt-2 break-words"><strong>{entrada.materiais.find(m => m.id === e.fonte)?.nome ?? e.fonte}:</strong> {e.trecho}</p>)}</details>}
    {cores.length > 0 && <div className="mt-4 space-y-3 border-t border-tinta/10 pt-4"><p className="text-sm font-medium">Cores dos materiais</p><p className="text-xs text-tinta-3">Escolha quais usar nos posts. “Estimada” é uma aproximação visual, não um código declarado.</p>
      {(["primaria", "secundaria", "destaque"] as const).map(k => <label key={k} className="block text-sm">{k === "primaria" ? "Cor principal" : k === "secundaria" ? "Cor secundária" : "Cor de destaque"}<select className={`mt-1 ${CAMPO_CONTEXTO}`} value={paleta[k]} onChange={e => { setPaleta(v => ({ ...v, [k]: e.target.value })); setPaletaAplicada(""); onInvalidar(); }}><option value={entrada.brand.paleta[k]}>Manter {entrada.brand.paleta[k]}</option>{cores.filter((c, i) => cores.findIndex(x => x.hex === c.hex) === i && c.hex !== entrada.brand.paleta[k]).map(c => <option key={c.hex} value={c.hex}>{c.hex} · {c.origem} · {c.nome}</option>)}</select></label>)}
      <button type="button" className={BOTAO_CONTEXTO} onClick={() => { setPaletaAplicada(chaveCores); onInvalidar(); }}>Usar estas cores nos posts</button>
      {paletaAplicada === chaveCores && <p className="text-sm text-tinta-2">Cores escolhidas. Confirme o contexto para aplicar.</p>}
    </div>}
    {erro && <p role="alert" className="mt-3 text-sm text-pauta-escura">{erro}</p>}
    {pendente && <p role="status" className="mt-3 text-sm text-tinta-3">Aguarde a leitura ou remova o material em andamento para continuar.</p>}
    <div className="mt-4 flex flex-wrap gap-2">
      <button type="button" className={BOTAO_CONTEXTO} disabled={pendente || ocupado} onClick={analisar}>{ocupado ? "Analisando contexto…" : "Analisar contexto com IA"}</button>
      <button type="button" className={BOTAO_CONTEXTO} disabled={pendente || ocupado || !draft.negocio.trim()} onClick={confirmar}>Confirmar contexto e buscar concorrentes</button>
    </div>
  </section>;
}
