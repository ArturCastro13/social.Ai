/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { Analise } from "@/lib/types";
import { BotaoComecar } from "./BotaoComecar";

const TITULO_SECAO = "font-display text-2xl font-semibold tracking-[-0.02em] sm:text-3xl";

export function Topo() {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
      <Link href="/" className="font-display text-xl font-semibold tracking-[-0.02em]">
        social.Ai
      </Link>
      <BotaoComecar className="inline-flex h-10 items-center bg-tinta px-4 text-sm font-medium text-papel transition-colors hover:bg-tinta-2" />
    </header>
  );
}

export function Cabecalho() {
  return (
    <>
      <h1 className="max-w-[15ch] text-balance font-display text-[2.6rem] font-semibold leading-[1.02] tracking-[-0.035em] sm:text-6xl lg:text-7xl">
        Posts prontos para a sua marca, a partir do seu site.
      </h1>
      <p className="mt-5 max-w-md text-lg sm:max-w-xl leading-relaxed text-tinta-2">Cole o endereço e receba artes e legendas com a sua identidade.</p>
    </>
  );
}

/** Duas artes reais de cada demo, geradas pelo motor a partir do site público. */
export function Exemplos({ demos }: { demos: Analise[] }) {
  const artes = demos.flatMap((d) => d.posts.slice(0, 2).map((p) => ({ id: p.id, marca: d.brand.nome })));
  return (
    <section aria-labelledby="exemplos" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
      <h2 id="exemplos" className={TITULO_SECAO}>
        Exemplos
      </h2>
      <ul className="mt-10 grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 md:grid-cols-3 md:gap-y-12">
        {artes.map((a) => (
          <li key={a.id}>
            <img
              src={`/api/render/${a.id}?tamanho=feed`}
              alt={`Post gerado para ${a.marca}`}
              loading="lazy"
              width={1080}
              height={1350}
              className="block h-auto w-full bg-papel-2 outline outline-1 -outline-offset-1 outline-tinta/10"
            />
            <p className="mt-3 text-sm text-tinta-3">{a.marca}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ComoFunciona() {
  const passos = [
    { t: "Cole seu site", d: "Só o endereço. Os @ das redes são opcionais." },
    { t: "A IA lê sua marca e o que funciona no seu nicho", d: "Ela usa as cores e o tom do site e compara com posts de referência do setor." },
    { t: "Baixe os posts e a estratégia", d: "Arte e legenda para cada rede, com um calendário sugerido." },
  ];
  return (
    <section aria-labelledby="como-funciona" className="border-t border-tinta/10">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <h2 id="como-funciona" className={TITULO_SECAO}>
          Como funciona
        </h2>
        <ol className="mt-10 grid gap-8 md:grid-cols-3 md:gap-10">
          {passos.map((p) => (
            <li key={p.t}>
              <h3 className="text-lg font-semibold leading-snug">{p.t}</h3>
              <p className="mt-2 max-w-xs leading-relaxed text-tinta-2">{p.d}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function Planos() {
  const planos = [
    { nome: "Solo", preco: "49", itens: ["12 posts por mês", "1 marca", "Estratégia e calendário mensais"] },
    { nome: "Tração", preco: "129", itens: ["40 posts por mês", "Até 3 marcas", "Nova análise de nicho todo mês"] },
    { nome: "Time", preco: "290", itens: ["Posts ilimitados", "Até 10 marcas", "Aprovação em equipe"] },
  ];
  return (
    <section aria-labelledby="preco" className="border-t border-tinta/10">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <h2 id="preco" className={TITULO_SECAO}>
          Preço
        </h2>
        <p className="mt-2 text-tinta-3">Preços em teste.</p>
        <div className="mt-10 grid gap-12 md:grid-cols-3 md:gap-10">
          {planos.map((p) => (
            <div key={p.nome} className="flex flex-col border-t border-tinta pt-6">
              <h3 className="text-lg font-semibold">{p.nome}</h3>
              <p className="mt-3">
                <span className="font-display text-4xl font-semibold tracking-[-0.02em] tabular-nums">R$ {p.preco}</span>
                <span className="text-tinta-3"> por mês</span>
              </p>
              <ul className="mt-5 flex-1 space-y-1.5 text-tinta-2">
                {p.itens.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
              <BotaoComecar className="mt-8 inline-flex h-11 items-center justify-center border border-tinta/25 px-5 font-medium transition-colors hover:border-tinta hover:bg-tinta hover:text-papel" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Rodape() {
  return (
    <footer className="border-t border-tinta/10">
      <p className="mx-auto max-w-6xl px-4 py-8 text-sm text-tinta-3 sm:px-6">
        social.Ai. Exemplos gerados a partir de sites públicos, sem vínculo com as marcas.
      </p>
    </footer>
  );
}
