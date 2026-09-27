"use client";
import React, { useEffect, useId, useReducer, useRef, useState } from "react";
import { materialSchema, MAX_MATERIAIS, type Material, type OrigemMaterial } from "@/lib/contexto/contrato";
import { reduzirMateriais } from "@/lib/client/materiais";

type Entrada = File | { nome: string; origem: Exclude<OrigemMaterial, "arquivo">; texto: string };
export function useMateriaisEmpresa(empresaId: string) {
  const [estado, dispatch] = useReducer(reduzirMateriais, { empresaId, revisao: 0, itens: [] });
  const sources = useRef(new Map<string, Entrada>());
  const active = useRef(new Map<string, AbortController>());
  useEffect(() => {
    const controllers = active.current, inputs = sources.current;
    dispatch({ tipo: "empresa", empresaId });
    return () => { controllers.forEach(c => c.abort()); controllers.clear(); inputs.clear(); };
  }, [empresaId]);

  async function enviar(id: string, input: Entrada, retry = false) {
    const token = crypto.randomUUID();
    active.current.get(id)?.abort();
    const controller = new AbortController(); active.current.set(id, controller);
    if (retry) dispatch({ tipo: "retry", id, token });
    else dispatch({ tipo: "adicionar", item: { id, nome: input instanceof File ? input.name : input.nome, token, estado: "processando" } });
    const timer = setTimeout(() => controller.abort(), 55_000);
    try {
      let body: BodyInit; const headers: Record<string, string> = {};
      if (input instanceof File) { const form = new FormData(); form.set("arquivo", input); body = form; }
      else { body = JSON.stringify(input); headers["content-type"] = "application/json"; }
      const res = await fetch("/api/materiais", { method: "POST", body, headers, signal: controller.signal });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.erro === "string" ? data.erro : "Não consegui ler. Tente novamente.");
      const material = materialSchema.parse(data.material);
      if (controller.signal.aborted) return;
      dispatch({ tipo: "concluir", empresaId, id, token, material });
      sources.current.delete(id); // originals no longer needed for successful reads
    } catch (e) {
      if (active.current.get(id) !== controller) return;
      dispatch({ tipo: "falhar", empresaId, id, token, erro: controller.signal.aborted ? "A leitura demorou demais. Tente novamente." : e instanceof Error ? e.message : "Não consegui ler. Tente novamente." });
    } finally { clearTimeout(timer); if (active.current.get(id) === controller) active.current.delete(id); }
  }
  function adicionar(input: Entrada) {
    // Synchronous reservation also covers multiple selections before React renders.
    if (sources.current.size + estado.itens.filter(i => i.estado === "pronto").length >= MAX_MATERIAIS || estado.itens.length >= MAX_MATERIAIS) return;
    const id = crypto.randomUUID(); sources.current.set(id, input); void enviar(id, input);
  }
  function remover(id: string) { active.current.get(id)?.abort(); active.current.delete(id); sources.current.delete(id); dispatch({ tipo: "remover", id }); }
  return {
    estado, adicionar, remover,
    retry: (id: string) => { const input = sources.current.get(id); if (input) void enviar(id, input, true); },
    editar: (id: string, material: Material) => dispatch({ tipo: "editar", id, material }),
    pendente: estado.itens.some(i => i.estado === "processando"),
    materiais: estado.itens.flatMap(i => i.estado === "pronto" && i.material ? [i.material] : []),
  };
}
export type ControleMateriais = ReturnType<typeof useMateriaisEmpresa>;
export const CAMPO_CONTEXTO = "w-full min-w-0 rounded-2xl border border-tinta/20 bg-white px-4 py-3 text-base outline-none focus:border-tinta";
export const BOTAO_CONTEXTO = "inline-flex min-h-11 items-center justify-center rounded-full border border-tinta/20 bg-white px-4 py-2 text-sm font-medium hover:border-tinta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pauta disabled:cursor-not-allowed disabled:opacity-40";

export function MateriaisEmpresa({ controle }: { controle: ControleMateriais }) {
  const id = useId(), file = useRef<HTMLInputElement>(null);
  const [importar, setImportar] = useState(false), [origem, setOrigem] = useState<"notion" | "granola" | "outro">("notion");
  const [nome, setNome] = useState(""), [texto, setTexto] = useState("");
  const cheio = controle.estado.itens.length >= MAX_MATERIAIS;
  return <section aria-labelledby={`${id}-titulo`} className="min-w-0">
    <h2 id={`${id}-titulo`} className="font-display text-lg font-semibold tracking-[-0.01em]">Materiais da empresa <span className="font-sans text-sm font-normal text-tinta-3">(opcional)</span></h2>
    <p className="mt-1 text-sm text-tinta-3">Adicione seu brandbook, apresentação ou referências visuais. Até 3 materiais. PDF, PNG e JPG, até 3 MB cada; PDF com até 20 páginas.</p>
    <div className="mt-3 flex flex-wrap gap-2">
      <input ref={file} type="file" aria-label="Anexar arquivos" accept=".pdf,.png,.jpg,.jpeg" className="sr-only" tabIndex={-1} disabled={cheio} onChange={e => { const selected = e.target.files?.[0]; if (selected) controle.adicionar(selected); e.target.value = ""; }} />
      <button type="button" className={BOTAO_CONTEXTO} disabled={cheio} onClick={() => file.current?.click()}>Anexar arquivos</button>
      <button type="button" className={BOTAO_CONTEXTO} aria-expanded={importar} disabled={cheio} onClick={() => setImportar(v => !v)}>Importar conteúdo</button>
    </div>
    {importar && !cheio && <div className="mt-4 space-y-3 border-l-2 border-tinta/10 pl-4">
      <p className="text-sm text-tinta-2">Importação manual — sem conexão automática</p>
      <label className="block text-sm">De onde vem o conteúdo?<select className={`mt-1 ${CAMPO_CONTEXTO}`} value={origem} onChange={e => setOrigem(e.target.value as typeof origem)}><option value="notion">Notion</option><option value="granola">Granola</option><option value="outro">Outra ferramenta</option></select></label>
      <p className="text-sm text-tinta-3">Copie só as páginas ou notas que quer compartilhar. Se preferir, exporte como PDF e use “Anexar arquivos”.</p>
      <label className="block text-sm">Nome do material<input className={`mt-1 ${CAMPO_CONTEXTO}`} value={nome} maxLength={160} onChange={e => setNome(e.target.value)} placeholder="Ex.: entrevistas com clientes" /></label>
      <label className="block text-sm">Conteúdo escolhido<textarea className={`mt-1 ${CAMPO_CONTEXTO}`} rows={5} value={texto} maxLength={20_000} onChange={e => setTexto(e.target.value)} placeholder="Cole o trecho que vai ajudar a entender a empresa." /></label>
      <p className="text-xs text-tinta-3">{texto.length}/20.000 caracteres. Revise o trecho antes de enviar.</p>
      <button type="button" className={BOTAO_CONTEXTO} disabled={!nome.trim() || !texto.trim()} onClick={() => { controle.adicionar({ nome: nome.trim(), texto: texto.trim(), origem }); setNome(""); setTexto(""); setImportar(false); }}>Adicionar conteúdo</button>
    </div>}
    <ul className="mt-3 space-y-3">
      {controle.estado.itens.map(item => <li key={item.id} className="min-w-0 rounded-2xl border border-tinta/10 p-3">
        <div className="flex items-start justify-between gap-3"><span className="min-w-0 break-words text-sm font-medium">{item.nome}</span><button type="button" className="min-h-10 shrink-0 text-sm underline underline-offset-4" aria-label={`Remover ${item.nome}`} onClick={() => controle.remover(item.id)}>Remover</button></div>
        <p role="status" className="text-sm text-tinta-3">{item.estado === "processando" ? "Lendo o material…" : item.estado === "pronto" ? "Pronto para revisar" : "Não foi possível ler"}</p>
        {item.erro && <><p role="alert" className="mt-2 text-sm text-pauta-escura">{item.erro}</p><button type="button" className={`mt-2 ${BOTAO_CONTEXTO}`} aria-label={`Tentar novamente ${item.nome}`} onClick={() => controle.retry(item.id)}>Tentar novamente</button></>}
        {item.material && <details className="mt-2 text-sm"><summary className="min-h-10 cursor-pointer py-2 underline underline-offset-4">Revisar conteúdo</summary>
          {item.material.avisos.map((a, i) => <p key={i} className="mb-2 text-tinta-3">{a}</p>)}
          {item.material.texto_manual !== undefined && <label className="block">Texto importado<textarea rows={5} maxLength={20_000} className={`mt-1 ${CAMPO_CONTEXTO}`} value={item.material.texto_manual} onChange={e => controle.editar(item.id, { ...item.material!, texto_manual: e.target.value })} /></label>}
          {item.material.fatos.map((f, i) => <div key={i} className="mt-3"><label className="block">{f.campo.replaceAll("_", " ")}<textarea rows={2} className={`mt-1 ${CAMPO_CONTEXTO}`} maxLength={500} value={f.texto} onChange={e => controle.editar(item.id, { ...item.material!, fatos: item.material!.fatos.map((x, j) => j === i ? { ...x, texto: e.target.value } : x) })} /></label><p className="text-xs text-tinta-3">Fonte: {f.evidencia || item.nome}</p><button type="button" className="min-h-10 underline" onClick={() => controle.editar(item.id, { ...item.material!, fatos: item.material!.fatos.filter((_, j) => j !== i) })}>Remover informação</button></div>)}
          {item.material.cores.length > 0 && <p className="mt-3 text-tinta-2">Cores encontradas: {item.material.cores.map(c => `${c.hex} (${c.origem})`).join(", ")}. Você escolhe quais aplicar ao revisar a empresa.</p>}
        </details>}
      </li>)}
    </ul>
    {cheio && <p className="mt-2 text-sm text-tinta-3">Limite de 3 materiais. Remova um para adicionar outro.</p>}
    <p className="mt-3 text-xs leading-relaxed text-tinta-3">Compartilhe apenas materiais que você pode usar, sem dados sensíveis desnecessários. A leitura usa o provedor de IA configurado. Os arquivos originais não ficam salvos na plataforma; os posts gerados podem ser salvos.</p>
  </section>;
}
