import { Estudio } from "@/components/estudio/Estudio";
import { AntesDepois, Cabecalho, ComoFunciona, Comparacao, Faq, Metodo, Planos, Rodape, Ticker, Topo, Vitrine } from "@/components/landing/Secoes";
import { DEMOS } from "@/lib/engine/demo";
import { NICHOS } from "@/lib/types";
import { BASE_ARQUIVO, itensDoArquivo } from "@/lib/virais";
import { construirCatalogo } from "@/lib/virais/catalogo";

export default function Home() {
  const itens = itensDoArquivo();
  const verificados = itens.filter((i) => i.status === "verificado");
  const catalogo = construirCatalogo(itens);
  const porNicho = NICHOS.map((n) => ({
    id: n.id,
    nome: n.nome,
    total: BASE_ARQUIVO[n.id].length,
    verificados: BASE_ARQUIVO[n.id].filter((i) => i.status === "verificado").length,
  }));
  // Exemplos com fonte verificada e métrica lida no post, para mostrar na seção do método.
  // Só ganchos literais (sem tradução nem paráfrase), um por nicho.
  const nichosVistos = new Set<string>();
  const exemplos = verificados
    .filter(
      (i) =>
        i.link_fonte &&
        i.autor_ou_marca &&
        i.metricas.curtidas !== null &&
        !/tradu|paráfrase|parafrase|não (é )?citação|original/i.test(i.notas_curadoria ?? "") &&
        !i.texto_gancho.includes('"'),
    )
    .sort((a, b) => (b.metricas.curtidas ?? 0) - (a.metricas.curtidas ?? 0))
    .filter((i) => !nichosVistos.has(i.nicho) && nichosVistos.add(i.nicho));

  return (
    <>
      <Topo />
      <main className="flex-1">
        <Estudio
          cabecalho={<Cabecalho />}
          vitrine={<Vitrine demos={DEMOS} />}
          exemplos={DEMOS.map((d) => ({ nome: d.brand.nome, dominio: d.brand.dominio, cor: d.brand.paleta.primaria }))}
          totalVirais={itens.length}
        />
        <Ticker total={itens.length} verificados={verificados.length} padroes={catalogo.length} />
        <ComoFunciona />
        <Metodo catalogo={catalogo} porNicho={porNicho} exemplos={exemplos} />
        <AntesDepois demos={DEMOS} />
        <Comparacao />
        <Planos />
        <Faq />
      </main>
      <Rodape />
    </>
  );
}
