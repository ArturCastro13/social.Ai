import { describe, expect, it } from "vitest";
import { humanizarTudo, AVISO_CAMPO_INTERNO, AVISO_NUMEROS, checarNumeros, limparFormato, numerosDasFontes, trocarNumerosSemFonte } from "@/lib/motor/checar-numeros";
import type { PostGerado } from "@/lib/types";

const fontes = numerosDasFontes(["+ de 1.900.000 De notas fiscais emitidas", "30h por mês", "NPS 86", "Planos a partir de R$ 49", "de R$81K até R$360K", "R$ 50,00 por mês"]);

describe("checagem de números sem fonte", () => {
  it("tira contagem e tempo inventados e deixa placeholder onde o número é o dado", () => {
    const r = trocarNumerosSemFonte("Analisamos 3.847 PMEs: 73% gastam mais de 3 horas por dia.", fontes);
    expect(r.texto).toBe("Analisamos PMEs: [PREENCHER: número real]% gastam mais de [PREENCHER: número real] horas por dia.");
    expect(r.trocados).toBe(3);
    expect(trocarNumerosSemFonte("Passei 3 semanas sem postar. Ouvimos 47 founders.\nEm 1 hora, R$ 99 e 3x mais.", fontes).texto).toBe(
      "Passei semanas sem postar. Ouvimos founders.\nEm horas, R$ [PREENCHER: número real] e [PREENCHER: número real]x mais.",
    );
  });

  it("mantém número que está nas fontes, mesmo escrito de outro jeito", () => {
    const r = trocarNumerosSemFonte("Mais de 1900000 notas por mês, 30h economizadas, NPS 86, a partir de R$ 49.", fontes);
    expect(r.trocados).toBe(0);
  });

  it("deixa placeholder quando tirar o número quebraria a frase", () => {
    expect(trocarNumerosSemFonte("Atende em menos de 40 segundos. Raro ir além de 15.", fontes).texto).toBe(
      "Atende em menos de [PREENCHER: número real] segundos. Raro ir além de [PREENCHER: número real].",
    );
  });

  it("confere \"N vezes\": o que está na fonte fica, o inventado vira placeholder", () => {
    const f = numerosDasFontes(["Eleita 3x a Melhor plataforma de e-commerce pela ABCOMM"]);
    expect(trocarNumerosSemFonte("Fomos eleitos 3 vezes a melhor plataforma.", f).trocados).toBe(0);
    expect(trocarNumerosSemFonte("Premiada 4 vezes.", f).texto).toBe("Premiada [PREENCHER: número real] vezes.");
  });

  it("reconhece o mesmo número escrito por extenso ou com centavos", () => {
    expect(trocarNumerosSemFonte("Emitimos 1,9 milhão de notas; faturamento de 81 mil a 360 mil; plano de R$ 50.", fontes).trocados).toBe(0);
  });

  it("não mexe em estrutura, ano, link, hashtag nem placeholder", () => {
    const texto = "3 erros que custam caro em 2026. Veja https://site.com/p?utm_campaign=2026&id=987 #top10 [PREENCHER: 45 clientes]";
    expect(trocarNumerosSemFonte(texto, fontes)).toEqual({ texto, trocados: 0 });
  });

  it("marca para revisão só o post que teve número trocado, e passa pelos roteiros", () => {
    const post = (gancho: string) => ({ gancho, slides: [{ titulo: "", texto: "" }], legendas: { instagram: gancho, linkedin: "", x: "", facebook: "" } }) as unknown as PostGerado;
    const r = checarNumeros([post("Queda de 40% em afastamentos"), post("3 sinais de que a planilha travou")], [
      { id: "v1", titulo: "", rede: "instagram", duracao_seg: 30, gancho: "Em 5 minutos", cenas: [{ fala: "Reduz 40% do custo" }], chamada_final: "", legenda: "" },
    ], fontes);
    expect(r.posts[0].precisa_revisao).toEqual([AVISO_NUMEROS]);
    expect(r.posts[1].precisa_revisao).toBeUndefined();
    expect(r.roteiros?.[0].cenas[0].fala).toBe("Reduz [PREENCHER: número real]% do custo");
    expect(r.roteiros?.[0].gancho).toBe("Em minutos");
    expect(r.trocados).toBe(4);
  });
});

describe("limparFormato", () => {
  it("tira markdown das legendas e corrige origem founder sem founder", () => {
    const [p] = limparFormato([{ legendas: { linkedin: "**Atenção**: veja isto\n## Título" }, origem_tema: "founder" }], false);
    expect(p.legendas?.linkedin).toBe("Atenção: veja isto\nTítulo");
    expect(p.origem_tema).toBe("site");
    expect(limparFormato([{ legenda: "ok", origem_tema: "founder" }], true)[0].origem_tema).toBe("founder");
  });
});

describe("limparFormato: bio e campo interno", () => {
  it("troca link na bio fora do Instagram e marca nome de campo vazado", () => {
    const [p] = limparFormato([{ legendas: { instagram: "Link na bio", linkedin: "Em_alta_no_nicho mostra isso. Clique na bio." } }], true);
    expect(p.legendas?.instagram).toBe("Link na bio");
    expect(p.legendas?.linkedin).toBe("Em_alta_no_nicho mostra isso. Clique no perfil.");
    expect((p as { precisa_revisao?: string[] }).precisa_revisao).toEqual([AVISO_CAMPO_INTERNO]);
    const [r] = limparFormato([{ rede: "linkedin", legenda: "Link na bio" }], true);
    expect(r.legenda).toBe("Link no perfil");
  });
});

describe("humanizarTudo", () => {
  it("troca nome técnico por palavra do founder em qualquer texto", () => {
    expect(humanizarTudo({ a: ["Faltam provas em site_extraido.provas", "conhecimento_founder e desempenho_proprio vazios"] })).toEqual({
      a: ["Faltam provas em o seu site", "as suas respostas e os números dos seus posts vazios"],
    });
  });
});
