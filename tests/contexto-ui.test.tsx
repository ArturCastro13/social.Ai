// @vitest-environment jsdom
import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { reduzirMateriais, type EstadoMateriais } from "@/lib/client/materiais";
import { MateriaisEmpresa, useMateriaisEmpresa } from "@/components/onboarding/MateriaisEmpresa";
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
