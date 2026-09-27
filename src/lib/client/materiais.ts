import { MAX_MATERIAIS, type Material } from "@/lib/contexto/contrato";
export interface ItemMaterial { id: string; nome: string; token: string; estado: "processando" | "pronto" | "falhou"; material?: Material; erro?: string }
export interface EstadoMateriais { empresaId: string; revisao: number; itens: ItemMaterial[] }
type Resultado = { empresaId: string; id: string; token: string };
export type AcaoMaterial =
  | { tipo: "empresa"; empresaId: string } | { tipo: "adicionar"; item: ItemMaterial }
  | { tipo: "remover"; id: string } | { tipo: "retry"; id: string; token: string }
  | ({ tipo: "concluir"; material: Material } & Resultado) | ({ tipo: "falhar"; erro: string } & Resultado)
  | { tipo: "editar"; id: string; material: Material };
export function reduzirMateriais(s: EstadoMateriais, a: AcaoMaterial): EstadoMateriais {
  if (a.tipo === "empresa") return a.empresaId === s.empresaId ? s : { empresaId: a.empresaId, revisao: s.revisao + 1, itens: [] };
  if ("empresaId" in a && a.empresaId !== s.empresaId) return s;
  if (a.tipo === "adicionar") return s.itens.length >= MAX_MATERIAIS ? s : { ...s, revisao: s.revisao + 1, itens: [...s.itens, a.item] };
  const item = s.itens.find(i => i.id === a.id);
  if (!item || ((a.tipo === "concluir" || a.tipo === "falhar") && (item.token !== a.token || item.estado !== "processando"))) return s;
  if (a.tipo === "remover") return { ...s, revisao: s.revisao + 1, itens: s.itens.filter(i => i.id !== a.id) };
  const next: ItemMaterial = a.tipo === "retry" ? { ...item, estado: "processando", token: a.token, erro: undefined }
    : a.tipo === "falhar" ? { ...item, estado: "falhou", erro: a.erro }
    : { ...item, estado: "pronto", material: { ...a.material, id: item.id }, erro: undefined };
  return { ...s, revisao: s.revisao + 1, itens: s.itens.map(i => i.id === item.id ? next : i) };
}
export const chaveContexto = (empresaId: string, revisao: number) => `${empresaId}|${revisao}`;
