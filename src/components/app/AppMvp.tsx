"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useState } from "react";
import { Carregando } from "@/components/estudio/Carregando";
import { Formulario, type DadosFormulario } from "@/components/estudio/Formulario";
import { Painel } from "@/components/estudio/Painel";
import { useGeracao } from "@/components/estudio/useGeracao";
import { TelaAjustes } from "@/components/onboarding/TelaAjustes";
import type { Preferencias } from "@/lib/motor/contrato";
import type { BrandProfile } from "@/lib/types";
import { urlDoApp } from "@/lib/client/parametros";

const SECOES = [
  { id: "semana", nome: "Semana" },
  { id: "posts", nome: "Posts" },
  { id: "ideias", nome: "Ideias" },
  { id: "metricas", nome: "Métricas" },
  { id: "analise", nome: "Análise" },
];

/**
 * Página do MVP em camadas: tela 1 (site, para quem, @), tela 2 (ajustes já preenchidos, com a tela 3 opcional)
 * e o resultado. Com `direto` (exemplos prontos), pula a tela 2 e gera na hora, como antes.
 */
export function AppMvp({
  dados,
  direto = false,
  totalVirais,
  exemplos,
}: {
  dados: DadosFormulario | null;
  direto?: boolean;
  totalVirais: number;
  exemplos: { nome: string; dominio: string }[];
}) {
  const router = useRouter();
  const g = useGeracao(totalVirais);
  const [indo, setIndo] = useState(false);
  const [ultimas, setUltimas] = useState<{ chave?: string; dados?: DadosFormulario; preferencias?: Preferencias; brand?: BrandProfile | null }>({});
  const chave = dados ? JSON.stringify(dados) + (direto ? ":direto" : "") : "";

  // Exemplo pronto gera assim que a página abre; site novo volta para a tela de ajustes.
  useEffect(() => {
    if (dados && direto) g.gerar(dados);
    else g.reiniciar();
    // A chave resume os dados; `g.gerar` muda a cada render e não deve disparar outra geração.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave]);

  function gerarComAjustes(preferencias: Preferencias, brand: BrandProfile | null, redes: Partial<DadosFormulario>) {
    if (!dados) return;
    const completos = { ...dados, ...redes };
    setUltimas({ chave, dados: completos, preferencias, brand });
    window.scrollTo({ top: 0 });
    g.gerar(completos, { preferencias, brand });
  }

  function ir(d: DadosFormulario) {
    setIndo(true);
    router.push(urlDoApp(d));
  }
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIndo(false);
  }, [chave]);

  const pronto = g.fase === "pronto" && g.analise;

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-40 border-b border-tinta/[0.06] bg-papel/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/" className="font-display text-xl font-semibold tracking-[-0.02em]">
              social.Ai
            </Link>
            {dados && <span className="truncate rounded-full bg-papel-2 px-3 py-1 text-sm text-tinta-2">{g.dominio || dados.url}</span>}
          </div>
          {dados && (
            <Link
              href="/app"
              className="inline-flex h-10 shrink-0 items-center rounded-full border border-tinta/15 bg-white px-4 text-sm font-medium transition-colors hover:border-tinta"
            >
              Outro site
            </Link>
          )}
        </div>
        {pronto && (
          <nav aria-label="Seções do resultado" className="mx-auto flex w-full max-w-6xl gap-1 overflow-x-auto px-4 pb-3 sm:px-6">
            {SECOES.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="shrink-0 rounded-full px-3 py-1.5 text-sm text-tinta-2 transition-colors hover:bg-tinta/5 hover:text-tinta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pauta"
              >
                {s.nome}
              </a>
            ))}
          </nav>
        )}
      </header>

      <main className="flex-1">
        {!dados && (
          <section className="mx-auto max-w-2xl px-4 py-16 sm:px-6 sm:py-24">
            <h1 className="font-display text-[2.4rem] font-semibold leading-[1.05] tracking-[-0.035em] sm:text-5xl">Cole o site da sua startup.</h1>
            <p className="mt-4 text-lg leading-relaxed text-tinta-2">A gente lê o site e te mostra o que entendeu. Você só corrige o que estiver errado.</p>
            <div className="mt-10">
              <Formulario onEnviar={ir} ocupado={indo} />
            </div>
            <p className="mt-6 text-sm text-tinta-3">
              ver exemplo:{" "}
              {exemplos.map((ex, i) => (
                <Fragment key={ex.dominio}>
                  <Link href={urlDoApp({ url: ex.dominio }, true)} className="underline decoration-tinta/30 underline-offset-4 hover:text-tinta hover:decoration-tinta">
                    {ex.nome}
                  </Link>
                  {i < exemplos.length - 1 ? ", " : ""}
                </Fragment>
              ))}
            </p>
          </section>
        )}

        {dados && !direto && g.fase === "parado" && (
          <section className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
            <TelaAjustes key={chave} dados={dados} onGerar={gerarComAjustes} />
          </section>
        )}

        {dados && (g.fase === "trabalhando" || (direto && g.fase === "parado")) && (
          <section className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-20">
            <h1 className="font-display text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">Preparando as ideias de hoje</h1>
            <p className="mt-3 text-tinta-2">Estamos lendo a sua marca e o seu nicho. Não feche esta página.</p>
            <div className="mt-8">
              <Carregando etapas={g.etapas} brand={g.brand} dominio={g.dominio || dados.url} />
            </div>
          </section>
        )}

        {dados && g.fase === "erro" && (
          <section className="mx-auto max-w-2xl px-4 py-16 sm:px-6 sm:py-24">
            <h1 className="font-display text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">Não deu certo desta vez</h1>
            <p className="mt-3 rounded-2xl border border-pauta/30 bg-pauta/5 px-4 py-3 text-tinta-2" role="alert">
              {g.erro}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => (ultimas.chave === chave ? g.gerar(ultimas.dados ?? dados, ultimas) : g.gerar(dados))}
                className="inline-flex h-12 items-center rounded-full bg-pauta px-6 font-semibold text-white transition-colors hover:bg-pauta-escura"
              >
                Tentar de novo
              </button>
              <Link href="/app" className="inline-flex h-12 items-center rounded-full border border-tinta/15 bg-white px-6 font-medium transition-colors hover:border-tinta">
                Usar outro site
              </Link>
            </div>
          </section>
        )}

        {pronto && g.analise && <Painel key={g.analise.id} analise={g.analise} />}
      </main>
    </div>
  );
}
