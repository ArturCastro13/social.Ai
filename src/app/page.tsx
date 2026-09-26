import { Estudio } from "@/components/estudio/Estudio";
import { BaralhoHero } from "@/components/landing/BaralhoHero";
import {
  arteEstatica,
  Cabecalho,
  Chamada,
  ComoFunciona,
  Dor,
  Exemplos,
  Manifesto,
  Metricas,
  PainelHero,
  Perguntas,
  Planos,
  Rodape,
  Topo,
  Video,
} from "@/components/landing/Secoes";
import { DEMOS } from "@/lib/engine/demo";
import { ordenarPorOportunidade, sinaisDoNicho } from "@/lib/oportunidade";
import { NICHOS } from "@/lib/types";
import { itensDoArquivo } from "@/lib/virais";

// Ordem do baralho do topo: alterna as três marcas para mostrar que cada post sai na identidade de quem pediu.
const CARTAS_HERO = ["cora-p1", "pipefy-p1", "sallve-p4", "cora-p5", "pipefy-p6", "sallve-p1", "cora-p2", "pipefy-p3"];

export default function Home() {
  const itens = itensDoArquivo();
  const cora = DEMOS.find((d) => d.id === "cora") ?? DEMOS[0];
  const radar = sinaisDoNicho(itens, "saas-b2b");
  const [ideia] = ordenarPorOportunidade(cora.posts, sinaisDoNicho(itens, cora.nicho), [], []);
  const cartas = CARTAS_HERO.flatMap((id) => {
    const d = DEMOS.find((x) => x.posts.some((p) => p.id === id));
    const p = d?.posts.find((x) => x.id === id);
    return d && p ? [{ id, src: arteEstatica(id), alt: `Post gerado para ${d.brand.nome}: ${p.gancho}`, estatica: true }] : [];
  });

  return (
    <>
      <Topo />
      <main className="flex-1">
        <Estudio
          cabecalho={<Cabecalho />}
          vitrine={
            <PainelHero>
              <BaralhoHero cartas={cartas} />
            </PainelHero>
          }
          exemplos={DEMOS.map((d) => ({ nome: d.brand.nome, dominio: d.brand.dominio }))}
          totalVirais={itens.length}
        />
        <Dor />
        <Manifesto />
        <Video />
        <ComoFunciona demo={cora} outliers={radar.outliers} nichoRadar={NICHOS.find((n) => n.id === "saas-b2b")?.nome ?? "SaaS B2B"} ideia={ideia} />
        <Metricas />
        <Exemplos demos={DEMOS} />
        <Planos />
        <Perguntas />
        <Chamada />
      </main>
      <Rodape />
    </>
  );
}
