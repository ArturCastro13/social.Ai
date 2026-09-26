"use client";

import { useRouter } from "next/navigation";
import { Fragment, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { EVENTO_COMECAR } from "@/components/landing/BotaoComecar";
import { urlDoApp } from "@/lib/client/parametros";
import { Formulario, type DadosFormulario } from "./Formulario";

/** Hero da landing. O formulário leva para /app, onde as ideias são geradas, para a página inicial não misturar as duas coisas. */
export function Estudio({
  cabecalho,
  vitrine,
  exemplos,
}: {
  cabecalho: ReactNode;
  vitrine?: ReactNode;
  exemplos: { nome: string; dominio: string }[];
}) {
  const router = useRouter();
  // O campo de URL só aparece depois do "Começar agora", para o topo ficar limpo.
  const [aberto, setAberto] = useState(false);
  const [indo, setIndo] = useState(false);

  useEffect(() => {
    const abrir = () => {
      setAberto(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
      requestAnimationFrame(() => document.getElementById("url")?.focus({ preventScroll: true }));
    };
    window.addEventListener(EVENTO_COMECAR, abrir);
    return () => window.removeEventListener(EVENTO_COMECAR, abrir);
  }, []);

  function ir(d: DadosFormulario) {
    setIndo(true);
    router.push(urlDoApp(d));
  }

  function exemplo(dominio: string) {
    router.push(urlDoApp({ url: dominio }, true));
  }

  return (
    <>
      <section id="topo" className="scroll-mt-4">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 pb-20 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] lg:items-center lg:gap-14 lg:pb-28 lg:pt-10">
          <div className="flex flex-col justify-center pb-4 pt-12 sm:pt-16 lg:py-0">
          {cabecalho}
          <div style={{ "--atraso": "340ms" } as CSSProperties} className="entrada mt-10 max-w-2xl">
            {aberto ? (
              <Formulario onEnviar={ir} ocupado={indo} />
            ) : (
              <button
                type="button"
                onClick={() => window.dispatchEvent(new Event(EVENTO_COMECAR))}
                className="tocavel h-14 rounded-full bg-pauta px-8 text-lg font-semibold text-white transition-colors hover:bg-pauta-escura"
              >
                Começar agora
              </button>
            )}
            {exemplos.length > 0 && (
              <p className={`mt-6 text-sm text-tinta-3 ${aberto ? "" : "hidden sm:block"}`}>
                ver exemplo:{" "}
                {exemplos.map((ex, i) => (
                  <Fragment key={ex.dominio}>
                    <button
                      type="button"
                      onClick={() => exemplo(ex.dominio)}
                      className="underline decoration-tinta/30 underline-offset-4 transition-colors hover:text-tinta hover:decoration-tinta"
                    >
                      {ex.nome}
                    </button>
                    {i < exemplos.length - 1 ? ", " : ""}
                  </Fragment>
                ))}
              </p>
            )}
          </div>
          </div>
          {vitrine && (
            <div style={{ "--atraso": "260ms" } as CSSProperties} className="entrada min-w-0">
              {vitrine}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
