"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { buscarSugestoesConcorrentes, normalizarConcorrentes, normalizarLink } from "@/lib/client/onboarding";
import type { PesquisaMercado, SugestaoConcorrente } from "@/lib/motor/contrato";
import type { BrandProfile } from "@/lib/types";
import type { ContextoConfirmado } from "@/lib/contexto/contrato";

const MAXIMO = 3;

/** Escolha de concorrentes: sugestões marcadas (pelo link) e os links colados à mão (sempre 3 posições). */
export interface Concorrentes {
  marcados: string[];
  manuais: string[];
}

export type StatusSugestoes = "ocioso" | "carregando" | "pronto" | "falhou";

export interface ControleConcorrentes {
  valor: Concorrentes;
  setValor: (f: (c: Concorrentes) => Concorrentes) => void;
  status: StatusSugestoes;
  sugestoes: SugestaoConcorrente[];
  /** Pesquisa de mercado na web (o que os concorrentes publicam e o que está em alta), quando houve. */
  pesquisa: PesquisaMercado | null;
  /** Pede sugestões para a marca. Não trava nada: enquanto isso, os campos manuais funcionam. */
  buscar: (brand: BrandProfile, publico: string, contexto?: ContextoConfirmado) => void;
  invalidar: () => void;
  /** Traz os links salvos da última vez, se a pessoa ainda não mexeu em nada. */
  restaurar: (links: string[]) => void;
  /** Até 3 links finais, para `preferencias.concorrentes`. */
  finais: () => string[];
}

const manuaisValidos = (m: string[]) => m.filter((v) => normalizarLink(v)).length;

export function useConcorrentes(): ControleConcorrentes {
  const [valor, setValorBruto] = useState<Concorrentes>({ marcados: [], manuais: ["", "", ""] });
  const [status, setStatus] = useState<StatusSugestoes>("ocioso");
  const [sugestoes, setSugestoes] = useState<SugestaoConcorrente[]>([]);
  const [pesquisa, setPesquisa] = useState<PesquisaMercado | null>(null);
  const ctrl = useRef<AbortController | null>(null);
  const cache = useRef(new Map<string, { sugestoes: SugestaoConcorrente[]; pesquisa?: PesquisaMercado }>());
  const ultimaChave = useRef("");
  // Depois que a pessoa escolhe algo (ou volta com escolhas salvas), a tela não marca nada sozinha.
  const escolheu = useRef(false);
  const valorRef = useRef(valor);
  useEffect(() => {
    valorRef.current = valor;
  }, [valor]);

  const setValor = useCallback((f: (c: Concorrentes) => Concorrentes) => {
    escolheu.current = true;
    setValorBruto(f);
  }, []);

  const aplicar = useCallback((novas: SugestaoConcorrente[]) => {
    setSugestoes((antigas) => {
      // Sugestão já marcada que sumiu da lista nova continua visível, para não perder a escolha.
      const urls = new Set(novas.map((s) => s.url));
      return [...antigas.filter((s) => !urls.has(s.url) && valorRef.current.marcados.includes(s.url)), ...novas];
    });
    setValorBruto((c) => {
      const porLink = new Map(novas.map((s) => [s.url, s]));
      // Link colado que é igual a uma sugestão vira sugestão marcada.
      const iguais = c.manuais.map((m) => normalizarLink(m)).filter((u): u is string => !!u && porLink.has(u));
      let marcados = [...new Set([...c.marcados, ...iguais])];
      const manuais = c.manuais.map((m) => (iguais.includes(normalizarLink(m) ?? "") ? "" : m));
      // Até a pessoa mexer, os concorrentes achados pela IA já vão marcados: o motor analisa sem pedir nada.
      if (!escolheu.current) {
        const vagas = MAXIMO - marcados.length - manuaisValidos(manuais);
        const daIa = novas.filter((s) => s.fonte === "ia" && !marcados.includes(s.url)).slice(0, Math.max(0, vagas));
        marcados = [...marcados, ...daIa.map((s) => s.url)];
      }
      return { marcados: marcados.slice(0, MAXIMO), manuais };
    });
  }, []);

  const buscar = useCallback(
    (brand: BrandProfile, publico: string, contexto?: ContextoConfirmado) => {
      const chave = `${brand.dominio}|${publico.trim().toLowerCase()}|${JSON.stringify(contexto ?? null)}`;
      if (chave === ultimaChave.current) return;
      ultimaChave.current = chave;
      ctrl.current?.abort();
      const guardadas = cache.current.get(chave);
      if (guardadas) {
        setStatus(guardadas.sugestoes.length ? "pronto" : "falhou");
        aplicar(guardadas.sugestoes);
        if (guardadas.pesquisa) setPesquisa(guardadas.pesquisa);
        return;
      }
      const c = new AbortController();
      ctrl.current = c;
      setStatus("carregando");
      buscarSugestoesConcorrentes(brand, publico, c.signal, contexto)
        .then((r) => {
          if (c.signal.aborted) return;
          cache.current.set(chave, r);
          setStatus(r.sugestoes.length ? "pronto" : "falhou");
          aplicar(r.sugestoes);
          // Uma busca sem pesquisa (limite do dia, IA fora) não apaga a pesquisa que já veio.
          if (r.pesquisa) setPesquisa(r.pesquisa);
        })
        .catch(() => {
          if (c.signal.aborted) return;
          // Falha não entra no cache: a próxima busca com os mesmos dados tenta de novo.
          ultimaChave.current = "";
          setStatus("falhou");
        });
    },
    [aplicar],
  );

  useEffect(() => () => ctrl.current?.abort(), []);

  const restaurar = useCallback((links: string[]) => {
    const limpos = normalizarConcorrentes(links);
    if (!limpos.length) return;
    setValorBruto((c) => {
      if (c.marcados.length || c.manuais.some((v) => v.trim())) return c;
      escolheu.current = true;
      return { marcados: [], manuais: [...limpos, "", "", ""].slice(0, MAXIMO) };
    });
  }, []);

  const finais = useCallback(() => normalizarConcorrentes([...valorRef.current.marcados, ...valorRef.current.manuais]), []);

  const invalidar = useCallback(() => {
    ctrl.current?.abort(); ultimaChave.current = ""; cache.current.clear();
    setSugestoes([]); setPesquisa(null); setStatus("ocioso");
    setValorBruto(c => ({ ...c, marcados: [] }));
  }, []);

  return { valor, setValor, status, sugestoes, pesquisa, buscar, restaurar, finais, invalidar };
}

const CAMPO =
  "h-11 w-full min-w-0 rounded-full border border-tinta/20 bg-white px-4 text-base outline-none transition-colors placeholder:text-tinta-3/70 focus:border-tinta focus-visible:outline-none";

/**
 * Concorrentes ou perfis que a pessoa acompanha. A tela sugere alguns e a pessoa marca os que valem;
 * dá para colar link também. Até 3 no total. Só o motor usa, e nada disso aparece nos posts.
 */
export function CampoConcorrentes({ controle, titulo }: { controle: ControleConcorrentes; titulo: string }) {
  const { valor, setValor, status, sugestoes, pesquisa } = controle;
  const total = valor.marcados.length + manuaisValidos(valor.manuais);
  const cheio = total >= MAXIMO;
  const daIa = sugestoes.filter((s) => s.fonte === "ia");
  const doNicho = sugestoes.filter((s) => s.fonte === "base_nicho");
  const ultimoPreenchido = valor.manuais.reduce((n, v, i) => (v.trim() ? i + 1 : n), 0);
  const visiveis = Math.max(MAXIMO - valor.marcados.length, ultimoPreenchido);

  function alternar(url: string) {
    setValor((c) =>
      c.marcados.includes(url)
        ? { ...c, marcados: c.marcados.filter((u) => u !== url) }
        : c.marcados.length + manuaisValidos(c.manuais) >= MAXIMO
          ? c
          : { ...c, marcados: [...c.marcados, url] },
    );
  }

  return (
    <fieldset>
      <legend className={titulo}>
        Concorrentes ou perfis que você acompanha <span className="font-sans text-sm font-normal text-tinta-3">(opcional)</span>
      </legend>
      <p className="mt-1 text-sm text-tinta-3">Até 3. A gente usa só por dentro, para ver o que já funciona no seu mercado. Não aparece nos posts.</p>

      {status === "carregando" && (
        <div className="mt-4" role="status" aria-live="polite">
          <p className="text-sm text-tinta-2">
            Pesquisando concorrentes e o que está em alta no seu mercado <span className="inline-block animate-pisca text-pauta">▍</span>
          </p>
          <div className="mt-3 space-y-2" aria-hidden>
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-[4.25rem] animate-pulse rounded-2xl bg-papel" />
            ))}
          </div>
        </div>
      )}

      {status !== "carregando" && daIa.length > 0 && (
        <GrupoSugestoes titulo="Sugestões para você conferir" dica="Sugeridas por IA, não confirmadas como concorrentes. Marque apenas as que fazem sentido para o seu negócio." itens={daIa} marcados={valor.marcados} cheio={cheio} onAlternar={alternar} />
      )}
      {status !== "carregando" && doNicho.length > 0 && (
        <GrupoSugestoes
          titulo="Referências do seu nicho"
          dica="Perfis fortes do seu mercado, não necessariamente concorrentes. Marque se quiser que a gente olhe."
          itens={doNicho}
          marcados={valor.marcados}
          cheio={cheio}
          onAlternar={alternar}
        />
      )}
      {status !== "carregando" && pesquisa && pesquisa.em_alta.length > 0 && <EmAlta pesquisa={pesquisa} />}
      {valor.marcados.length > 0 && (
        <p className="mt-2 text-xs tabular-nums text-tinta-3" aria-live="polite">
          {total} de 3 escolhidos.{cheio ? " Desmarque um para trocar ou colar outro link." : ""}
        </p>
      )}

      <div className={visiveis > 0 ? "mt-4" : ""}>
        {sugestoes.length > 0 && visiveis > 0 && <p className="mb-2 text-sm text-tinta-2">Ou cole o link</p>}
        <div className="space-y-2">
          {valor.manuais.slice(0, visiveis).map((v, i) => {
            const invalido = v.trim() !== "" && !normalizarLink(v);
            return (
              <div key={i}>
                <label htmlFor={`concorrente-${i}`} className="sr-only">
                  Link de concorrente ou perfil {i + 1}
                </label>
                <input
                  id={`concorrente-${i}`}
                  inputMode="url"
                  autoCapitalize="none"
                  autoComplete="off"
                  spellCheck={false}
                  maxLength={500}
                  value={v}
                  disabled={cheio && !v.trim()}
                  placeholder={cheio && !v.trim() ? "Limite de 3 atingido" : ["instagram.com/concorrente", "linkedin.com/company/...", "site-do-concorrente.com.br"][i]}
                  onChange={(e) => setValor((c) => ({ ...c, manuais: c.manuais.map((x, k) => (k === i ? e.target.value : x)) }))}
                  aria-invalid={invalido}
                  aria-describedby={invalido ? `concorrente-${i}-erro` : undefined}
                  className={`${CAMPO} disabled:cursor-not-allowed disabled:bg-papel`}
                />
                {invalido && (
                  <p id={`concorrente-${i}-erro`} className="mt-1 pl-4 text-xs text-pauta-escura">
                    Esse não parece um link. Ele vai ficar de fora.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </fieldset>
  );
}

function GrupoSugestoes({
  titulo,
  dica,
  itens,
  marcados,
  cheio,
  onAlternar,
}: {
  titulo: string;
  dica?: string;
  itens: SugestaoConcorrente[];
  marcados: string[];
  cheio: boolean;
  onAlternar: (url: string) => void;
}) {
  return (
    <div className="mt-4">
      <p className="text-sm font-medium text-tinta">{titulo}</p>
      {dica && <p className="mt-0.5 text-sm text-tinta-3">{dica}</p>}
      <ul className="mt-2 space-y-2">
        {itens.map((s) => {
          const ativo = marcados.includes(s.url);
          const bloqueado = !ativo && cheio;
          return (
            <li key={s.url}>
              <button
                type="button"
                onClick={() => onAlternar(s.url)}
                aria-pressed={ativo}
                disabled={bloqueado}
                className={`flex w-full min-w-0 items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pauta disabled:cursor-not-allowed disabled:opacity-40 ${
                  ativo ? "border-tinta bg-tinta text-papel" : "border-tinta/20 bg-white hover:border-tinta"
                }`}
              >
                <span
                  aria-hidden
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs leading-none ${ativo ? "border-papel" : "border-tinta/30"}`}
                >
                  {ativo ? "✓" : ""}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium leading-snug">{s.nome}</span>
                  <span className={`block truncate text-xs ${ativo ? "text-papel/70" : "text-tinta-3"}`}>{s.url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}</span>
                  {s.motivo && <span className={`mt-1 block text-sm leading-snug ${ativo ? "text-papel/85" : "text-tinta-2"}`}>{s.motivo}</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** O que a pesquisa na web achou em alta no nicho. Vai para o motor junto com os concorrentes. */
function EmAlta({ pesquisa }: { pesquisa: PesquisaMercado }) {
  return (
    <div className="mt-5 rounded-2xl bg-papel px-4 py-3">
      <p className="text-sm font-medium text-tinta">Em alta no seu mercado</p>
      <p className="mt-0.5 text-sm text-tinta-3">Achamos isso na web agora. Os seus posts vão partir daqui, com o seu jeito.</p>
      <ul className="mt-2 space-y-2">
        {pesquisa.em_alta.slice(0, 4).map((t, i) => (
          <li key={i} className="text-sm leading-snug text-tinta-2">
            <span className="font-medium text-tinta">{t.tema}</span>
            {t.gancho && <span>. {t.gancho}</span>}
            {t.url && (
              <>
                {" "}
                <a href={t.url} target="_blank" rel="noopener noreferrer" className="whitespace-nowrap text-tinta-3 underline decoration-tinta/30 underline-offset-2 hover:text-tinta">
                  fonte
                </a>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
