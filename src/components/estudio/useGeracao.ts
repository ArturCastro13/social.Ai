"use client";

import { useRef, useState } from "react";
import { ehSemSite } from "@/lib/brand/sem-site";
import type { Preferencias } from "@/lib/motor/contrato";
import type { Analise, BrandProfile } from "@/lib/types";
import type { Etapa } from "./Carregando";
import type { DadosFormulario } from "./Formulario";

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

export const dominioDe = (url: string) => url.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0].toLowerCase();

function etapasIniciais(dominio: string, quantidade: number, totalVirais: number, semSite?: { comPrint: boolean }): Etapa[] {
  const inicio: Etapa[] = semSite
    ? [
        { id: "abrir", texto: "Montando a marca com o que você contou", estado: "andando" },
        {
          id: "paleta",
          texto: semSite.comPrint ? "Usando as cores do print do Instagram nas artes" : "Escolhendo uma paleta neutra para as artes",
          estado: "pendente",
        },
      ]
    : [
        { id: "abrir", texto: `Abrindo ${dominio} e lendo o que a empresa diz sobre si`, estado: "andando" },
        { id: "paleta", texto: "Tirando paleta, fontes e logo do código do site", estado: "pendente" },
      ];
  return [
    ...inicio,
    { id: "nicho", texto: "Descobrindo nicho, público e tom de voz", estado: "pendente" },
    { id: "virais", texto: `Comparando com ${totalVirais} posts da base de virais`, estado: "pendente" },
    { id: "escrever", texto: `Escrevendo estratégia e ${quantidade} ideias de post`, estado: "pendente" },
    { id: "artes", texto: "Diagramando as artes na identidade da marca", estado: "pendente" },
  ];
}

export interface OpcoesGeracao {
  /** Escolhas das telas 2 e 3. Sem elas, o motor segue só com a leitura do site, como antes. */
  preferencias?: Preferencias;
  /** Marca já lida na tela 2, para não abrir o site duas vezes. */
  brand?: BrandProfile | null;
}

/** Lê a marca e gera a análise, mostrando as etapas reais enquanto espera. */
export function useGeracao(totalVirais: number) {
  const [fase, setFase] = useState<"parado" | "trabalhando" | "pronto" | "erro">("parado");
  const [etapas, setEtapas] = useState<Etapa[]>([]);
  const [brand, setBrand] = useState<BrandProfile | null>(null);
  const [analise, setAnalise] = useState<Analise | null>(null);
  const [dominio, setDominio] = useState("");
  const [erro, setErro] = useState("");
  const execucao = useRef(0);

  const marcar = (id: string, estado: Etapa["estado"]) => setEtapas((es) => es.map((e) => (e.id === id ? { ...e, estado } : e)));

  /** Volta ao estado inicial (quando a pessoa troca de site sem sair da página). */
  function reiniciar() {
    execucao.current++;
    setFase("parado");
    setEtapas([]);
    setBrand(null);
    setAnalise(null);
    setErro("");
  }

  async function gerar(d: DadosFormulario, opcoes: OpcoesGeracao = {}) {
    const minha = ++execucao.current;
    const vivo = () => execucao.current === minha;
    // Sem site não há domínio para mostrar: vale o nome que a pessoa deu à empresa.
    const semSite = !!opcoes.brand?.sem_site || ehSemSite(d.url) || !!d.semSite;
    const dom = semSite ? (opcoes.brand?.nome ?? "sua empresa") : dominioDe(d.url);
    setDominio(dom);
    setErro("");
    setBrand(null);
    setAnalise(null);
    setEtapas(etapasIniciais(dom, d.quantidade, totalVirais, semSite ? { comPrint: d.paletaInstagram.length > 0 } : undefined));
    setFase("trabalhando");
    const inicio = agora();

    try {
      const handles = { instagram: d.instagram || undefined, linkedin: d.linkedin || undefined, x: d.x || undefined, facebook: d.facebook || undefined };
      let b: BrandProfile;
      if (opcoes.brand) {
        b = opcoes.brand;
        await espera(350);
      } else if (semSite) {
        // Sem site não há o que abrir; a marca só existe depois da tela da empresa.
        throw new Error("Faltou contar sobre a empresa. Volte e preencha o nome e o que vocês fazem.");
      } else {
        const rb = await fetch("/api/brand", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ url: d.url, ...handles, paletaInstagram: d.paletaInstagram.length ? d.paletaInstagram : undefined }),
        });
        b = await lerResposta(rb, "Não consegui ler esse site.");
      }
      if (!vivo()) return;
      marcar("abrir", "feito");
      marcar("paleta", "andando");
      await espera(450);
      setBrand(b);
      marcar("paleta", "feito");
      marcar("nicho", "andando");

      // As etapas de escrita avançam enquanto a resposta não chega; a última só fecha com a resposta.
      const avancos = ["nicho", "virais", "escrever"];
      let k = 0;
      const timer = setInterval(() => {
        if (k < avancos.length - 1) {
          marcar(avancos[k], "feito");
          marcar(avancos[k + 1], "andando");
          k++;
        }
      }, 1400);
      let ra: Response;
      try {
        ra = await fetch("/api/analyze", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ brand: b, ...handles, quantidade: d.quantidade, ...(opcoes.preferencias ? { preferencias: opcoes.preferencias } : {}) }),
        });
      } finally {
        clearInterval(timer);
      }
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
    } catch (e) {
      if (!vivo()) return;
      setErro(e instanceof TypeError ? "Sem conexão com o servidor. Confira a internet e tente de novo." : (e as Error).message);
      setFase("erro");
    }
  }

  return { fase, etapas, brand, analise, dominio, erro, gerar, reiniciar };
}
