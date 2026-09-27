// @vitest-environment jsdom
import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { reduzirMateriais, type EstadoMateriais } from "@/lib/client/materiais";
import { MateriaisEmpresa, useMateriaisEmpresa } from "@/components/onboarding/MateriaisEmpresa";
import { useConcorrentes } from "@/components/onboarding/Concorrentes";
import { ResumoNegocio, type RascunhoContexto } from "@/components/onboarding/ResumoNegocio";
import recallo from "./fixtures/marcas/recallo.json";
import type { BrandProfile } from "@/lib/types";
import { contextoConfirmadoSchema } from "@/lib/contexto/contrato";
const material = { id: "m", nome: "Notas", origem: "notion" as const, fatos: [], cores: [], avisos: [], texto_manual: "Ensino de inglês" };
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it("ignora resultado removido, antigo e de outra empresa", () => {
  const state: EstadoMateriais = { empresaId: "a", revisao: 1, itens: [{ id: "m", nome: "Notas", estado: "processando", token: "novo" }] };
  const removed = reduzirMateriais(state, { tipo: "remover", id: "m" });
  expect(reduzirMateriais(removed, { tipo: "concluir", empresaId: "a", id: "m", token: "novo", material }).itens).toEqual([]);
  expect(reduzirMateriais(state, { tipo: "concluir", empresaId: "b", id: "m", token: "novo", material })).toBe(state);
  expect(reduzirMateriais(state, { tipo: "concluir", empresaId: "a", id: "m", token: "antigo", material })).toBe(state);
});
it("limita adições concorrentes e limpa materiais ao trocar empresa", () => {
  let state: EstadoMateriais = { empresaId: "a", revisao: 0, itens: [] };
  for (let i = 0; i < 4; i++) state = reduzirMateriais(state, { tipo: "adicionar", item: { id: String(i), nome: "Arquivo", token: String(i), estado: "processando" } });
  expect(state.itens).toHaveLength(3);
  expect(reduzirMateriais(state, { tipo: "empresa", empresaId: "b" }).itens).toEqual([]);
});
function Harness() { const controle = useMateriaisEmpresa("teste"); return <MateriaisEmpresa controle={controle} />; }
it("importa Notion manualmente de verdade e permite remover o resultado", async () => {
  vi.stubGlobal("fetch", async (_url: string, req: RequestInit) => {
    const body = JSON.parse(req.body as string);
    return { ok: true, json: async () => ({ material: { ...material, nome: body.nome, texto_manual: body.texto } }) };
  });
  render(<Harness />);
  fireEvent.click(screen.getByRole("button", { name: "Importar conteúdo" }));
  expect(screen.getByText("Importação manual — sem conexão automática")).toBeTruthy();
  fireEvent.change(screen.getByLabelText("Nome do material"), { target: { value: "Notas de entrevistas" } });
  fireEvent.change(screen.getByLabelText("Conteúdo escolhido"), { target: { value: "Ensino de inglês" } });
  fireEvent.click(screen.getByRole("button", { name: "Adicionar conteúdo" }));
  await waitFor(() => expect(screen.getByText("Pronto para revisar")).toBeTruthy());
  expect(screen.getByText("Notas de entrevistas")).toBeTruthy();
  expect(screen.queryByRole("button", { name: /^Conectar/ })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Remover Notas de entrevistas" }));
  expect(screen.queryByText("Notas de entrevistas")).toBeNull();
});
it("mostra erro real de upload sem apagar os dados nem declarar leitura concluída", async () => {
  vi.stubGlobal("fetch", async () => ({ ok: false, json: async () => ({ erro: "Configure a IA para ler arquivos." }) }));
  render(<Harness />);
  fireEvent.change(screen.getByLabelText("Anexar arquivos"), { target: { files: [new File(["pdf"], "manual.pdf", { type: "application/pdf" })] } });
  await waitFor(() => expect(screen.getByText("Configure a IA para ler arquivos.")).toBeTruthy());
  expect(screen.queryByText("Pronto para revisar")).toBeNull();
  expect(screen.getByRole("button", { name: "Tentar novamente manual.pdf" })).toBeTruthy();
});
it("busca recebe contexto, já marca os achados pela IA, e invalidação remove sugestões", async () => {
  const c = contextoConfirmadoSchema.parse({ versao: 1, empresa: "recallo.com.br", revisao: 1, entendimento: { negocio: "Inglês", segmento: "Idiomas", publico: "Adultos", nicho: "edtech", evidencias: [], duvidas: [], fonte: "manual" }, materiais: [] });
  let sent = "";
  vi.stubGlobal("fetch", async (_url: string, req: RequestInit) => { sent = String(req.body); return { ok: true, json: async () => ({ sugestoes: [{ nome: "Escola", url: "https://escola.com.br", motivo: "Idiomas", fonte: "ia" }] }) }; });
  const { result } = renderHook(() => useConcorrentes());
  act(() => result.current.buscar(recallo as BrandProfile, "Adultos", c));
  await waitFor(() => expect(result.current.status).toBe("pronto"));
  expect(JSON.parse(sent).contexto.entendimento.negocio).toBe("Inglês");
  // O motor analisa sozinho os concorrentes achados; a pessoa desmarca se quiser.
  expect(result.current.valor.marcados).toEqual(["https://escola.com.br/"]);
  act(() => result.current.invalidar()); expect(result.current.sugestoes).toEqual([]); expect(result.current.valor.marcados).toEqual([]);
});
it("revisão confirma negócio sem anexos e bloqueia durante leitura", async () => {
  let received = "";
  const props = { entrada: { brand: recallo as BrandProfile, founder: {}, materiais: [] }, revisao: 1, chaveEntrada: "1", pendente: true, confirmado: false, onInvalidar: () => {}, onConfirmar: (c: { entendimento: { negocio: string } }) => { received = c.entendimento.negocio; } };
  const { rerender } = render(<ResumoNegocio {...props} />);
  const button = screen.getByRole("button", { name: "Confirmar contexto e buscar concorrentes" }) as HTMLButtonElement;
  expect(button.disabled).toBe(true);
  rerender(<ResumoNegocio {...props} pendente={false} />);
  fireEvent.change(screen.getByLabelText("O que a empresa faz"), { target: { value: "Preparação para exames de inglês" } });
  fireEvent.click(screen.getByRole("button", { name: "Confirmar contexto e buscar concorrentes" }));
  expect(received).toBe("Preparação para exames de inglês");
});
it("mantém resumo editado quando o founder volta uma etapa", () => {
  function Navegacao() {
    const [mostrar, setMostrar] = React.useState(true);
    const [rascunho, setRascunho] = React.useState<RascunhoContexto | null>(null);
    return <><button onClick={() => setMostrar(v => !v)}>Trocar etapa</button>{mostrar && <ResumoNegocio entrada={{ brand: recallo as BrandProfile, founder: {}, materiais: [] }} revisao={0} chaveEntrada="mesma" pendente={false} confirmado={true} onInvalidar={() => {}} onConfirmar={() => {}} inicial={rascunho} onGuardar={setRascunho} />}</>;
  }
  render(<Navegacao />);
  fireEvent.change(screen.getByLabelText('O que a empresa faz'), {target:{value:'Preparação personalizada para inglês'}});
  fireEvent.click(screen.getByRole('button',{name:'Trocar etapa'})); fireEvent.click(screen.getByRole('button',{name:'Trocar etapa'}));
  expect((screen.getByLabelText('O que a empresa faz') as HTMLTextAreaElement).value).toBe('Preparação personalizada para inglês');
});
it("remover fonte elimina resumo e citações derivados dela antes de reconfirmar", async () => {
  let result = '';
  vi.stubGlobal('fetch', async () => ({ok:true,json:async()=>({entendimento:{negocio:'Segredo exclusivo do documento',segmento:'Idiomas',publico:'Adultos',nicho:'edtech',evidencias:[{fonte:'m',trecho:'Segredo exclusivo do documento'}],duvidas:[],fonte:'ia'}})}));
  const props = {entrada:{brand:recallo as BrandProfile,founder:{},materiais:[material]},revisao:1,chaveEntrada:'com-material',pendente:false,confirmado:false,onInvalidar:()=>{},onConfirmar:(c:unknown)=>{result=JSON.stringify(c);}};
  const {rerender}=render(<ResumoNegocio {...props}/>);
  fireEvent.click(screen.getByRole('button',{name:'Analisar contexto com IA'}));
  await waitFor(()=>expect((screen.getByLabelText('O que a empresa faz') as HTMLTextAreaElement).value).toBe('Segredo exclusivo do documento'));
  rerender(<ResumoNegocio {...props} entrada={{...props.entrada,materiais:[]}} chaveEntrada="sem-material" revisao={2}/>);
  fireEvent.click(screen.getByRole('button',{name:'Confirmar contexto e buscar concorrentes'}));
  expect(result).not.toContain('Segredo exclusivo'); expect(JSON.parse(result).entendimento.evidencias).toEqual([]);
});
