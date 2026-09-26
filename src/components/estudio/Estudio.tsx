"use client";

import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { EVENTO_COMECAR } from "@/components/landing/BotaoComecar";
import type { Analise, BrandProfile } from "@/lib/types";
import { Carregando, type Etapa } from "./Carregando";
import { Formulario, type DadosFormulario } from "./Formulario";
import { Painel } from "./Painel";

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));
const agora = () => Date.now();

/** Lê JSON da API; se vier HTML (timeout da plataforma) ou erro, vira uma mensagem legível. */
async function lerResposta(res: Response, mensagemPadrao: string) {
  const txt = await res.text();
  let dados: { erro?: string } | null = null;
  try {
    dados = JSON.parse(txt);
  } catch {
    throw new Error(mensagemPadrao);
  }
  if (!res.ok) throw new Error(dados?.erro ?? mensagemPadrao);
  return dados as never;
}

function etapasIniciais(dominio: string, quantidade: number, totalVirais: number): Etapa[] {
  return [
    { id: "abrir", texto: `Abrindo ${dominio} e lendo o que a empresa diz sobre si`, estado: "andando" },
    { id: "paleta", texto: "Tirando paleta, fontes e logo do código do site", estado: "pendente" },
    { id: "nicho", texto: "Descobrindo nicho, público e tom de voz", estado: "pendente" },
    { id: "virais", texto: `Comparando com ${totalVirais} posts da base de virais`, estado: "pendente" },
    { id: "escrever", texto: `Escrevendo diagnóstico, estratégia e ${quantidade} posts`, estado: "pendente" },
    { id: "artes", texto: "Diagramando as artes na identidade da marca", estado: "pendente" },
  ];
}

export function Estudio({
  cabecalho,
  exemplos,
  totalVirais,
}: {
  cabecalho: ReactNode;
  exemplos: { nome: string; dominio: string }[];
  totalVirais: number;
}) {
  const [fase, setFase] = useState<"form" | "trabalhando" | "pronto">("form");
  // O campo de URL só aparece depois do "Começar agora", para o topo ficar limpo.
  const [aberto, setAberto] = useState(false);
  const [etapas, setEtapas] = useState<Etapa[]>([]);
  const [brand, setBrand] = useState<BrandProfile | null>(null);
  const [analise, setAnalise] = useState<Analise | null>(null);
  const [dominio, setDominio] = useState("");
  const [erro, setErro] = useState("");
  const execucao = useRef(0);

  useEffect(() => {
    const abrir = () => {
      setAberto(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
      requestAnimationFrame(() => document.getElementById("url")?.focus({ preventScroll: true }));
    };
    window.addEventListener(EVENTO_COMECAR, abrir);
    return () => window.removeEventListener(EVENTO_COMECAR, abrir);
  }, []);

  const marcar = (id: string, estado: Etapa["estado"]) => setEtapas((es) => es.map((e) => (e.id === id ? { ...e, estado } : e)));

  async function rodar(d: DadosFormulario) {
    const minha = ++execucao.current;
    const vivo = () => execucao.current === minha;
    const dom = d.url.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
    setDominio(dom);
    setErro("");
    setBrand(null);
    setAnalise(null);
    setEtapas(etapasIniciais(dom, d.quantidade, totalVirais));
    setFase("trabalhando");
    requestAnimationFrame(() => document.getElementById("redacao")?.scrollIntoView({ behavior: "smooth", block: "center" }));
    const inicio = agora();

    try {
      const handles = { instagram: d.instagram || undefined, linkedin: d.linkedin || undefined, x: d.x || undefined, facebook: d.facebook || undefined };
      const rb = await fetch("/api/brand", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: d.url, ...handles, paletaInstagram: d.paletaInstagram.length ? d.paletaInstagram : undefined }),
      });
      const b = await lerResposta(rb, "Não consegui ler esse site.");
      if (!vivo()) return;
      marcar("abrir", "feito");
      marcar("paleta", "andando");
      await espera(450);
      setBrand(b);
      marcar("paleta", "feito");
      marcar("nicho", "andando");

      // As etapas de IA avançam enquanto a resposta não chega; a última só fecha com a resposta.
      const avancos = ["nicho", "virais", "escrever"];
      let k = 0;
      const timer = setInterval(() => {
        if (k < avancos.length - 1) {
          marcar(avancos[k], "feito");
          marcar(avancos[k + 1], "andando");
          k++;
        }
      }, 1400);
      const ra = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ brand: b, ...handles, quantidade: d.quantidade }),
      });
      clearInterval(timer);
      const a = await lerResposta(ra, "O motor demorou demais para responder. Tente de novo ou use um dos exemplos.");
      if (!vivo()) return;
      for (const id of avancos) marcar(id, "feito");
      marcar("artes", "andando");
      // Um respiro mínimo para a pessoa conseguir ler o que aconteceu, mesmo quando vem do cache.
      await espera(Math.max(600, 3600 - (agora() - inicio)));
      marcar("artes", "feito");
      await espera(250);
      if (!vivo()) return;
      setAnalise(a);
      setFase("pronto");
      requestAnimationFrame(() => document.getElementById("resultado")?.scrollIntoView({ behavior: "smooth" }));
    } catch (e) {
      if (!vivo()) return;
      setErro(e instanceof TypeError ? "Sem conexão com o servidor. Confira a internet e tente de novo." : (e as Error).message);
      setFase("form");
    }
  }

  function exemplo(dominio: string) {
    rodar({ url: dominio, instagram: "", linkedin: "", x: "", facebook: "", quantidade: 6, paletaInstagram: [] });
  }

  function nova() {
    execucao.current++;
    setFase("form");
    setAberto(true);
    setAnalise(null);
    setBrand(null);
    requestAnimationFrame(() => document.getElementById("topo")?.scrollIntoView({ behavior: "smooth" }));
  }

  return (
    <>
      <section id="topo" className="scroll-mt-4">
        <div className="mx-auto flex min-h-[calc(100svh-4.5rem)] max-w-6xl flex-col justify-center px-4 pb-32 pt-8 sm:min-h-0 sm:px-6 sm:pb-24 sm:pt-24 lg:pt-32">
          {cabecalho}
          <div className="mt-10 max-w-2xl">
            {fase === "trabalhando" ? (
              <div id="redacao">
                <Carregando etapas={etapas} brand={brand} dominio={dominio} />
              </div>
            ) : aberto || fase === "pronto" ? (
              <>
                <Formulario onEnviar={rodar} ocupado={false} />
                {erro && (
                  <p className="mt-4 border border-pauta/40 bg-pauta/5 px-3 py-2 text-sm" role="alert">
                    {erro}
                  </p>
                )}
                {fase === "pronto" && analise && (
                  <a href="#resultado" className="mt-5 inline-block text-sm underline underline-offset-4 hover:text-tinta-2">
                    Ver os posts gerados
                  </a>
                )}
              </>
            ) : (
              <button
                type="button"
                onClick={() => window.dispatchEvent(new Event(EVENTO_COMECAR))}
                className="h-14 bg-pauta px-8 text-lg font-semibold text-white transition-colors hover:bg-pauta-escura"
              >
                Começar agora
              </button>
            )}
            {fase !== "trabalhando" && exemplos.length > 0 && (
              <p className={`mt-6 text-sm text-tinta-3 ${aberto || fase === "pronto" ? "" : "hidden sm:block"}`}>
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
      </section>
      {fase === "pronto" && analise && <Painel key={analise.id} analise={analise} onNova={nova} />}
    </>
  );
}
