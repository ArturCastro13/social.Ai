import { describe, expect, it } from "vitest";
import { BOM, celulaCsv, dataArquivo, montarCsv } from "@/lib/csv";
import { COLUNAS_CSV, filtrarEspera, resumirEspera } from "@/lib/lista-espera";

describe("CSV", () => {
  it("começa com BOM, tem cabeçalho e usa CRLF", () => {
    const csv = montarCsv(COLUNAS_CSV, [{ empresa: "Açaí & Cia", email: "a@x.com", criado_em: "2026-09-26T10:00:00Z" }]);
    expect(csv.startsWith(BOM)).toBe(true);
    expect(csv.slice(1)).toBe("empresa,email,criado_em\r\nAçaí & Cia,a@x.com,2026-09-26T10:00:00Z\r\n");
  });

  it("escapa aspas, vírgulas e quebras de linha", () => {
    expect(celulaCsv('Loja "Boa"')).toBe('"Loja ""Boa"""');
    expect(celulaCsv("Silva, Filhos")).toBe('"Silva, Filhos"');
    expect(celulaCsv("linha\nduas")).toBe('"linha\nduas"');
    expect(celulaCsv(null)).toBe("");
  });

  it("neutraliza fórmulas de planilha", () => {
    expect(celulaCsv("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(celulaCsv("@soma")).toBe("'@soma");
  });

  it("nome do arquivo usa a data local", () => {
    expect(`lista-de-espera-${dataArquivo(new Date(2026, 0, 5, 23, 59))}.csv`).toBe("lista-de-espera-2026-01-05.csv");
  });
});

describe("resumo da lista de espera", () => {
  const agora = new Date(2026, 8, 26, 15, 0);
  const em = (dias: number, h = 12) => new Date(2026, 8, 26 - dias, h).toISOString();
  const itens = [
    { empresa: "A", email: "a@x.com", criado_em: em(0, 9) },
    { empresa: "B", email: "B@x.com", criado_em: em(1) },
    { empresa: "C", email: "c@x.com", criado_em: em(6) },
    { empresa: "B de novo", email: "b@x.com", criado_em: em(10) },
    { empresa: "B outra vez", email: "b@x.com", criado_em: em(20) },
  ];

  it("conta hoje, 7 dias e repetidos por e-mail", () => {
    const r = resumirEspera(itens, agora);
    expect(r).toMatchObject({ total: 5, hoje: 1, semana: 3, emailsUnicos: 3, duplicadas: 2 });
    expect([...r.repetidos]).toEqual(["b@x.com"]);
  });

  it("busca por empresa ou e-mail sem ligar para acentos", () => {
    const lista = [{ empresa: "Padaria São João", email: "pao@x.com", criado_em: "" }, ...itens];
    expect(filtrarEspera(lista, "sao joao").map((i) => i.empresa)).toEqual(["Padaria São João"]);
    expect(filtrarEspera(lista, "C@X").map((i) => i.empresa)).toEqual(["C"]);
    expect(filtrarEspera(lista, "  ")).toHaveLength(6);
  });
});
