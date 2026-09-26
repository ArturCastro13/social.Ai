"use client";

import { useRef, useState, type ReactNode } from "react";
import type { Analise, BrandProfile } from "@/lib/types";
import { Carregando, type Etapa } from "./Carregando";
import { Formulario, type DadosFormulario } from "./Formulario";
import { Painel } from "./Painel";

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

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
  vitrine,
  exemplos,
  totalVirais,
}: {
  cabecalho: ReactNode;
  vitrine: ReactNode;
  exemplos: { nome: string; dominio: string; cor: string }[];
  totalVirais: number;
}) {
  const [fase, setFase] = useState<"form" | "trabalhando" | "pronto">("form");
  const [etapas, setEtapas] = useState<Etapa[]>([]);
  const [brand, setBrand] = useState<BrandProfile | null>(null);
  const [analise, setAnalise] = useState<Analise | null>(null);
  const [dominio, setDominio] = useState("");
  const [erro, setErro] = useState("");
  const execucao = useRef(0);

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
    const inicio = Date.now();

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
      let email: string | undefined;
      try {
        email = localStorage.getItem("socialai_email") ?? undefined;
      } catch {
        /* ignora */
      }
      const ra = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ brand: b, ...handles, quantidade: d.quantidade, email }),
      });
      clearInterval(timer);
      const a = await lerResposta(ra, "O motor demorou demais para responder. Tente de novo ou use um dos exemplos.");
      if (!vivo()) return;
      for (const id of avancos) marcar(id, "feito");
      marcar("artes", "andando");
      // Um respiro mínimo para a pessoa conseguir ler o que aconteceu, mesmo quando vem do cache.
      await espera(Math.max(600, 3600 - (Date.now() - inicio)));
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
    setAnalise(null);
    setBrand(null);
    requestAnimationFrame(() => document.getElementById("topo")?.scrollIntoView({ behavior: "smooth" }));
  }

  return (
    <>
      <section id="topo" className="relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 pb-16 pt-8 sm:pt-10 lg:grid-cols-[1.2fr_1fr] lg:gap-12 lg:pb-20">
          <div className="flex flex-col justify-center">
            {cabecalho}
            <div className="mt-7">
              {fase === "trabalhando" ? (
                <div id="redacao">
                  <Carregando etapas={etapas} brand={brand} dominio={dominio} />
                </div>
              ) : (
                <>
                  <Formulario onEnviar={rodar} ocupado={false} exemplos={exemplos} onExemplo={exemplo} />
                  {erro && (
                    <p className="mt-4 border-l-4 border-pauta bg-pauta/10 px-3 py-2 text-sm" role="alert">
                      {erro}
                    </p>
                  )}
                  {fase === "pronto" && analise && (
                    <a href="#resultado" className="retranca mt-5 inline-block text-pauta underline underline-offset-4">
                      ↓ ver a pauta gerada
                    </a>
                  )}
                </>
              )}
            </div>
          </div>
          <div className="relative">{vitrine}</div>
        </div>
      </section>
      {fase === "pronto" && analise && <Painel key={analise.id} analise={analise} onNova={nova} />}
    </>
  );
}
