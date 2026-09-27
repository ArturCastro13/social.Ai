# Contexto da empresa no onboarding — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar no localhost os anexos com leitura, importações manuais de Notion/Granola e entendimento revisável antes dos concorrentes, sem redesenhar a plataforma.

**Architecture:** Um contexto estruturado e temporário liga as três entregas. Originais são validados em memória no servidor e enviados ao adaptador multimodal existente; o founder confirma os fatos e cores que chegam tanto ao buscador quanto ao motor de posts. A implementação parte de uma cópia isolada do upstream do Bruno e preserva rotas e contratos legados.

**Tech Stack:** Next.js App Router, React, TypeScript, Zod, Vitest e adaptadores Gemini/Claude existentes. Adicionar `pdf-lib` para validar PDFs e declarar `sharp` como dependência direta para validar imagens; testes de componentes usam `@testing-library/react` e `jsdom`, sem introduzir framework visual.

**Spec:** `docs/superpowers/specs/2026-09-26-contexto-onboarding-design.md` (aprovada por Artur na conversa).

## Global Constraints

- Preservar os componentes, fontes, cores e organização visual do Bruno.
- Não editar a lista de espera, checkout ou produção. Não fazer push, merge ou deploy nesta etapa.
- Primeira versão: PDF, PNG e JPEG; até três materiais ativos; até 3 MB por arquivo, enviado individualmente como multipart; PDF limitado a vinte páginas.
- Aceitar até 20 mil caracteres por material textual, respeitando os três materiais ativos.
- Usar rótulo “Importação manual — sem conexão automática”.
- Chaves exclusivamente no servidor.
- Não salvar arquivos em disco, bucket público, localStorage ou logs.
- As escolhas confirmadas pelo founder prevalecem.
- Não introduzir novo framework visual, provedor de armazenamento ou serviço de autenticação.
- Deploy somente após aprovação posterior.

## Review Focus

1. Um usuário remove um material durante a leitura: a resposta atrasada não pode recriá-lo. Testes do reducer e componente na tarefa 3.
2. A empresa muda dentro da mesma sessão: fatos, cores e sugestões da empresa anterior não podem reaparecer. Testes de escopo/revisão nas tarefas 1, 3 e 4.
3. O arquivo é pequeno em bytes, mas sua imagem exige muita memória, ou o PDF está criptografado: rejeitar antes da chamada paga. Testes na tarefa 2.
4. A geração refaz o perfil da marca após ler Instagram/fluxo sem site: as cores confirmadas não podem desaparecer. Testes no ponto final de geração na tarefa 4.
5. O gerador persiste preferências ou análises: originais e fontes privadas não podem vazar para armazenamento, logs ou resultados públicos. Testes de sanitização nas tarefas 1 e 4.

## Arquivos e responsabilidades

Todos os caminhos abaixo são relativos à raiz do checkout de implementação. O checkout atual de documentação fica em `/Users/arturcastro/Documents/Codex/2026-09-26/est/work/social-ai`; não implementar os recursos sobre sua base antiga.

| Unidade | Arquivos |
|---|---|
| Contratos, orçamento e revisão | `src/lib/contexto/contrato.ts`, `src/lib/contexto/revisao.ts`, `src/lib/motor/contrato.ts` |
| Upload e segurança de entrada | `src/lib/contexto/arquivos.ts`, `src/lib/contexto/requisicao.ts`, `src/app/api/materiais/route.ts` |
| Extração e IA multimodal | `src/lib/contexto/extrair.ts`, `src/lib/llm/index.ts`, `src/lib/llm/anexos.ts` |
| Interface de materiais/importação | `src/components/onboarding/MateriaisEmpresa.tsx`, `src/lib/client/materiais.ts`, `src/components/onboarding/TelaAjustes.tsx`, `src/components/onboarding/TelaSemSite.tsx` |
| Entendimento revisável | `src/lib/contexto/entender.ts`, `src/app/api/contexto/route.ts`, `src/components/onboarding/ResumoNegocio.tsx` |
| Consumidores do contexto | `src/components/onboarding/Concorrentes.tsx`, `src/lib/client/onboarding.ts`, `src/app/api/concorrentes/route.ts`, `src/lib/motor/concorrentes.ts`, `src/lib/motor/contexto.ts`, `src/app/api/analyze/route.ts` |
| Regressão de classificação | `src/lib/engine/nicho.ts`, `tests/fixtures/marcas/recallo.json` |
| Verificação | `tests/contexto-contrato.test.ts`, `tests/contexto-arquivos.test.ts`, `tests/contexto-ia.test.ts`, `tests/contexto-requisicao.test.ts`, `tests/contexto-ui.test.tsx`, `tests/contexto-fluxo.test.ts`, `tests/contexto-entender.test.ts` |

## Contratos compartilhados

Definir com Zod e exportar os tipos inferidos em `src/lib/contexto/contrato.ts`; não importar `Preferencias` desse módulo para evitar ciclo. Consumers do contrato legado usam import type quando possível.

```ts
type OrigemMaterial = "arquivo" | "notion" | "granola" | "outro";
type CampoFato = "negocio" | "publico" | "oferta" | "diferencial" |
  "tom" | "regra" | "proibicao" | "referencia_visual" | "tipografia";
type Fato = { campo: CampoFato; texto: string; evidencia: string };
type CorMaterial = {
  hex: string;
  origem: "declarada" | "estimada";
  evidencia: string;
};
type Material = {
  id: string;
  nome: string;
  origem: OrigemMaterial;
  fatos: Fato[];
  cores: CorMaterial[];
  avisos: string[];
};
type Entendimento = {
  negocio: string;
  segmento: string;
  publico: string;
  nicho: "saas-b2b" | "fintech" | "healthtech" | "edtech" | "ecommerce-dtc" | "outro";
  evidencias: { fonte: string; trecho: string }[];
  duvidas: string[];
  fonte: "ia" | "manual";
};
type ContextoConfirmado = {
  versao: 1;
  empresa: string;
  revisao: number;
  entendimento: Entendimento;
  materiais: Material[];
  paleta?: { primaria: string; secundaria: string; destaque: string };
};
```

Limites: nome 160; IDs 80; negócio 1.200; segmento 200; público 300; no máximo 24 fatos por material (texto 500, evidência 250); oito cores; oito avisos de 250; oito evidências/dúvidas por entendimento; até três materiais. Orçamento agregado serializado de 30 mil caracteres para contexto confirmado. Rejeitar excesso com instrução para reduzir/revisar, nunca `.slice()` silencioso. Campos e evidências são texto, renderizados por React, sem HTML.

`id`, `nome`, `origem` e a referência da empresa são definidos/validados pela aplicação, não aceitos como autoridade da resposta do modelo. As fontes de evidência permitidas são `site`, `founder` e IDs dos materiais daquela requisição.

### Task 1: Contratos temporários e propagação segura

**Interfaces:** Produz `materialSchema`, `entendimentoSchema`, `contextoConfirmadoSchema`, `validarOrcamento(contexto): ContextoConfirmado`, `aplicarContextoMarca(brand, contexto): BrandProfile` e `semContextoPrivado(preferencias): Preferencias`. `preferenciasSchema` ganha apenas `contexto_empresa?: ContextoConfirmado`.

- [ ] Preparar isolamento com a skill `using-git-worktrees`: inspecionar anexos existentes; reutilizar checkout adequado ou criar via ferramenta nativa. Obter a referência atual de `bruno-dotcom12/social.Ai/main`, registrar SHA e não mesclar a branch de lista de espera. Transferir somente os dois documentos aprovados para o checkout novo. Registrar caminho retornado, ler AGENTS e docs Next nele. Conferir processos/portas antes de iniciar servidor; não matar servidor do usuário.
- [ ] Executar baseline com `npm ci`, `npm test`, `npm run lint` e `npm run build`; registrar falhas preexistentes. Verificar presença (não valores) de configuração IA, incluindo variáveis herdadas e `.env*` do projeto. Não copiar credenciais de outros projetos.
- [ ] Criar primeiro testes em `tests/contexto-contrato.test.ts`. Um exemplo completo do teste de orçamento e cardinalidade:

```ts
import { describe, expect, it } from "vitest";
import { materialSchema, contextoConfirmadoSchema } from "@/lib/contexto/contrato";
const material = { id: "m1", nome: "Manual", origem: "arquivo", fatos: [], cores: [], avisos: [] };
const base = {
  versao: 1, empresa: "recallo.com.br", revisao: 1,
  entendimento: { negocio: "Preparação para inglês", segmento: "Idiomas", publico: "Estudantes", nicho: "edtech", evidencias: [], duvidas: [], fonte: "manual" },
  materiais: [],
};
describe("contexto temporário", () => {
  it("aceita material vazio mas não quatro materiais", () => {
    expect(materialSchema.safeParse(material).success).toBe(true);
    expect(contextoConfirmadoSchema.safeParse({ ...base, materiais: Array.from({ length: 4 }, (_, i) => ({ ...material, id: `m${i}` })) }).success).toBe(false);
  });
  it("rejeita código de cor que não seja hexadecimal", () => {
    expect(materialSchema.safeParse({ ...material, cores: [{ hex: "javascript:alert(1)", origem: "declarada", evidencia: "" }] }).success).toBe(false);
  });
});
```

- [ ] Rodar `npm test -- tests/contexto-contrato.test.ts`, confirmar falha por módulo ausente. Acrescentar casos de IDs duplicados, orçamento total, origem inválida e empresa divergente.
- [ ] Implementar os schemas acima e a extensão opcional de `preferenciasSchema`. `validarOrcamento` compara `JSON.stringify(contexto).length` a 30.000 e lança erro de validação. `aplicarContextoMarca` usa cópia imutável, substitui apenas as três cores aprovadas e mantém fundo/texto contrastantes, sem mudar tema da aplicação. Só aplica para a empresa correspondente; não altera fontes globais. Persistência remove contexto sem mudar preferências legadas:

```ts
export function semContextoPrivado(p: Preferencias): Preferencias {
  const copy = { ...p };
  delete copy.contexto_empresa;
  return copy;
}
```

- [ ] Modificar `salvarPreferencias` para serializar `semContextoPrivado(p)`; manter materiais no estado do componente pai, fora de `Empresa` salva e dos campos legados de brandbook. Testar via spy que o JSON gravado não contém contexto, textos de documentos ou base64.
- [ ] Rodar testes novos e existentes do contrato/motor; commit local explícito dos arquivos desta tarefa com mensagem `feat: define temporary company context contract`.

### Task 2: Endpoint de materiais com validação e IA multimodal

**Interfaces:** `validarArquivo(file: File): Promise<{ mime: "application/pdf" | "image/png" | "image/jpeg"; bytes: Uint8Array }>`; `extrairMaterial(entrada, llm): Promise<Material>`; `POST /api/materiais` aceita um arquivo multipart ou JSON `{nome, origem, texto}`; responde `{material}` ou `{erro, codigo}`. A interface `LLM` mantém `gerar(sistema,prompt)` e adiciona método opcional `gerarComAnexos(sistema,prompt,anexos): Promise<string>`; `AnexoLLM = {mime, dadosBase64}`. Os únicos produtores de base64 são funções servidor.

- [ ] Adicionar testes de validação com bytes reais gerados por bibliotecas, antes do validador. Instalar `pdf-lib` e `sharp` e registrar lockfile. Exemplo em `tests/contexto-arquivos.test.ts`:

```ts
import { expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { validarArquivo } from "@/lib/contexto/arquivos";
it("rejeita PDF com 21 páginas", async () => {
  const doc = await PDFDocument.create();
  for (let i = 0; i < 21; i++) doc.addPage();
  const bytes = await doc.save();
  await expect(validarArquivo(new File([new Uint8Array(bytes)], "manual.pdf", { type: "application/pdf" }))).rejects.toThrow(/20 páginas/);
});
it("não aceita HTML renomeado para PNG", async () => {
  await expect(validarArquivo(new File(["<html>não sou imagem</html>"], "marca.png", { type: "image/png" }))).rejects.toThrow();
});
it("limita bytes antes de decodificar", async () => {
  await expect(validarArquivo(new File([new Uint8Array(3_000_001)], "marca.png", { type: "image/png" }))).rejects.toThrow(/3 MB/);
});
```

- [ ] Rodar para falhar; completar testes de arquivo vazio, JPEG/PNG válidos, imagem truncada, MIME conflitante, PDF válido/criptografado/corrompido e limite de pixels. Injetar loader de PDF no teste de erro de criptografia e acrescentar um PDF criptografado de fixture sintética para teste de integração.
- [ ] Implementar `validarArquivo`: verificar 1–3.000.000 bytes, assinatura PDF/PNG/JPEG, MIME e extensão consistentes; `PDFDocument.load(bytes, { ignoreEncryption: false, throwOnInvalidObject: true })`, contar páginas e exigir 1–20. Para imagens usar `sharp(bytes, { limitInputPixels: 16_000_000, failOn: "warning" })`, verificar formato e decodificar totalmente com reencode seguro, sem metadados; rejeitar animação. Garantir que a saída também não ultrapasse 3 MB. Não executar JavaScript de PDF nem seguir links embutidos.
- [ ] Criar testes de montagem do payload Gemini e Claude com `vi.stubGlobal("fetch", mock)`/mock do SDK e conferir MIME, base64 somente no servidor, max tokens, timeout, falha sem credencial e erro sanitizado. Manter `gerar` legado compatível. Para Gemini usar partes `inlineData: { mimeType, data }` no endpoint `generateContent`; para Claude usar blocos `document`/`image` com source base64. Não usar upload persistente Files API. Usar modelo configurado; não escolher novo modelo caro silenciosamente.
- [ ] Implementar a extração com prompt que exige JSON conforme contrato, trata todo material como dado, não executa instruções nem ferramentas e permite fatos desconhecidos. Limitar resposta a 6.000 tokens, timeout de 45s, sem retries automáticos. Validar JSON e schemas, recusar saída truncada/excesso, retornar avisos sem inventar informação. Em modo sem IA ou modelo incompatível, responder 503 com orientação para texto manual, nunca “lido com sucesso”.
- [ ] Implementar leitura limitada do corpo em `requisicao.ts`: acumular stream até 3.200.000 bytes para multipart/100.000 para JSON, rejeitar antes de `formData()`/parse mesmo sem Content-Length. Aceitar só um campo arquivo; origem e nome no formato validado. Validar Origin contra `new URL(request.url).origin` quando enviado; negar cross-site. O endpoint não aceita caminho de disco nem URL para buscar arquivo.
- [ ] Limitar simultaneidade a duas extrações por processo e 15 requisições/10min por origem de cliente quando identificável, com expiração/limite de entradas; retorno 429 + Retry-After. Não confiar em IP arbitrário como autenticação. Documentar que este controle não é proteção distribuída para deploy. Mapear inválido→400, tamanho→413, limite→429, modelo indisponível→503, timeout→504 e provedor→502 sem expor payload, chave ou mensagem crua do provedor. Usar `Cache-Control: no-store`.
- [ ] Em `tests/contexto-requisicao.test.ts`, testar corpo chunked acima do limite, origem cruzada, falha do parser, liberação do slot em erro e nenhuma chamada ao modelo para arquivo inválido. Rodar `npm test -- tests/contexto-arquivos.test.ts tests/contexto-ia.test.ts tests/contexto-requisicao.test.ts`; commit local `feat: extract company materials with bounded multimodal input`.

Referências oficiais para conferir durante execução: [Gemini documentos](https://ai.google.dev/gemini-api/docs/document-processing), [Claude PDF](https://platform.claude.com/docs/en/build-with-claude/pdf-support), [PDFDocument](https://pdf-lib.js.org/docs/api/classes/pdfdocument), [Sharp limites](https://sharp.pixelplumbing.com/api-constructor/). Confirmar payload da versão da API instalada; não migrar o adaptador inteiro para outra API.

### Task 3: Anexos e importação manual no onboarding existente

**Interfaces:** `MateriaisEmpresa` recebe `{ empresaId, valor: ItemMaterial[], onChange }`; `ItemMaterial` contém ID, nome, estado (`selecionado|processando|pronto|falhou`), erro opcional e `material?: Material`. `reduzirMateriais(state, action)` e `chaveContexto(empresaId, revisao)` ficam em `src/lib/client/materiais.ts`. Originais vivem apenas na requisição/controlador, não em preferência serializada.

- [ ] Instalar dev deps `@testing-library/react` e `jsdom`. Criar teste por arquivo com ambiente jsdom, mantendo os demais testes Node. Criar primeiro teste de reducer para remover durante leitura:

```ts
import { expect, it } from "vitest";
import { reduzirMateriais } from "@/lib/client/materiais";
it("ignora resultado de material removido", () => {
  const initial = { empresaId: "a", revisao: 1, itens: [{ id: "m", nome: "Manual", estado: "processando" as const }] };
  const removed = reduzirMateriais(initial, { tipo: "remover", id: "m" });
  const result = reduzirMateriais(removed, { tipo: "concluir", empresaId: "a", id: "m", material: { id: "m", nome: "Manual", origem: "arquivo", fatos: [], cores: [], avisos: [] } });
  expect(result.itens).toEqual([]);
});
```

- [ ] Rodar teste e confirmar falha. Acrescentar reset de empresa, adição concorrente do quarto item, resultado antigo depois de retry, erro individual preservando outros itens e reenvio do mesmo arquivo após remoção. Cada ação de resultado inclui token de execução além do ID; reducer aceita somente token ativo.
- [ ] Implementar reducer e componente usando os estilos existentes de `ui.tsx`, `AjustesRedes` e `TelaTurbinar`. Botões auxiliares sempre `type="button"`, input com label e accept `.pdf,.png,.jpg,.jpeg`, texto acessível de progresso `role="status"`. Erros por material, botão remover e tentar novamente; reset de input permite repetir seleção. Limite de três materiais entre arquivos e textos, sem limite separado por tipo.
- [ ] Adicionar importação manual com seletor Notion/Granola/Outro, nome, textarea máximo 20.000 e botão “Importar conteúdo”. Mostrar “Importação manual — sem conexão automática” e orientação de exportação PDF/imagem. Não pedir credenciais de terceiros nem buscar links privados. Texto vazio/espaços rejeitado. Preview do trecho permite revisar antes do envio. Se não houver IA, permitir manter texto como referência manual explicitamente rotulada, sujeita ao orçamento e revisão; não inventar extração visual.
- [ ] Em `TelaAjustes`, manter materiais fora de `Empresa`; passar o mesmo estado a `TelaSemSite`. Inserir bloco junto das redes em ambos os caminhos. Usar ID estável de instância da empresa sem site para evitar vazamento entre empresas com nomes iguais; trocar empresa limpa materiais e aborta requisições. Nome editado da mesma empresa não descarta anexos inadvertidamente.
- [ ] No teste de componente com React Testing Library, usar `fireEvent.change` no arquivo/texto e `findByRole` para estado pronto/falhou; mock apenas fetch, não o reducer. Testar limite agregado, teclado, rótulo de importação manual, ausência de botão de conexão falsa e preservação das respostas ao alternar passos. Não gravar material em localStorage.
- [ ] Rodar testes novos + existentes de onboarding. Commit local `feat: add optional materials and manual tool imports to onboarding`.

### Task 4: Entendimento revisável, concorrentes e geração consistentes

**Interfaces:** `POST /api/contexto` aceita `{empresaId, revisao, brand, founder, materiais, descricaoManual?}`; responde `{entendimento}`. `entenderEmpresa(entrada, llm: LLM | null): Promise<Entendimento>` não busca URLs novas. `ResumoNegocio` recebe draft editável e `onConfirmar(ContextoConfirmado)`. `useConcorrentes.buscar(brand, publico, contexto?)` e `buscarSugestoesConcorrentes(brand, publico, sinal?, contexto?)` mantêm argumentos legados e acrescentam contexto opcional. `invalidar()` aborta busca e limpa sugestões automáticas, preservando links manuais para revisão.

- [ ] Criar fixture Recallo com título/descrições públicos lidos na investigação e arrays h1/h2/parágrafos vazios. Testar `palpiteNicho` antes de qualquer correção:

```ts
import { expect, it } from "vitest";
import recallo from "./fixtures/marcas/recallo.json";
import { palpiteNicho } from "@/lib/engine/nicho";
import type { BrandProfile } from "@/lib/types";
it("não transforma exames de inglês em saúde", () => {
  expect(palpiteNicho(recallo as BrandProfile).nicho).toBe("edtech");
});
```

- [ ] Acrescentar contraste com clínica/exames médicos, escola de idiomas, empresa desconhecida e descrição em branco. Fazer mudança limitada na heurística: palavras inteiras e sinais educacionais de inglês/idiomas/IELTS/TOEFL; “exames de inglês” não conta como evidência médica. A heurística permanece identificada como fallback, não substitui entendimento semântico. Não criar regra pelo nome Recallo.
- [ ] Implementar `entenderEmpresa` combinando campos extraídos do site, respostas, materiais e descrição manual, com orçamento explícito/validação e mesmo tratamento de timeout/erro da tarefa 2. Modelo retorna entendimento estruturado; evidências devem referenciar fontes existentes e trechos textuais presentes quando alegados como citação. Conflitos e inferências sem suporte viram dúvidas. Sem IA, fornecer draft manual conservador e `fonte:"manual"`; negócio insuficiente exige descrição antes de confirmar, mas ausência de anexos não bloqueia o fluxo.
- [ ] Na tela atual de ajustes, acrescentar resumo compacto editável (negócio, segmento, público), dúvidas e regras dos materiais revisáveis, inclusive remoção de fatos incorretos. Mostrar cores declaradas/estimadas e botão explícito para aplicar às três posições da paleta. Não substituir escolhas já editadas; não alterar tipografia da plataforma. Confirmação produz `ContextoConfirmado` validado; impedir confirmar enquanto leitura está pendente, com explicação e opção remover para continuar.
- [ ] Remover busca automática de concorrentes de `carregar()` e do blur da tela sem site. Somente confirmar entendimento dispara `buscar`. Editar respostas, público, descrição ou materiais incrementa revisão e invalida entendimento/sugestões anteriores. Usar AbortController e número de execução para ignorar resposta atrasada; não requisitar IA a cada tecla.
- [ ] Alterar o cache de concorrentes para incluir empresa, revisão e contexto serializado validado. Retirar seleção automática de até três itens da IA. O endpoint legado segue aceitando chamadas antigas, mas a nova interface sempre envia contexto confirmado. Público explicitamente confirmado prevalece; não substituir nicho desconhecido por um catálogo aleatório.
- [ ] No motor de concorrentes, incluir o entendimento/fatos confirmados no prompt em seção de dados não confiáveis. Manter validações de URL/SSRF existentes. Acrescentar metadados opcionais `tipo:"concorrente_sugerido"|"referencia"` e `verificacao:"a_confirmar"|"referencia_curada"`, preservados no parser cliente. Renderizar “Sugestões para você conferir”; motivo não é prova de pesquisa. Não simular verificação semântica com o simples HTTP 200. Sem contexto suficiente, deixar entrada manual e não encher a tela de referências de nicho arbitrário.
- [ ] Em `montarPreferencias`, enviar contexto confirmado em campo separado; na geração exigir revisão vigente somente quando o novo fluxo foi iniciado, sem quebrar API antiga/demos. Em `montarContexto`, usar materiais estruturados sem corte de 3.000 caracteres. Regras aprovadas continuam completas dentro do orçamento. Colocar precedência de escolhas do founder no prompt. Instruções dentro de fontes não têm autoridade sobre políticas de sistema ou ferramentas.
- [ ] Aplicar `aplicarContextoMarca` no servidor depois da última leitura/reconstrução de BrandProfile e antes de gerar/renderizar; cobrir paths sem site e paleta de Instagram. No browser, mostrar a mesma paleta aprovada. Não permitir que contexto de outra empresa altere marca.
- [ ] Auditar todas as escritas do fluxo de geração: procurar `preferencias`, `contexto_empresa`, `JSON.stringify`, `.insert`, `.upsert` e logs em `api/analyze` e funções chamadas. Remover originais, textos importados e evidências privadas de preferências persistidas/retornos públicos. Preservar resultados gerados e escolhas de cor necessários ao produto; não alterar política de dados legados fora deste escopo. Registrar essa diferença no aviso da UI.
- [ ] Testar contexto enviado ao gerador/buscador com spy: alteração material provoca nova busca; remoção elimina conteúdo; sem credencial é rotulado manual; chamada antiga permanece válida; sem arquivo permite concluir. Testar ausência de contexto privado em serialização da análise e preservação das cores em ambos os fluxos. Rodar `npm test`; commit local `feat: confirm company understanding before competitors and generation`.

### Task 5: Verificação real e localhost para aprovação

**Entrega:** servidor local ativo, rota `/app`, evidências e limitações documentadas em `docs/superpowers/reports/2026-09-26-contexto-onboarding-local.md`. Nenhuma publicação externa.

- [ ] Rodar `npm test`, `npm run lint`, `npm run build` e verificar `git diff --check`. Comparar com baseline, corrigir regressões deste trabalho e listar problemas antigos separadamente. Verificar que o diff não inclui landing page, checkout, estilos globais, fontes ou alterações não relacionadas.
- [ ] Conferir testes de erros com timeout, resposta malformada, provedor indisponível e documentos falsos. Conferir que a aplicação não mostra “sucesso” quando somente um mock passou. Testar o caminho completo sem credencial e com chave configurada, quando disponível.
- [ ] Se não houver credencial, pedir configuração privada no `.env.local` do checkout novo (nunca no chat) e informar que validação real de IA está pendente. Não ler segredos em saída. Não fabricar sucesso nem copiar chave de outro projeto. Continuar os testes independentes dessa credencial.
- [ ] Criar material sintético de teste em memória: um PDF com cor `#0055AA`, regra “Não usar superlativos” e negócio de ensino de inglês, mais uma imagem de moodboard com paleta distinta. Arquivos sintéticos podem ser gerados como fixtures de teste pelo script aprovado, sem dados de clientes. Quando a chave estiver disponível, demonstrar extração e confirmá-las antes de gerar; fazer poucas chamadas para limitar custo.
- [ ] Escolher porta livre com verificação de processos. Iniciar `npm run dev -- --hostname 127.0.0.1 --port 3001` somente se 3001 estiver livre; caso contrário usar a próxima livre e registrar a URL efetiva. Não encerrar processos alheios. Confirmar HTTP 200 e abrir o preview usando `open_in_codex` na URL efetiva `/app`.
- [ ] Verificar no navegador com screenshots: entrada com site Recallo, fluxo sem site, três perguntas, anexos, importação manual, resumo confirmado, sugestões e geração. Usar viewport 360, 390 e desktop; sem overflow horizontal. Comparar tokens de fonte/cor e blocos anteriores com o upstream do Bruno. Testar teclado e nomes acessíveis dos controles novos.
- [ ] Fazer revisão final independente conforme método de execução escolhido, com foco em privacidade, concorrência de requisições e compatibilidade. Corrigir problemas encontrados e repetir os testes afetados. Salvar o relatório e commit local só dos arquivos do escopo.
- [ ] Entregar link clicável do localhost ativo, instruções de teste em três passos e tabela curta com “verificado”, “pendente de credencial” ou “fora do escopo”. Parar para aprovação do produto. Não fazer deploy, push nem merge.

## Execução recomendada

Execução direta nesta conversa, mantendo um responsável pelo estado compartilhado do onboarding, com revisão independente ao final. Alternativa: subagentes por tarefa com revisão entre entregas, mais custosa em coordenação. Nenhuma das opções muda o escopo nem autoriza deploy.

## Autorrevisão do plano

- Anexos, importações e entendimento compartilham contrato: tarefas sequenciais no mesmo recurso, não três subsistemas independentes.
- Os cinco riscos de revisão têm testes ou checagens explícitas nas tarefas responsáveis.
- Métodos legados do LLM/API recebem extensões opcionais; novos contratos têm nomes únicos neste plano.
- PDF/imagens passam por validação antes de chamadas externas; modelo/configuração real são verificados sem presumir credenciais.
- Notion/Granola são importação manual, de acordo com a especificação aprovada.
- Deploy, redesign, OAuth e pesquisa ampla continuam excluídos.
