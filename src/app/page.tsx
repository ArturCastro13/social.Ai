import { Estudio } from "@/components/estudio/Estudio";
import { Cabecalho, Chamada, ComoFunciona, Dor, Exemplo, Perguntas, Planos, Rodape, Topo, Video } from "@/components/landing/Secoes";
import { DEMOS } from "@/lib/engine/demo";

export default function Home() {
  return (
    <>
      <Topo />
      <main className="flex-1">
        <Estudio cabecalho={<Cabecalho />} exemplos={DEMOS.map((d) => ({ nome: d.brand.nome, dominio: d.brand.dominio }))} />
        <Dor />
        <Video />
        <ComoFunciona />
        <Exemplo />
        <Planos />
        <Perguntas />
        <Chamada />
      </main>
      <Rodape />
    </>
  );
}
