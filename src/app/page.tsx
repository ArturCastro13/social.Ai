import { Estudio } from "@/components/estudio/Estudio";
import { Cabecalho, ComoFunciona, Exemplos, Planos, Rodape, Topo } from "@/components/landing/Secoes";
import { DEMOS } from "@/lib/engine/demo";
import { itensDoArquivo } from "@/lib/virais";

export default function Home() {
  return (
    <>
      <Topo />
      <main className="flex-1">
        <Estudio
          cabecalho={<Cabecalho />}
          exemplos={DEMOS.map((d) => ({ nome: d.brand.nome, dominio: d.brand.dominio }))}
          totalVirais={itensDoArquivo().length}
        />
        <Exemplos demos={DEMOS} />
        <ComoFunciona />
        <Planos />
      </main>
      <Rodape />
    </>
  );
}
