"use client";

import { useState } from "react";
import { ehLink } from "./rotulos";
import { BOTAO_SECUNDARIO } from "./Partes";
import { engajamento, type Numeros, type Postado } from "./useFeedback";

const CAMPOS: { k: keyof Numeros; rotulo: string }[] = [
  { k: "alcance", rotulo: "Alcance" },
  { k: "curtidas", rotulo: "Curtidas" },
  { k: "comentarios", rotulo: "Comentários" },
  { k: "salvamentos", rotulo: "Salvos" },
  { k: "compartilhamentos", rotulo: "Compartilhamentos" },
];

const inteiro = new Intl.NumberFormat("pt-BR");
export const formatarNumero = (n: number) => inteiro.format(n);
export const formatarPct = (x: number) => `${(x * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

// Só dígitos contam ("1.234" vira 1234). Campo sem dígito fica sem dado, e o teto é o mesmo da API.
function num(s: string) {
  const digitos = s.replace(/\D/g, "");
  return digitos === "" ? null : Math.min(1e9, Number(digitos));
}

/** "Postado · 1.240 de alcance · 5,2% de engajamento". */
export function resumoPostado(r: Partial<Postado>): string {
  const partes = ["Postado"];
  if (r.alcance != null) partes.push(`${formatarNumero(r.alcance)} de alcance`);
  const eng = engajamento(r);
  if (eng !== null) partes.push(`${formatarPct(eng)} de engajamento`);
  return partes.join(" · ");
}

/**
 * "Já postei": botão que abre um formulário curto com os números do post.
 * Depois de salvo, vira uma linha de resumo com a opção de editar.
 */
export function JaPostei({ atual, onSalvar }: { atual?: Postado; onSalvar: (v: Postado) => void }) {
  const [aberto, setAberto] = useState(false);
  const [v, setV] = useState<Record<keyof Numeros | "link", string>>({ link: "", alcance: "", curtidas: "", comentarios: "", salvamentos: "", compartilhamentos: "" });

  function abrir() {
    setV({
      link: atual?.link ?? "",
      alcance: atual?.alcance?.toString() ?? "",
      curtidas: atual?.curtidas?.toString() ?? "",
      comentarios: atual?.comentarios?.toString() ?? "",
      salvamentos: atual?.salvamentos?.toString() ?? "",
      compartilhamentos: atual?.compartilhamentos?.toString() ?? "",
    });
    setAberto(true);
  }

  if (!aberto) {
    return atual ? (
      <p className="mt-2 flex flex-wrap items-center gap-x-2 rounded-2xl bg-aprovado/10 px-3 py-2 text-xs font-medium text-tinta">
        <span className="tabular-nums">{resumoPostado(atual)}</span>
        {ehLink(atual.link) && (
          <a href={atual.link} target="_blank" rel="noopener noreferrer" className="underline decoration-tinta/30 underline-offset-2 hover:decoration-tinta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pauta">
            ver post
          </a>
        )}
        <button
          type="button"
          onClick={abrir}
          className="ml-auto font-semibold underline decoration-tinta/30 underline-offset-2 hover:decoration-tinta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pauta"
        >
          editar
        </button>
      </p>
    ) : (
      <button type="button" onClick={abrir} className={`${BOTAO_SECUNDARIO} mt-2 w-full border-aprovado/50 text-aprovado`}>
        Já postei
      </button>
    );
  }

  return (
    <form
      className="mt-2 rounded-2xl bg-papel p-3"
      aria-label="Números do post publicado"
      onSubmit={(e) => {
        e.preventDefault();
        const link = v.link.trim();
        onSalvar({
          ...(link ? { link } : {}),
          alcance: num(v.alcance),
          curtidas: num(v.curtidas),
          comentarios: num(v.comentarios),
          salvamentos: num(v.salvamentos),
          compartilhamentos: num(v.compartilhamentos),
        });
        setAberto(false);
      }}
    >
      <p className="text-xs text-tinta-2">Preencha só o que tiver. A próxima pauta aprende com esses números.</p>
      <label className="mt-2 block">
        <span className="text-xs text-tinta-3">Link do post</span>
        <input
          type="url"
          inputMode="url"
          value={v.link}
          maxLength={500}
          placeholder="https://"
          onChange={(e) => setV({ ...v, link: e.target.value })}
          className="mt-1 h-10 w-full rounded-xl border border-tinta/15 bg-white px-2.5 text-sm focus-visible:border-tinta/40 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-pauta"
        />
      </label>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {CAMPOS.map((c) => (
          <label key={c.k} className="block">
            <span className="text-xs text-tinta-3">{c.rotulo}</span>
            <input
              inputMode="numeric"
              value={v[c.k]}
              onChange={(e) => setV({ ...v, [c.k]: e.target.value.replace(/[^\d.]/g, "") })}
              className="mt-1 h-10 w-full rounded-xl border border-tinta/15 bg-white px-2.5 text-sm tabular-nums focus-visible:border-tinta/40 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-pauta"
            />
          </label>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <button className="h-10 flex-1 rounded-full bg-tinta px-4 text-sm font-semibold text-papel transition hover:bg-tinta-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pauta">
          Salvar números
        </button>
        <button type="button" onClick={() => setAberto(false)} className={BOTAO_SECUNDARIO}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

/** Aprovar e recusar lado a lado. Aprovado de novo desfaz. */
export function AprovarRecusar({ decisao, onDecidir }: { decisao?: "aprovado" | "pulado"; onDecidir: (d: "aprovado" | "pulado" | null) => void }) {
  const aprovado = decisao === "aprovado";
  return (
    <div className="mt-4 grid grid-cols-2 gap-2">
      <button
        type="button"
        aria-pressed={aprovado}
        onClick={() => onDecidir(aprovado ? null : "aprovado")}
        title={aprovado ? "Clique de novo para desfazer" : undefined}
        className={`h-11 rounded-full text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pauta ${aprovado ? "bg-aprovado text-white hover:bg-aprovado/90" : "bg-tinta text-papel hover:bg-tinta-2"}`}
      >
        {aprovado ? "Aprovado ✓" : "Aprovar"}
      </button>
      <button type="button" aria-pressed={decisao === "pulado"} onClick={() => onDecidir("pulado")} className={`${BOTAO_SECUNDARIO} h-11`}>
        Recusar
      </button>
    </div>
  );
}

/** Card recusado: uma linha com o título riscado e "desfazer". */
export function Recusado({ titulo, onDesfazer }: { titulo: string; onDesfazer: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <p className="line-clamp-1 min-w-0 text-sm text-tinta-3 line-through decoration-tinta/30">{titulo}</p>
      <p className="shrink-0 text-xs text-tinta-3">
        Recusado ·{" "}
        <button
          type="button"
          onClick={onDesfazer}
          className="font-semibold text-tinta underline decoration-tinta/30 underline-offset-2 hover:decoration-tinta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pauta"
        >
          desfazer
        </button>
      </p>
    </div>
  );
}
