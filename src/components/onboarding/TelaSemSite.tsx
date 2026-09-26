"use client";

import { useEffect, useRef, useState } from "react";
import { brandSemSite, type EmpresaSemSite } from "@/lib/brand/sem-site";
import type { RedeArroba } from "@/lib/client/onboarding";
import { NICHOS, type Nicho } from "@/lib/types";
import { CampoPrint } from "./AjustesRedes";
import { CampoConcorrentes, type ControleConcorrentes } from "./Concorrentes";
import { CampoArroba, Chip } from "./ui";

export type RedeEmpresa = "instagram" | "linkedin" | "x" | "facebook";

export interface Empresa {
  nome: string;
  descricao: string;
  publico: string;
  nicho: Nicho | null;
  redes: Record<RedeEmpresa, string>;
  /** Redes marcadas com "Não tenho essa rede social". */
  semRede: Record<RedeEmpresa, boolean>;
  /** Cores do print do grid do Instagram. */
  paleta: string[];
}

export const EMPRESA_VAZIA: Empresa = {
  nome: "",
  descricao: "",
  publico: "",
  nicho: null,
  redes: { instagram: "", linkedin: "", x: "", facebook: "" },
  semRede: { instagram: false, linkedin: false, x: false, facebook: false },
  paleta: [],
};

export const LIMITE_DESCRICAO = 600;

const REDES: { id: RedeEmpresa; nome: string; placeholder: string }[] = [
  { id: "instagram", nome: "Instagram", placeholder: "@suaempresa ou link do perfil" },
  { id: "linkedin", nome: "LinkedIn", placeholder: "linkedin.com/company/suaempresa" },
  { id: "x", nome: "X", placeholder: "@suaempresa" },
  { id: "facebook", nome: "Facebook", placeholder: "facebook.com/suaempresa" },
];

const SUBTITULO = "font-display text-lg font-semibold tracking-[-0.01em]";
const LINHA =
  "h-11 w-full min-w-0 rounded-full border border-tinta/20 bg-white px-4 text-base outline-none transition-colors placeholder:text-tinta-3/70 focus:border-tinta focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-papel disabled:text-tinta-3";

/** Junta os dados da tela no formato que o `brandSemSite` espera. */
export function empresaParaMarca(e: Empresa): EmpresaSemSite {
  const handles = Object.fromEntries(
    REDES.map((r) => [r.id, e.semRede[r.id] ? "" : e.redes[r.id].trim().slice(0, 300)]).filter(([, v]) => v),
  ) as EmpresaSemSite["handles"];
  return {
    nome: e.nome.trim(),
    descricao: e.descricao.trim().slice(0, LIMITE_DESCRICAO),
    publico: e.publico.trim() || undefined,
    nicho: e.nicho ?? undefined,
    handles,
    paleta: e.semRede.instagram ? [] : e.paleta,
  };
}

/**
 * Primeira tela de quem não tem site: o que a empresa faz, para quem, o nicho e as redes.
 * É o que o site diria. Só nome e descrição são obrigatórios.
 */
export function TelaSemSite({
  empresa,
  onChange,
  founder,
  onFounder,
  concorrentes,
  onContinuar,
}: {
  empresa: Empresa;
  onChange: (e: Empresa) => void;
  founder: { valor: string; rede: RedeArroba };
  onFounder: (f: { valor: string; rede: RedeArroba }) => void;
  concorrentes: ControleConcorrentes;
  onContinuar: () => void;
}) {
  const [erros, setErros] = useState<{ nome?: string; descricao?: string }>({});

  // Com nome e descrição, pede sugestões de concorrentes quando a pessoa sai de um campo ou troca o nicho,
  // não a cada pausa de digitação: com IA ligada, cada pedido é uma chamada paga.
  const { buscar } = concorrentes;
  const nome = empresa.nome.trim();
  const descricao = empresa.descricao.trim();
  const { nicho, publico } = empresa;
  const [pedido, setPedido] = useState(0);
  const pedir = () => setPedido((n) => n + 1);
  const atual = useRef({ nome, descricao, nicho, publico });
  useEffect(() => {
    atual.current = { nome, descricao, nicho, publico };
  });
  useEffect(() => {
    const a = atual.current;
    if (!a.nome || a.descricao.length < 20) return;
    buscar(brandSemSite({ nome: a.nome, descricao: a.descricao, nicho: a.nicho ?? undefined, publico: a.publico }), a.publico);
  }, [buscar, pedido, nicho]);

  function continuar(ev: React.FormEvent) {
    ev.preventDefault();
    const novos: typeof erros = {};
    if (!empresa.nome.trim()) novos.nome = "Coloque o nome da empresa.";
    if (empresa.descricao.trim().length < 10) novos.descricao = "Conta em uma ou duas frases o que vocês fazem.";
    setErros(novos);
    if (novos.nome || novos.descricao) {
      document.getElementById(novos.nome ? "empresa-nome" : "empresa-descricao")?.focus();
      return;
    }
    onContinuar();
  }

  function alternarRede(id: RedeEmpresa) {
    const marcar = !empresa.semRede[id];
    onChange({
      ...empresa,
      semRede: { ...empresa.semRede, [id]: marcar },
      redes: marcar ? { ...empresa.redes, [id]: "" } : empresa.redes,
      paleta: marcar && id === "instagram" ? [] : empresa.paleta,
    });
  }

  return (
    <form onSubmit={continuar} noValidate className="animate-subir">
      <p className="text-sm font-medium text-pauta-escura">Sem site, tudo bem</p>
      <h1 className="mt-2 text-balance font-display text-3xl font-semibold leading-[1.1] tracking-[-0.03em] sm:text-4xl">Conta sobre a sua empresa</h1>
      <p className="mt-3 text-lg leading-relaxed text-tinta-2">É o que o site diria. Duas linhas já bastam para a gente montar a pauta.</p>

      <div className="mt-8 space-y-7 rounded-3xl border border-tinta/10 bg-white p-5 shadow-[0_30px_60px_-40px_rgba(22,19,15,.35)] sm:p-8">
        <div>
          <label htmlFor="empresa-nome" className={`block ${SUBTITULO}`}>
            Nome da empresa
          </label>
          <input
            id="empresa-nome"
            onBlur={pedir}
            value={empresa.nome}
            onChange={(e) => {
              onChange({ ...empresa, nome: e.target.value });
              if (erros.nome) setErros({ ...erros, nome: undefined });
            }}
            maxLength={80}
            required
            autoComplete="organization"
            placeholder="Ex.: Doce Mel Confeitaria"
            aria-invalid={!!erros.nome}
            aria-describedby={erros.nome ? "empresa-nome-erro" : undefined}
            className={`mt-3 ${LINHA}`}
          />
          {erros.nome && (
            <p id="empresa-nome-erro" className="mt-1 pl-4 text-sm text-pauta-escura">
              {erros.nome}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="empresa-descricao" className={`block ${SUBTITULO}`}>
            O que vocês fazem?
          </label>
          <p id="empresa-descricao-dica" className="mt-1 text-sm text-tinta-3">
            Uma ou duas linhas, do jeito que você explicaria para um cliente.
          </p>
          <textarea
            id="empresa-descricao"
            onBlur={pedir}
            rows={3}
            value={empresa.descricao}
            onChange={(e) => {
              onChange({ ...empresa, descricao: e.target.value });
              if (erros.descricao) setErros({ ...erros, descricao: undefined });
            }}
            maxLength={LIMITE_DESCRICAO}
            required
            placeholder="Ex.: Bolos de festa sob encomenda em Curitiba, com entrega no mesmo dia."
            aria-invalid={!!erros.descricao}
            aria-describedby={erros.descricao ? "empresa-descricao-dica empresa-descricao-erro" : "empresa-descricao-dica"}
            className="mt-3 w-full rounded-2xl border border-tinta/20 bg-white px-4 py-3 text-base leading-relaxed outline-none transition-colors placeholder:text-tinta-3/70 focus:border-tinta focus-visible:outline-none"
          />
          <div className="mt-1 flex justify-between gap-3 px-4 text-xs">
            <span id="empresa-descricao-erro" className="text-pauta-escura">
              {erros.descricao ?? ""}
            </span>
            <span className="shrink-0 tabular-nums text-tinta-3">
              {empresa.descricao.length}/{LIMITE_DESCRICAO}
            </span>
          </div>
        </div>

        <div>
          <label htmlFor="empresa-publico" className={`block ${SUBTITULO}`}>
            Para quem vocês vendem? <span className="font-sans text-sm font-normal text-tinta-3">(opcional)</span>
          </label>
          <input
            id="empresa-publico"
            onBlur={pedir}
            value={empresa.publico}
            onChange={(e) => onChange({ ...empresa, publico: e.target.value })}
            maxLength={300}
            autoComplete="off"
            placeholder="Ex.: mães que organizam festa infantil em casa"
            className={`mt-3 ${LINHA}`}
          />
        </div>

        <fieldset>
          <legend className={SUBTITULO}>
            Nicho <span className="font-sans text-sm font-normal text-tinta-3">(opcional)</span>
          </legend>
          <p className="mt-1 text-sm text-tinta-3">Se nenhum servir, deixe em branco. A gente deduz pelo que você escreveu.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {NICHOS.map((n) => (
              <Chip key={n.id} ativo={empresa.nicho === n.id} onClick={() => onChange({ ...empresa, nicho: empresa.nicho === n.id ? null : n.id })}>
                {n.nome}
              </Chip>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="mt-6 space-y-7 rounded-3xl border border-tinta/10 bg-white p-5 sm:p-8">
        <fieldset>
          <legend className={SUBTITULO}>Suas redes</legend>
          <p className="mt-1 text-sm text-tinta-3">Coloque o @ ou o link de cada uma. Se a empresa não está numa rede, é só marcar.</p>
          <div className="mt-4 space-y-5">
            {REDES.map((r) => {
              const sem = empresa.semRede[r.id];
              return (
                <div key={r.id}>
                  <label htmlFor={`empresa-rede-${r.id}`} className={`text-sm ${sem ? "text-tinta-3 line-through" : "text-tinta-2"}`}>
                    {r.nome} da empresa
                  </label>
                  <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center">
                    <input
                      id={`empresa-rede-${r.id}`}
                      value={empresa.redes[r.id]}
                      onChange={(e) => onChange({ ...empresa, redes: { ...empresa.redes, [r.id]: e.target.value } })}
                      disabled={sem}
                      placeholder={sem ? "Sem essa rede" : r.placeholder}
                      autoCapitalize="none"
                      autoComplete="off"
                      spellCheck={false}
                      maxLength={300}
                      className={`${LINHA} sm:flex-1`}
                    />
                    <button
                      type="button"
                      onClick={() => alternarRede(r.id)}
                      aria-pressed={sem}
                      aria-label={`Não tenho essa rede social (${r.nome})`}
                      className={`inline-flex min-h-10 shrink-0 items-center gap-2 self-start rounded-full border px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pauta sm:self-auto ${
                        sem ? "border-tinta bg-tinta text-papel" : "border-tinta/20 bg-white text-tinta-2 hover:border-tinta hover:text-tinta"
                      }`}
                    >
                      <span
                        aria-hidden
                        className={`flex h-4 w-4 items-center justify-center rounded border text-[10px] leading-none ${sem ? "border-papel" : "border-tinta/30"}`}
                      >
                        {sem ? "✓" : ""}
                      </span>
                      Não tenho essa rede social
                    </button>
                  </div>
                  {r.id === "instagram" && !sem && (
                    <div className="mt-2">
                      <CampoPrint paleta={empresa.paleta} onPaleta={(paleta) => onChange({ ...empresa, paleta })} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </fieldset>

        <div className="border-t border-tinta/10 pt-6">
          <CampoArroba
            id="empresa-founder"
            rotulo="Seu @ pessoal, se você também posta"
            valor={founder.valor}
            rede={founder.rede}
            onChange={(valor, rede) => onFounder({ valor, rede })}
            placeholder="@voce ou link do perfil"
          />
        </div>

        <div className="border-t border-tinta/10 pt-6">
          <CampoConcorrentes controle={concorrentes} titulo={SUBTITULO} />
        </div>
      </div>

      <div className="mt-8">
        <button
          type="submit"
          className="h-14 w-full rounded-full bg-pauta px-8 text-lg font-semibold text-white transition-colors hover:bg-pauta-escura focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinta sm:w-auto"
        >
          Continuar
        </button>
      </div>
    </form>
  );
}
