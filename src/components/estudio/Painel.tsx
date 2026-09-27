"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { baixarZip, gravarFoto, lerFotos, type Personalizacao } from "@/lib/client/artes";
import type { Analise } from "@/lib/types";
import { AbasBaixo, AbasTopo, type Aba } from "./abas";
import { Calendario } from "./Calendario";
import { CapasContexto } from "./capas-contexto";
import { Concorrentes } from "./Concorrentes";
import { Hoje } from "./Hoje";
import { SeusResultados } from "./SeusResultados";
import { useCapasAutomaticas } from "./useCapas";
import { useFeedback } from "./useFeedback";

/**
 * O resultado em três abas: "Hoje" (o post do dia), "Calendário" (a semana, todos os posts e vídeos)
 * e "Resultados" (seus números e o que funciona nos concorrentes).
 * As abas do computador vão para o cabeçalho da página (`slotAbas`); no celular, uma barra fixa embaixo.
 */
export function Painel({
  analise,
  aba,
  onAba,
  slotAbas,
  onNova,
}: {
  analise: Analise;
  aba: Aba;
  onAba: (aba: Aba, ancora?: string) => void;
  slotAbas?: HTMLElement | null;
  onNova?: () => void;
}) {
  const [pers, setPers] = useState<Record<string, Personalizacao>>({});
  const [fotosLidas, setFotosLidas] = useState(false);
  const [zip, setZip] = useState<{ feito: number; total: number } | null>(null);
  const [aviso, setAviso] = useState("");
  const fb = useFeedback(analise);
  const pendentes = fb.carregado ? analise.posts.filter((p) => !fb.decisoes[p.id]).length : 0;
  const mudarPers = (id: string, p: Personalizacao) => {
    if ((p.foto ?? null) !== (pers[id]?.foto ?? null)) gravarFoto(analise.id, id, p.foto ?? null);
    setPers((old) => ({ ...old, [id]: p }));
  };
  const capas = useCapasAutomaticas(analise, pers, mudarPers, fotosLidas);

  // Imagens criadas com IA voltam do navegador depois de montar (o HTML do servidor não tem localStorage).
  // Só depois de ler (com ou sem fotos) as capas automáticas podem começar: senão pediriam de novo uma capa
  // que a pessoa já tinha guardado.
  useEffect(() => {
    const fotos = lerFotos(analise.id);
    if (!Object.keys(fotos).length) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFotosLidas(true);
      return;
    }
    setPers((old) => {
      const novo = { ...old };
      for (const [id, url] of Object.entries(fotos)) novo[id] = { ...novo[id], foto: novo[id]?.foto ?? url };
      return novo;
    });
    setFotosLidas(true);
  }, [analise.id]);

  async function baixarUma(url: string, nome: string) {
    setAviso("");
    const res = await fetch(url).catch(() => null);
    if (!res?.ok) {
      setAviso("Não deu para baixar essa arte agora. Tente de novo em instantes.");
      return;
    }
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = nome;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  async function baixarTudo() {
    setZip({ feito: 0, total: 1 });
    setAviso("");
    try {
      const r = await baixarZip(analise, pers, (feito, total) => setZip({ feito, total }));
      if (r.falhas) setAviso(`${r.falhas} de ${r.total} imagens não vieram. O ZIP foi baixado com as demais.`);
    } catch (e) {
      setAviso((e as Error).message);
    } finally {
      setZip(null);
    }
  }

  return (
    <section id="resultado" className="flex flex-col bg-papel pb-[calc(4rem+env(safe-area-inset-bottom)+2rem)] md:pb-20">
      <CapasContexto.Provider value={capas}>
        {slotAbas && createPortal(<AbasTopo aba={aba} onAba={onAba} pendentes={pendentes} />, slotAbas)}

        {/* key: a aba nova entra com um leve deslize. "backwards" e não "both": transform que fica depois da animação prende as barras fixas dentro da aba. */}
        <div key={aba} className="animate-[aparecer_.35s_cubic-bezier(.2,.7,.1,1)_backwards]">
          {aba === "hoje" && <Hoje analise={analise} fb={fb} pers={pers} onPers={mudarPers} onBaixar={baixarUma} onAba={onAba} />}
          {aba === "calendario" && (
            <Calendario analise={analise} fb={fb} pers={pers} onPers={mudarPers} onBaixar={baixarUma} onZip={baixarTudo} zip={zip} aviso={aviso} onNova={onNova} />
          )}
          {aba === "resultados" && (
            <div className="mx-auto w-full max-w-6xl space-y-12 px-4 pt-6 sm:pt-10">
              <SeusResultados analise={analise} fb={fb} onAbrir={(ancora) => onAba("calendario", ancora)} />
              <section aria-labelledby="titulo-concorrentes-aba" className="border-t border-tinta/10 pt-10">
                <h2 id="titulo-concorrentes-aba" className="font-display text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">
                  Concorrentes e nicho
                </h2>
                <p className="mt-2 max-w-xl text-tinta-2">O que outras marcas publicam e o que foi bem no seu nicho. Use como referência.</p>
                <div className="mt-6 max-w-4xl">
                  <Concorrentes analise={analise} />
                </div>
              </section>
            </div>
          )}
        </div>

        <AbasBaixo aba={aba} onAba={onAba} pendentes={pendentes} />
      </CapasContexto.Provider>
    </section>
  );
}
