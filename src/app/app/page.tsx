import type { Metadata } from "next";
import { AppMvp } from "@/components/app/AppMvp";
import { dadosDaBusca } from "@/lib/client/parametros";
import { DEMOS } from "@/lib/engine/demo";
import { itensDoArquivo } from "@/lib/virais";

export const metadata: Metadata = {
  title: "social.Ai | Suas ideias de hoje",
  description: "Cole o site da sua startup e aprove as ideias de post do dia, com estratégia e métricas.",
};

export default async function PaginaApp({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const dados = dadosDaBusca(await searchParams);
  return (
    <AppMvp
      dados={dados}
      totalVirais={itensDoArquivo().length}
      exemplos={DEMOS.map((d) => ({ nome: d.brand.nome, dominio: d.brand.dominio }))}
    />
  );
}
