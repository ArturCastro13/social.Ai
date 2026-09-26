import type { Metadata } from "next";
import { AppMvp } from "@/components/app/AppMvp";
import { dadosDaBusca, diretoDaBusca } from "@/lib/client/parametros";
import { DEMOS } from "@/lib/engine/demo";
import { itensDoArquivo } from "@/lib/virais";

export const metadata: Metadata = {
  title: "social.Ai | Comece pelo seu site",
  description: "Cole o site ou conte sobre a sua empresa. Três perguntas e a sua semana de posts e vídeos sai pronta.",
};

export default async function PaginaApp({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const busca = await searchParams;
  const dados = dadosDaBusca(busca);
  return (
    <AppMvp
      dados={dados}
      direto={diretoDaBusca(busca)}
      totalVirais={itensDoArquivo().length}
      exemplos={DEMOS.map((d) => ({ nome: d.brand.nome, dominio: d.brand.dominio }))}
    />
  );
}
