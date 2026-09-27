# Posts virais e bonitos: plano de implementação

> **Para agentes:** SUB-SKILL OBRIGATÓRIA: use superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans para executar este plano tarefa por tarefa. Os passos usam checkbox (`- [ ]`).

**Objetivo:** posts no estilo carrossel de creator com capa de imagem de IA, escritos a partir de virais do nicho (biblioteca de 8 nichos e busca ao vivo), com a geração aparecendo na tela enquanto acontece.

**Arquitetura:** o Claude Sonnet 5 pesquisa (4 buscas) e escreve os posts em streaming, já com a direção de arte de cada capa; um leitor incremental solta cada post pronto para a tela; a OpenAI desenha só a imagem da capa, que o Haiku confere por visão; os templates Satori compõem o texto por cima, no estilo creator.

**Tecnologias:** Next.js 16 (App Router, Node runtime), `@anthropic-ai/sdk` 0.128, OpenAI Images REST (`gpt-image-2`), Satori via `next/og`, zod 4, vitest (+ jsdom e Testing Library), Tailwind 4.

**Especificação:** `docs/superpowers/specs/2026-09-26-posts-virais-design.md`

---

## Regras para quem executa

- Leia `AGENTS.md`: este Next.js tem mudanças; a documentação da versão instalada está em `node_modules/next/dist/docs/`.
- Código, comentários e textos de interface em português do Brasil com acentos. Nunca use travessão (— ou –) em texto de interface ou de post.
- Comandos: testes `npx vitest run <arquivo>`, tudo `npx vitest run`, tipos `npx tsc --noEmit -p .`, lint `npx eslint`.
- Commits pequenos, mensagem em português, terminando com a linha:
  `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`
- Não gaste a chave de IA fora da trilha G. Os testes usam IA falsa.
- Execução econômica: um agente por trilha, não por tarefa. Ordem: A, B e C; depois D e F em paralelo (arquivos diferentes; F usa o `destaque` de C2); depois E; por fim G. Uma revisão só, no fim de cada trilha, rodando os testes.

## Mapa de arquivos

| Arquivo | Responsabilidade | Tarefas |
|---|---|---|
| `src/lib/types.ts` | `IDS_NICHO`, `Nicho`, `NICHOS` | A1 |
| `src/lib/engine/nicho.ts` | palavras-chave dos nichos | A1 |
| `src/lib/motor/mapa.ts` | ids de nicho do motor | A1 |
| `src/lib/engine/local.ts`, `src/lib/engine/temas-locais.ts`, `src/lib/motor/inferir.ts`, `src/lib/imagem/direcao.ts`, `src/lib/store/index.ts`, `src/lib/contexto/contrato.ts`, `src/lib/virais/schema.ts` | listas e mapas por nicho | A1 |
| `src/lib/virais/index.ts`, `data/virais/*/itens.json`, `data/virais/catalogo.json` | biblioteca de virais | A2, A3 |
| `src/lib/motor/contexto.ts` | CONTEXTO do motor (referências, virais ao vivo) | A3, B2 |
| `src/lib/motor/contrato.ts` | `pesquisaMercadoSchema`, `ExtrasPost`, `EventoAoVivo` | B1, C2, D3 |
| `src/lib/motor/concorrentes.ts` | pesquisa na web (4 buscas) | B1 |
| `src/lib/motor/saida.ts` | saída do motor: `postMotorSchema`, `postDoMotor`, `contextoDosPosts` | C1, C2 |
| `src/lib/engine/schema.ts` | `postDaSaida` | C1 |
| `src/lib/llm/prompt-motor.ts` | prompt do motor | B2, C3 |
| `src/lib/llm/index.ts` | `gerarEmStream`, cache de prompt | C4 |
| `src/lib/engine/ao-vivo.ts` (novo) | leitor incremental e ouvinte ao vivo | D1, D2 |
| `src/lib/motor/checar-numeros.ts` | `textosDasFontes` (movido) | D2 |
| `src/lib/engine/index.ts` | `analisar` com `aoVivo` | C1, D2 |
| `src/lib/http-ao-vivo.ts` (novo) | resposta NDJSON | D3 |
| `src/app/api/analyze/route.ts` | modo `stream` | D3 |
| `src/lib/client/ao-vivo.ts` (novo) | leitor de eventos no navegador | D4 |
| `src/components/estudio/useGeracao.ts` | estado ao vivo | D4 |
| `src/components/estudio/AoVivo.tsx` (novo) | tela ao vivo | D5 |
| `src/app/app/page.tsx` → `src/components/app/AppMvp.tsx` | liga a tela ao vivo | D5 |
| `src/lib/imagem/*`, `src/app/api/imagem/route.ts`, `src/lib/render/payload.ts` | capa: direção pronta, paisagem, visão, parcial | E1, E2, E3, E5 |
| `src/lib/client/capas.ts` (novo), `src/components/estudio/useCapas.ts` (novo), `src/components/estudio/capas-contexto.ts` (novo) | capas automáticas | E4 |
| `src/components/estudio/Painel.tsx`, `src/components/estudio/PostCard.tsx` | capas no painel | E4, E5 |
| `assets/fonts/BricolageGrotesque-800.ttf` (novo), `src/lib/render/fonts.ts` | fonte display | F1 |
| `src/lib/render/tema.ts` | papel e marca-texto | F2 |
| `src/lib/render/templates.tsx` | templates estilo creator | F3 a F7 |
| `scripts/render-amostras.tsx` (novo) | revisão visual sem custo | F8 |
| `scripts/auditar-ia.ts` | validação paga com capas | G2 |

## Ordem e paralelismo

- **A1 primeiro** (muda o tipo `Nicho`, usado em quase tudo). A2 só começa quando a curadoria dos 8 nichos terminar (arquivos em `data/virais/*/itens.json`).
- Depois de A1, as trilhas andam em paralelo, cada uma na ordem das suas tarefas:
  - **B** (pesquisa) e **A3**.
  - **C** (motor): C1 → C2 → C3 → C4.
  - **F** (visual): F1 → F2 → F3 → F4 → F5 → F6 → F7 → F8. F4 usa `post.destaque` (C2): se F4 chegar antes, use `(p.post as { destaque?: string }).destaque` até C2 entrar.
  - **E** (capas): E1 depois de C2; E2, E3, E4, E5 em ordem.
- **D** (ao vivo) depois de C1 e C4: D1 → D2 → D3 → D4 → D5.
- **G** por último, com tudo junto.

---

## Trilha A: nichos e biblioteca de virais

### Tarefa A1: oito nichos no tipo e em todos os mapas

**Arquivos:**
- Modificar: `src/lib/types.ts`, `src/lib/virais/schema.ts`, `src/lib/motor/contrato.ts`, `src/lib/contexto/contrato.ts`, `src/lib/engine/nicho.ts`, `src/lib/motor/mapa.ts`, `src/lib/engine/local.ts`, `src/lib/engine/temas-locais.ts`, `src/lib/motor/inferir.ts`, `src/lib/imagem/direcao.ts`, `src/lib/store/index.ts`
- Teste: `tests/nichos.test.ts` (novo)

- [ ] **Passo 1: teste que falha**

```ts
// tests/nichos.test.ts
import { describe, expect, it } from "vitest";
import { IDS_NICHO, NICHOS, type BrandProfile } from "@/lib/types";
import { palpiteNicho } from "@/lib/engine/nicho";
import { nichoDoMotor, nichoParaMotor } from "@/lib/motor/mapa";
import { nichoSchema } from "@/lib/virais/schema";

const marca = (texto: string) =>
  ({ title: texto, description: texto, og: { title: null, description: null, image: null }, headings: { h1: [], h2: [] }, paragrafos: [] }) as unknown as BrandProfile;

describe("nichos", () => {
  it("os 8 nichos estão no tipo, na lista e no esquema", () => {
    expect(IDS_NICHO).toHaveLength(8);
    expect(NICHOS.map((n) => n.id)).toEqual([...IDS_NICHO]);
    for (const id of IDS_NICHO) expect(nichoSchema.safeParse(id).success).toBe(true);
  });

  it("o palpite reconhece os nichos novos", () => {
    expect(palpiteNicho(marca("Agência de marketing digital: tráfego pago, social media e branding para marcas")).nicho).toBe("marketing-agencias");
    expect(palpiteNicho(marca("Clínica de estética no seu bairro. Agende sua avaliação, horário de funcionamento estendido")).nicho).toBe("servicos-locais");
    expect(palpiteNicho(marca("SDK open source para desenvolvedores criarem agentes com LLM")).nicho).toBe("ia-dev");
  });

  it("os ids do motor vão e voltam", () => {
    for (const id of IDS_NICHO) expect(nichoDoMotor(nichoParaMotor(id))).toBe(id);
  });
});
```

- [ ] **Passo 2: rodar e ver falhar**

Run: `npx vitest run tests/nichos.test.ts`
Expected: FAIL (`IDS_NICHO` não existe).

- [ ] **Passo 3: tipo e lista em `src/lib/types.ts`**

Troque as linhas do tipo e da lista por:

```ts
/** Os nichos da biblioteca de virais. A ordem aparece nas telas. */
export const IDS_NICHO = ["saas-b2b", "fintech", "healthtech", "edtech", "ecommerce-dtc", "marketing-agencias", "servicos-locais", "ia-dev"] as const;

export type Nicho = (typeof IDS_NICHO)[number];

export const NICHOS: { id: Nicho; nome: string }[] = [
  { id: "saas-b2b", nome: "SaaS B2B" },
  { id: "fintech", nome: "Fintech" },
  { id: "healthtech", nome: "Healthtech" },
  { id: "edtech", nome: "Edtech" },
  { id: "ecommerce-dtc", nome: "E-commerce / DTC" },
  { id: "marketing-agencias", nome: "Marketing e agências" },
  { id: "servicos-locais", nome: "Serviços e negócio local" },
  { id: "ia-dev", nome: "IA e tech para devs" },
];
```

- [ ] **Passo 4: esquemas usam a mesma lista**

`src/lib/virais/schema.ts`: troque a linha do `nichoSchema` por

```ts
import { IDS_NICHO } from "@/lib/types";

export const nichoSchema = z.enum(IDS_NICHO);
```

`src/lib/motor/contrato.ts`: no `pesquisaMercadoSchema`, troque o enum do `nicho` por `z.enum(IDS_NICHO).optional()` e acrescente `import { IDS_NICHO } from "@/lib/types";` (o `types.ts` só importa tipos de `contrato.ts`, então não há ciclo em tempo de execução).

`src/lib/contexto/contrato.ts`: troque `nicho: z.enum(["saas-b2b", "fintech", "healthtech", "edtech", "ecommerce-dtc", "outro"])` por `nicho: z.enum([...IDS_NICHO, "outro"])` e importe `IDS_NICHO` de `@/lib/types`.

- [ ] **Passo 5: palavras-chave em `src/lib/engine/nicho.ts`**

Acrescente ao objeto `PALAVRAS`, depois de `"ecommerce-dtc"`:

```ts
  "marketing-agencias": [
    "agência", "agencia", "marketing digital", "tráfego pago", "trafego pago", "social media", "branding", "gestão de redes",
    "assessoria de marketing", "growth", "inbound", "lançamento", "lancamento", "infoproduto", "copywriting", "anúncios",
    "anuncios", "funil", "leads",
  ],
  "servicos-locais": [
    "clínica de estética", "clinica de estetica", "estética", "estetica", "odontologia", "dentista", "academia", "personal",
    "salão", "salao", "barbearia", "restaurante", "cardápio", "cardapio", "advocacia", "advogado", "contabilidade",
    "agende", "agendamento", "unidade", "bairro", "horário de funcionamento", "horario de funcionamento",
  ],
  "ia-dev": [
    "inteligência artificial", "inteligencia artificial", "ia generativa", "llm", "machine learning", "modelo de linguagem",
    "desenvolvedores", "devs", "developer", "sdk", "open source", "github", "deploy", "agente de ia", "agentes", "prompt",
    "gpu", "dev tools",
  ],
```

- [ ] **Passo 6: ids do motor em `src/lib/motor/mapa.ts`**

```ts
export type NichoMotor =
  | "saas_b2b" | "fintech" | "healthtech" | "edtech" | "ecommerce_dtc" | "marketing_agencias" | "servicos_locais" | "ia_dev" | "outro";

export function nichoParaMotor(n: Nicho | string | null | undefined): NichoMotor {
  const m: Record<string, NichoMotor> = {
    "saas-b2b": "saas_b2b",
    fintech: "fintech",
    healthtech: "healthtech",
    edtech: "edtech",
    "ecommerce-dtc": "ecommerce_dtc",
    "marketing-agencias": "marketing_agencias",
    "servicos-locais": "servicos_locais",
    "ia-dev": "ia_dev",
  };
  return m[String(n ?? "")] ?? "outro";
}
```

No mapa de `nichoDoMotor`, acrescente:

```ts
    marketingagencias: "marketing-agencias",
    marketing: "marketing-agencias",
    agencia: "marketing-agencias",
    agencias: "marketing-agencias",
    servicoslocais: "servicos-locais",
    negociolocal: "servicos-locais",
    servicos: "servicos-locais",
    iadev: "ia-dev",
    devtools: "ia-dev",
    ia: "ia-dev",
```

- [ ] **Passo 7: mapas exaustivos que o compilador aponta**

Run: `npx tsc --noEmit -p .`
Expected: erros de `Record<Nicho, ...>` sem as chaves novas. Complete cada um:

`src/lib/engine/local.ts`, em `DIAG_NICHO`:

```ts
  "marketing-agencias": [
    ["Mostre o método, não só o resultado", "Na base de marketing, os posts que mais circulam abrem o processo por trás de uma campanha: o que foi testado, o que deu errado e o que ficou. Isso vende a agência melhor que o print do resultado."],
    ["Tenha uma opinião sobre o mercado", "Posts que contrariam uma prática comum do setor geram debate nos comentários e trazem o cliente certo para perto."],
  ],
  "servicos-locais": [
    ["Mostre o dia a dia de perto", "Bastidor do atendimento, da equipe e do espaço aproxima quem mora perto e ainda não conhece. Rosto e lugar reais geram confiança."],
    ["Responda a dúvida que chega no WhatsApp", "A pergunta que a recepção ouve toda semana vira um carrossel curto que a pessoa salva e manda para alguém."],
  ],
  "ia-dev": [
    ["Mostre funcionando", "Na base de IA e dev, o que viraliza é demonstração: antes e depois, passo a passo e comparação honesta com o jeito antigo."],
    ["Explique o técnico em linguagem simples", "Carrosséis que traduzem um conceito técnico em poucos slides são salvos e compartilhados por quem decide a compra."],
  ],
```

`src/lib/engine/temas-locais.ts`, em `PADRAO`:

```ts
  "marketing-agencias": "saas-padrao",
  "servicos-locais": "ecommerce-padrao",
  "ia-dev": "saas-padrao",
```

Se o `tsc` apontar outro `Record<Nicho, ...>`, use o conteúdo do nicho mais próximo: `marketing-agencias` e `ia-dev` como `saas-b2b`; `servicos-locais` como `ecommerce-dtc`.

- [ ] **Passo 8: listas soltas**

`src/lib/store/index.ts`, em `listarVirais` do store local: troque a lista fixa por `const nichos = [...IDS_NICHO];` e importe `IDS_NICHO` de `@/lib/types`.

`src/lib/motor/inferir.ts`: troque `const b2b = nicho === "saas-b2b" || ...` por

```ts
  const b2b = nicho === "saas-b2b" || nicho === "marketing-agencias" || nicho === "ia-dev" || /\b(b2b|empresas|pmes?|times|equipes|gestores)\b/.test(t);
```

`src/lib/imagem/direcao.ts`, no objeto `CENAS`, acrescente:

```ts
  "marketing-agencias": [
    "A bright creative studio table seen from above with blank colored paper swatches, a ruler and a small plant, arranged in a clean grid, soft daylight.",
    "Editorial still life of a single glowing spotlight beam falling on a pedestal with a smooth colored sphere, dark seamless backdrop, sense of attention.",
    "A megaphone made of folded colored paper on a smooth surface, playful premium campaign look, soft studio light.",
  ],
  "servicos-locais": [
    "A welcoming neighborhood storefront at golden hour seen from the sidewalk, warm light inside, plants by the door, no signage.",
    "Top-down still life of tidy work tools of a local professional on a wooden counter, soft morning light, sense of care.",
    "A calm, clean treatment room with soft towels, a plant and natural light through a window, serene and inviting.",
  ],
  "ia-dev": [
    "Abstract 3D composition of smooth glowing nodes connected by thin light threads floating over a matte surface, soft studio light.",
    "Editorial still life of interlocking translucent geometric blocks assembling themselves into a neat structure, clean seamless backdrop.",
    "A single small robot figurine made of matte clay arranging tiny colored blocks on a desk, warm soft light, playful and precise.",
  ],
```

- [ ] **Passo 9: rodar os testes**

Run: `npx vitest run tests/nichos.test.ts && npx tsc --noEmit -p .`
Expected: PASS e nenhum erro de tipo. Em seguida `npx vitest run`: tudo passa (se algum teste antigo contar 5 nichos, atualize para 8).

- [ ] **Passo 10: commit**

```bash
git add src/lib tests/nichos.test.ts
git commit -m "Oito nichos: marketing e agências, serviços locais e IA para devs

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

### Tarefa A2: biblioteca dos 8 nichos no motor e catálogo novo

Começa quando a curadoria entregar os 8 arquivos `data/virais/<nicho>/itens.json` (60 itens cada).

**Arquivos:**
- Modificar: `src/lib/virais/index.ts`, `data/virais/catalogo.json` (gerado)
- Teste: `tests/virais.test.ts`

- [ ] **Passo 1: teste que falha**

Acrescente em `tests/virais.test.ts`:

```ts
import { BASE_ARQUIVO } from "@/lib/virais";
import { IDS_NICHO } from "@/lib/types";

describe("biblioteca de 8 nichos", () => {
  it("cada nicho tem pelo menos 40 itens e metade verificada", () => {
    for (const id of IDS_NICHO) {
      const itens = BASE_ARQUIVO[id];
      expect(itens.length, id).toBeGreaterThanOrEqual(40);
      expect(itens.filter((i) => i.status === "verificado").length, id).toBeGreaterThanOrEqual(Math.floor(itens.length / 2));
      expect(itens.every((i) => i.nicho === id), id).toBe(true);
    }
  });
});
```

- [ ] **Passo 2: rodar e ver falhar**

Run: `npx vitest run tests/virais.test.ts`
Expected: FAIL (nichos novos ausentes em `BASE_ARQUIVO`).

- [ ] **Passo 3: carregar os arquivos novos em `src/lib/virais/index.ts`**

```ts
import marketingAgencias from "../../../data/virais/marketing-agencias/itens.json";
import servicosLocais from "../../../data/virais/servicos-locais/itens.json";
import iaDev from "../../../data/virais/ia-dev/itens.json";
```

e no objeto `BASE_ARQUIVO`:

```ts
  "marketing-agencias": marketingAgencias as ViralItem[],
  "servicos-locais": servicosLocais as ViralItem[],
  "ia-dev": iaDev as ViralItem[],
```

- [ ] **Passo 4: validar e gerar o catálogo**

Run: `npm run virais:catalogo`
Expected: nenhuma linha com `✗`, e `data/virais/catalogo.json` regravado com o total (perto de 480). Se aparecer `✗`, corrija o item apontado no arquivo do nicho.

- [ ] **Passo 5: atualizar contagens antigas e rodar tudo**

Run: `npx vitest run`
Se algum teste antigo esperar 74 itens ou 15 por nicho, troque pelo número que o catálogo imprimiu. Expected: PASS.

- [ ] **Passo 6: commit**

```bash
git add data/virais src/lib/virais/index.ts tests/virais.test.ts
git commit -m "Biblioteca de virais: 8 nichos, cerca de 480 posts

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

### Tarefa A3: referências mais ricas no CONTEXTO do motor

**Arquivos:**
- Modificar: `src/lib/virais/index.ts`, `src/lib/motor/contexto.ts`
- Teste: `tests/roteiros.test.ts`

- [ ] **Passo 1: teste que falha**

Acrescente em `tests/roteiros.test.ts`, no `describe` de "concorrentes e referências no CONTEXTO":

```ts
  it("referências: até 12, verificados e carrosséis primeiro, estrutura de até 6 passos", async () => {
    const refs = await contextoViralDoNicho("saas-b2b", 10);
    const c = montarContexto(cora.brand, null, { referencias: refs });
    expect(c.referencias_nicho.length).toBeLessThanOrEqual(12);
    expect(c.referencias_nicho.length).toBeGreaterThan(6);
    expect(c.referencias_nicho.every((r) => r.estrutura.length <= 6)).toBe(true);
    const pesos = c.referencias_nicho.map((r) => Number(r.metrica_verificada) * 2 + Number(r.formato === "carrossel"));
    expect([...pesos].sort((a, b) => b - a)).toEqual(pesos);
  });
```

(importe `contextoViralDoNicho` de `@/lib/virais` se o arquivo ainda não importa.)

- [ ] **Passo 2: rodar e ver falhar**

Run: `npx vitest run tests/roteiros.test.ts`
Expected: FAIL (estrutura cortada em 4 passos; ordem sem peso de carrossel).

- [ ] **Passo 3: 3 exemplos por padrão em `src/lib/virais/index.ts`**

Em `contextoViralDoNicho`, troque `.slice(0, 2)` por `.slice(0, 3)`.

- [ ] **Passo 4: `referenciasDoNicho` em `src/lib/motor/contexto.ts`**

```ts
function referenciasDoNicho(refs: ExtrasContexto["referencias"] = []): ContextoMotor["referencias_nicho"] {
  const out: ContextoMotor["referencias_nicho"] = [];
  for (const { padrao, exemplos } of refs) {
    const lista = exemplos.length ? exemplos.slice(0, 3) : [null];
    for (const e of lista) {
      out.push({
        padrao: padrao.nome,
        gancho_modelo: padrao.modelo_gancho,
        formato: MOTOR_DO_FORMATO[padrao.formato],
        rede: e?.rede ?? "",
        metrica_verificada: e?.status === "verificado",
        fonte_url: e?.link_fonte ?? "",
        texto_gancho: corte(semTraco(e?.texto_gancho ?? ""), 200),
        estrutura: (e?.estrutura ?? []).slice(0, 6).map((x) => corte(semTraco(x), 120)),
        por_que_funciona: corte(semTraco(e?.por_que_funciona || padrao.descricao || ""), 240),
      });
    }
  }
  // Verificados primeiro (camada 4 da hierarquia), carrossel em seguida (o formato principal do produto).
  const peso = (r: ContextoMotor["referencias_nicho"][number]) => Number(r.metrica_verificada) * 2 + Number(r.formato === "carrossel");
  return out.sort((a, b) => peso(b) - peso(a)).slice(0, 12);
}
```

- [ ] **Passo 5: rodar os testes**

Run: `npx vitest run tests/roteiros.test.ts tests/motor.test.ts`
Expected: PASS. Se um teste antigo esperar no máximo 14 referências ou 4 passos, ajuste para 12 e 6.

- [ ] **Passo 6: commit**

```bash
git add src/lib/virais/index.ts src/lib/motor/contexto.ts tests/roteiros.test.ts
git commit -m "Motor recebe até 12 virais do nicho, verificados e carrosséis primeiro

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

## Trilha B: pesquisa com virais ao vivo

### Tarefa B1: quarta busca e `virais_ao_vivo`

**Arquivos:**
- Modificar: `src/lib/motor/contrato.ts`, `src/lib/motor/concorrentes.ts`
- Teste: `tests/concorrentes.test.ts`

- [ ] **Passo 1: teste que falha**

No teste "com busca na web: nicho da IA..." de `tests/concorrentes.test.ts`, acrescente ao JSON da resposta falsa:

```ts
      virais_ao_vivo: [
        { gancho: "Sua agenda tem buraco na terça? Faça isto", formato: "carrossel", rede: "instagram", por_que: "nomeia a dor do dono", quem: "creator de gestão", url: "https://exemplo.com/v1" },
        { gancho: "Sem link", formato: "carrossel", rede: "linkedin", por_que: "x", quem: "y", url: "ftp://ruim" },
        { formato: "carrossel" },
      ],
```

e as asserções:

```ts
    expect(r.pesquisa?.virais_ao_vivo.map((v) => [v.gancho, v.url])).toEqual([
      ["Sua agenda tem buraco na terça? Faça isto", "https://exemplo.com/v1"],
      ["Sem link", undefined],
    ]);
```

e um teste novo:

```ts
  it("o prompt da pesquisa pede 4 buscas, a última de virais do nicho", () => {
    expect(MAX_BUSCAS).toBe(4);
    expect(SISTEMA_PESQUISA).toContain("virais_ao_vivo");
    expect(SISTEMA_PESQUISA).toMatch(/4\. Virais do nicho/);
  });
```

(importe `MAX_BUSCAS` de `@/lib/motor/concorrentes`.)

- [ ] **Passo 2: rodar e ver falhar**

Run: `npx vitest run tests/concorrentes.test.ts`
Expected: FAIL.

- [ ] **Passo 3: esquema em `src/lib/motor/contrato.ts`**

Depois de `itemEmAltaSchema`:

```ts
/** Um post que está rendendo agora no nicho do cliente, achado na busca ao vivo. */
export const viralAoVivoSchema = z.object({
  gancho: z.string().trim().min(1).max(240),
  formato: textoPesquisa(40),
  rede: textoPesquisa(20),
  por_que: textoPesquisa(300),
  quem: textoPesquisa(100),
  url: z.string().trim().url().max(500).optional(),
});
```

e no `pesquisaMercadoSchema`, depois de `em_alta`:

```ts
  /** Posts de alto engajamento do nicho nos últimos 12 meses, da quarta busca. */
  virais_ao_vivo: z.array(viralAoVivoSchema).max(6).default([]),
```

- [ ] **Passo 4: prompt e leitura em `src/lib/motor/concorrentes.ts`**

Troque `export const MAX_BUSCAS = 3;` por `export const MAX_BUSCAS = 4;`.

No `SISTEMA_PESQUISA`, depois do item `3. O assunto do momento ...`, acrescente a linha:

```
4. Virais do nicho: posts de alto engajamento dos últimos 12 meses sobre o tema desta empresa, no LinkedIn, Instagram ou X, de concorrentes, criadores ou mídias do nicho. Busque o tema junto de termos como "carrossel", "post viral" ou "mais compartilhado".
```

No JSON de saída descrito no mesmo prompt, acrescente `"virais_ao_vivo": [{"gancho": "", "formato": "", "rede": "", "por_que": "", "quem": "", "url": ""}]` depois de `em_alta`, e nas regras:

```
- "virais_ao_vivo": até 6 posts reais que apareceram na busca. "gancho" é a frase de abertura em português (traduza se vier em inglês); "formato" (carrossel, imagem-unica, print-tweet, citacao, lista, video); "rede"; "por_que" é o mecanismo em uma frase; "quem" publicou; "url" o link do post. Sem busca que ache post, deixe a lista vazia.
```

Em `lerPesquisaIA`, depois do bloco `em_alta`:

```ts
  const virais_ao_vivo = (Array.isArray(bruto.virais_ao_vivo) ? bruto.virais_ao_vivo : []).flatMap((x) => {
    const o = (x ?? {}) as Record<string, unknown>;
    const base = { gancho: corte(s(o.gancho), 240), formato: corte(s(o.formato), 40), rede: corte(s(o.rede), 20), por_que: corte(s(o.por_que), 300), quem: corte(s(o.quem), 100) };
    const comLink = /^https?:\/\//.test(s(o.url)) ? viralAoVivoSchema.safeParse({ ...base, url: s(o.url) }) : null;
    const item = comLink?.success ? comLink : viralAoVivoSchema.safeParse(base);
    return item.success ? [item.data] : [];
  });
```

troque o `return` por

```ts
  return { mercado: corte(s(bruto.mercado), 300), ...(nicho ? { nicho } : {}), em_alta: em_alta.slice(0, 8), virais_ao_vivo: virais_ao_vivo.slice(0, 6) };
```

importe `viralAoVivoSchema` de `./contrato`, e em `buscarConcorrentes` troque a condição da pesquisa por

```ts
    if (buscar && lida && (lida.mercado || lida.em_alta.length || lida.virais_ao_vivo.length || confirmados.length)) {
```

Por fim, a pesquisa guardada antes desta mudança não tem a quarta busca e valeria por mais 7 dias. Versione a chave da guarda: em `chaveGuarda`, troque o começo do texto `` `${brand.dominio}|`` por `` `v2|${brand.dominio}|`` e acrescente o comentário `// v2: pesquisa com a quarta busca (virais ao vivo). Mudou o formato da pesquisa, suba a versão.` na linha de cima.

- [ ] **Passo 5: rodar os testes**

Run: `npx vitest run tests/concorrentes.test.ts && npx tsc --noEmit -p .`
Expected: PASS.

- [ ] **Passo 6: commit**

```bash
git add src/lib/motor/contrato.ts src/lib/motor/concorrentes.ts tests/concorrentes.test.ts
git commit -m "Pesquisa ganha a quarta busca: virais do nicho ao vivo

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

### Tarefa B2: virais ao vivo no CONTEXTO e no prompt do motor

**Arquivos:**
- Modificar: `src/lib/motor/contexto.ts`, `src/lib/llm/prompt-motor.ts`
- Teste: `tests/roteiros.test.ts`, `tests/motor.test.ts`

- [ ] **Passo 1: teste que falha**

Em `tests/roteiros.test.ts`, no teste "pesquisa de mercado: o que o concorrente publica...", acrescente ao `pesquisa_mercado`:

```ts
        virais_ao_vivo: [{ gancho: "O erro que trava seu caixa", formato: "carrossel", rede: "instagram", por_que: "erro comum", quem: "creator", url: "https://exemplo.com/v" }],
```

e as asserções:

```ts
    expect(c.virais_ao_vivo).toEqual([{ gancho: "O erro que trava seu caixa", formato: "carrossel", rede: "instagram", por_que: "erro comum", quem: "creator", url: "https://exemplo.com/v" }]);
    expect(montarPromptMotor(c)).toContain("virais_ao_vivo");
```

Em `tests/motor.test.ts`, acrescente `"virais_ao_vivo"` a `CHAVES_CONTEXTO` e `expect(c.virais_ao_vivo).toEqual([]);` no teste "funciona só com o brand".

- [ ] **Passo 2: rodar e ver falhar**

Run: `npx vitest run tests/roteiros.test.ts tests/motor.test.ts`
Expected: FAIL.

- [ ] **Passo 3: `src/lib/motor/contexto.ts`**

Na interface `ContextoMotor`, depois de `em_alta_no_nicho`:

```ts
  /** Posts que estão rendendo agora no nicho deste cliente, da busca ao vivo. Mecanismo para adaptar, nunca texto para copiar. */
  virais_ao_vivo: { gancho: string; formato: string; rede: string; por_que: string; quem: string; url: string | null }[];
```

Em `montarContexto`, depois de `em_alta_no_nicho: ...`:

```ts
    virais_ao_vivo: (p?.pesquisa_mercado?.virais_ao_vivo ?? []).map((v) => ({
      gancho: semTraco(v.gancho),
      formato: v.formato,
      rede: v.rede,
      por_que: semTraco(v.por_que),
      quem: semTraco(v.quem),
      url: v.url ?? null,
    })),
```

- [ ] **Passo 4: `src/lib/llm/prompt-motor.ts`**

Depois do parágrafo que começa com `referencias_nicho mostra por que cada viral do nicho funcionou`, acrescente:

```
virais_ao_vivo traz posts que estão rendendo agora no nicho deste cliente, achados numa busca feita para ele: gancho, formato, rede, por que funcionou e a fonte. É a referência mais atual. Use o mecanismo, nunca as palavras, e nunca cite quem publicou.
```

- [ ] **Passo 5: rodar os testes**

Run: `npx vitest run tests/roteiros.test.ts tests/motor.test.ts`
Expected: PASS.

- [ ] **Passo 6: commit**

```bash
git add src/lib/motor/contexto.ts src/lib/llm/prompt-motor.ts tests/roteiros.test.ts tests/motor.test.ts
git commit -m "Motor lê os virais ao vivo do nicho do cliente

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

## Trilha C: motor dos posts

### Tarefa C1: o post do motor em uma função reaproveitável

Sem mudança de comportamento. A prévia ao vivo (D2) precisa montar um post por vez, com a mesma regra do fim da análise.

**Arquivos:**
- Modificar: `src/lib/motor/saida.ts`, `src/lib/engine/schema.ts`, `src/lib/engine/index.ts`
- Teste: `tests/motor.test.ts`

- [ ] **Passo 1: teste que falha**

Acrescente em `tests/motor.test.ts`:

```ts
import { contextoDosPosts, postDoMotor, postMotorSchema } from "@/lib/motor/saida";
import { postDaSaida } from "@/lib/engine/schema";

describe("postDoMotor", () => {
  const cru = (extra: Record<string, unknown> = {}) =>
    postMotorSchema.parse({ rede: "instagram", formato: "carrossel", gancho: "Gancho forte", slides_ou_arte: [{ titulo: "Gancho forte", texto: "" }], legenda: "Legenda", ...extra });

  it("perfil ambos alterna o trilho quando o modelo não manda", () => {
    const c = contextoDosPosts({ brand: cora.brand, palpite: "fintech", quantidade: 3, redes: ["instagram"], preferencias: preferenciasSchema.parse({ perfil_alvo: "ambos" }) });
    const a = postDoMotor(cru(), 0, [], c);
    const b = postDoMotor(cru(), 1, [a.extras.trilho ?? "empresa"], c);
    expect([a.extras.trilho, b.extras.trilho]).toEqual(["founder", "empresa"]);
    expect(a.post.template).toBe("capa-gancho");
  });

  it("postDaSaida dá id da análise e template válido", () => {
    const c = contextoDosPosts({ brand: cora.brand, palpite: "fintech", quantidade: 1, redes: ["instagram"] });
    const { post } = postDoMotor(cru(), 0, [], c);
    const final = postDaSaida(post, "abc", 0);
    expect(final.id).toBe("abc-p1");
    expect(final.legendas.instagram).toContain("Legenda");
  });
});
```

(`cora` e `preferenciasSchema` já são importados no arquivo; se não forem, importe de `@/lib/engine/demo` via `DEMOS.cora` e de `@/lib/motor/contrato`.)

- [ ] **Passo 2: rodar e ver falhar**

Run: `npx vitest run tests/motor.test.ts`
Expected: FAIL (`contextoDosPosts` não existe).

- [ ] **Passo 3: extrair em `src/lib/motor/saida.ts`**

Acima de `saidaParaAnaliseIA`, acrescente:

```ts
/** O que todo post do lote precisa para virar post do app: perfil, redes, endereçamento e padrões conhecidos. */
export interface ContextoPosts {
  perfil: "founder" | "empresa" | "ambos";
  redes: Rede[];
  ctxEnd: ContextoEnderecamento;
  padraoPorNome: Map<string, string>;
}

export function contextoDosPosts(op: OpcoesAdaptador, publicoInferido = ""): ContextoPosts {
  const pref = op.preferencias ?? null;
  const padraoPorNome = new Map<string, string>();
  for (const p of op.padroes ?? []) {
    padraoPorNome.set(p.nome.toLowerCase(), p.id);
    padraoPorNome.set(p.id.toLowerCase(), p.id);
  }
  return {
    perfil: pref?.perfil_alvo ?? "empresa",
    redes: op.redes.length ? op.redes : ["linkedin", "instagram"],
    // Endereçamento: o que o modelo não mandou é completado (rodízio de objetivos, público da preferência ou do
    // contexto inferido, gatilho do gancho) e o post vai para revisão.
    ctxEnd: {
      objetivos: objetivosDoRodizio(pref),
      publico: pref?.publico_alvo?.trim() || publicoInferido || publicoAlvoDoSite(op.brand),
      gatilho: "gancho",
      marca: op.brand.nome || undefined,
      marcarRevisao: true,
    },
    padraoPorNome,
  };
}

type PostMotor = z.output<typeof postMotorSchema>;

/**
 * Um post do modelo no formato do app, mais os extras do motor. `trilhosAntes` são os trilhos dos posts anteriores
 * do lote: no perfil "ambos", o post sem trilho vai para o lado com menos posts até aqui.
 */
export function postDoMotor(
  p: PostMotor,
  i: number,
  trilhosAntes: ("founder" | "empresa")[],
  c: ContextoPosts,
): { post: AnaliseIA["posts"][number]; extras: ExtrasPost } {
  const rede = normalizarRede(p.rede) ?? c.redes[i % c.redes.length];
  const fm = normalizarFormatoMotor(p.formato) ?? (p.slides_ou_arte.length > 1 ? "carrossel" : "estatico");
  const tpl = TEMPLATES.includes(p.template as TemplateId) ? (p.template as TemplateId) : null;
  const { formato, template } = formatoDoApp(fm, tpl);
  const gancho = corte(p.gancho, 220);
  const slides = p.slides_ou_arte.length ? p.slides_ou_arte : [{ titulo: gancho, texto: "" }];
  const hashtags = p.hashtags.map((h) => h.replace(/^#/, "").replace(/\s+/g, "")).filter(Boolean);
  const nomePadrao = p.padrao_referencia.nome;
  const revisar = [...p.precisa_revisao];
  const todoTexto = [p.gancho, p.legenda, ...slides.flatMap((s) => [s.titulo, s.texto])].join(" ");
  if (/\[PREENCHER/i.test(todoTexto) && !revisar.length) revisar.push("Há um [PREENCHER] no texto: complete antes de publicar.");
  const nFounder = trilhosAntes.filter((t) => t === "founder").length;
  const trilho = c.perfil === "ambos" ? (p.trilho ?? (nFounder <= i - nFounder ? "founder" : "empresa")) : c.perfil;
  const { enderecamento, completou } = completarEnderecamento(
    p.enderecamento,
    { gancho, slides, legenda: p.legenda, chamada_final: p.chamada_final, objetivo: p.objetivo },
    i,
    c.ctxEnd,
  );
  if (completou && !revisar.includes(REVISAR_PUBLICO)) revisar.push(REVISAR_PUBLICO);
  return {
    post: {
      rede_principal: rede,
      formato,
      template,
      gancho,
      slides: slides.slice(0, 8),
      legendas: legendasPorRede(rede, p.legenda, gancho, hashtags),
      hashtags,
      padrao_inspirador: corte(c.padraoPorNome.get(nomePadrao.toLowerCase()) ?? nomePadrao, 80),
      por_que: corte(p.por_que_funciona, 400),
    },
    extras: {
      trilho,
      objetivo: p.objetivo || enderecamento.objetivo,
      enderecamento,
      formato_motor: fm,
      origem_tema: p.origem_tema,
      padrao_referencia: nomePadrao || p.padrao_referencia.fonte_url ? { nome: nomePadrao, fonte_url: p.padrao_referencia.fonte_url } : undefined,
      chamada_final: p.chamada_final || undefined,
      precisa_revisao: revisar,
    },
  };
}
```

Em `saidaParaAnaliseIA`, troque o trecho que vai de `const perfil = pref?.perfil_alvo ?? "empresa";` até o fim do `posts.map(...)` que monta `analisePosts` por:

```ts
  const c = contextoDosPosts(op, saida.contexto_inferido.publico);
  const posts = saida.posts.slice(0, op.quantidade);
  const extrasPosts: ExtrasPost[] = [];
  const analisePosts: AnaliseIA["posts"] = posts.map((p, i) => {
    const r = postDoMotor(p, i, extrasPosts.map((e) => e.trilho ?? "empresa"), c);
    extrasPosts.push(r.extras);
    return r.post;
  });
```

No resto da função, troque `redes` por `c.redes`, `ctxEnd` por `c.ctxEnd` e `perfil` por `c.perfil`.

- [ ] **Passo 4: `postDaSaida` em `src/lib/engine/schema.ts`**

```ts
/** Post da saída validada no formato final, com o id da análise. Serve ao fim da análise e à prévia ao vivo. */
export function postDaSaida(p: AnaliseIA["posts"][number], id: string, i: number): PostGerado {
  return {
    id: `${id}-p${i + 1}`,
    rede_principal: p.rede_principal,
    formato: p.formato,
    template: templateValido(p.template, p.formato),
    gancho: p.gancho,
    slides: p.slides.map((s) => ({ titulo: s.titulo ?? "", texto: s.texto ?? "" })),
    legendas: p.legendas,
    hashtags: p.hashtags.map((h) => h.replace(/^#/, "").replace(/\s+/g, "")).filter(Boolean),
    padrao_inspirador: p.padrao_inspirador,
    por_que: p.por_que,
    ...(p.origem_tema ? { origem_tema: p.origem_tema } : {}),
  };
}
```

(acrescente `PostGerado` ao `import type` de `@/lib/types` no topo.)

Em `src/lib/engine/index.ts`, dentro de `finalizar`, troque o `limpa.posts.map((p, i) => ({ ... }))` inteiro por:

```ts
  const posts: PostGerado[] = limpa.posts.map((p, i) => ({ ...enderecamentoDoPost(p, i, enderecar), ...postDaSaida(p, id, i) }));
```

e importe `postDaSaida` de `./schema`.

- [ ] **Passo 5: rodar tudo**

Run: `npx vitest run && npx tsc --noEmit -p .`
Expected: PASS, nenhum teste antigo muda.

- [ ] **Passo 6: commit**

```bash
git add src/lib/motor/saida.ts src/lib/engine/schema.ts src/lib/engine/index.ts tests/motor.test.ts
git commit -m "Post do motor em uma função reaproveitável

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

### Tarefa C2: padrão viral, destaque e direção da capa em cada post

**Arquivos:**
- Modificar: `src/lib/motor/contrato.ts`, `src/lib/motor/saida.ts`, `src/lib/render/payload.ts`, `src/lib/imagem/direcao.ts`
- Teste: `tests/motor.test.ts`

- [ ] **Passo 1: teste que falha**

No `describe("postDoMotor")` de `tests/motor.test.ts`:

```ts
  it("leva padrão viral, destaque que existe no título e direção da capa", () => {
    const c = contextoDosPosts({ brand: cora.brand, palpite: "fintech", quantidade: 1, redes: ["instagram"] });
    const p = cru({
      slides_ou_arte: [{ titulo: "Por que seus alunos somem antes do 3º mês", texto: "" }],
      padrao_viral: { nome: "erro invisível", origem: "ao_vivo" },
      destaque: "antes do 3º mês",
      direcao_capa: { cena: "Dancers fading into mist at practice bars", estilo: "ilustracao-3d" },
    });
    const { extras } = postDoMotor(p, 0, [], c);
    expect(extras.padrao_viral).toEqual({ nome: "erro invisível", origem: "ao_vivo" });
    expect(extras.destaque).toBe("antes do 3º mês");
    expect(extras.direcao_capa).toEqual({ cena: "Dancers fading into mist at practice bars", estilo: "ilustracao-3d" });
  });

  it("destaque que não está no título sai; campos ruins não derrubam o post", () => {
    const c = contextoDosPosts({ brand: cora.brand, palpite: "fintech", quantidade: 1, redes: ["instagram"] });
    const { extras } = postDoMotor(cru({ destaque: "outra coisa", padrao_viral: "x", direcao_capa: 3 }), 0, [], c);
    expect(extras.destaque).toBeUndefined();
    expect(extras.padrao_viral).toBeUndefined();
    expect(extras.direcao_capa).toBeUndefined();
  });
```

- [ ] **Passo 2: rodar e ver falhar**

Run: `npx vitest run tests/motor.test.ts`
Expected: FAIL.

- [ ] **Passo 3: tipos em `src/lib/motor/contrato.ts`**

Antes de `export interface ExtrasPost`:

```ts
/** Estilo da imagem da capa. O mesmo que a direção de arte usa (src/lib/imagem/direcao.ts). */
export type EstiloCapa = "fotografia" | "ilustracao-3d" | "ilustracao-flat";
```

e dentro de `ExtrasPost`:

```ts
  /** Padrão viral que o post adaptou e de onde ele veio (busca ao vivo ou biblioteca curada). */
  padrao_viral?: { nome: string; origem: "ao_vivo" | "biblioteca" };
  /** Trecho do título da capa que a arte marca com a cor da marca. */
  destaque?: string;
  /** Direção de arte da imagem da capa, escrita pelo Claude junto com o post (em inglês). */
  direcao_capa?: { cena: string; estilo: EstiloCapa };
```

Em `src/lib/imagem/direcao.ts`, troque `export type Estilo = "fotografia" | "ilustracao-3d" | "ilustracao-flat";` por:

```ts
import type { EstiloCapa } from "@/lib/motor/contrato";

export type Estilo = EstiloCapa;
```

- [ ] **Passo 4: esquema e mapeamento em `src/lib/motor/saida.ts`**

No `postMotorSchema`, depois de `por_que_funciona`:

```ts
    padrao_viral: z
      .object({ nome: txt(120), origem: z.enum(["ao_vivo", "biblioteca"]).catch("biblioteca") })
      .catch({ nome: "", origem: "biblioteca" as const }),
    destaque: txt(120),
    direcao_capa: z
      .object({ cena: txt(900), estilo: z.enum(["fotografia", "ilustracao-3d", "ilustracao-flat"]).catch("fotografia") })
      .catch({ cena: "", estilo: "fotografia" as const }),
```

Acima de `postDoMotor`:

```ts
const palavraNormal = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

/** O destaque só vale se for um trecho seguido do título da capa, de 1 a 6 palavras. Senão, sai vazio. */
export function destaqueValido(destaque: string, titulo: string): string {
  const alvo = destaque.split(/\s+/).map(palavraNormal).filter(Boolean);
  const palavras = titulo.split(/\s+/).map(palavraNormal);
  if (!alvo.length || alvo.length > 6) return "";
  for (let i = 0; i + alvo.length <= palavras.length; i++) {
    if (alvo.every((a, k) => palavras[i + k] === a)) return destaque.trim();
  }
  return "";
}
```

No `return` de `postDoMotor`, dentro de `extras`, depois de `precisa_revisao: revisar,`:

```ts
      ...(p.padrao_viral.nome ? { padrao_viral: p.padrao_viral } : {}),
      ...(destaqueValido(p.destaque, slides[0]?.titulo || gancho) ? { destaque: p.destaque.trim() } : {}),
      ...(p.direcao_capa.cena ? { direcao_capa: p.direcao_capa } : {}),
```

- [ ] **Passo 5: a arte e a imagem aceitam os campos (`src/lib/render/payload.ts`)**

No `post` do `payloadSchema`, depois de `por_que`:

```ts
    destaque: z.string().max(160).optional(),
    direcao_capa: z.object({ cena: z.string().max(900), estilo: z.enum(["fotografia", "ilustracao-3d", "ilustracao-flat"]) }).optional(),
```

- [ ] **Passo 6: rodar tudo**

Run: `npx vitest run && npx tsc --noEmit -p .`
Expected: PASS.

- [ ] **Passo 7: commit**

```bash
git add src/lib/motor src/lib/render/payload.ts src/lib/imagem/direcao.ts tests/motor.test.ts
git commit -m "Cada post traz o padrão viral, o destaque da capa e a direção de arte

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

### Tarefa C3: prompt do motor para carrossel de creator, posts primeiro na saída

**Arquivos:**
- Modificar: `src/lib/llm/prompt-motor.ts`
- Teste: `tests/prompt-motor.test.ts` (novo)

- [ ] **Passo 1: teste que falha**

```ts
// tests/prompt-motor.test.ts
import { describe, expect, it } from "vitest";
import { SISTEMA_MOTOR } from "@/lib/llm/prompt-motor";

const saida = SISTEMA_MOTOR.slice(SISTEMA_MOTOR.indexOf("## Saída (JSON)"));

describe("prompt do motor", () => {
  it("a saída começa pelos posts e não pede mais diagnóstico nem estratégia", () => {
    expect(saida.indexOf('"posts"')).toBeGreaterThan(-1);
    expect(saida.indexOf('"posts"')).toBeLessThan(saida.indexOf('"roteiros"'));
    expect(saida.indexOf('"roteiros"')).toBeLessThan(saida.indexOf('"calendario"'));
    expect(saida).not.toContain('"diagnostico"');
    expect(saida).not.toContain('"estrategia"');
    expect(SISTEMA_MOTOR).not.toContain("## 9. Diagnóstico");
  });

  it("pede padrão viral, destaque e direção da capa em cada post", () => {
    for (const campo of ['"padrao_viral"', '"destaque"', '"direcao_capa"']) expect(saida).toContain(campo);
    expect(SISTEMA_MOTOR).toContain("## 11a. Direção de arte da capa");
    expect(SISTEMA_MOTOR).toMatch(/carrossel de creator/);
    expect(SISTEMA_MOTOR).toMatch(/no máximo 2 posts do lote com o mesmo padrão/);
  });
});
```

- [ ] **Passo 2: rodar e ver falhar**

Run: `npx vitest run tests/prompt-motor.test.ts`
Expected: FAIL.

- [ ] **Passo 3: abertura do prompt**

Troque a frase `Seu trabalho é transformar o contexto recebido em diagnóstico, estratégia, calendário e posts prontos que tenham chance real de alcance no nicho do usuário.` por:

```
Seu trabalho é transformar o contexto recebido em posts prontos, roteiros de vídeo e calendário, com chance real de alcance no nicho do usuário. Os posts saem no estilo carrossel de creator: capa com gancho forte e imagem, slides curtos que entregam valor e uma chamada final clara.
```

- [ ] **Passo 4: seção 6 inteira**

Troque o bloco que começa em `## 6. Como escolher cada post` e termina em `Distribua os padrões: não repita o mesmo padrão de gancho mais de 2 vezes num lote de até 9 posts.` por:

```
## 6. Como escolher cada post
Para cada post:
1. Escolha um objetivo da lista objetivos e o recorte do publico_alvo que o post endereça (seção 5).
2. Escolha um padrão viral que já funcionou para esse objetivo e essa rede: de virais_ao_vivo (o que está rendendo agora no nicho deste cliente) ou de referencias_nicho (a biblioteca curada). Informe em "padrao_viral" o "nome" do padrão, em poucas palavras, e a "origem" ("ao_vivo" ou "biblioteca").
3. Adapte o mecanismo do gancho ao que a empresa realmente faz. O gancho cabe na primeira linha ou no primeiro slide e dá motivo para parar a rolagem: contradição, número com fonte, erro comum, história, pergunta que o público vive.
4. Justifique em uma frase por que esse post tende a performar, citando o padrão usado.
Distribua os padrões: no máximo 2 posts do lote com o mesmo padrão. Quando virais_ao_vivo tiver 3 itens ou mais, pelo menos metade dos posts usa um padrão de lá.
```

- [ ] **Passo 5: carrossel de creator na seção 7**

Troque a linha `- carrossel: 5 a 8 slides. Slide 1 é gancho, último slide é fechamento com chamada para salvar, comentar ou seguir. Máximo 30 palavras por slide.` por:

```
- carrossel de creator, o formato principal (4 ou 5 dos 6 posts quando formatos_permitidos deixar; com a lista vazia, use carrossel na maioria): 5 a 7 slides.
  Slide 1 (capa): o gancho no titulo, até 12 palavras, e no texto uma promessa curta do que vem.
  Slides do meio: um ponto por slide, titulo de até 8 palavras e texto de até 30. Siga a estrutura do padrão viral escolhido: tensão, valor, prova.
  Último slide: a chamada no titulo e, no texto, o que a pessoa ganha fazendo isso.
  Em "destaque", copie de 2 a 5 palavras seguidas do titulo da capa que carregam a tensão do gancho. A arte marca esse trecho com a cor da marca.
```

- [ ] **Passo 6: tirar o diagnóstico**

Apague a seção inteira que começa em `## 9. Diagnóstico` (o título e o parágrafo seguinte, até antes de `## 10. Aprendizado`).

- [ ] **Passo 7: direção de arte da capa**

Antes de `## 12. Roteiros de vídeo`, acrescente:

```
## 11a. Direção de arte da capa
Todo carrossel, citação e dado de impacto ganha uma capa com imagem criada por IA, que ocupa a faixa de cima da arte. Em "direcao_capa", escreva a direção de arte dessa imagem:
- "cena": uma frase em inglês com uma cena concreta e fotografável que traduz a ideia do post em metáfora visual (objetos, lugar, luz, material). Ela aparece num recorte horizontal largo: o assunto principal fica no centro.
- "estilo": "fotografia", "ilustracao-3d" ou "ilustracao-flat", conforme o tom da marca.
- A imagem nunca tem texto, letra, número, logo, tela legível, papel escrito, calendário, relógio, cartão ou dinheiro. Nada de rosto identificável nem antes e depois. Em saúde, nada de paciente doente, sangue, agulha ou procedimento.
- Cite as cores da marca pelo nome em inglês quando fizer sentido.
Nos outros formatos, "direcao_capa" vem com a cena vazia.
```

- [ ] **Passo 8: saída com os posts primeiro**

Troque tudo o que vem entre a linha `## Saída (JSON)` e o fim da template string de `SISTEMA_MOTOR` (a linha `}\`;`) por:

```
## Saída (JSON)
Devolva exatamente este objeto, nesta ordem de campos: os posts primeiro.
{
  "posts": [{
    "post_id": "",
    "trilho": "founder | empresa",
    "rede": "",
    "formato": "",
    "template": "",
    "objetivo": "",
    "origem_tema": "founder | site | noticia | nicho",
    "padrao_viral": { "nome": "", "origem": "ao_vivo | biblioteca" },
    "enderecamento": { "objetivo": "id de objetivos", "publico": "recorte concreto do publico_alvo", "gatilho_identificacao": "dor, desejo ou situação tirada das fontes", "acao_esperada": "" },
    "padrao_referencia": { "nome": "", "fonte_url": "" },
    "gancho": "",
    "destaque": "",
    "slides_ou_arte": [{"titulo": "", "texto": ""}],
    "legenda": "",
    "hashtags": [],
    "chamada_final": "",
    "por_que_funciona": "",
    "direcao_capa": { "cena": "", "estilo": "fotografia | ilustracao-3d | ilustracao-flat" },
    "precisa_revisao": []
  }],
  "roteiros": [{
    "roteiro_id": "v1",
    "titulo": "",
    "rede": "instagram | linkedin | tiktok | youtube",
    "duracao_seg": 30,
    "gancho": "",
    "cenas": [{"fala": "", "tela": ""}],
    "chamada_final": "",
    "legenda": "",
    "dica_gravacao": "",
    "objetivo": "",
    "origem_tema": "founder | site | noticia | nicho",
    "enderecamento": { "objetivo": "", "publico": "", "gatilho_identificacao": "", "acao_esperada": "" },
    "padrao_referencia": { "nome": "", "fonte_url": "" },
    "agenda": { "dia": "", "horario": "", "fonte": "sua audiência | hipótese do nicho | teste" },
    "precisa_revisao": []
  }],
  "calendario": {
    "frequencia_semana": [{"rede": "", "posts": 0}],
    "slots": [{"dia": "", "horario": "", "rede": "", "post_id": "", "fonte": "sua audiência | hipótese do nicho | teste"}],
    "comentario_frequencia": ""
  },
  "contexto_inferido": { "nicho": "", "publico": "", "tom_resumo": "", "objetivos": [], "confianca": "alta | media | baixa" },
  "aprendizados": { "funcionou": [], "nao_funcionou": [], "ajuste": "" },
  "benchmark_concorrentes": [{ "url": "", "nome": "", "formatos": [], "angulos": [], "oportunidade": "" }],
  "o_que_aprendi": "",
  "avisos": []
}`;
```

- [ ] **Passo 9: rodar os testes**

Run: `npx vitest run tests/prompt-motor.test.ts tests/motor.test.ts tests/roteiros.test.ts`
Expected: PASS. Se algum teste antigo procurar `"diagnostico"` no prompt, apague essa asserção: o diagnóstico passou a ser preenchido pelo servidor (`DIAG_RESERVA` em `saida.ts`).

- [ ] **Passo 10: commit**

```bash
git add src/lib/llm/prompt-motor.ts tests/prompt-motor.test.ts tests
git commit -m "Prompt do motor: carrossel de creator, padrão viral e capa, posts primeiro

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

### Tarefa C4: streaming e cache de prompt no adaptador do Claude

**Arquivos:**
- Modificar: `src/lib/llm/index.ts`
- Teste: `tests/llm.test.ts` (novo)

- [ ] **Passo 1: teste que falha**

```ts
// tests/llm.test.ts
import { describe, expect, it } from "vitest";
import { parametrosDoPedido } from "@/lib/llm";

describe("parâmetros do pedido ao Claude", () => {
  const longo = "x".repeat(7000);

  it("Sonnet com instrução longa usa cache de prompt e esforço", () => {
    const p = parametrosDoPedido("claude-sonnet-5", { maxTokens: 32000, esforco: "low" }, longo, "oi");
    expect(p.system).toEqual([{ type: "text", text: longo, cache_control: { type: "ephemeral" } }]);
    expect(p.output_config).toEqual({ effort: "low" });
  });

  it("Haiku e instrução curta vão sem cache e sem esforço", () => {
    expect(parametrosDoPedido("claude-haiku-4-5", { maxTokens: 16000, esforco: "low" }, longo, "oi").system).toBe(longo);
    expect(parametrosDoPedido("claude-haiku-4-5", { maxTokens: 16000, esforco: "low" }, longo, "oi").output_config).toBeUndefined();
    expect(parametrosDoPedido("claude-sonnet-5", { maxTokens: 16000 }, "curto", "oi").system).toBe("curto");
  });
});
```

- [ ] **Passo 2: rodar e ver falhar**

Run: `npx vitest run tests/llm.test.ts`
Expected: FAIL.

- [ ] **Passo 3: `src/lib/llm/index.ts`**

Na interface `LLM`, acrescente:

```ts
  /** Como gerar, mas entrega o texto aos pedaços enquanto o modelo escreve. Só existe no Claude. */
  gerarEmStream?(sistema: string, prompt: string, aoTexto: (delta: string) => void, sinal?: AbortSignal): Promise<string>;
```

Acima da classe `ClaudeLLM`:

```ts
/**
 * Corpo do pedido ao Claude. As instruções fixas grandes vão com cache de prompt de 5 minutos: o Sonnet cacheia a
 * partir de 1.024 tokens (6 mil caracteres dão folga) e o Haiku só a partir de 4.096, por isso fica de fora.
 */
export function parametrosDoPedido(modelo: string, op: { maxTokens: number; esforco?: Esforco }, sistema: string, prompt: string) {
  const haiku = modelo.startsWith("claude-haiku");
  const cache = !haiku && sistema.length >= 6000;
  return {
    model: modelo,
    max_tokens: op.maxTokens,
    system: cache ? [{ type: "text" as const, text: sistema, cache_control: { type: "ephemeral" as const } }] : sistema,
    messages: [{ role: "user" as const, content: prompt }],
    ...(op.esforco && !haiku ? { output_config: { effort: op.esforco } } : {}),
  };
}
```

Em `registrarUso`, troque a linha do `console.info` por:

```ts
  const cache = u.cache_read_input_tokens || u.cache_creation_input_tokens ? ` cache_lido=${u.cache_read_input_tokens ?? 0} cache_gravado=${u.cache_creation_input_tokens ?? 0}` : "";
  console.info(`[ia] ${tipo} ${modelo} entrada=${u.input_tokens} saida=${u.output_tokens}${buscas ? ` buscas=${buscas}` : ""}${cache}`);
```

Em `ClaudeLLM.gerar`, troque o objeto passado a `this.client.messages.stream({...})` por `parametrosDoPedido(this.modelo, this.op, sistema, prompt)`, e acrescente o método:

```ts
  async gerarEmStream(sistema: string, prompt: string, aoTexto: (delta: string) => void, sinal?: AbortSignal): Promise<string> {
    const stream = this.client.messages.stream(parametrosDoPedido(this.modelo, this.op, sistema, prompt), sinal ? { signal: sinal } : undefined);
    stream.on("text", (delta) => aoTexto(delta));
    const msg = await stream.finalMessage();
    registrarUso(this.modelo, "gerar-ao-vivo", msg.usage);
    if (msg.stop_reason === "refusal") throw new Error("Claude recusou a solicitação");
    if (msg.stop_reason === "max_tokens") throw new Error("Claude parou no limite de tamanho da resposta");
    return msg.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  }
```

- [ ] **Passo 4: rodar os testes**

Run: `npx vitest run tests/llm.test.ts && npx tsc --noEmit -p .`
Expected: PASS.

- [ ] **Passo 5: commit**

```bash
git add src/lib/llm/index.ts tests/llm.test.ts
git commit -m "Claude em streaming e com cache de prompt nas instruções do motor

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

## Trilha D: espera ao vivo

Depende de C1 (post reaproveitável) e C4 (`gerarEmStream`). D5 depende também de E4 (registro de capas).

### Tarefa D1: leitor incremental dos posts

**Arquivos:**
- Criar: `src/lib/engine/ao-vivo.ts`
- Teste: `tests/ao-vivo.test.ts` (novo)

- [ ] **Passo 1: teste que falha**

```ts
// tests/ao-vivo.test.ts
import { describe, expect, it } from "vitest";
import { ganchoParcial, lerPostsParciais } from "@/lib/engine/ao-vivo";

const completo = JSON.stringify({
  posts: [
    { gancho: "Primeiro {com chave} e \"aspas\"", slides_ou_arte: [{ titulo: "a", texto: "b" }] },
    { gancho: "Segundo", slides_ou_arte: [] },
  ],
  roteiros: [],
});

describe("leitor incremental", () => {
  it("devolve só os objetos que já fecharam, na ordem", () => {
    const corte = completo.indexOf('{ "gancho": "Segundo"'.replace(" ", "")) > 0 ? completo.indexOf('{"gancho":"Segundo"') : completo.length;
    const r = lerPostsParciais(completo.slice(0, corte + 20));
    expect(r.prontos).toHaveLength(1);
    expect(JSON.parse(r.prontos[0]).gancho).toBe('Primeiro {com chave} e "aspas"');
    expect(r.escrevendo).toEqual({ indice: 1, gancho: "Segundo" });
  });

  it("com a resposta inteira, lê todos e não há post aberto", () => {
    const r = lerPostsParciais(completo);
    expect(r.prontos.map((p) => JSON.parse(p).gancho)).toEqual(['Primeiro {com chave} e "aspas"', "Segundo"]);
    expect(r.escrevendo).toBeNull();
  });

  it("antes do array de posts não há nada", () => {
    expect(lerPostsParciais('{"pos')).toEqual({ prontos: [], escrevendo: null });
  });

  it("gancho parcial só quando o campo já fechou", () => {
    expect(ganchoParcial('{"gancho":"Meio do')).toBeNull();
    expect(ganchoParcial('{"gancho":"Inteiro \\"ok\\"","slides')).toBe('Inteiro "ok"');
  });
});
```

- [ ] **Passo 2: rodar e ver falhar**

Run: `npx vitest run tests/ao-vivo.test.ts`
Expected: FAIL (módulo não existe).

- [ ] **Passo 3: implementar `src/lib/engine/ao-vivo.ts`**

```ts
// Geração ao vivo: lê o JSON do motor enquanto ele chega e solta cada post assim que ele fecha.

export interface LeituraParcial {
  /** Posts completos, cada um como o texto JSON do objeto. */
  prontos: string[];
  /** Post aberto que ainda está sendo escrito, com o gancho quando o campo já fechou. */
  escrevendo: { indice: number; gancho: string | null } | null;
}

/**
 * Acha o array "posts" e devolve os objetos que já fecharam, na ordem. Não depende do fim da resposta: conta
 * chaves e respeita aspas e escapes, então chave dentro de texto não confunde a contagem.
 */
export function lerPostsParciais(texto: string): LeituraParcial {
  const achado = /"posts"\s*:\s*\[/.exec(texto);
  if (!achado) return { prontos: [], escrevendo: null };
  const prontos: string[] = [];
  let profundidade = 0;
  let dentroDeTexto = false;
  let escape = false;
  let comeco = -1;
  for (let i = achado.index + achado[0].length; i < texto.length; i++) {
    const c = texto[i];
    if (dentroDeTexto) {
      if (escape) escape = false;
      else if (c === "\\") escape = true;
      else if (c === '"') dentroDeTexto = false;
      continue;
    }
    if (c === '"') dentroDeTexto = true;
    else if (c === "{") {
      if (profundidade === 0) comeco = i;
      profundidade++;
    } else if (c === "}") {
      profundidade--;
      if (profundidade === 0 && comeco >= 0) {
        prontos.push(texto.slice(comeco, i + 1));
        comeco = -1;
      }
    } else if (c === "]" && profundidade === 0) {
      return { prontos, escrevendo: null }; // o array de posts acabou
    }
  }
  return { prontos, escrevendo: comeco >= 0 ? { indice: prontos.length, gancho: ganchoParcial(texto.slice(comeco)) } : null };
}

/** O gancho do post aberto, se o campo já fechou. */
export function ganchoParcial(objetoAberto: string): string | null {
  const m = /"gancho"\s*:\s*"((?:[^"\\]|\\.)*)"/.exec(objetoAberto);
  if (!m) return null;
  try {
    return JSON.parse(`"${m[1]}"`) as string;
  } catch {
    return null;
  }
}
```

- [ ] **Passo 4: rodar os testes**

Run: `npx vitest run tests/ao-vivo.test.ts`
Expected: PASS. (No primeiro teste, o corte cai no meio do segundo objeto, depois do campo `gancho`.)

- [ ] **Passo 5: commit**

```bash
git add src/lib/engine/ao-vivo.ts tests/ao-vivo.test.ts
git commit -m "Leitor incremental dos posts do motor

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

### Tarefa D2: o motor avisa cada post pronto enquanto escreve

**Arquivos:**
- Modificar: `src/lib/motor/contrato.ts`, `src/lib/engine/ao-vivo.ts`, `src/lib/motor/checar-numeros.ts`, `src/lib/engine/index.ts`
- Teste: `tests/ao-vivo.test.ts`

- [ ] **Passo 1: teste que falha**

Acrescente em `tests/ao-vivo.test.ts`:

```ts
import { criarOuvinteAoVivo } from "@/lib/engine/ao-vivo";
import { DEMOS } from "@/lib/engine/demo";
import { preferenciasSchema, type EventoAoVivo } from "@/lib/motor/contrato";

describe("ouvinte ao vivo", () => {
  const cora = DEMOS.cora;
  const saida = JSON.stringify({
    posts: [
      { rede: "instagram", formato: "carrossel", gancho: "Analisamos 3.847 PMEs", slides_ou_arte: [{ titulo: "Analisamos 3.847 PMEs", texto: "E aprendemos isto" }, { titulo: "Um", texto: "x" }], legenda: "Legenda **forte**", destaque: "3.847 PMEs" },
      { rede: "linkedin", formato: "carrossel", gancho: "Segundo post", slides_ou_arte: [{ titulo: "Segundo post", texto: "" }], legenda: "Outra" },
    ],
    roteiros: [],
  });

  it("emite escrevendo e post, já com id final e checagens aplicadas", () => {
    const eventos: EventoAoVivo[] = [];
    const o = criarOuvinteAoVivo({
      id: "abc",
      quantidade: 2,
      adaptador: { brand: cora.brand, palpite: "fintech", quantidade: 2, redes: ["instagram", "linkedin"], preferencias: preferenciasSchema.parse({}) },
      fontes: new Set<string>(),
      temFounder: false,
      emitir: (e) => eventos.push(e),
    });
    for (let i = 0; i < saida.length; i += 37) o.receber(saida.slice(i, i + 37));
    const posts = eventos.filter((e) => e.tipo === "post");
    expect(posts.map((e) => e.tipo === "post" && e.post.id)).toEqual(["abc-p1", "abc-p2"]);
    const primeiro = posts[0].tipo === "post" ? posts[0].post : null;
    expect(primeiro?.gancho).toBe("Analisamos PMEs");
    expect(primeiro?.legendas.instagram).not.toContain("**");
    expect(primeiro?.precisa_revisao?.length).toBeGreaterThan(0);
    expect(eventos.find((e) => e.tipo === "escrevendo" && e.indice === 1)).toBeTruthy();
    expect(eventos.findIndex((e) => e.tipo === "post" && e.indice === 0)).toBeLessThan(eventos.findIndex((e) => e.tipo === "escrevendo" && e.indice === 1 && e.gancho !== null));
  });
});
```

- [ ] **Passo 2: rodar e ver falhar**

Run: `npx vitest run tests/ao-vivo.test.ts`
Expected: FAIL.

- [ ] **Passo 3: o contrato dos eventos em `src/lib/motor/contrato.ts`**

No topo, `import type { Analise, PostGerado } from "@/lib/types";` e, no fim do arquivo:

```ts
/**
 * Eventos da geração ao vivo (POST /api/analyze com `stream: true`), um por linha de NDJSON.
 * `previa` diz se o post veio da escrita ao vivo da IA (true) ou saiu pronto no fim (demo, cache, motor local).
 */
export type EventoAoVivo =
  | { tipo: "inicio"; concorrentes: string[]; em_alta: string[]; virais_ao_vivo: number; preenchimento?: string }
  | { tipo: "escrevendo"; indice: number; gancho: string | null }
  | { tipo: "post"; indice: number; post: PostGerado; previa: boolean }
  | { tipo: "final"; analise: Analise }
  | { tipo: "erro"; mensagem: string };

/** O que o motor emite enquanto escreve. */
export type EventoDoMotor = Extract<EventoAoVivo, { tipo: "escrevendo" | "post" }>;
```

- [ ] **Passo 4: `textosDasFontes` vai para `src/lib/motor/checar-numeros.ts`**

Recorte a função `textosDasFontes` do fim de `src/lib/engine/index.ts` e cole no fim de `src/lib/motor/checar-numeros.ts` (com `import type { BrandProfile } from "@/lib/types";` e `import type { Preferencias } from "./contrato";`). Em `src/lib/engine/index.ts`, importe-a de `@/lib/motor/checar-numeros` junto de `checarNumeros`. Nada muda no comportamento.

- [ ] **Passo 5: o ouvinte em `src/lib/engine/ao-vivo.ts`**

Acrescente:

```ts
import type { EventoDoMotor } from "@/lib/motor/contrato";
import { checarNumeros, limparFormato } from "@/lib/motor/checar-numeros";
import { contextoDosPosts, postDoMotor, postMotorSchema, type ContextoPosts, type OpcoesAdaptador } from "@/lib/motor/saida";
import type { PostGerado } from "@/lib/types";
import { extrairJson, postDaSaida, postIASchema, semTravessao } from "./schema";

export interface ConfigOuvinte {
  /** Id da análise: os posts saem com o id final (`${id}-p1`). */
  id: string;
  quantidade: number;
  adaptador: OpcoesAdaptador;
  /** Números das fontes, para a mesma checagem do fim da análise. */
  fontes: Set<string>;
  temFounder: boolean;
  emitir: (e: EventoDoMotor) => void;
}

/** Recebe o texto do modelo aos pedaços e emite o post que está sendo escrito e cada post pronto, já checado. */
export function criarOuvinteAoVivo(c: ConfigOuvinte): { receber: (delta: string) => void } {
  const ctx = contextoDosPosts(c.adaptador);
  const trilhos: ("founder" | "empresa")[] = [];
  let texto = "";
  let emitidos = 0;
  let aviso = { indice: -1, gancho: null as string | null };
  return {
    receber(delta) {
      texto += delta;
      // Só relê quando algo pode ter fechado: um objeto (}) ou um campo de texto (").
      if (!/[}"]/.test(delta)) return;
      const { prontos, escrevendo } = lerPostsParciais(texto);
      while (emitidos < prontos.length && emitidos < c.quantidade) {
        const indice = emitidos++;
        const post = previaDoPost(prontos[indice], indice, trilhos, ctx, c);
        if (post) c.emitir({ tipo: "post", indice, post, previa: true });
      }
      if (escrevendo && escrevendo.indice < c.quantidade && (escrevendo.indice !== aviso.indice || escrevendo.gancho !== aviso.gancho)) {
        aviso = escrevendo;
        c.emitir({ tipo: "escrevendo", indice: escrevendo.indice, gancho: escrevendo.gancho });
      }
    },
  };
}

function previaDoPost(json: string, indice: number, trilhos: ("founder" | "empresa")[], ctx: ContextoPosts, c: ConfigOuvinte): PostGerado | null {
  let bruto: unknown;
  try {
    bruto = extrairJson(json);
  } catch {
    return null;
  }
  const p = postMotorSchema.safeParse(bruto);
  if (!p.success) return null;
  const { post, extras } = postDoMotor(p.data, indice, trilhos, ctx);
  trilhos.push(extras.trilho ?? "empresa");
  const valido = postIASchema.safeParse(post);
  if (!valido.success) return null;
  const base: PostGerado = { ...postDaSaida(semTravessao(valido.data), c.id, indice), ...semTravessao(extras) };
  const [limpo] = limparFormato([base], c.temFounder);
  return checarNumeros([limpo], undefined, c.fontes).posts[0];
}
```

- [ ] **Passo 6: `analisar` usa o ouvinte (`src/lib/engine/index.ts`)**

Em `AnalisarOpcoes`, acrescente:

```ts
  /** Geração ao vivo: o post sendo escrito e cada post pronto saem por aqui enquanto a IA escreve. */
  aoVivo?: (e: EventoDoMotor) => void;
  /** Cancela a chamada da IA quando a pessoa fecha a página. */
  sinal?: AbortSignal;
```

Logo depois de `const id = novoId();`, mova para cá a linha `const temFounder = ...` que hoje está dentro do bloco `if (provedor) {` (e apague-a de lá).

No bloco `if (llm)`, antes de `if (pref) {`, declare `let ouvinte: { receber: (delta: string) => void } | null = null;`. Dentro de `if (pref) {`, depois da linha `const horariosComDado = ...;`:

```ts
        ouvinte = op.aoVivo
          ? criarOuvinteAoVivo({
              id,
              quantidade,
              adaptador: { brand, palpite, quantidade, redes, preferencias: pref, padroes: contexto.map((c) => c.padrao), horariosComDado },
              fontes: numerosDasFontes(textosDasFontes(brand, pref)),
              temFounder,
              emitir: op.aoVivo,
            })
          : null;
```

No laço de tentativas, troque a chamada `const txt = await llm.gerar(sistema, erroAnterior ? ... : prompt);` por:

```ts
          const promptAtual = erroAnterior ? `${prompt}\n\nA resposta anterior veio inválida (${erroAnterior}). Corrija e devolva só o JSON.` : prompt;
          // Primeira tentativa ao vivo, quando a tela pediu e o provedor transmite; a nova tentativa vai inteira.
          const txt =
            tentativa === 0 && ouvinte && llm.gerarEmStream
              ? await llm.gerarEmStream(sistema, promptAtual, ouvinte.receber, op.sinal)
              : await llm.gerar(sistema, promptAtual);
```

e no `catch` do laço, antes do `if (/HTTP (401|403|429)/...)`:

```ts
          if (op.sinal?.aborted) break; // a pessoa saiu: não paga outra tentativa
```

Importe `criarOuvinteAoVivo` de `./ao-vivo` e `EventoDoMotor` de `@/lib/motor/contrato`.

- [ ] **Passo 7: rodar tudo**

Run: `npx vitest run && npx tsc --noEmit -p .`
Expected: PASS.

- [ ] **Passo 8: commit**

```bash
git add src/lib tests/ao-vivo.test.ts
git commit -m "Motor avisa cada post pronto enquanto escreve

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

### Tarefa D3: `/api/analyze` em modo stream

**Arquivos:**
- Criar: `src/lib/http-ao-vivo.ts`
- Modificar: `src/app/api/analyze/route.ts`
- Teste: `tests/http-ao-vivo.test.ts` (novo)

- [ ] **Passo 1: teste que falha**

```ts
// tests/http-ao-vivo.test.ts
import { describe, expect, it } from "vitest";
import { inicioDaPesquisa, respostaAoVivo } from "@/lib/http-ao-vivo";
import { DEMOS } from "@/lib/engine/demo";
import type { Analise } from "@/lib/types";

const linhas = async (r: Response) => (await r.text()).trim().split("\n").map((l) => JSON.parse(l));

describe("resposta ao vivo", () => {
  const analise = { ...DEMOS.cora, posts: DEMOS.cora.posts.slice(0, 2) } as unknown as Analise;

  it("inicio com preenchimento de 1 KB, posts ao vivo, os que faltaram e o final", async () => {
    const r = respostaAoVivo(inicioDaPesquisa({ concorrentes: [{ nome: "A" }], em_alta: [{ tema: "T" }], virais_ao_vivo: [1, 2] }), async (emitir) => {
      emitir({ tipo: "escrevendo", indice: 0, gancho: "G" });
      emitir({ tipo: "post", indice: 0, post: analise.posts[0], previa: true });
      return analise;
    });
    expect(r.headers.get("content-type")).toContain("application/x-ndjson");
    const ev = await linhas(r);
    expect(ev.map((e) => e.tipo)).toEqual(["inicio", "escrevendo", "post", "post", "final"]);
    expect(ev[0]).toMatchObject({ concorrentes: ["A"], em_alta: ["T"], virais_ao_vivo: 2 });
    expect(ev[0].preenchimento.length).toBe(1024);
    expect(ev[3]).toMatchObject({ indice: 1, previa: false });
  });

  it("falha vira evento de erro, sem derrubar o stream", async () => {
    const ev = await linhas(respostaAoVivo(inicioDaPesquisa(undefined), async () => { throw new Error("x"); }));
    expect(ev.map((e) => e.tipo)).toEqual(["inicio", "erro"]);
  });
});
```

- [ ] **Passo 2: rodar e ver falhar**

Run: `npx vitest run tests/http-ao-vivo.test.ts`
Expected: FAIL.

- [ ] **Passo 3: `src/lib/http-ao-vivo.ts`**

```ts
import { CORS_HEADERS } from "@/lib/http";
import type { EventoAoVivo, EventoDoMotor } from "@/lib/motor/contrato";
import type { Analise } from "@/lib/types";

type Inicio = Extract<EventoAoVivo, { tipo: "inicio" }>;

/**
 * Resposta NDJSON da geração ao vivo, um evento por linha. O primeiro leva 1 KB de preenchimento porque o Safari
 * só mostra um stream depois do primeiro quilobyte. Posts que não saíram ao vivo (demo, cache, motor local) saem
 * juntos antes do evento final.
 */
export function respostaAoVivo(inicio: Inicio, executar: (emitir: (e: EventoDoMotor) => void) => Promise<Analise>): Response {
  const cod = new TextEncoder();
  const corpo = new ReadableStream<Uint8Array>({
    async start(controller) {
      let aberto = true;
      const enviar = (e: EventoAoVivo) => {
        if (!aberto) return;
        try {
          controller.enqueue(cod.encode(JSON.stringify(e) + "\n"));
        } catch {
          aberto = false; // a pessoa fechou a página
        }
      };
      enviar({ ...inicio, preenchimento: " ".repeat(1024) });
      const emitidos = new Set<number>();
      try {
        const analise = await executar((e) => {
          if (e.tipo === "post") emitidos.add(e.indice);
          enviar(e);
        });
        analise.posts.forEach((post, indice) => {
          if (!emitidos.has(indice)) enviar({ tipo: "post", indice, post, previa: false });
        });
        enviar({ tipo: "final", analise });
      } catch (e) {
        console.error("[analyze]", (e as Error).message);
        enviar({ tipo: "erro", mensagem: "O motor tropeçou nesta análise. Tente de novo ou use um dos exemplos." });
      } finally {
        if (aberto) controller.close();
      }
    },
  });
  return new Response(corpo, {
    headers: {
      ...CORS_HEADERS,
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no",
      "x-content-type-options": "nosniff",
    },
  });
}

/** O que a tela mostra no topo enquanto os posts nascem: concorrentes, temas em alta e virais ao vivo. */
export function inicioDaPesquisa(pesquisa?: { concorrentes?: { nome: string }[]; em_alta?: { tema: string }[]; virais_ao_vivo?: unknown[] }): Inicio {
  return {
    tipo: "inicio",
    concorrentes: (pesquisa?.concorrentes ?? []).map((c) => c.nome).slice(0, 5),
    em_alta: (pesquisa?.em_alta ?? []).map((t) => t.tema).slice(0, 4),
    virais_ao_vivo: pesquisa?.virais_ao_vivo?.length ?? 0,
  };
}
```

- [ ] **Passo 4: a rota**

Em `src/app/api/analyze/route.ts`, no esquema `Entrada`, acrescente `stream: z.boolean().optional(),`. Troque o bloco que vai de `let analise;` até `return json(analise);` por:

```ts
  const opcoes = {
    quantidade: d.quantidade,
    email: d.email ?? null,
    identificadores: [`ip:${ip}`, ...(d.email ? [d.email.toLowerCase()] : [])],
    // Ignorar o cache custa uma chamada de IA: só o time pode pedir.
    forcarNovo: d.forcarNovo && adminOk(req),
    // Os @ do founder vão só no contexto do motor, não nos handles da marca.
    preferencias,
  };
  // Tela ao vivo: cada post sai assim que fica pronto. Sem `stream`, a resposta é a mesma de sempre (SPEC.md, Adapta).
  if (d.stream) {
    return respostaAoVivo(inicioDaPesquisa(preferencias?.pesquisa_mercado), (emitir) =>
      analisar(brand, { ...opcoes, aoVivo: emitir, sinal: req.signal }),
    );
  }
  let analise;
  try {
    analise = await analisar(brand, opcoes);
  } catch (e) {
    console.error("[analyze]", (e as Error).message);
    return erro("O motor tropeçou nesta análise. Tente de novo ou use um dos exemplos.", 500);
  }
  return json(analise);
```

e importe `inicioDaPesquisa, respostaAoVivo` de `@/lib/http-ao-vivo`.

- [ ] **Passo 5: rodar tudo**

Run: `npx vitest run && npx tsc --noEmit -p .`
Expected: PASS.

- [ ] **Passo 6: commit**

```bash
git add src/lib/http-ao-vivo.ts src/app/api/analyze/route.ts tests/http-ao-vivo.test.ts
git commit -m "Análise em modo stream: eventos NDJSON para a tela ao vivo

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

### Tarefa D4: navegador lê os eventos e guarda o estado ao vivo

**Arquivos:**
- Criar: `src/lib/client/ao-vivo.ts`
- Modificar: `src/components/estudio/useGeracao.ts`
- Teste: `tests/cliente-ao-vivo.test.ts` (novo)

- [ ] **Passo 1: teste que falha**

```ts
// tests/cliente-ao-vivo.test.ts
import { describe, expect, it } from "vitest";
import { lerLinhasJson } from "@/lib/client/ao-vivo";

function resposta(pedacos: string[]): Response {
  const cod = new TextEncoder();
  return new Response(new ReadableStream({ start(c) { pedacos.forEach((p) => c.enqueue(cod.encode(p))); c.close(); } }));
}

describe("leitor de NDJSON no navegador", () => {
  it("junta linhas cortadas entre pedaços e ignora linhas vazias", async () => {
    const vistos: unknown[] = [];
    await lerLinhasJson(resposta(['{"a":1}\n{"b"', ':2}\n\n{"c":', "3}"]), (e) => vistos.push(e));
    expect(vistos).toEqual([{ a: 1 }, { b: 2 }, { c: 3 }]);
  });

  it("erro dentro do tratamento interrompe a leitura", async () => {
    await expect(lerLinhasJson(resposta(['{"a":1}\n{"a":2}\n']), () => { throw new Error("parar"); })).rejects.toThrow("parar");
  });
});
```

- [ ] **Passo 2: rodar e ver falhar**

Run: `npx vitest run tests/cliente-ao-vivo.test.ts`
Expected: FAIL.

- [ ] **Passo 3: `src/lib/client/ao-vivo.ts`**

```ts
/** Lê uma resposta NDJSON linha a linha, chamando `aoItem` para cada objeto. Linha cortada entre pedaços é juntada. */
export async function lerLinhasJson<T>(res: Response, aoItem: (item: T) => void): Promise<void> {
  if (!res.body) throw new Error("A resposta veio sem corpo.");
  const leitor = res.body.getReader();
  const decodificador = new TextDecoder();
  let resto = "";
  try {
    for (;;) {
      const { value, done } = await leitor.read();
      resto += decodificador.decode(value ?? new Uint8Array(), { stream: !done });
      const linhas = resto.split("\n");
      resto = linhas.pop() ?? "";
      for (const l of linhas) if (l.trim()) aoItem(JSON.parse(l) as T);
      if (done) break;
    }
    if (resto.trim()) aoItem(JSON.parse(resto) as T);
  } finally {
    leitor.releaseLock();
  }
}
```

- [ ] **Passo 4: `useGeracao` com estado ao vivo**

Em `src/components/estudio/useGeracao.ts`:

```ts
import { lerLinhasJson } from "@/lib/client/ao-vivo";
import type { EventoAoVivo } from "@/lib/motor/contrato";
import type { PostGerado } from "@/lib/types";

/** O que a tela ao vivo mostra enquanto a análise é escrita. */
export interface EstadoAoVivo {
  resumo: { concorrentes: string[]; em_alta: string[]; virais_ao_vivo: number } | null;
  /** Posts já prontos, por índice. `previa` diz se vieram da escrita ao vivo da IA. */
  posts: Record<number, { post: PostGerado; previa: boolean }>;
  escrevendo: { indice: number; gancho: string | null } | null;
}

export const AO_VIVO_VAZIO: EstadoAoVivo = { resumo: null, posts: {}, escrevendo: null };
```

Dentro de `useGeracao`: `const [aoVivo, setAoVivo] = useState<EstadoAoVivo>(AO_VIVO_VAZIO);`, zere com `setAoVivo(AO_VIVO_VAZIO)` em `reiniciar` e no começo de `gerar`, e troque o trecho que vai do `let ra: Response;` até a linha `const a = await lerResposta(ra, ...)` por:

```ts
      let ra: Response;
      try {
        ra = await fetch("/api/analyze", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ brand: b, ...handles, quantidade: d.quantidade, stream: true, ...(opcoes.preferencias ? { preferencias: opcoes.preferencias } : {}) }),
        });
      } finally {
        clearInterval(timer);
      }
      // Guardado num objeto: atribuição dentro do callback não é vista pelo controle de tipos.
      const fim: { analise: Analise | null } = { analise: null };
      if (!ra.ok || !(ra.headers.get("content-type") ?? "").includes("ndjson")) {
        fim.analise = await lerResposta(ra, "O motor demorou demais para responder. Tente de novo ou use um dos exemplos.");
      } else {
        await lerLinhasJson<EventoAoVivo>(ra, (e) => {
          if (!vivo()) return;
          if (e.tipo === "inicio") setAoVivo((s) => ({ ...s, resumo: { concorrentes: e.concorrentes, em_alta: e.em_alta, virais_ao_vivo: e.virais_ao_vivo } }));
          else if (e.tipo === "escrevendo") setAoVivo((s) => ({ ...s, escrevendo: { indice: e.indice, gancho: e.gancho } }));
          else if (e.tipo === "post") setAoVivo((s) => ({ ...s, posts: { ...s.posts, [e.indice]: { post: e.post, previa: e.previa } } }));
          else if (e.tipo === "final") fim.analise = e.analise;
          else if (e.tipo === "erro") throw new Error(e.mensagem);
        });
        if (!fim.analise) throw new Error("A geração parou no meio. Tente de novo em instantes.");
      }
      const a = fim.analise;
```

No `return` do hook, acrescente `aoVivo`.

- [ ] **Passo 5: rodar tudo**

Run: `npx vitest run && npx tsc --noEmit -p . && npx eslint src/components/estudio src/lib/client`
Expected: PASS.

- [ ] **Passo 6: commit**

```bash
git add src/lib/client/ao-vivo.ts src/components/estudio/useGeracao.ts tests/cliente-ao-vivo.test.ts
git commit -m "Navegador lê a análise ao vivo, evento por evento

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

### Tarefa D5: a tela ao vivo

Depende de E4 (`useCapasAoVivo`, `analiseProvisoria`).

**Arquivos:**
- Criar: `src/components/estudio/AoVivo.tsx`
- Modificar: `src/components/app/AppMvp.tsx`
- Teste: `tests/ao-vivo-ui.test.tsx` (novo)

- [ ] **Passo 1: teste que falha**

```tsx
// @vitest-environment jsdom
// tests/ao-vivo-ui.test.tsx
import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { AoVivo } from "@/components/estudio/AoVivo";
import { DEMOS } from "@/lib/engine/demo";
import type { BrandProfile, PostGerado } from "@/lib/types";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it("mostra a pesquisa, o post pronto, o que está sendo escrito e a fila", () => {
  vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {}))); // capas ficam pintando
  const post = { ...DEMOS.cora.posts[0], id: "abc-p1", template: "capa-gancho" } as PostGerado;
  render(
    <AoVivo
      estado={{ resumo: { concorrentes: ["Nubank", "Inter"], em_alta: ["Pix parcelado"], virais_ao_vivo: 4 }, posts: { 0: { post, previa: true } }, escrevendo: { indice: 1, gancho: "Segundo gancho" } }}
      quantidade={3}
      totalVirais={480}
      brand={DEMOS.cora.brand as BrandProfile}
    />,
  );
  expect(screen.getByText(/480 virais/)).toBeTruthy();
  expect(screen.getByText(/Nubank, Inter/)).toBeTruthy();
  expect(screen.getByText(/Pix parcelado/)).toBeTruthy();
  expect(screen.getByAltText(new RegExp(post.gancho.slice(0, 20)))).toBeTruthy();
  expect(screen.getByText("Segundo gancho")).toBeTruthy();
  expect(screen.getAllByText("Na fila")).toHaveLength(1);
  expect(screen.getByText(/Pintando a capa/)).toBeTruthy();
});
```

- [ ] **Passo 2: rodar e ver falhar**

Run: `npx vitest run tests/ao-vivo-ui.test.tsx`
Expected: FAIL.

- [ ] **Passo 3: `src/components/estudio/AoVivo.tsx`**

```tsx
"use client";

/* eslint-disable @next/next/no-img-element */
import { useMemo } from "react";
import { urlArte } from "@/lib/client/artes";
import { analiseProvisoria } from "@/lib/client/capas";
import type { BrandProfile, PostGerado } from "@/lib/types";
import type { EstadoAoVivo } from "./useGeracao";
import { useCapasAoVivo } from "./useCapas";

/** A geração ao vivo: a pesquisa no topo e um cartão por post (na fila, escrevendo, pintando a capa, pronto). */
export function AoVivo({
  estado,
  quantidade,
  totalVirais,
  brand,
  nicho,
  publico,
}: {
  estado: EstadoAoVivo;
  quantidade: number;
  totalVirais: number;
  brand: BrandProfile;
  nicho?: string;
  publico?: string;
}) {
  const prontos = Object.values(estado.posts);
  const analiseId = prontos[0]?.post.id.replace(/-p\d+$/, "") ?? "ao-vivo";
  const provisoria = useMemo(
    () => analiseProvisoria({ id: analiseId, brand, posts: prontos.map((p) => p.post), nicho, publico }),
    [analiseId, brand, prontos, nicho, publico],
  );
  const capas = useCapasAoVivo(provisoria, prontos.filter((p) => p.previa).map((p) => p.post));
  const escrevendo = estado.escrevendo;
  const r = estado.resumo;
  const linha =
    prontos.length >= quantidade
      ? "Posts prontos. Fechando o calendário e os roteiros."
      : `Escrevendo o post ${Math.min(quantidade, (escrevendo?.indice ?? prontos.length) + 1)} de ${quantidade}. As capas chegam em seguida.`;

  return (
    <div className="animate-subir rounded-3xl border border-tinta/10 bg-white p-5 shadow-[0_30px_60px_-40px_rgba(22,19,15,.35)] sm:p-7" role="status" aria-live="polite">
      <div className="flex items-center justify-between gap-4">
        <p className="min-w-0 truncate font-display text-lg font-semibold tracking-[-0.01em]">Criando os posts da {brand.nome}</p>
        <span className="flex shrink-0 items-center gap-2 rounded-full bg-papel px-3 py-1 text-xs font-medium text-tinta-2">
          <span className="h-2 w-2 animate-pisca rounded-full bg-pauta" /> ao vivo
        </span>
      </div>
      <p className="mt-1 text-sm text-tinta-2">{linha}</p>

      <ul className="mt-4 flex flex-wrap gap-2 text-xs text-tinta-2">
        <li className="rounded-full border border-tinta/10 bg-papel px-3 py-1">
          Lidos <strong className="text-tinta">{totalVirais} virais</strong> da biblioteca{r?.virais_ao_vivo ? <> e <strong className="text-tinta">{r.virais_ao_vivo} ao vivo</strong> do seu nicho</> : null}
        </li>
        {r?.concorrentes.length ? (
          <li className="rounded-full border border-tinta/10 bg-papel px-3 py-1">
            <strong className="text-tinta">{r.concorrentes.length} concorrentes</strong>: {r.concorrentes.join(", ")}
          </li>
        ) : null}
        {r?.em_alta.length ? (
          <li className="rounded-full border border-tinta/10 bg-papel px-3 py-1">
            Em alta: <strong className="text-tinta">{r.em_alta.slice(0, 2).join(", ")}</strong>
          </li>
        ) : null}
      </ul>

      <ol className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Array.from({ length: quantidade }).map((_, i) => {
          const pronto = estado.posts[i];
          if (pronto) {
            const capa = capas[pronto.post.id];
            return (
              <li key={i} className="overflow-hidden rounded-2xl border border-tinta/10 bg-papel">
                <div className="relative aspect-[4/5]">
                  <img src={urlArte(provisoria, pronto.post, { slide: 0, tamanho: "feed", foto: capa?.url ?? null })} alt={`Post ${i + 1}: ${pronto.post.gancho}`} className="h-full w-full object-cover" />
                  {capa?.estado === "pintando" && (
                    <div className="absolute inset-x-0 top-0 flex h-1/2 items-center justify-center overflow-hidden">
                      {capa.parcial ? <img src={capa.parcial} alt="" className="absolute inset-0 h-full w-full scale-105 object-cover blur-sm" /> : <div className="absolute inset-0 animate-pulse bg-papel-3/70" />}
                      <span className="relative rounded-full bg-tinta/80 px-3 py-1 text-[11px] font-semibold text-papel">Pintando a capa…</span>
                    </div>
                  )}
                </div>
                <p className="px-3 py-2 text-[11px] font-semibold text-aprovado">✓ Post {i + 1} pronto</p>
              </li>
            );
          }
          if (escrevendo?.indice === i) {
            return (
              <li key={i} className="flex aspect-[4/5] flex-col justify-end rounded-2xl border border-pauta/30 bg-papel p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-pauta">Escrevendo…</p>
                {escrevendo.gancho ? <p className="mt-1 font-display text-base font-semibold leading-tight text-tinta">{escrevendo.gancho}</p> : null}
                <span className="mt-1 inline-block h-4 w-0.5 animate-pisca bg-pauta" aria-hidden="true" />
              </li>
            );
          }
          return (
            <li key={i} className="flex aspect-[4/5] flex-col justify-end gap-2 rounded-2xl bg-papel p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-tinta-3">Na fila</p>
              <span className="h-2.5 w-4/5 rounded bg-papel-3" />
              <span className="h-2.5 w-3/5 rounded bg-papel-3" />
            </li>
          );
        })}
      </ol>
    </div>
  );
}
```

- [ ] **Passo 4: ligar em `src/components/app/AppMvp.tsx`**

Importe `AoVivo`. No bloco da seção `g.fase === "trabalhando"`, troque o `<div className="mt-8"><Carregando ... /></div>` por:

```tsx
            <div className="mt-8">
              {g.brand && (g.aoVivo.resumo || Object.keys(g.aoVivo.posts).length || g.aoVivo.escrevendo) ? (
                <AoVivo
                  estado={g.aoVivo}
                  quantidade={dados.quantidade}
                  totalVirais={totalVirais}
                  brand={g.brand}
                  nicho={ultimas.preferencias?.pesquisa_mercado?.nicho}
                  publico={ultimas.preferencias?.publico_alvo}
                />
              ) : (
                <Carregando etapas={g.etapas} brand={g.brand} dominio={g.dominio || (dados.semSite ? "sua empresa" : dados.url)} />
              )}
            </div>
```

A seção fica mais larga para os cartões: troque `max-w-2xl` por `max-w-3xl` nessa `<section>`.

- [ ] **Passo 5: rodar os testes e ver no navegador**

Run: `npx vitest run && npx tsc --noEmit -p . && npx eslint`
Expected: PASS. Depois, `npm run dev` e abra `/app` com um exemplo (demo): os cartões aparecem prontos de uma vez (demo não passa pela IA). A geração ao vivo de verdade é conferida na trilha G.

- [ ] **Passo 6: commit**

```bash
git add src/components/estudio/AoVivo.tsx src/components/app/AppMvp.tsx tests/ao-vivo-ui.test.tsx
git commit -m "Tela ao vivo: a pesquisa no topo e cada post nascendo

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

## Trilha E: capas com IA

E1 depende de C2 (`direcao_capa` no post e no payload).

### Tarefa E1: capa usa a direção de arte pronta e sai em paisagem

No estilo creator, a imagem ocupa a faixa de cima da capa (cerca de 1,6:1). Retrato desperdiça metade no corte; paisagem 1536x1024 custa o mesmo.

**Arquivos:**
- Modificar: `src/lib/imagem/openai.ts`, `src/lib/imagem/direcao.ts`, `src/lib/imagem/index.ts`
- Teste: `tests/imagem.test.tsx`

- [ ] **Passo 1: teste que falha**

Acrescente em `tests/imagem.test.tsx`:

```ts
import { TAMANHO_IMAGEM } from "@/lib/imagem/openai";

describe("capa com direção pronta", () => {
  it("usa a direção do post e não chama o Claude", async () => {
    const llm = { nome: "falso", gerar: vi.fn(async () => '{"estilo":"fotografia","cena":"outra"}') };
    const subidos: string[] = [];
    const arm = { urlPublica: (c: string) => `https://cdn/${c}`, existe: async () => false, subir: async (c: string) => void subidos.push(c) };
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ data: [{ b64_json: JPEG_PEQUENO }] }))));
    const post = { ...postBase, direcao_capa: { cena: "Dancers fading into mist at practice bars", estilo: "ilustracao-3d" as const } };
    const r = await criarImagemDoPost({ post, brand: marcaBase }, { llm, armazenamento: arm, chaveOpenAI: "k", conferidor: null });
    expect(llm.gerar).not.toHaveBeenCalled();
    expect(r.direcao).toMatchObject({ cena: "Dancers fading into mist at practice bars", estilo: "ilustracao-3d", origem: "ia" });
  });

  it("direção pronta com objeto que vira texto é reescrita pelo Claude", async () => {
    const llm = { nome: "falso", gerar: vi.fn(async () => '{"estilo":"fotografia","cena":"A calm sculpture of stacked stones"}') };
    const arm = { urlPublica: (c: string) => `https://cdn/${c}`, existe: async () => false, subir: async () => {} };
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ data: [{ b64_json: JPEG_PEQUENO }] }))));
    const post = { ...postBase, direcao_capa: { cena: "A laptop screen showing a dashboard", estilo: "fotografia" as const } };
    const r = await criarImagemDoPost({ post, brand: marcaBase }, { llm, armazenamento: arm, chaveOpenAI: "k", conferidor: null });
    expect(llm.gerar).toHaveBeenCalled();
    expect(r.direcao.cena).toContain("stacked stones");
  });

  it("imagem em paisagem e prompt de faixa larga", () => {
    expect(TAMANHO_IMAGEM).toBe("1536x1024");
    expect(montarPromptImagem({ post: postBase, brand: marcaBase }, { estilo: "fotografia", cena: "x", origem: "regra" })).toMatch(/Horizontal/);
  });
});
```

`postBase`, `marcaBase` e `JPEG_PEQUENO` (um JPEG pequeno em base64) já existem no arquivo; se algum não existir com esse nome, crie a partir dos que o arquivo usa (post da Cora, marca da Cora e um JPEG de 1x1 gerado com `sharp`).

- [ ] **Passo 2: rodar e ver falhar**

Run: `npx vitest run tests/imagem.test.tsx`
Expected: FAIL.

- [ ] **Passo 3: paisagem em `src/lib/imagem/openai.ts`**

Troque `export const TAMANHO_IMAGEM = "1024x1536";` por:

```ts
/** Paisagem: a capa creator usa a faixa de cima (cerca de 1,6:1) e o horizontal usa a metade esquerda. */
export const TAMANHO_IMAGEM = "1536x1024";
```

e atualize o comentário do topo do arquivo (retrato 1024x1536 vira paisagem 1536x1024, mesmo preço).

- [ ] **Passo 4: prompt de faixa larga em `src/lib/imagem/direcao.ts`**

Em `EntradaImagem`, troque o `Pick` do `post` por `Pick<PostGerado, "id" | "gancho" | "slides" | "formato" | "rede_principal" | "template" | "direcao_capa">`.

Em `montarPromptImagem`, troque a primeira linha do array e a linha `Composition: ...` por:

```ts
    `Horizontal ${FORMATO_EN[e.post.formato] ?? "image"} for a professional ${REDE_EN[e.post.rede_principal]} brand post.`,
```

```ts
    "Composition: wide horizontal frame; keep the main subject inside the central 60% so it survives a crop to a wide band or to a square; calm, uncluttered edges.",
```

- [ ] **Passo 5: direção pronta em `src/lib/imagem/index.ts`**

Em `Dependencias`, acrescente:

```ts
  /** Quem confere a capa pronta com visão. undefined: o provedor configurado. null: sem conferência. */
  conferidor?: LLM | null;
```

Em `criarImagemDoPost`, troque o bloco `let direcao = direcoes.get(k); if (!direcao) { ... }` por:

```ts
  let direcao = direcoes.get(k);
  // A direção que o Claude escreveu junto com o post vale na primeira imagem, se não citar objeto que vira texto.
  const pronta = e.post.direcao_capa;
  if (!direcao && pronta?.cena && !(e.variacao ?? 0) && !objetosComTexto(pronta.cena).length) {
    direcao = { estilo: pronta.estilo, cena: pronta.cena, origem: "ia" };
  }
  if (!direcao) {
    const llm = deps.llm === undefined ? provedorConfigurado("rapido") : deps.llm;
    direcao = await escreverDirecao(e, llm);
    // Regra por falha passageira da IA não fica guardada: o próximo pedido tenta a IA de novo.
    if (!llm || direcao.origem === "ia") {
      if (direcoes.size >= LIMITE_DIRECOES) direcoes.delete(direcoes.keys().next().value!);
      direcoes.set(k, direcao);
    }
  }
```

e importe `objetosComTexto` de `./direcao`.

- [ ] **Passo 6: rodar os testes**

Run: `npx vitest run tests/imagem.test.tsx && npx tsc --noEmit -p .`
Expected: PASS. Se um teste antigo esperar `Vertical` ou `1024x1536`, troque por `Horizontal` e `1536x1024`.

- [ ] **Passo 7: commit**

```bash
git add src/lib/imagem tests/imagem.test.tsx
git commit -m "Capa usa a direção de arte do post e sai em paisagem

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

### Tarefa E2: o Haiku confere cada capa com visão

**Arquivos:**
- Criar: `src/lib/imagem/conferir.ts`
- Modificar: `src/lib/imagem/index.ts`
- Teste: `tests/imagem.test.tsx`

- [ ] **Passo 1: teste que falha**

```ts
import { conferirImagem } from "@/lib/imagem/conferir";

describe("conferência da capa por visão", () => {
  it("lê o veredito; sem IA ou com falha, aprova para não gastar outra imagem", async () => {
    const recusa = { nome: "v", gerar: vi.fn(), gerarComAnexos: vi.fn(async () => '{"ok": false, "motivo": "letras na placa"}') };
    expect(await conferirImagem(Buffer.from("x"), recusa)).toEqual({ ok: false, motivo: "letras na placa" });
    expect(await conferirImagem(Buffer.from("x"), null)).toEqual({ ok: true, motivo: "" });
    const quebrado = { nome: "v", gerar: vi.fn(), gerarComAnexos: vi.fn(async () => { throw new Error("x"); }) };
    expect(await conferirImagem(Buffer.from("x"), quebrado)).toEqual({ ok: true, motivo: "" });
  });

  it("capa recusada é gerada de novo uma vez, com o motivo no prompt", async () => {
    const prompts: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (_u: string, init: RequestInit) => {
      prompts.push(JSON.parse(String(init.body)).prompt);
      return new Response(JSON.stringify({ data: [{ b64_json: JPEG_PEQUENO }] }));
    }));
    const conferidor = { nome: "v", gerar: vi.fn(), gerarComAnexos: vi.fn().mockResolvedValueOnce('{"ok":false,"motivo":"um logo"}').mockResolvedValue('{"ok":true}') };
    const arm = { urlPublica: (c: string) => `https://cdn/${c}`, existe: async () => false, subir: async () => {} };
    await criarImagemDoPost({ post: postBase, brand: marcaBase }, { llm: null, armazenamento: arm, chaveOpenAI: "k", conferidor });
    expect(prompts).toHaveLength(2);
    expect(prompts[1]).toContain("um logo");
  });
});
```

- [ ] **Passo 2: rodar e ver falhar**

Run: `npx vitest run tests/imagem.test.tsx`
Expected: FAIL.

- [ ] **Passo 3: `src/lib/imagem/conferir.ts`**

```ts
import type { LLM } from "@/lib/llm";
import { extrairJson } from "@/lib/engine/schema";

// O Haiku olha a capa antes de ela ir para a tela: modelo de imagem às vezes desenha letra ou logo mesmo proibido.
// Custa uns US$ 0,002 por imagem (a imagem é reduzida para cerca de 1.500 tokens).

export const SISTEMA_CONFERIR = `Você confere imagens que vão virar capa de post de uma marca. Responda só com JSON: {"ok": true, "motivo": ""}.
"ok" é false se a imagem tiver qualquer letra, palavra, número, logotipo, marca d'água, tela com interface legível ou rosto humano em close. Texto borrado ou falso também conta. Em "motivo", diga em poucas palavras o que achou.
Caso contrário, "ok" é true e "motivo" fica vazio.`;

/** Veredito da conferência. Sem IA ou com falha, aprova: na dúvida não gastamos outra imagem. */
export async function conferirImagem(bytes: Buffer, llm: LLM | null): Promise<{ ok: boolean; motivo: string }> {
  if (!llm?.gerarComAnexos) return { ok: true, motivo: "" };
  try {
    const txt = await llm.gerarComAnexos(SISTEMA_CONFERIR, "Confira esta imagem.", [{ mime: "image/jpeg", dadosBase64: bytes.toString("base64") }]);
    const j = extrairJson(txt) as { ok?: unknown; motivo?: unknown };
    return { ok: j.ok !== false, motivo: typeof j.motivo === "string" ? j.motivo.slice(0, 200) : "" };
  } catch (e) {
    console.error("[imagem] conferência", (e as Error).message.slice(0, 120));
    return { ok: true, motivo: "" };
  }
}
```

- [ ] **Passo 4: gerar de novo uma vez em `src/lib/imagem/index.ts`**

Troque a linha `const img = await gerarImagemOpenAI(montarPromptImagem(e, direcao), { chave, modelo, qualidade });` por:

```ts
  const prompt = montarPromptImagem(e, direcao);
  let img = await gerarImagemOpenAI(prompt, { chave, modelo, qualidade });
  const conferidor = deps.conferidor === undefined ? provedorConfigurado("rapido") : deps.conferidor;
  const veredito = await conferirImagem(img.bytes, conferidor);
  // Uma segunda chance só, e só se ainda couber no limite do dia.
  if (!veredito.ok && (!deps.reservar || deps.reservar())) {
    console.info(`[imagem] conferência recusou a capa (${veredito.motivo || "sem motivo"}); gerando de novo`);
    img = await gerarImagemOpenAI(
      `${prompt}\nThe previous attempt showed ${veredito.motivo || "text or a logo"}. This time the image must contain zero letters, digits, logos, signs or readable screens.`,
      { chave, modelo, qualidade },
    );
  }
```

e importe `conferirImagem` de `./conferir`.

- [ ] **Passo 5: rodar os testes**

Run: `npx vitest run tests/imagem.test.tsx && npx tsc --noEmit -p .`
Expected: PASS. Nos testes antigos de `criarImagemDoPost`, passe `conferidor: null` para não depender de IA.

- [ ] **Passo 6: commit**

```bash
git add src/lib/imagem tests/imagem.test.tsx
git commit -m "Haiku confere cada capa com visão e pede outra se houver texto ou logo

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

### Tarefa E3: limites de imagem para capas automáticas

**Arquivos:**
- Modificar: `src/lib/imagem/index.ts`, `.env.example`
- Teste: `tests/imagem.test.tsx`

- [ ] **Passo 1: teste que falha**

```ts
it("limite padrão: 30 capas por IP e 150 por dia", () => {
  const agora = new Date("2026-10-01T12:00:00Z");
  for (let i = 0; i < 30; i++) expect(reservarUsoImagem("ip-limite", agora)).toBe(true);
  expect(reservarUsoImagem("ip-limite", agora)).toBe(false);
});
```

- [ ] **Passo 2: rodar e ver falhar**

Run: `npx vitest run tests/imagem.test.tsx`
Expected: FAIL (o padrão hoje é 10).

- [ ] **Passo 3: novos padrões**

Em `reservarUsoImagem`: `LIMITE_IMAGENS_POR_IP || 30` e `LIMITE_IMAGENS_DIA || 150`, e o comentário da função com esses números. No `.env.example`, na linha dos limites de imagem, os mesmos padrões (30 e 150) e a nota: "com capas automáticas, uma análise usa até 6".

- [ ] **Passo 4: rodar e commit**

Run: `npx vitest run tests/imagem.test.tsx`
Expected: PASS.

```bash
git add src/lib/imagem/index.ts .env.example tests/imagem.test.tsx
git commit -m "Limites de imagem para capas automáticas: 30 por IP e 150 por dia

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

### Tarefa E4: capas automáticas na tela ao vivo e no painel

**Arquivos:**
- Criar: `src/lib/client/capas.ts`, `src/components/estudio/useCapas.ts`, `src/components/estudio/capas-contexto.ts`
- Modificar: `src/components/estudio/Painel.tsx`, `src/components/estudio/PostCard.tsx`
- Teste: `tests/capas.test.ts` (novo)

- [ ] **Passo 1: teste que falha**

```ts
// @vitest-environment jsdom
// tests/capas.test.ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { analiseProvisoria, lerSemCapa, marcarSemCapa, pedirCapa, precisaCapa } from "@/lib/client/capas";
import { lerFotos } from "@/lib/client/artes";
import { DEMOS } from "@/lib/engine/demo";
import type { BrandProfile, PostGerado } from "@/lib/types";

afterEach(() => { vi.unstubAllGlobals(); localStorage.clear(); });

const brand = DEMOS.cora.brand as BrandProfile;
const post = (n: number, template = "capa-gancho") => ({ ...DEMOS.cora.posts[0], id: `an${n}-p1`, template }) as PostGerado;

describe("capas automáticas", () => {
  it("quem precisa: carrossel, citação e dado, sem foto, fora da demo", () => {
    const a = analiseProvisoria({ id: "x", brand, posts: [] });
    expect(precisaCapa(a, post(1))).toBe(true);
    expect(precisaCapa(a, post(1, "lista"))).toBe(false);
    expect(precisaCapa(a, post(1), "https://ja.tem")).toBe(false);
    expect(precisaCapa({ ...a, origem: "demo" }, post(1))).toBe(false);
  });

  it("dois pedidos do mesmo post viram um só, e a URL fica guardada", async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ url: "https://cdn/capa.jpg", direcao: "d" })));
    vi.stubGlobal("fetch", fetch);
    const a = analiseProvisoria({ id: "an2", brand, posts: [post(2)] });
    const [u1, u2] = await Promise.all([pedirCapa(a, post(2)), pedirCapa(a, post(2))]);
    expect([u1, u2]).toEqual(["https://cdn/capa.jpg", "https://cdn/capa.jpg"]);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(lerFotos("an2")["an2-p1"]).toBe("https://cdn/capa.jpg");
  });

  it("no máximo 3 capas ao mesmo tempo", async () => {
    let abertas = 0, pico = 0;
    const soltar: (() => void)[] = [];
    vi.stubGlobal("fetch", vi.fn(() => { abertas++; pico = Math.max(pico, abertas); return new Promise<Response>((r) => soltar.push(() => { abertas--; r(new Response(JSON.stringify({ url: "https://cdn/x.jpg" }))); })); }));
    const pedidos = [3, 4, 5, 6, 7].map((n) => pedirCapa(analiseProvisoria({ id: `an${n}`, brand, posts: [] }), post(n)));
    for (let i = 0; i < 5; i++) { await new Promise((r) => setTimeout(r, 0)); soltar.shift()?.(); }
    await Promise.all(pedidos);
    expect(pico).toBe(3);
  });

  it("capa tirada pela pessoa não volta sozinha", () => {
    marcarSemCapa("an9", "an9-p1");
    expect(lerSemCapa("an9").has("an9-p1")).toBe(true);
  });
});
```

- [ ] **Passo 2: rodar e ver falhar**

Run: `npx vitest run tests/capas.test.ts`
Expected: FAIL.

- [ ] **Passo 3: `src/lib/client/capas.ts`**

```ts
import { criarImagemIA, gravarFoto } from "./artes";
import type { Analise, BrandProfile, PostGerado, TemplateId } from "@/lib/types";

// Capas automáticas: cada post de carrossel, citação ou dado ganha a capa com imagem de IA sem a pessoa pedir.
// Um registro só para a página inteira: a tela ao vivo e o painel pedindo a mesma capa recebem a mesma promessa,
// então nenhuma imagem é paga duas vezes.

export type EstadoCapa = "pintando" | "pronta" | "erro";

export const CAPA_AUTOMATICA: TemplateId[] = ["capa-gancho", "citacao", "dado-impacto"];
const MAX_SIMULTANEAS = 3;

const pedidos = new Map<string, Promise<string>>();
let ativos = 0;
const esperando: (() => void)[] = [];

async function naVez<T>(f: () => Promise<T>): Promise<T> {
  if (ativos >= MAX_SIMULTANEAS) await new Promise<void>((r) => esperando.push(r));
  ativos++;
  try {
    return await f();
  } finally {
    ativos--;
    esperando.shift()?.();
  }
}

export function precisaCapa(analise: Pick<Analise, "origem">, post: PostGerado, foto?: string | null): boolean {
  return analise.origem !== "demo" && CAPA_AUTOMATICA.includes(post.template) && !foto;
}

/** Pede a capa uma vez por post. `aoParcial` recebe a prévia borrada quando o servidor manda (E5). */
export function pedirCapa(analise: Analise, post: PostGerado, aoParcial?: (dataUrl: string) => void): Promise<string> {
  const k = `${analise.id}:${post.id}`;
  const ja = pedidos.get(k);
  if (ja) return ja;
  const p = naVez(() => criarImagemIA(analise, post, {}, 0, aoParcial)).then((r) => {
    gravarFoto(analise.id, post.id, r.url);
    return r.url;
  });
  pedidos.set(k, p);
  p.catch(() => pedidos.delete(k)); // falhou: um clique em "Criar imagem com IA" tenta de novo
  return p;
}

const CHAVE_SEM = (analiseId: string) => `socialai:sem-capa:${analiseId}`;

/** A pessoa tirou a imagem de um post: a capa automática não volta sozinha. */
export function marcarSemCapa(analiseId: string, postId: string) {
  try {
    const atual = lerSemCapa(analiseId);
    atual.add(postId);
    localStorage.setItem(CHAVE_SEM(analiseId), JSON.stringify([...atual]));
  } catch {
    /* sem armazenamento: vale só nesta visita */
  }
}

export function lerSemCapa(analiseId: string): Set<string> {
  try {
    const j = JSON.parse(localStorage.getItem(CHAVE_SEM(analiseId)) ?? "[]") as unknown;
    return new Set(Array.isArray(j) ? j.filter((x): x is string => typeof x === "string") : []);
  } catch {
    return new Set();
  }
}

/** Análise mínima enquanto a real não chega: o que a URL da arte e o pedido de capa precisam. */
export function analiseProvisoria(x: { id: string; brand: BrandProfile; posts: PostGerado[]; nicho?: string; publico?: string }): Analise {
  return {
    id: x.id,
    url: x.brand.url,
    nicho: (x.nicho ?? "saas-b2b") as Analise["nicho"],
    resumo_negocio: "",
    publico: x.publico ?? "",
    tom_de_voz: "",
    posicionamento: "",
    pilares: [],
    diagnostico: [],
    estrategia: [],
    posts: x.posts,
    calendario: [],
    brand: x.brand,
    origem: "ia",
    provedor: null,
    avisos: [],
    criadoEm: "",
  };
}
```

Em `src/lib/client/artes.ts`, `criarImagemIA` ganha o quinto parâmetro `aoParcial?: (dataUrl: string) => void` (a E5 usa; aqui ele só é repassado e ainda não faz nada).

- [ ] **Passo 4: contexto e hooks**

`src/components/estudio/capas-contexto.ts`:

```ts
"use client";

import { createContext } from "react";
import type { EstadoCapa } from "@/lib/client/capas";

/** Estado da capa automática de cada post, por id. O cartão do post mostra "Pintando a capa". */
export const CapasContexto = createContext<Record<string, EstadoCapa>>({});
```

`src/components/estudio/useCapas.ts`:

```ts
"use client";

import { useEffect, useRef, useState } from "react";
import type { Personalizacao } from "@/lib/client/artes";
import { lerSemCapa, pedirCapa, precisaCapa, type EstadoCapa } from "@/lib/client/capas";
import type { Analise, PostGerado } from "@/lib/types";

/** Painel: pede a capa de cada post que precisa, uma vez, e guarda a URL na personalização do post. */
export function useCapasAutomaticas(
  analise: Analise,
  pers: Record<string, Personalizacao>,
  mudarPers: (id: string, p: Personalizacao) => void,
  pronto: boolean,
): Record<string, EstadoCapa> {
  const [estados, setEstados] = useState<Record<string, EstadoCapa>>({});
  const iniciados = useRef(new Set<string>());
  const persRef = useRef(pers);
  const mudarRef = useRef(mudarPers);
  useEffect(() => {
    persRef.current = pers;
    mudarRef.current = mudarPers;
  });
  useEffect(() => {
    if (!pronto) return;
    const recusadas = lerSemCapa(analise.id);
    for (const post of analise.posts) {
      if (iniciados.current.has(post.id) || recusadas.has(post.id) || !precisaCapa(analise, post, persRef.current[post.id]?.foto)) continue;
      iniciados.current.add(post.id);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEstados((e) => ({ ...e, [post.id]: "pintando" }));
      pedirCapa(analise, post)
        .then((url) => {
          mudarRef.current(post.id, { ...persRef.current[post.id], foto: url });
          setEstados((e) => ({ ...e, [post.id]: "pronta" }));
        })
        .catch(() => setEstados((e) => ({ ...e, [post.id]: "erro" })));
    }
  }, [analise, pronto]);
  return estados;
}

/** Tela ao vivo: pede a capa de cada prévia assim que ela chega, com a prévia borrada quando o servidor manda. */
export function useCapasAoVivo(analise: Analise, previas: PostGerado[]): Record<string, { estado: EstadoCapa; url?: string; parcial?: string }> {
  const [capas, setCapas] = useState<Record<string, { estado: EstadoCapa; url?: string; parcial?: string }>>({});
  const iniciados = useRef(new Set<string>());
  useEffect(() => {
    for (const post of previas) {
      if (iniciados.current.has(post.id) || !precisaCapa(analise, post)) continue;
      iniciados.current.add(post.id);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCapas((c) => ({ ...c, [post.id]: { estado: "pintando" } }));
      pedirCapa(analise, post, (parcial) => setCapas((c) => ({ ...c, [post.id]: { ...c[post.id], estado: "pintando", parcial } })))
        .then((url) => setCapas((c) => ({ ...c, [post.id]: { estado: "pronta", url } })))
        .catch(() => setCapas((c) => ({ ...c, [post.id]: { estado: "erro" } })));
    }
  }, [analise, previas]);
  return capas;
}
```

- [ ] **Passo 5: Painel e PostCard**

Em `src/components/estudio/Painel.tsx`:
- `const [fotosLidas, setFotosLidas] = useState(false);`
- no `useEffect` que lê as fotos, troque o `if (!Object.keys(fotos).length) return;` por um bloco que, quando não há fotos, só chama `setFotosLidas(true)` e retorna; e, quando há, chama `setFotosLidas(true)` depois do `setPers(...)` (com o mesmo `eslint-disable-next-line react-hooks/set-state-in-effect` que já está ali);
- `const capas = useCapasAutomaticas(analise, pers, mudarPers, fotosLidas);`
- envolva o conteúdo da `<section>` com `<CapasContexto.Provider value={capas}> ... </CapasContexto.Provider>`.

Em `src/components/estudio/PostCard.tsx`:
- `const capaAuto = useContext(CapasContexto)[original.id];` (importe `useContext` e `CapasContexto`);
- troque a condição do aviso `{criandoImagem && (` por `{(criandoImagem || capaAuto === "pintando") && (`, e o título do aviso por `{capaAuto === "pintando" && !criandoImagem ? "Pintando a capa com IA" : "Criando a imagem com IA"}`;
- no botão "Tirar imagem", troque `onClick={() => novaArte({ ...pers, foto: null })}` por `onClick={() => { marcarSemCapa(analise.id, original.id); novaArte({ ...pers, foto: null }); }}` e importe `marcarSemCapa` de `@/lib/client/capas`.

- [ ] **Passo 6: rodar tudo**

Run: `npx vitest run && npx tsc --noEmit -p . && npx eslint`
Expected: PASS.

- [ ] **Passo 7: commit**

```bash
git add src/lib/client src/components/estudio tests/capas.test.ts
git commit -m "Capas automáticas: cada carrossel ganha a capa de IA sem pedir, sem pagar duas vezes

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

### Tarefa E5: a capa se revela aos poucos

A OpenAI manda uma prévia parcial em streaming (`partial_images: 1`, evento `image_generation.partial_image`, mais US$ 0,003 por prévia). A tela mostra a prévia borrada na faixa de cima até a capa final chegar.

**Arquivos:**
- Modificar: `src/lib/imagem/openai.ts`, `src/lib/imagem/index.ts`, `src/app/api/imagem/route.ts`, `src/lib/client/artes.ts`
- Teste: `tests/imagem.test.tsx`

- [ ] **Passo 1: teste que falha**

```ts
import { lerEventosSse } from "@/lib/imagem/openai";

describe("capa que se revela", () => {
  it("lê os eventos SSE da OpenAI: parcial e final", async () => {
    const sse = [
      'event: image_generation.partial_image\ndata: {"type":"image_generation.partial_image","b64_json":"AAA","partial_image_index":0}\n\n',
      'event: image_generation.completed\ndata: {"type":"image_generation.completed","b64_json":"BBB","usage":{"input_tokens":10,"output_tokens":20}}\n\n',
    ];
    const cod = new TextEncoder();
    const corpo = new ReadableStream({ start(c) { sse.join("").match(/[\s\S]{1,40}/g)!.forEach((p) => c.enqueue(cod.encode(p))); c.close(); } });
    const parciais: string[] = [];
    const final = await lerEventosSse(new Response(corpo), (b64) => parciais.push(b64));
    expect(parciais).toEqual(["AAA"]);
    expect(final).toEqual({ b64: "BBB", uso: { entrada: 10, saida: 20 } });
  });
});
```

- [ ] **Passo 2: rodar e ver falhar**

Run: `npx vitest run tests/imagem.test.tsx`
Expected: FAIL.

- [ ] **Passo 3: SSE em `src/lib/imagem/openai.ts`**

```ts
/** Lê o SSE da geração com prévia: chama `aoParcial` a cada prévia e devolve a imagem final e o uso. */
export async function lerEventosSse(res: Response, aoParcial: (b64: string) => void): Promise<{ b64: string; uso: { entrada: number; saida: number } }> {
  if (!res.body) throw new ErroImagem("O gerador de imagens respondeu vazio. Tente de novo.", 502);
  const leitor = res.body.getReader();
  const dec = new TextDecoder();
  let resto = "";
  let final: { b64: string; uso: { entrada: number; saida: number } } | null = null;
  const tratar = (bloco: string) => {
    const dados = bloco.split("\n").filter((l) => l.startsWith("data:")).map((l) => l.slice(5).trim()).join("");
    if (!dados) return;
    const j = JSON.parse(dados) as { type?: string; b64_json?: string; usage?: { input_tokens?: number; output_tokens?: number } };
    if (j.type === "image_generation.partial_image" && j.b64_json) aoParcial(j.b64_json);
    if (j.type === "image_generation.completed" && j.b64_json) final = { b64: j.b64_json, uso: { entrada: j.usage?.input_tokens ?? 0, saida: j.usage?.output_tokens ?? 0 } };
  };
  for (;;) {
    const { value, done } = await leitor.read();
    resto += dec.decode(value ?? new Uint8Array(), { stream: !done });
    const blocos = resto.split("\n\n");
    resto = blocos.pop() ?? "";
    blocos.forEach(tratar);
    if (done) break;
  }
  if (resto.trim()) tratar(resto);
  if (!final) throw new ErroImagem("O gerador de imagens parou no meio. Tente de novo.", 502);
  return final;
}
```

Em `gerarImagemOpenAI`, acrescente a opção `aoParcial?: (b64: string) => void` em `op`. Quando ela vier, o corpo leva também `stream: true` e `partial_images: 1`, e a leitura da resposta passa a ser:

```ts
  const { b64, uso: usoFinal } = op.aoParcial
    ? await lerEventosSse(res, op.aoParcial)
    : await (async () => {
        const data = (await res.json()) as { data?: { b64_json?: string }[]; usage?: { input_tokens?: number; output_tokens?: number } };
        const b = data.data?.[0]?.b64_json;
        if (!b) throw new ErroImagem("O gerador de imagens respondeu vazio. Tente de novo.", 502);
        return { b64: b, uso: { entrada: data.usage?.input_tokens ?? 0, saida: data.usage?.output_tokens ?? 0 } };
      })();
  let bytes: Buffer = Buffer.from(b64, "base64");
```

(o restante da função segue igual, usando `usoFinal` no lugar de `uso`).

- [ ] **Passo 4: `criarImagemDoPost` repassa a prévia reduzida (`src/lib/imagem/index.ts`)**

`criarImagemDoPost` ganha o terceiro parâmetro `aoParcial?: (dataUrl: string) => void`. Na primeira geração (não na segunda chance), passe para `gerarImagemOpenAI`:

```ts
    aoParcial: aoParcial
      ? (b64) => {
          // Prévia pequena: vai para a tela como data URL, então 480 px de largura bastam.
          void sharp(Buffer.from(b64, "base64")).resize({ width: 480 }).jpeg({ quality: 60 }).toBuffer()
            .then((b) => aoParcial(`data:image/jpeg;base64,${b.toString("base64")}`))
            .catch(() => {});
        }
      : undefined,
```

(importe `sharp` de `"sharp"`).

- [ ] **Passo 5: rota `/api/imagem` com `aoVivo`**

No esquema `Entrada`, acrescente `aoVivo: z.boolean().optional(),`. Quando `aoVivo` vier, responda NDJSON com o mesmo cabeçalho da D3 (importe `CORS_HEADERS` de `@/lib/http`):

```ts
  if (body.data.aoVivo) {
    const cod = new TextEncoder();
    const corpo = new ReadableStream<Uint8Array>({
      async start(c) {
        const enviar = (x: unknown) => { try { c.enqueue(cod.encode(JSON.stringify(x) + "\n")); } catch { /* fechou */ } };
        try {
          const r = await criarImagemDoPost({ post, brand, contexto, variacao }, { reservar: () => reservarUsoImagem(ip) }, (imagem) => enviar({ tipo: "parcial", imagem }));
          enviar({ tipo: "pronta", url: r.url, direcao: r.direcao.cena, estilo: r.direcao.estilo, origem_direcao: r.direcao.origem, cache: r.cache });
        } catch (e) {
          const status = e instanceof ErroImagem ? e.status : 500;
          if (!(e instanceof ErroImagem)) console.error("[imagem]", (e as Error).message);
          enviar({ tipo: "erro", status, mensagem: e instanceof ErroImagem ? e.message : "Não deu para criar a imagem agora. Tente de novo." });
        } finally {
          c.close();
        }
      },
    });
    return new Response(corpo, { headers: { ...CORS_HEADERS, "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-cache, no-transform", "x-accel-buffering": "no" } });
  }
```

- [ ] **Passo 6: cliente em `src/lib/client/artes.ts`**

Em `criarImagemIA`, quando `aoParcial` vier: mande `aoVivo: true` no corpo e leia a resposta com `lerLinhasJson` (de `./ao-vivo`):

```ts
  if (aoParcial && res.ok && (res.headers.get("content-type") ?? "").includes("ndjson")) {
    let final: ImagemCriada | null = null;
    await lerLinhasJson<{ tipo: string; imagem?: string; url?: string; direcao?: string; mensagem?: string }>(res, (e) => {
      if (e.tipo === "parcial" && e.imagem) aoParcial(e.imagem);
      else if (e.tipo === "pronta" && e.url) final = { url: e.url, direcao: e.direcao ?? "" };
      else if (e.tipo === "erro") throw new Error(e.mensagem || "Não deu para criar a imagem agora. Tente de novo.");
    });
    if (!final) throw new Error("A imagem parou no meio. Tente de novo.");
    return final;
  }
```

(coloque antes da leitura JSON atual; sem `aoParcial`, tudo segue como hoje).

- [ ] **Passo 7: rodar tudo**

Run: `npx vitest run && npx tsc --noEmit -p . && npx eslint`
Expected: PASS.

- [ ] **Passo 8: commit**

```bash
git add src/lib/imagem src/app/api/imagem/route.ts src/lib/client/artes.ts tests/imagem.test.tsx
git commit -m "Capa se revela aos poucos com a prévia parcial da OpenAI

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

## Trilha F: visual estilo creator

A referência aprovada é o carrossel B com imagem de IA na capa (tela de brainstorm "carrossel-b-completo"): fundo de papel no tom da marca, faixa de cor no topo, autor no topo, título display gigante com o trecho de destaque marcado, contador com barra de progresso, chamada final escura. A imagem da IA ocupa a faixa de cima (retrato e quadrado) ou a metade esquerda (paisagem).

### Tarefa F1: fonte display escolhida pelo tom

Quando a fonte da marca é genérica, o título ganha uma display com personalidade: Bricolage Grotesque (moderna, direta) na maioria dos tons e Fraunces (serifada, editorial) quando o tom é sofisticado, acolhedor ou institucional. O corpo continua na fonte da marca.

**Arquivos:**
- Criar: `assets/fonts/BricolageGrotesque-800.ttf`, `assets/fonts/Fraunces-800.ttf`
- Modificar: `src/lib/render/fonts.ts`, `src/app/api/render/[postId]/route.tsx`
- Teste: `tests/render.test.ts`

- [ ] **Passo 1: baixar as fontes**

```bash
for F in "Bricolage+Grotesque:BricolageGrotesque" "Fraunces:Fraunces"; do
  URL=$(curl -s "https://fonts.googleapis.com/css2?family=${F%%:*}:wght@800" | grep -oE "https://[^)]+\.ttf" | head -1)
  curl -s "$URL" -o "assets/fonts/${F##*:}-800.ttf"
done
ls -la assets/fonts/BricolageGrotesque-800.ttf assets/fonts/Fraunces-800.ttf
```

Expected: dois arquivos com mais de 50 KB. (Sem user-agent de navegador, o Google Fonts devolve TTF estático.)

- [ ] **Passo 2: teste que falha**

Em `tests/render.test.ts`:

```ts
import { familiaDoTitulo } from "@/lib/render/fonts";

describe("fonte do título", () => {
  it("fonte genérica vira display pelo tom; fonte com personalidade fica", () => {
    for (const f of ["Inter", "Roboto", "Arial", "Helvetica", "system-ui", "Open Sans", "Montserrat", "Poppins"]) {
      expect(familiaDoTitulo(f, "direto, prático e bem-humorado")).toBe("Bricolage Grotesque");
    }
    expect(familiaDoTitulo("Inter")).toBe("Bricolage Grotesque");
    expect(familiaDoTitulo("Inter", "acolhedor e cuidadoso")).toBe("Fraunces");
    expect(familiaDoTitulo("Roboto", "Sofisticado, premium")).toBe("Fraunces");
    expect(familiaDoTitulo("Arial", "institucional e sério")).toBe("Fraunces");
    expect(familiaDoTitulo("DM Serif Display", "acolhedor")).toBe("DM Serif Display");
    expect(familiaDoTitulo("Space Grotesk")).toBe("Space Grotesk");
  });
});
```

- [ ] **Passo 3: rodar e ver falhar**

Run: `npx vitest run tests/render.test.ts`
Expected: FAIL.

- [ ] **Passo 4: `src/lib/render/fonts.ts`**

Em `FONTES_EMBUTIDAS`, acrescente:

```ts
  "Bricolage Grotesque": { 800: "BricolageGrotesque-800.ttf" },
  Fraunces: { 800: "Fraunces-800.ttf" },
```

Acima de `fontesDaMarca`:

```ts
// Fontes genéricas deixam o post com cara de template. No título, elas dão lugar a uma display com personalidade
// escolhida pelo tom de voz; o corpo continua na fonte da marca.
const GENERICAS = /^(inter|roboto|arial|helvetica( neue)?|system-ui|sans-serif|open sans|lato|montserrat|poppins|segoe ui|-apple-system|noto sans)$/i;
const TOM_EDITORIAL = /sofistic|elegan|premium|luxo|acolhed|cuidad|delicad|sens[ií]vel|institucional|s[ée]ri[oa]|editorial|cl[aá]ssic/i;

export function familiaDoTitulo(fonteDaMarca: string, tom = ""): string {
  if (!GENERICAS.test(fonteDaMarca.trim())) return fonteDaMarca;
  return TOM_EDITORIAL.test(tom) ? "Fraunces" : "Bricolage Grotesque";
}
```

Mude a assinatura para `export async function fontesDaMarca(titulo: string, corpo: string, tom = ""): Promise<FonteCarregada[]>` e troque `primeiroQueCarrega(titulo, [800, 700, 900, 600, 400])` por `primeiroQueCarrega(familiaDoTitulo(titulo, tom), [800, 700, 900, 600, 400])`.

- [ ] **Passo 5: passar o tom na rota de render**

Em `src/app/api/render/[postId]/route.tsx`, troque `fontesDaMarca(brand.fontes?.titulo ?? "Inter", brand.fontes?.corpo ?? "Inter")` por `fontesDaMarca(brand.fontes?.titulo ?? "Inter", brand.fontes?.corpo ?? "Inter", brand.tom_de_voz ?? "")`.

- [ ] **Passo 6: rodar e commit**

Run: `npx vitest run tests/render.test.ts tests/imagem.test.tsx && npx tsc --noEmit -p .`
Expected: PASS.

```bash
git add assets/fonts/BricolageGrotesque-800.ttf assets/fonts/Fraunces-800.ttf src/lib/render/fonts.ts "src/app/api/render/[postId]/route.tsx" tests/render.test.ts
git commit -m "Título com fonte display escolhida pelo tom quando a marca usa uma fonte genérica

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

### Tarefa F2: tema com papel e marca-texto

**Arquivos:**
- Modificar: `src/lib/render/tema.ts`
- Teste: `tests/render.test.ts`

- [ ] **Passo 1: teste que falha**

```ts
describe("tema do estilo creator", () => {
  it("papel, textos e marca-texto legíveis em várias paletas", () => {
    for (const primaria of ["#10b77f", "#fe3e6d", "#0b66ff", "#ffd400", "#111111", "#f5f5f5"]) {
      const brand = { ...DEMOS.cora.brand, paleta: { ...DEMOS.cora.brand.paleta, primaria } } as BrandProfile;
      const t = temaDaMarca(brand);
      expect(contrastRatio(t.tintaNoPapel, t.papel)).toBeGreaterThanOrEqual(7);
      expect(contrastRatio(t.mutedNoPapel, t.papel)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(t.primariaNoPapel, t.papel)).toBeGreaterThanOrEqual(3);
      expect(contrastRatio(t.tintaNoPapel, t.marcaTexto)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
```

- [ ] **Passo 2: rodar e ver falhar**

Run: `npx vitest run tests/render.test.ts`
Expected: FAIL.

- [ ] **Passo 3: `src/lib/render/tema.ts`**

Na interface `Tema`, acrescente:

```ts
  papel: string; // fundo "papel" do estilo creator, levemente quente e tingido da marca
  tintaNoPapel: string;
  mutedNoPapel: string;
  primariaNoPapel: string; // primária legível no papel (números, aspas)
  marcaTexto: string; // cor clara atrás do trecho de destaque do título
```

Em `temaDaMarca`, antes do `return`:

```ts
  const papel = mix("#f6f3ec", primaria, 0.05);
  const tintaNoPapel = ensureContrast(tinta, papel, 7);
  // Marca-texto: a primária clareada até o texto escuro ficar legível por cima dela.
  let marcaTexto = mix(primaria, "#ffffff", 0.55);
  for (let k = 0; k < 8 && contrastRatio(tintaNoPapel, marcaTexto) < 4.5; k++) marcaTexto = mix(marcaTexto, "#ffffff", 0.25);
```

e no objeto devolvido:

```ts
    papel,
    tintaNoPapel,
    mutedNoPapel: ensureContrast(mix(tinta, papel, 0.35), papel, 4.5),
    primariaNoPapel: ensureContrast(primaria, papel, 3),
    marcaTexto,
```

- [ ] **Passo 4: rodar e commit**

Run: `npx vitest run tests/render.test.ts`
Expected: PASS.

```bash
git add src/lib/render/tema.ts tests/render.test.ts
git commit -m "Tema ganha papel e marca-texto do estilo creator

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

### Tarefa F3: peças comuns e `[PREENCHER]` fora da arte

**Arquivos:**
- Modificar: `src/lib/render/templates.tsx`
- Teste: `tests/templates-creator.test.tsx` (novo)

- [ ] **Passo 1: teste que falha**

```tsx
// tests/templates-creator.test.tsx
import { describe, expect, it } from "vitest";
import { limpar, marcarDestaque } from "@/lib/render/templates";

describe("peças do estilo creator", () => {
  it("a arte nunca mostra [PREENCHER]", () => {
    expect(limpar("Ganhe [PREENCHER: número real]% de tempo.")).toBe("Ganhe % de tempo.");
    expect(limpar("Emite [PREENCHER: número real] notas por mês")).toBe("Emite notas por mês");
  });

  it("marca o destaque sem ligar para acento, caixa e pontuação", () => {
    const m = marcarDestaque("Por que seus alunos somem antes do 3º mês?", "antes do 3º MES");
    expect(m.filter((w) => w.marcada).map((w) => w.palavra)).toEqual(["antes", "do", "3º", "mês?"]);
    expect(marcarDestaque("Título qualquer", "não existe").some((w) => w.marcada)).toBe(false);
    expect(marcarDestaque("Título", undefined).every((w) => !w.marcada)).toBe(true);
  });
});
```

(`"Ganhe % de tempo."` é aceitável: o número foi tirado e o post fica marcado para revisão no cartão.)

- [ ] **Passo 2: rodar e ver falhar**

Run: `npx vitest run tests/templates-creator.test.tsx`
Expected: FAIL.

- [ ] **Passo 3: `limpar` sem placeholder e `marcarDestaque`**

Em `src/lib/render/templates.tsx`, troque a linha `export const limpar = ...` por:

```ts
/** Tira o [PREENCHER: ...] da arte: o cartão do post pede para completar, a imagem nunca mostra o marcador. */
export function semPlaceholder(s: string): string {
  return s.replace(/\s*\[PREENCHER[^\]]*\]\s*/gi, " ").replace(/\s+([.,;:!?%])/g, "$1").replace(/\s{2,}/g, " ").trim();
}

export const limpar = (s: string) => semPlaceholder(s.replace(EMOJI, "")).replace(/\s{2,}/g, " ").trim();

const palavraNormal = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

/** Divide o título em palavras e marca as que formam o destaque (sem diferença de acento, caixa e pontuação). */
export function marcarDestaque(texto: string, destaque?: string | null): { palavra: string; marcada: boolean }[] {
  const palavras = limpar(texto).split(" ").filter(Boolean);
  const out = palavras.map((palavra) => ({ palavra, marcada: false }));
  const alvo = limpar(destaque ?? "").split(" ").map(palavraNormal).filter(Boolean);
  if (!alvo.length) return out;
  const norm = palavras.map(palavraNormal);
  for (let i = 0; i + alvo.length <= norm.length; i++) {
    if (alvo.every((a, k) => norm[i + k] === a)) {
      for (let k = 0; k < alvo.length; k++) out[i + k].marcada = true;
      break;
    }
  }
  return out;
}
```

- [ ] **Passo 4: as peças do estilo creator**

Depois de `Moldura`, acrescente:

```tsx
// ---------------------------------------------------------------- estilo creator: peças comuns

/** Faixa de cor da marca no topo da arte (ou só da imagem, quando ela ocupa a faixa de cima). */
function FaixaTopo({ p, largura }: { p: ArteProps; largura: number }) {
  const u = Math.min(p.w, p.h) / 1080;
  return <div style={{ position: "absolute", left: 0, top: 0, width: largura, height: 14 * u, background: p.tema.primaria }} />;
}

/** Fundo de papel no tom da marca com a faixa no topo: a base de quase todos os templates. */
function Papel({ p, children, style }: { p: ArteProps; children: ReactNode; style?: CSSProperties }) {
  return (
    <Moldura p={p} bg={p.tema.papel} style={style}>
      <FaixaTopo p={p} largura={p.w} />
      {children}
    </Moldura>
  );
}

/** Autor no topo, como nos carrosséis de creator: avatar (logo ou inicial), nome e @. */
function Autor({ p, cor, corSec, tamanho = 1 }: { p: ArteProps; cor: string; corSec: string; tamanho?: number }) {
  const u = (Math.min(p.w, p.h) / 1080) * tamanho;
  const nome = limpar(p.brand.nome);
  const lado = 76 * u;
  return (
    <div style={row({ alignItems: "center", gap: 20 * u })}>
      {p.logo ? (
        <div style={row({ width: lado, height: lado, borderRadius: 9999, background: "#ffffff", alignItems: "center", justifyContent: "center", overflow: "hidden", border: `${2 * u}px solid ${withAlpha(cor, 0.15)}` })}>
          <img src={p.logo} alt="" style={{ width: lado * 0.68, height: lado * 0.68, objectFit: "contain" }} />
        </div>
      ) : (
        <div style={row({ width: lado, height: lado, borderRadius: 9999, background: p.tema.primaria, color: p.tema.naPrimaria, alignItems: "center", justifyContent: "center", fontFamily: "Titulo", fontSize: 36 * u })}>
          {nome.charAt(0).toUpperCase()}
        </div>
      )}
      <div style={col({ gap: 2 * u })}>
        <div style={{ fontFamily: "Corpo", fontWeight: 700, fontSize: 30 * u, color: cor }}>{nome}</div>
        <div style={{ fontFamily: "Corpo", fontSize: 24 * u, color: corSec }}>{handleDe(p.brand, p.post)}</div>
      </div>
    </div>
  );
}

/** Título display com o trecho de destaque sobre um marca-texto na cor da marca. */
function TituloCreator({ texto, destaque, fs, cor, marca, lh = 0.98 }: { texto: string; destaque?: string | null; fs: number; cor: string; marca: string; lh?: number }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", columnGap: fs * 0.24, rowGap: fs * 0.06, fontFamily: "Titulo", fontSize: fs, lineHeight: lh, color: cor, letterSpacing: -fs * 0.035 }}>
      {marcarDestaque(texto, destaque).map((w, i) => (
        <div
          key={i}
          style={
            w.marcada
              ? { display: "flex", backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0) 50%, ${marca} 50%, ${marca} 94%, rgba(0,0,0,0) 94%)`, padding: `0 ${fs * 0.05}px`, margin: `0 ${-fs * 0.05}px` }
              : { display: "flex" }
          }
        >
          {w.palavra}
        </div>
      ))}
    </div>
  );
}

/** Contador e barra de progresso no rodapé do carrossel. */
function Progresso({ p, i, total, cor, trilho }: { p: ArteProps; i: number; total: number; cor: string; trilho: string }) {
  const u = Math.min(p.w, p.h) / 1080;
  return (
    <div style={col({ gap: 14 * u, width: "100%" })}>
      <div style={row({ justifyContent: "space-between", fontFamily: "Corpo", fontWeight: 700, fontSize: 24 * u, letterSpacing: 2 * u, color: cor })}>
        <div>{`${i + 1} / ${total}`}</div>
        <div>{i + 1 < total ? "DESLIZE →" : ""}</div>
      </div>
      <div style={row({ width: "100%", height: 6 * u, borderRadius: 99, background: trilho })}>
        <div style={{ width: `${((i + 1) / total) * 100}%`, height: "100%", borderRadius: 99, background: p.tema.primaria }} />
      </div>
    </div>
  );
}

/** Onde a imagem da IA fica: faixa de cima (retrato e quadrado) ou metade esquerda (paisagem). */
function faixaDaFoto(p: ArteProps, fracao: number) {
  const paisagem = p.w / p.h > 1.3;
  return paisagem ? { w: Math.round(p.w * 0.44), h: p.h, paisagem } : { w: p.w, h: Math.round(p.h * fracao), paisagem };
}

/** A imagem da IA na faixa, com a faixa de cor da marca por cima. */
function FotoFaixa({ p, foto, w, h }: { p: ArteProps; foto: string; w: number; h: number }) {
  return (
    <div style={{ display: "flex", position: "absolute", left: 0, top: 0, width: w, height: h }}>
      <img src={foto} alt="" style={{ position: "absolute", left: 0, top: 0, width: w, height: h, objectFit: "cover" }} />
      <FaixaTopo p={p} largura={w} />
    </div>
  );
}

/** Padding da arte quando a imagem ocupa a faixa: o conteúdo começa depois dela. */
function depoisDaFoto(p: ArteProps, f: { w: number; h: number; paisagem: boolean } | null): CSSProperties | undefined {
  const u = Math.min(p.w, p.h) / 1080;
  if (!f) return undefined;
  return f.paisagem ? { paddingLeft: f.w + 60 * u } : { paddingTop: f.h + 44 * u };
}
```

- [ ] **Passo 5: rodar e commit**

Run: `npx vitest run tests/templates-creator.test.tsx && npx tsc --noEmit -p .`
Expected: PASS. (As peças ainda não são usadas; o lint pode acusar função sem uso até F4. Rode `npx eslint` só a partir de F4.)

```bash
git add src/lib/render/templates.tsx tests/templates-creator.test.tsx
git commit -m "Peças do estilo creator e arte sem [PREENCHER]

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

### Tarefa F4: carrossel (capa, slides do meio e chamada final)

**Arquivos:**
- Modificar: `src/lib/render/templates.tsx`
- Teste: `tests/templates-creator.test.tsx`

- [ ] **Passo 1: teste de desenho que falha**

Acrescente em `tests/templates-creator.test.tsx`:

```tsx
import React from "react";
import { beforeAll } from "vitest";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { Arte } from "@/lib/render/templates";
import { temaDaMarca, TAMANHOS, type Tamanho } from "@/lib/render/tema";
import { fontesDaMarca } from "@/lib/render/fonts";
import { DEMOS } from "@/lib/engine/demo";
import type { PostGerado, TemplateId } from "@/lib/types";

const brand = DEMOS.cora.brand;
let FOTO = "";
beforeAll(async () => {
  const b = await sharp({ create: { width: 96, height: 64, channels: 3, background: "#3366aa" } }).jpeg().toBuffer();
  FOTO = `data:image/jpeg;base64,${b.toString("base64")}`;
});

async function desenhar(post: PostGerado, template: TemplateId, slide: number, tamanho: Tamanho, foto: string | null) {
  const { w, h } = TAMANHOS[tamanho];
  const fonts = await fontesDaMarca(brand.fontes.titulo, brand.fontes.corpo, brand.tom_de_voz);
  const r = new ImageResponse(<Arte post={post} template={template} slide={slide} brand={brand} tema={temaDaMarca(brand)} w={w} h={h} logo={null} foto={foto} />, { width: w, height: h, fonts });
  return Buffer.from(await r.arrayBuffer());
}

const carrossel = {
  ...DEMOS.cora.posts[0],
  template: "capa-gancho",
  destaque: "sem virar o chato",
  slides: [
    { titulo: "Como cobrar cliente atrasado sem virar o chato", texto: "4 passos que funcionam para qualquer PJ" },
    { titulo: "Mande o lembrete antes do vencimento", texto: "Um aviso gentil dois dias antes resolve metade dos atrasos." },
    { titulo: "3", texto: "Ofereça o Pix na mesma mensagem." },
    { titulo: "Salve para usar no fim do mês", texto: "E mande para quem cobra por você." },
  ],
} as PostGerado;

describe("carrossel creator", () => {
  it("desenha todos os slides nos 4 tamanhos, com e sem foto na capa", async () => {
    for (const tamanho of ["feed", "quadrado", "linkedin", "x"] as Tamanho[]) {
      for (let s = 0; s < carrossel.slides.length; s++) {
        for (const foto of s === 0 ? [null, FOTO] : [null]) {
          expect((await desenhar(carrossel, "capa-gancho", s, tamanho, foto)).length).toBeGreaterThan(5000);
        }
      }
    }
  }, 120_000);
});
```

- [ ] **Passo 2: rodar**

Run: `npx vitest run tests/templates-creator.test.tsx`
Expected: PASS com o carrossel antigo (o teste garante que nada quebra ao trocar). A mudança visual é conferida em F8.

- [ ] **Passo 3: `CapaGancho` no estilo creator**

Troque a função `CapaGancho` inteira por:

```tsx
function CapaGancho(p: ArteProps) {
  const { tema, post, w, h } = p;
  const u = Math.min(w, h) / 1080;
  const paisagem = w / h > 1.3;
  const total = post.slides.length;
  const i = Math.min(p.slide, total - 1);
  const s = post.slides[i];
  const areaW = w - (paisagem ? 120 : 168) * u;
  const trilho = withAlpha(tema.tintaNoPapel, 0.12);

  if (i === 0) {
    const titulo = limpar(s.titulo || post.gancho);
    const sub = limpar(s.texto);
    const f = p.foto ? faixaDaFoto(p, 0.5) : null;
    const textoW = f?.paisagem ? w - f.w - 120 * u : areaW;
    const fs = f ? caber(titulo, textoW, f.paisagem ? h * 0.42 : h * 0.22, 104 * u, 44 * u, 0.98) : caber(titulo, areaW, h * (paisagem ? 0.46 : 0.42), 150 * u, 56 * u, 0.98);
    const fsSub = caber(sub, textoW * 0.92, h * (f ? 0.07 : 0.1), (f ? 34 : 40) * u, 24 * u, 1.3, 0.5);
    return (
      <Papel p={p} style={depoisDaFoto(p, f)}>
        {f && p.foto ? <FotoFaixa p={p} foto={p.foto} w={f.w} h={f.h} /> : null}
        <Autor p={p} cor={tema.tintaNoPapel} corSec={tema.mutedNoPapel} tamanho={f ? 0.85 : 1} />
        <div style={col({ gap: (f ? 18 : 26) * u, maxWidth: textoW })}>
          <TituloCreator texto={titulo} destaque={post.destaque} fs={fs} cor={tema.tintaNoPapel} marca={tema.marcaTexto} />
          {sub ? <div style={{ fontFamily: "Corpo", fontSize: fsSub, lineHeight: 1.3, color: tema.mutedNoPapel, maxWidth: textoW * 0.92 }}>{sub}</div> : null}
        </div>
        <Progresso p={p} i={0} total={total} cor={tema.tintaNoPapel} trilho={trilho} />
      </Papel>
    );
  }

  if (i === total - 1) {
    const titulo = limpar(s.titulo);
    const texto = limpar(s.texto);
    const fs = caber(titulo, areaW, h * 0.3, 100 * u, 44 * u, 1.02);
    const acao = dominioVisivel(p.brand) || handleDe(p.brand, post);
    return (
      <Moldura p={p} bg={tema.escuro}>
        <FaixaTopo p={p} largura={w} />
        <Autor p={p} cor={tema.naEscuro} corSec={withAlpha(tema.naEscuro, 0.7)} tamanho={0.85} />
        <div style={col({ gap: 28 * u })}>
          <TituloCreator texto={titulo} fs={fs} cor={tema.naEscuro} marca={tema.escuro} lh={1.02} />
          {texto ? (
            <div style={{ fontFamily: "Corpo", fontSize: caber(texto, areaW, h * 0.14, 38 * u, 26 * u, 1.35, 0.5), lineHeight: 1.35, color: withAlpha(tema.naEscuro, 0.78) }}>{texto}</div>
          ) : null}
          <div style={row({ alignItems: "center" })}>
            <div style={row({ background: tema.primaria, color: tema.naPrimaria, borderRadius: 999, padding: `${16 * u}px ${34 * u}px`, fontFamily: "Corpo", fontWeight: 700, fontSize: 30 * u })}>{acao}</div>
          </div>
        </div>
        <Progresso p={p} i={i} total={total} cor={tema.naEscuro} trilho={withAlpha(tema.naEscuro, 0.18)} />
      </Moldura>
    );
  }

  const numeroSo = /^\d+[.)]?$/.test(s.titulo.trim());
  const tituloLimpo = limpar(s.titulo.replace(/^\d+[.)]\s*/, ""));
  const texto = limpar(s.texto);
  const fsTitulo = caber(tituloLimpo, areaW, h * 0.2, 80 * u, 40 * u, 1.02);
  const fsTexto = caber(texto, areaW, h * 0.3, 44 * u, 28 * u, 1.38, 0.5);
  return (
    <Papel p={p}>
      <Autor p={p} cor={tema.tintaNoPapel} corSec={tema.mutedNoPapel} tamanho={0.75} />
      <div style={col({ gap: 24 * u })}>
        <div style={{ fontFamily: "Titulo", fontSize: (paisagem ? 110 : 150) * u, lineHeight: 0.85, color: tema.primariaNoPapel, letterSpacing: -6 * u }}>{String(i).padStart(2, "0")}</div>
        {!numeroSo && tituloLimpo ? <TituloCreator texto={tituloLimpo} fs={fsTitulo} cor={tema.tintaNoPapel} marca={tema.marcaTexto} lh={1.02} /> : null}
        {texto ? <div style={{ fontFamily: "Corpo", fontSize: fsTexto, lineHeight: 1.38, color: tema.mutedNoPapel }}>{texto}</div> : null}
      </div>
      <Progresso p={p} i={i} total={total} cor={tema.tintaNoPapel} trilho={trilho} />
    </Papel>
  );
}
```

- [ ] **Passo 4: rodar os testes**

Run: `npx vitest run tests/templates-creator.test.tsx tests/render.test.ts tests/imagem.test.tsx`
Expected: PASS.

- [ ] **Passo 5: commit**

```bash
git add src/lib/render/templates.tsx tests/templates-creator.test.tsx
git commit -m "Carrossel no estilo creator: capa com imagem na faixa, slides numerados, chamada escura

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

### Tarefa F5: lista e checklist

**Arquivos:**
- Modificar: `src/lib/render/templates.tsx`
- Teste: `tests/templates-creator.test.tsx`

- [ ] **Passo 1: teste de desenho**

```tsx
  it("lista e checklist nos 4 tamanhos", async () => {
    const lista = { ...carrossel, template: "lista", slides: [{ titulo: "5 sinais de que a planilha travou", texto: "" }, ...["Fechamento leva dias", "Ninguém confia no saldo", "Nota sai atrasada", "Cobrança fica esquecida", "Contador pede tudo de novo"].map((t) => ({ titulo: t, texto: "" }))] } as PostGerado;
    for (const t of ["lista", "checklist"] as TemplateId[])
      for (const tamanho of ["feed", "quadrado", "linkedin", "x"] as Tamanho[]) expect((await desenhar(lista, t, 0, tamanho, null)).length).toBeGreaterThan(5000);
  }, 60_000);
```

- [ ] **Passo 2: `Lista` no estilo creator**

Troque a função `Lista` por:

```tsx
function Lista(p: ArteProps & { check?: boolean }) {
  const { tema, post, w, h } = p;
  const u = Math.min(w, h) / 1080;
  const paisagem = w / h > 1.3;
  const [cab, ...itens] = post.slides;
  const titulo = limpar(cab?.titulo || post.gancho);
  const lista = itens.slice(0, 6);
  const larguraItem = paisagem ? (w - 120 * u) / 2 - 24 * u : w - 168 * u;
  const fsItem = Math.min(44 * u, ...lista.map((it) => caber(it.titulo, larguraItem - 110 * u, 110 * u, 44 * u, 26 * u, 1.15, 0.52)));
  const fsTitulo = caber(titulo, w - 168 * u, h * (paisagem ? 0.24 : 0.22), 92 * u, 40 * u, 1.0);
  return (
    <Papel p={p}>
      <div style={col({ gap: 24 * u })}>
        <Autor p={p} cor={tema.tintaNoPapel} corSec={tema.mutedNoPapel} tamanho={0.75} />
        <TituloCreator texto={titulo} destaque={post.destaque} fs={fsTitulo} cor={tema.tintaNoPapel} marca={tema.marcaTexto} lh={1.0} />
      </div>
      <div style={row({ flexWrap: "wrap", gap: `${(paisagem ? 16 : 24) * u}px ${48 * u}px` })}>
        {lista.map((it, k) => (
          <div key={k} style={row({ alignItems: "center", gap: 26 * u, width: larguraItem })}>
            {p.check ? (
              <div style={row({ width: 60 * u, height: 60 * u, flexShrink: 0, borderRadius: 14 * u, border: `${5 * u}px solid ${tema.primariaNoPapel}`, alignItems: "center", justifyContent: "center" })}>
                <div style={{ width: 16 * u, height: 28 * u, borderRight: `${6 * u}px solid ${tema.primariaNoPapel}`, borderBottom: `${6 * u}px solid ${tema.primariaNoPapel}`, transform: "rotate(45deg)", marginTop: -8 * u }} />
              </div>
            ) : (
              <div style={row({ width: 64 * u, height: 64 * u, flexShrink: 0, borderRadius: 9999, background: tema.primaria, color: tema.naPrimaria, alignItems: "center", justifyContent: "center", fontFamily: "Titulo", fontSize: 32 * u })}>{k + 1}</div>
            )}
            <div style={col({ gap: 4 * u, flex: 1 })}>
              <div style={{ fontFamily: "Corpo", fontWeight: 700, fontSize: fsItem, lineHeight: 1.15, color: tema.tintaNoPapel }}>{limpar(it.titulo)}</div>
              {it.texto ? <div style={{ fontFamily: "Corpo", fontSize: fsItem * 0.7, lineHeight: 1.3, color: tema.mutedNoPapel }}>{limpar(it.texto)}</div> : null}
            </div>
          </div>
        ))}
      </div>
      <div style={row({ justifyContent: "space-between", fontFamily: "Corpo", fontWeight: 700, fontSize: 24 * u, letterSpacing: 2 * u, color: tema.mutedNoPapel })}>
        <div>{handleDe(p.brand, post)}</div>
        <div>SALVE PARA CONSULTAR</div>
      </div>
    </Papel>
  );
}
```

- [ ] **Passo 3: rodar e commit**

Run: `npx vitest run tests/templates-creator.test.tsx`
Expected: PASS.

```bash
git add src/lib/render/templates.tsx tests/templates-creator.test.tsx
git commit -m "Lista e checklist no estilo creator

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

### Tarefa F6: citação e dado de impacto

**Arquivos:**
- Modificar: `src/lib/render/templates.tsx`
- Teste: `tests/templates-creator.test.tsx`

- [ ] **Passo 1: teste de desenho**

```tsx
  it("citação e dado nos 4 tamanhos, com e sem foto", async () => {
    const citacao = { ...carrossel, template: "citacao", slides: [{ titulo: "Cora", texto: "Empreender já exige coragem. Seu banco não precisa exigir paciência." }] } as PostGerado;
    const dado = { ...carrossel, template: "dado-impacto", slides: [{ titulo: "1,9 milhão", texto: "de notas fiscais emitidas todo mês na plataforma" }] } as PostGerado;
    for (const [post, t] of [[citacao, "citacao"], [dado, "dado-impacto"]] as [PostGerado, TemplateId][])
      for (const tamanho of ["feed", "quadrado", "linkedin", "x"] as Tamanho[])
        for (const foto of [null, FOTO]) expect((await desenhar(post, t, 0, tamanho, foto)).length).toBeGreaterThan(5000);
  }, 60_000);
```

- [ ] **Passo 2: `Citacao` e `DadoImpacto`**

Troque as duas funções por:

```tsx
function Citacao(p: ArteProps) {
  const { tema, post, w, h } = p;
  const u = Math.min(w, h) / 1080;
  const s = post.slides[0];
  const frase = limpar(s.texto || post.gancho);
  const autor = limpar(s.titulo || "").toLowerCase() === limpar(p.brand.nome).toLowerCase() || !s.titulo ? null : limpar(s.titulo);
  const f = p.foto ? faixaDaFoto(p, 0.42) : null;
  const areaW = f?.paisagem ? w - f.w - 120 * u : w - 168 * u;
  const fs = caber(frase, areaW, f ? (f.paisagem ? h * 0.46 : h * 0.3) : h * 0.5, (f ? 84 : 100) * u, 38 * u, 1.1);
  return (
    <Papel p={p} style={depoisDaFoto(p, f)}>
      {f && p.foto ? <FotoFaixa p={p} foto={p.foto} w={f.w} h={f.h} /> : null}
      <div style={{ fontFamily: "Titulo", fontSize: (f ? 140 : 220) * u, lineHeight: 0.7, height: (f ? 60 : 100) * u, color: tema.primariaNoPapel }}>“</div>
      <div style={col({ gap: 26 * u, maxWidth: areaW })}>
        <TituloCreator texto={frase} destaque={post.destaque} fs={fs} cor={tema.tintaNoPapel} marca={tema.marcaTexto} lh={1.1} />
        {autor ? (
          <div style={row({ alignItems: "center", gap: 18 * u })}>
            <div style={{ width: 60 * u, height: 6 * u, background: tema.primaria }} />
            <div style={{ fontFamily: "Corpo", fontWeight: 700, fontSize: 30 * u, color: tema.tintaNoPapel }}>{autor}</div>
          </div>
        ) : null}
      </div>
      <Autor p={p} cor={tema.tintaNoPapel} corSec={tema.mutedNoPapel} tamanho={0.8} />
    </Papel>
  );
}

function DadoImpacto(p: ArteProps) {
  const { tema, post, w, h } = p;
  const u = Math.min(w, h) / 1080;
  const s = post.slides[0];
  const numero = limpar(s.titulo || "");
  const texto = limpar(s.texto || post.gancho);
  const f = p.foto ? faixaDaFoto(p, 0.4) : null;
  const areaW = f?.paisagem ? w - f.w - 120 * u : w - 168 * u;
  const fsNum = caber(numero, areaW, h * (f ? 0.2 : 0.36), (f ? 260 : 380) * u, 96 * u, 1, 0.6);
  const fsTexto = caber(texto, areaW, h * (f ? 0.14 : 0.2), 48 * u, 28 * u, 1.3, 0.5);
  return (
    <Papel p={p} style={depoisDaFoto(p, f)}>
      {f && p.foto ? <FotoFaixa p={p} foto={p.foto} w={f.w} h={f.h} /> : null}
      <div style={row({ alignItems: "center", gap: 14 * u })}>
        <div style={{ width: 16 * u, height: 16 * u, borderRadius: 99, background: tema.primaria }} />
        <div style={{ fontFamily: "Corpo", fontWeight: 700, fontSize: 24 * u, letterSpacing: 4 * u, color: tema.mutedNoPapel }}>EM NÚMEROS</div>
      </div>
      <div style={col({ gap: 20 * u, maxWidth: areaW })}>
        <div style={{ fontFamily: "Titulo", fontSize: fsNum, lineHeight: 0.9, color: tema.primariaNoPapel, letterSpacing: -fsNum * 0.04 }}>{numero}</div>
        <div style={{ fontFamily: "Corpo", fontSize: fsTexto, lineHeight: 1.3, color: tema.tintaNoPapel }}>{texto}</div>
      </div>
      <Autor p={p} cor={tema.tintaNoPapel} corSec={tema.mutedNoPapel} tamanho={0.8} />
    </Papel>
  );
}
```

- [ ] **Passo 3: rodar e commit**

Run: `npx vitest run tests/templates-creator.test.tsx tests/imagem.test.tsx`
Expected: PASS.

```bash
git add src/lib/render/templates.tsx tests/templates-creator.test.tsx
git commit -m "Citação e dado de impacto no estilo creator, com a imagem na faixa

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

### Tarefa F7: bastidor, antes e depois, print de post e limpeza

**Arquivos:**
- Modificar: `src/lib/render/templates.tsx`
- Teste: `tests/templates-creator.test.tsx`

- [ ] **Passo 1: teste de desenho de todos os templates**

```tsx
  it("todos os templates desenham nos 4 tamanhos", async () => {
    for (const t of TEMPLATES as readonly TemplateId[])
      for (const tamanho of ["feed", "quadrado", "linkedin", "x"] as Tamanho[])
        for (const foto of [null, FOTO]) expect((await desenhar({ ...carrossel, template: t } as PostGerado, t, 0, tamanho, foto)).length).toBeGreaterThan(5000);
  }, 180_000);
```

(importe `TEMPLATES` de `@/lib/engine/schema`.)

- [ ] **Passo 2: `Bastidor`**

Troque a função por:

```tsx
function Bastidor(p: ArteProps) {
  const { tema, post, w, h } = p;
  const u = Math.min(w, h) / 1080;
  const s = post.slides[0];
  const titulo = limpar(s.titulo || post.gancho);
  const texto = limpar(s.texto);
  const f = p.foto ? faixaDaFoto(p, 0.42) : null;
  const areaW = f?.paisagem ? w - f.w - 120 * u : w - 168 * u;
  const fs = caber(titulo, areaW, f ? h * 0.26 : h * 0.42, 108 * u, 44 * u, 1.02);
  return (
    <Papel p={p} style={depoisDaFoto(p, f)}>
      {f && p.foto ? <FotoFaixa p={p} foto={p.foto} w={f.w} h={f.h} /> : null}
      <div style={row({ alignItems: "center", gap: 16 * u })}>
        <div style={{ fontFamily: "Corpo", fontWeight: 700, fontSize: 24 * u, letterSpacing: 5 * u, color: tema.primariaNoPapel }}>BASTIDORES</div>
        <div style={{ width: 120 * u, height: 3 * u, background: tema.primariaNoPapel }} />
      </div>
      <div style={col({ gap: 24 * u, maxWidth: areaW })}>
        <TituloCreator texto={titulo} destaque={post.destaque} fs={fs} cor={tema.tintaNoPapel} marca={tema.marcaTexto} lh={1.02} />
        {texto ? <div style={{ fontFamily: "Corpo", fontSize: caber(texto, areaW, h * 0.18, 40 * u, 26 * u, 1.38, 0.5), lineHeight: 1.38, color: tema.mutedNoPapel }}>{texto}</div> : null}
      </div>
      <Autor p={p} cor={tema.tintaNoPapel} corSec={tema.mutedNoPapel} tamanho={0.8} />
    </Papel>
  );
}
```

- [ ] **Passo 3: `AntesDepois` no papel da marca**

Em `AntesDepois`, troque `const cinza = "#e9e6e1";` por `const cinza = mix(tema.papel, "#000000", 0.06);` e, logo antes do último `</div>` do retorno, acrescente a faixa de cor da marca no topo: `<FaixaTopo p={p} largura={w} />`.

- [ ] **Passo 4: print de post no papel da marca**

Em `PrintX`, sem foto, o fundo passa a ser o papel com a faixa no topo, e os círculos decorativos usam o marca-texto. Troque `<Moldura p={p} bg={tema.primaria} style={{ alignItems: "center", justifyContent: "center" }}>` por `<Moldura p={p} bg={p.foto ? tema.escuro : tema.papel} style={{ alignItems: "center", justifyContent: "center" }}>` e o bloco `: ( <> ... </> )` dos círculos por:

```tsx
      ) : (
        <>
          <FaixaTopo p={p} largura={w} />
          <div style={{ position: "absolute", left: -180 * u, top: -180 * u, width: 520 * u, height: 520 * u, borderRadius: 9999, background: tema.marcaTexto, opacity: 0.55 }} />
          <div style={{ position: "absolute", right: -140 * u, bottom: -160 * u, width: 440 * u, height: 440 * u, borderRadius: 9999, background: tema.primaria, opacity: 0.12 }} />
        </>
      )}
```

No cartão (o `div` com `background: "#ffffff"`), troque `boxShadow: ...` por estas duas propriedades:

```tsx
boxShadow: `0 ${24 * u}px ${60 * u}px rgba(0,0,0,0.14)`, border: `${2 * u}px solid ${withAlpha(tema.tintaNoPapel, 0.08)}`,
```

- [ ] **Passo 5: limpeza**

Apague o que ficou sem uso: `FundoFoto`, `corDoVeu`, `SOMBRA_TEXTO` e `Rodape` (confira com `npx eslint src/lib/render`). Mantenha `veuLegivel` exportado: há teste que o usa.

- [ ] **Passo 6: rodar tudo e commit**

Run: `npx vitest run && npx tsc --noEmit -p . && npx eslint`
Expected: PASS.

```bash
git add src/lib/render/templates.tsx tests/templates-creator.test.tsx
git commit -m "Bastidor, antes e depois e print de post no estilo creator; peças antigas removidas

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

### Tarefa F8: revisão visual sem custo

**Arquivos:**
- Criar: `scripts/render-amostras.tsx`

- [ ] **Passo 1: o script**

```tsx
// Desenha artes de exemplo em PNG para revisão visual, sem gastar IA.
// Uso: npx tsx scripts/render-amostras.tsx <pasta-de-saida> [imagem-da-capa.jpg]
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { ImageResponse } from "next/og";
import { DEMOS } from "../src/lib/engine/demo";
import { Arte, totalDeImagens } from "../src/lib/render/templates";
import { temaDaMarca, TAMANHOS, type Tamanho } from "../src/lib/render/tema";
import { fontesDaMarca } from "../src/lib/render/fonts";
import type { PostGerado } from "../src/lib/types";

const [saida = "amostras", fotoArq] = process.argv.slice(2);
const foto = fotoArq ? `data:image/jpeg;base64,${readFileSync(fotoArq).toString("base64")}` : null;
mkdirSync(saida, { recursive: true });

async function main() {
  for (const [marca, demo] of Object.entries(DEMOS)) {
    const brand = demo.brand;
    const fonts = await fontesDaMarca(brand.fontes.titulo, brand.fontes.corpo, brand.tom_de_voz);
    for (const original of demo.posts.slice(0, 4)) {
      // Destaque de exemplo: as 3 últimas palavras do título da capa.
      const titulo = original.slides[0]?.titulo || original.gancho;
      const post = { ...original, destaque: titulo.split(" ").slice(-3).join(" ") } as PostGerado;
      const total = totalDeImagens(post.template, post);
      for (const tamanho of ["feed", "linkedin"] as Tamanho[]) {
        for (let s = 0; s < total; s++) {
          for (const comFoto of s === 0 && foto ? [false, true] : [false]) {
            const { w, h } = TAMANHOS[tamanho];
            const png = await new ImageResponse(
              createElement(Arte, { post, template: post.template, slide: s, brand, tema: temaDaMarca(brand), w, h, logo: null, foto: comFoto ? foto : null }),
              { width: w, height: h, fonts },
            ).arrayBuffer();
            const nome = `${marca}-${post.id}-${post.template}-s${s + 1}-${tamanho}${comFoto ? "-foto" : ""}.png`;
            writeFileSync(path.join(saida, nome), Buffer.from(png));
          }
        }
      }
    }
  }
  console.log(`Artes em ${saida}`);
}
main();
```

- [ ] **Passo 2: gerar as amostras**

Run: `npx tsx scripts/render-amostras.tsx /private/tmp/amostras-creator <caminho de uma capa de IA já gerada, ex.: a cena da Recallo>`
Expected: PNGs de Cora, Pipefy e Sallve, em feed e LinkedIn, com e sem foto.

- [ ] **Passo 3: revisão de design**

Abra as PNGs (Read) e faça uma revisão com um subagente de design independente, com este checklist por arte: título legível no celular; hierarquia clara (gancho, apoio, progresso); destaque marcado no trecho certo; autor e marca presentes sem poluir; nada cortado ou sobreposto; nenhum `[PREENCHER]`; paisagem com a imagem à esquerda sem esmagar o texto; consistência entre os slides do mesmo carrossel; cara de post de creator bom, não de template. Corrija os tamanhos e espaçamentos apontados em `templates.tsx`, gere de novo e repita até a revisão aprovar.

- [ ] **Passo 4: commit**

```bash
git add scripts/render-amostras.tsx src/lib/render/templates.tsx
git commit -m "Revisão visual das artes creator com amostras locais

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

## Trilha G: verificação, validação paga e deploy

### Tarefa G1: versão no cache de análise e custo medido no log

Análises guardadas antes do redesenho não têm `destaque`, `direcao_capa` nem `padrao_viral` e seriam servidas por 7 dias. E a validação paga precisa do custo real, não de estimativa.

**Arquivos:**
- Modificar: `src/lib/engine/index.ts`, `src/lib/llm/index.ts`, `package.json`
- Criar: `src/lib/llm/custo.ts`, `scripts/custo-do-log.ts`
- Teste: `tests/custo.test.ts` (novo), e os testes que comparam a chave de cache exata

- [ ] **Passo 1: teste que falha**

```ts
// tests/custo.test.ts
import { describe, expect, it } from "vitest";
import { custoDoLog } from "@/lib/llm/custo";
import { chaveCache } from "@/lib/engine";

describe("custo pelo log", () => {
  it("soma Claude (entrada, saída, cache, buscas) e OpenAI", () => {
    const log = [
      "[ia] pesquisar claude-sonnet-5 entrada=20000 saida=3000 buscas=4",
      "[ia] gerar-ao-vivo claude-sonnet-5 entrada=9000 saida=8000 cache_lido=5000 cache_gravado=0",
      "[ia] anexos claude-haiku-4-5-20251001 entrada=1600 saida=30",
      "[imagem] openai gpt-image-2 medium entrada=300 saida=1000 21000ms 480KB",
      "linha qualquer",
    ].join("\n");
    const r = custoDoLog(log);
    expect(r.itens).toHaveLength(4);
    expect(r.total).toBeCloseTo(0.25225, 4);
  });

  it("cache de análise tem versão", () => {
    expect(chaveCache("https://cora.com.br")).toMatch(/^v2:/);
  });
});
```

- [ ] **Passo 2: rodar e ver falhar**

Run: `npx vitest run tests/custo.test.ts`
Expected: FAIL.

- [ ] **Passo 3: `src/lib/llm/custo.ts`**

```ts
// Custo em dólar a partir das linhas "[ia] ..." e "[imagem] openai ..." do log do servidor.
// Preços por milhão de tokens (confira nas páginas de preço antes de uma validação paga):
// Sonnet 5: US$ 2 entrada, 10 saída. Haiku 4.5: 1 e 5. Cache lido: 10% da entrada; gravado: 125%.
// Busca na web: US$ 10 por mil. gpt-image-2: 5 por milhão de entrada e 40 por milhão de saída de imagem.
const CLAUDE: [RegExp, { entrada: number; saida: number }][] = [
  [/sonnet-5/, { entrada: 2, saida: 10 }],
  [/haiku-4-5/, { entrada: 1, saida: 5 }],
];
const IMAGEM = { entrada: 5, saida: 40 };
const BUSCA = 0.01;

export interface ItemCusto { tipo: string; modelo: string; dolares: number }

export function custoDoLog(texto: string): { total: number; itens: ItemCusto[]; desconhecidos: string[] } {
  const itens: ItemCusto[] = [];
  const desconhecidos: string[] = [];
  const M = 1e6;
  for (const linha of texto.split("\n")) {
    const c = linha.match(/\[ia\] (\S+) (\S+) entrada=(\d+) saida=(\d+)(?: buscas=(\d+))?(?: cache_lido=(\d+) cache_gravado=(\d+))?/);
    if (c) {
      const [, tipo, modelo, ent, sai, bus, lido, grav] = c;
      const preco = CLAUDE.find(([re]) => re.test(modelo))?.[1];
      if (!preco) desconhecidos.push(modelo);
      const p = preco ?? CLAUDE[0][1];
      const dolares = (+ent * p.entrada + +sai * p.saida + +(lido ?? 0) * p.entrada * 0.1 + +(grav ?? 0) * p.entrada * 1.25) / M + +(bus ?? 0) * BUSCA;
      itens.push({ tipo, modelo, dolares });
      continue;
    }
    const i = linha.match(/\[imagem\] openai (\S+) \S+ entrada=(\d+) saida=(\d+)/);
    if (i) itens.push({ tipo: "imagem", modelo: i[1], dolares: (+i[2] * IMAGEM.entrada + +i[3] * IMAGEM.saida) / M });
  }
  return { total: itens.reduce((s, x) => s + x.dolares, 0), itens, desconhecidos };
}
```

- [ ] **Passo 4: `scripts/custo-do-log.ts` e o comando**

```ts
// Custo real de uma rodada a partir do log do servidor. Uso: npm run ia:custo -- <arquivo.log> [linha-inicial]
import { readFileSync } from "node:fs";
import { custoDoLog } from "../src/lib/llm/custo";

const [arq, desde = "0"] = process.argv.slice(2);
const texto = readFileSync(arq, "utf8").split("\n").slice(Number(desde)).join("\n");
const r = custoDoLog(texto);
const porTipo = new Map<string, number>();
for (const i of r.itens) porTipo.set(`${i.tipo} ${i.modelo}`, (porTipo.get(`${i.tipo} ${i.modelo}`) ?? 0) + i.dolares);
for (const [k, v] of porTipo) console.log(`${k.padEnd(40)} US$ ${v.toFixed(4)}`);
if (r.desconhecidos.length) console.log(`modelos sem preço (contados como Sonnet): ${[...new Set(r.desconhecidos)].join(", ")}`);
console.log(`TOTAL US$ ${r.total.toFixed(4)}`);
```

Em `package.json`, em `scripts`: `"ia:custo": "tsx scripts/custo-do-log.ts"`.

- [ ] **Passo 5: log da visão e versão do cache**

Em `ClaudeLLM.gerarComAnexos` (`src/lib/llm/index.ts`), logo depois do `messages.create`, acrescente `registrarUso(this.modelo, "anexos", msg.usage);`.

Em `chaveCache` (`src/lib/engine/index.ts`), troque `const base = chaveUrl(url);` por:

```ts
  // v2: posts com destaque, direção de capa e padrão viral. Mudou o formato da análise, suba a versão.
  const base = `v2:${chaveUrl(url)}`;
```

Rode `npx vitest run` e ajuste os testes que comparam a chave exata (acrescentar `v2:` ao esperado).

- [ ] **Passo 6: rodar e commit**

Run: `npx vitest run && npx tsc --noEmit -p .`
Expected: PASS.

```bash
git add src/lib/llm src/lib/engine/index.ts scripts/custo-do-log.ts package.json tests
git commit -m "Custo real pelo log e versão no cache de análise

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

### Tarefa G2: verificação completa sem custo

- [ ] **Passo 1: tudo verde**

Run: `npx vitest run && npx tsc --noEmit -p . && npx eslint && npm run build`
Expected: tudo PASS, build sem erro.

- [ ] **Passo 2: biblioteca e catálogo**

```bash
npm run virais:catalogo && git status --porcelain data/virais
node -e 'for (const n of require("fs").readdirSync("data/virais").filter(d=>!d.includes("."))) { const i=require(`./data/virais/${n}/itens.json`); console.log(n, i.length, i.filter(x=>x.verificado).length) }'
```

Expected: nenhum arquivo alterado; os 8 nichos listados, cada um perto de 60 itens (a spec pede pelo menos 40 conferidos nos nichos novos).

- [ ] **Passo 3: nada de travessão nem `[PREENCHER]` na arte**

```bash
git diff $(git merge-base HEAD origin/main) -U0 -- src | grep '^+' | grep -n '[—–]' || echo "sem travessão"
```

Expected: `sem travessão`. (O `[PREENCHER]` na arte já é coberto pelo teste de F3.)

- [ ] **Passo 4: fluxo local sem IA**

```bash
npm run build && ANTHROPIC_API_KEY= OPENAI_API_KEY= GEMINI_API_KEY= npm start
```

(Variável vazia no ambiente não é sobrescrita pelo `.env.local`: o servidor sobe sem IA e não gasta.) No navegador, em `http://localhost:3000`, rode um exemplo (Cora) e um site qualquer. Confira: a tela ao vivo aparece com o bloco da pesquisa e um cartão por post; os posts entram um a um; as artes estão no estilo creator; nenhum pedido a `/api/imagem` sai (demo e motor local não pedem capa). Tire um print de cada tela.

### Tarefa G3: validação paga, até US$ 2

Três análises reais pela interface, em três nichos (um deles novo), com auditoria. Pare antes do limite: o custo é medido no log a cada site.

- [ ] **Passo 1: servidor local com IA e log em arquivo**

```bash
npm run build && npm start 2>&1 | tee /private/tmp/validacao.log
```

(O `.env.local` aponta para o Supabase de produção: pesquisa, análise e capas ficam guardadas e a produção reaproveita.)

- [ ] **Passo 2: três sites, um de cada vez**

Sites: `https://www.pipefy.com` (saas-b2b), `https://www.nuvemshop.com.br` (ecommerce-dtc) e uma agência de marketing brasileira com site próprio (marketing-agencias, nicho novo). Para cada um:

1. Anote a linha atual do log: `wc -l < /private/tmp/validacao.log`.
2. No navegador, faça o fluxo completo e anote as respostas do onboarding em `/private/tmp/validacao-respostas.md` (a produção vai repetir as mesmas para achar o cache).
3. Meça: segundos até o primeiro post aparecer, até o último e até a última capa.
4. Quando as capas terminarem: `npm run ia:custo -- /private/tmp/validacao.log <linha anotada>`.
5. Salve a análise (botão de exportar ou `GET /api/analise/<id>`) em `/private/tmp/validacao-<nicho>.json` e os PNGs das artes (feed e LinkedIn) em `/private/tmp/validacao-<nicho>/`.
6. **Se a soma dos sites já feitos passar de US$ 1,40, pare**: o próximo site estouraria o orçamento.

Critérios: primeiro post na tela antes de 60 s depois da pesquisa; custo por site até US$ 0,60; 4 ou 5 carrosséis com capa por análise; nenhuma capa com letra, logo ou rosto; nenhum número sem fonte.

- [ ] **Passo 3: auditoria**

Um workflow com 3 auditores, cada um lendo os três JSONs e os PNGs, e cada achado grave conferido por um cético:
- **fatos:** números, depoimentos e concorrentes batem com as fontes e a pesquisa (os erros da auditoria da Alice: concorrente parceiro ou adquirido, média virando garantia, depoimento alterado);
- **viral:** gancho, padrão viral aplicado, variedade no lote, estrutura do carrossel (gancho, tensão, valor, prova, chamada), chamada final;
- **design:** legibilidade no celular, destaque no trecho certo, capa bonita e sem texto, nada cortado, cara de creator.

Corrija no código o que for confirmado (prompt, checagens, templates). Uma nova rodada paga só se couber no que sobrou do orçamento.

- [ ] **Passo 4: commit das correções**

```bash
git add -A src tests
git commit -m "Ajustes da validação paga

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

### Tarefa G4: deploy e teste em produção

- [ ] **Passo 1: variáveis na Vercel**

```bash
vercel env ls production | grep -E "LIMITE_IMAGENS|LLM_PROVIDER|ANTHROPIC_MODEL|OPENAI"
```

Se `LIMITE_IMAGENS_POR_IP` ou `LIMITE_IMAGENS_DIA` estiverem com 10 e 60, remova (`vercel env rm <nome> production`) para valer o padrão novo (30 e 150).

- [ ] **Passo 2: deploy**

```bash
git push origin HEAD:main && vercel --prod --yes
```

- [ ] **Passo 3: teste em produção sem gastar**

No site de produção, repita o fluxo de um dos sites da G3 com as mesmas respostas de `/private/tmp/validacao-respostas.md`. Esperado: pesquisa e análise vêm do cache (resposta em segundos, eventos no mesmo formato) e as capas também (nenhuma linha `[imagem] openai` nova em `vercel logs`). Confira a tela ao vivo, as capas e o download das artes. Rode `vercel logs <url> --level error --since 1h`: sem erros.

- [ ] **Passo 4: STATUS.md**

Acrescente uma seção com o que mudou (estilo creator, capas automáticas conferidas pelo Haiku, 8 nichos, virais ao vivo, tela ao vivo), o custo medido por site na G3 e os limites novos.

```bash
git add STATUS.md
git commit -m "STATUS: posts virais, capas automáticas e tela ao vivo no ar

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
git push origin HEAD:main
```
