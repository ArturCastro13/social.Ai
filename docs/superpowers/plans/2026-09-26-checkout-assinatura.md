# Checkout por assinatura — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar a jornada aprovada de amostra gratuita até assinatura mensal no Stripe, exclusivamente em ambiente de teste, com trabalho recuperável e acesso protegido.

**Architecture:** Supabase Auth identifica o usuário; um workspace privado reúne briefing, materiais extraídos, pautas e consumo. Serviços pequenos de cobrança convertem eventos Stripe em acesso persistente; o servidor limita a prévia e controla todas as operações privadas. Componentes atuais recebem a nova jornada sem redesign.

**Tech Stack:** Next.js 16.3.6/App Router, React 19.2.8, TypeScript, Zod, Supabase/PostgreSQL, SDK Stripe, Vitest, Testing Library e testes reais em sandbox.

**Spec:** `docs/superpowers/specs/2026-09-26-checkout-assinatura-design.md` — aprovada pelo usuário antes deste plano.

## Global Constraints

- “Esta entrega se limita a localhost/preview protegido e Stripe em modo de teste.”
- “Não autoriza cobrança real nem migração de clientes para um plano pago.”
- “Preservar componentes, fontes, cores e organização visual do Bruno; ajustes mobile-first e acessíveis.”
- “Os valores R$49/129/290 atuais são fictícios, não preços validados.”
- “Uma oferta mensal, uma marca por workspace neste MVP; sem plano anual, upsell, cupom ou promessa de uso ilimitado.”
- “Arquivos originais permanecem transitórios, sem novo armazenamento permanente.”
- “Não enviar documentos, briefing ou e-mail em URLs, logs ou metadados Stripe.”
- Não mudar a produção, executar migração no banco atual, criar produto live ou substituir a integração do Bruno. Custos/preço comercial ficam fora desta execução.
- Antes de escrever código Next, ler as instruções `AGENTS.md` e os guias relevantes em `node_modules/next/dist/docs/`. Instalar dependências somente na execução, registrar versões resolvidas no lockfile e evitar atualização geral do projeto.

## Review Focus

1. Duas contas usam o mesmo domínio: conteúdo, cache, documentos e métricas precisam permanecer separados — Tarefas 2 e 4.
2. Duas abas pagam ao mesmo tempo ou a gravação falha após resposta Stripe: recuperar uma tentativa sem duplicar assinatura — Tarefa 5.
3. Retorno chega antes do webhook; trabalhador antigo volta após expiração: não liberar nem reabrir acesso incorretamente — Tarefas 6 e 7.
4. Duas abas editam versões diferentes do briefing: não sobrescrever contexto confirmado nem pagar por um rascunho diferente — Tarefas 2 e 7.
5. Sessão expira com arquivos selecionados: preservar o que ainda estiver em memória e explicar o que exige reanexar, sem upload anônimo — Tarefas 1 e 7.

## Organização e dependências

Trabalhar no worktree isolado já usado, branch `codex/checkout-assinatura`, preservando alterações alheias. Antes da execução, verificar a versão atual do Bruno e integrar somente após verificar o diff. Não criar outro checkout se o atual estiver adequado.

- `src/lib/assinatura/`: contratos, configuração sintética e decisão pura de acesso.
- `src/lib/auth/` e `src/proxy.ts`: sessão, OTP, respostas privadas e validação de origem.
- `src/lib/workspace/`: repositório persistente, rascunhos e consumo transacional.
- `src/lib/billing/`: adapter Stripe, checkout, portal e reconciliação; SDK não vaza para UI.
- `src/lib/engine/preview.ts` e adapter de store: geração limitada e isolamento, sem reescrever o motor inteiro.
- `src/components/auth/`, `src/components/billing/`: controles pequenos usando tokens/componentes atuais.
- `supabase/migrations/`, `supabase/tests/`: schema aditivo e provas de RLS/transações.
- `tests/`: testes de unidade/rotas/UI; `tests/helpers/assinatura.ts` reúne apenas utilitários de teste.

Dependências: 1 → 2 → 3 → 4; 2 + 3 → 5 → 6; 4 + 5 + 6 → 7 → 8. A sequência evita dois agentes editando o mesmo motor ou componente simultaneamente.

## Contratos compartilhados

Definir na Tarefa 1; todas as tarefas importam os mesmos tipos. `DraftBody` usa os schemas existentes de `BrandProfile`, `Preferencias`, `ContextoConfirmado` e `Personalizacao`; arquivos binários não entram nele.

```ts
type Scope = { userId: string; workspaceId: string };
type UsageKind = 'material_extract' | 'context_analyze' |
  'competitor_suggest' | 'preview_generate' | 'week_generate';
type BillingStatus = 'none' | 'incomplete' | 'incomplete_expired' |
  'trialing' | 'active' | 'past_due' | 'unpaid' | 'paused' | 'canceled';
type AccessState = {
  status: BillingStatus; paidFrom: string | null; paidThrough: string | null;
  cancelAtPeriodEnd: boolean; riskHold: boolean;
};
type DraftBody = {
  brand: BrandProfile | null; preferencias: Preferencias;
  contexto: ContextoConfirmado | null;
  personalizacoes: Record<string, Personalizacao>;
};
type Draft = { id: string; workspaceId: string; version: number; body: DraftBody };
type CheckoutResult = { attemptId: string; sessionId: string; url: string };
type CheckoutStatus = {
  state: 'pending' | 'active' | 'canceled' | 'expired';
  draftId: string; draftVersion: number; access: AccessState;
};
```

Não usar `CheckoutStatus.state` como estado da assinatura. `canceled` nesse contrato significa abandono da tentativa; `AccessState` é reconciliado separadamente. Respostas de erro privadas: `{code, message}`, sem stack/segredos; 401 sessão, 404 recurso ausente ou alheio, 409 versão/conflito, 402 acesso pago necessário, 429 cota/frequência, 503 dependência indisponível.

---

### Task 1: Contratos, configuração segura e identidade verificada

**Files:** criar `src/lib/assinatura/{contrato,config,acesso}.ts`, `src/lib/auth/{server,proxy,scope,http}.ts`, `src/proxy.ts`, `src/app/api/auth/{otp,verify,logout,session}/route.ts`, `tests/assinatura-auth.test.ts`, `tests/assinatura-config.test.ts`; modificar `.env.example`, `package.json`, `package-lock.json`.

**Interfaces:** produzir `billingMode(): 'disabled' | 'test'`, `requireScope(): Promise<Scope>`, `canGeneratePaid(a: AccessState, now: Date): boolean`, `privateJson(data: unknown, status?: number): Response`. `requireScope` valida usuário no Auth e resolve/cria seu único workspace por RPC da Tarefa 2; até ela existir, o teste usa adapter de teste explícito, nunca fallback de autenticação em runtime.

- [ ] **1. Escrever testes vermelhos** de modo live rejeitado, cookie forjado, sessão expirada, origem cruzada e acesso expirado. Introduzir os imports reais no arquivo de teste:

```ts
it('não concede acesso apenas porque status é active', () => {
  expect(canGeneratePaid({ status: 'active', paidFrom: null,
    paidThrough: null, cancelAtPeriodEnd: false, riskHold: false }, new Date())).toBe(false);
});
it('recusa configuração live nesta entrega', () => {
  vi.stubEnv('BILLING_MODE', 'live');
  expect(() => billingMode()).toThrow();
});
afterEach(() => vi.unstubAllEnvs());
```

- [ ] **2. Observar falha:** `npx vitest run tests/assinatura-auth.test.ts tests/assinatura-config.test.ts`; registrar RED, sem editar expectativa para esconder falha.
- [ ] **3. Implementar:** instalar `@supabase/ssr` e `stripe`; separar service role do cliente de sessão. OTP é solicitado/verificado por Route Handlers, cookies propagados via SSR/proxy. Checar identidade com `auth.getUser()` no servidor; nunca confiar apenas em `getSession()`. Validar e-mail/código com Zod, enviar respostas genéricas para não enumerar contas e preservar controles de frequência do Supabase. Mutações exigem origem do app; webhook terá autenticação própria. Não aplicar CORS `*` às rotas privadas.

```ts
export function canGeneratePaid(a: AccessState, now: Date): boolean {
  return !a.riskHold && ['active', 'past_due'].includes(a.status) &&
    a.paidFrom !== null && a.paidThrough !== null &&
    Date.parse(a.paidFrom) <= now.getTime() && now.getTime() < Date.parse(a.paidThrough);
}
```

Adicionar configuração vazia/documentada para `BILLING_MODE`, `APP_ORIGIN`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_TEST_PRICE_ID`, `STRIPE_TEST_PORTAL_CONFIGURATION_ID`. Default `disabled`; qualquer outro valor além de `test` falha fechado. Rejeitar segredo live e validar `livemode=false` nas respostas Stripe, não apenas prefixos. Reutilizar variáveis Supabase existentes; não preencher segredos por mensagem nem sobrescrever `.env.local`.
- [ ] **4. GREEN e regressões:** `npm test && npm run lint && npx tsc --noEmit`. Mockar apenas a borda Auth nos testes unitários; falha de dependência não cria identidade fictícia.
- [ ] **5. Commit específico:** `git commit -m "feat: add sandbox subscription contracts and verified identity"` após stage somente dos arquivos desta tarefa.

### Task 2: Workspace privado, rascunhos versionados e migração aditiva

**Files:** criar `supabase/migrations/202609260001_subscription_workspace.sql`, `supabase/tests/subscription_workspace.sql`, `src/lib/workspace/{repository,drafts}.ts`, `src/app/api/workspace/drafts/route.ts`, `src/app/api/workspace/drafts/[id]/route.ts`, `tests/workspace-drafts.test.ts`, `tests/helpers/assinatura.ts`.

**Interfaces:** `saveDraft(scope: Scope, input: {id?: string; expectedVersion: number; body: DraftBody}): Promise<Draft>`; `loadDraft(scope: Scope, id: string): Promise<Draft>`; `deleteDraft(scope: Scope, id: string): Promise<void>`. Repositório resolve ownership internamente; todo consumidor fornece Scope verificado, não ID do browser isoladamente.

- [ ] **1. RED:** utilitário `createWorkspaceHarness()` cria dois usuários/workspaces de teste e expõe `a`, `b`, `save`, `load`, `remove`, `emptyBody`. Usa o serviço real com adapter persistente de teste; testes SQL separados provam políticas reais.

```ts
it('isola contas e recusa salvar versão obsoleta', async () => {
  const h = createWorkspaceHarness();
  const draft = await h.save(h.a, { expectedVersion: 0, body: h.emptyBody });
  await expect(h.load(h.b, draft.id)).rejects.toMatchObject({ status: 404 });
  await h.save(h.a, { id: draft.id, expectedVersion: 1, body: h.emptyBody });
  await expect(h.save(h.a, { id: draft.id, expectedVersion: 1, body: h.emptyBody }))
    .rejects.toMatchObject({ status: 409 });
});
```

- [ ] **2. Rodar RED:** `npx vitest run tests/workspace-drafts.test.ts`.
- [ ] **3. Implementar schema e RPCs:** novas tabelas `workspaces`, `drafts`, `draft_versions`, `workspace_analyses`, `workspace_post_edits`, `workspace_feedback`, `workspace_metrics`; UUIDs, FKs, `owner_user_id UNIQUE`, versões imutáveis e `UNIQUE(draft_id, version)`. Guardar corpo Zod validado, máximo 150 KB; original de arquivo nunca entra no JSON. Exclusão do rascunho remove suas versões/material extraído; análises geradas usam somente saída/snapshot necessário, sem documentos originais. Exclusão de análise privada remove posts/edições/feedback próprios, sem tocar dados legados nem ledger financeiro.

```sql
-- Padrão obrigatório de leitura; repetir com WITH CHECK nas políticas de escrita.
create policy drafts_owner on public.drafts for select to authenticated
using (exists (select 1 from public.workspaces w
  where w.id = drafts.workspace_id and w.owner_user_id = (select auth.uid())));
-- save_draft: SELECT ... FOR UPDATE, verificar owner e expectedVersion,
-- gravar nova versão e atualizar ponteiro na mesma transação.
```

RPCs `ensure_workspace`, `save_draft`, `delete_draft` validam identidade/owner e `search_path` fixo; qualquer função de service role recebe ator validado e não tem EXECUTE público. GET/PATCH/DELETE usam JSON privado e `Cache-Control: no-store`. Remoção de material revoga seu uso também em versões anteriores: registrar IDs revogados e recusar nova geração com snapshot que ainda os contém; checkout antigo exige revisão do contexto. A exclusão completa do rascunho remove suas versões e extrações. Não restaurar automaticamente uma extração removida ao voltar do Stripe.
- [ ] **4. Verificar:** unitários + `supabase/tests/subscription_workspace.sql` em banco explicitamente de teste, com dois usuários autenticados e transações revertidas. Testar leitura, inserção, update, delete e cache com mesmo domínio. Não executar SQL no projeto atual do Bruno. Se não houver banco local/teste disponível, relatar essa verificação como pendente; não substituir prova de RLS por mock.
- [ ] **5. Commit:** `git commit -m "feat: persist owner-scoped versioned onboarding drafts"`.

### Task 3: Reserva persistente e atômica de consumo

**Files:** criar `src/lib/workspace/usage.ts`, `supabase/migrations/202609260002_usage_operations.sql`, `supabase/tests/subscription_usage.sql`, `tests/workspace-usage.test.ts`; completar fixture de `src/lib/assinatura/config.ts` e helper de teste.

**Interfaces:** `reserveUsage(scope: Scope, input: {operationId: string; kind: UsageKind; draftId: string; draftVersion: number}): Promise<{operationId: string; state: 'reserved'|'started'|'completed'|'uncertain'; resultId: string|null}>`; `markUsageStarted(scope, operationId): Promise<void>`; `finishUsage(scope, operationId, resultId): Promise<void>`; `releaseUnusedUsage(scope, operationId): Promise<void>`. Tipar parâmetros compartilhados com `Scope` e strings, sem `any`.

- [ ] **1. RED:** teste de concorrência real no SQL e serviço real no helper; o limite deve falhar se a reserva virar simples contar/depois-inserir.

```ts
it('não libera duas operações quando resta apenas uma', async () => {
  const h = createUsageHarness({ limit: 1 });
  const r = await Promise.allSettled([h.reserve('op-a'), h.reserve('op-b')]);
  expect(r.filter(x => x.status === 'fulfilled')).toHaveLength(1);
  expect(await h.used()).toBe(1);
});
```

`createUsageHarness({limit})` é utilitário de teste que chama `reserveUsage` com Scope/rascunho fixos e contador persistente de teste; não alterar configuração de produção para satisfazê-lo.
- [ ] **2. Rodar RED:** `npx vitest run tests/workspace-usage.test.ts`.
- [ ] **3. Implementar:** ledger `usage_operations` com chave única workspace/operação, tipo, hash do pedido, período, resultado e estado. Mesma chave com outro corpo retorna 409. RPC bloqueia linha de quota, revalida acesso e reserva atomicamente. `started` ocorre antes da chamada externa; somente reserva não iniciada é devolvida automaticamente. Resultado concluído é reaproveitado; incerto não dispara outra IA silenciosamente. Sem DB, 503, não geração gratuita por fallback.

```ts
export const TEST_LIMITS = {
  free: { material_extract: 3, context_analyze: 2, competitor_suggest: 1, preview_generate: 1, week_generate: 0 },
  paid: { material_extract: 10, context_analyze: 10, competitor_suggest: 10, preview_generate: 0, week_generate: 4 },
  postsPerWeek: 6,
} as const;
```

Gratuito é por conta, não reseta ao criar outro rascunho. Pago usa início/fim reais reconhecidos da fatura, sem supor 30 dias. Acesso pago é passado ao serviço a partir de estado persistido, nunca do navegador. Adicionar guard persistente de frequência para operações/OTP com HMAC de identificadores nos logs, sem e-mail em claro.
- [ ] **4. GREEN:** suite e prova SQL com conexões concorrentes, retry mesma chave, chave com corpo alterado, timeout e banco indisponível.
- [ ] **5. Commit:** `git commit -m "feat: enforce atomic workspace usage reservations"`.

### Task 4: Prévia limitada e proteção completa do conteúdo

**Files:** criar `src/lib/engine/preview.ts`, `src/lib/workspace/{engine-store,generation}.ts`, `src/app/api/workspace/analyses/route.ts`, `src/app/api/workspace/analyses/[id]/route.ts`, `tests/subscription-content.test.ts`; modificar `src/lib/engine/index.ts`, `src/lib/client/artes.ts`, rotas existentes `analyze`, `analise/[id]`, `render/[postId]/route.tsx`, `feedback`, `materiais`, `contexto`, `concorrentes`.

**Interfaces:** `generatePreview(scope: Scope, draftId: string, version: number, operationId: string): Promise<{analysisId: string; post: PostGerado; titulos: [string,string,string]}>`; `generateWeek(scope, draftId, version, operationId): Promise<Analise>`. Os quatro parâmetros têm os mesmos tipos na segunda função. `ownedEngineStore(scope: Scope): Store` limita todos os métodos usados pelo motor ao workspace; curadoria pública pode continuar compartilhada.

- [ ] **1. RED:** criar fixture `createContentHarness()` com dois usuários, mesmo domínio, provider controlado e repositório isolado; seu `preview()` chama o serviço real e `getAnalysis(actor,id)` chama autorização real.

```ts
it('prévia não gera nem transporta uma semana escondida', async () => {
  const h = createContentHarness();
  const result = await h.preview(h.a);
  expect(result.titulos).toHaveLength(3);
  expect(result.post).toBeDefined();
  expect(Object.keys(result).sort()).toEqual(['analysisId','post','titulos']);
  await expect(h.getAnalysis(h.b, result.analysisId)).rejects.toMatchObject({ status: 404 });
});
```

- [ ] **2. Rodar RED:** `npx vitest run tests/subscription-content.test.ts`.
- [ ] **3. Implementar:** preview tem prompt/schema próprios de um post e três títulos, sem chamar o motor de semana e recortar depois. Usar inferência/renderer existentes e validar contexto confirmado. Motor semanal recebe dependência de store escopada (padrão antigo somente em modo desabilitado/demo), evitando acesso acidental a cache/histórico global; teste falha se houver consulta personalizada sem workspace. No fluxo pago, quota nova substitui os limites de demo, e indisponibilidade de IA deve ser erro recuperável explícito, não entrega silenciosa inferior cobrada como sucesso.

```ts
// Ordem obrigatória nos serviços de geração.
const draft = await loadDraft(scope, draftId);
if (draft.version !== version) throw new WorkspaceError(409, 'draft_changed');
const reservation = await reserveUsage(scope, { operationId, kind: 'preview_generate', draftId, draftVersion: version });
// Se completed, recuperar resultId; se started/uncertain, informar em andamento.
// Só uma reserva nova pode passar para markUsageStarted e chamar o provedor.
```

Definir `WorkspaceError(status, code)` em `src/lib/workspace/repository.ts`; todas as rotas traduzem o erro sem stack. Em `BILLING_MODE=test`, rotas antigas não são caminho alternativo para dados privados: negar não autenticado, resolver ownership ou servir somente demos allowlisted. Fora do modo, manter beta existente sem apontar para tabelas privadas.

Persistir personalizações por post/versionamento antes de renderizar. `urlArte` privado contém só IDs e opções visuais limitadas; nunca post/brand serializados em `?d=`. Render verifica owner, ignora/rejeita payload arbitrário, usa `private,no-store`. O ZIP usa somente URLs privadas autorizadas; cancelar assinatura não retira histórico/exportação já concedidos. Feedback e métricas validam associação análise/post/workspace, não domínio informado. Cobrir remoção de material e exclusão autenticada, sem bucket público para novas saídas privadas.
- [ ] **4. GREEN:** suite completa, inspeção do JSON de prévia e testes negativos para cada rota protegida; demos estáticas/landing/lista de espera permanecem funcionais.
- [ ] **5. Commit:** `git commit -m "feat: add bounded preview and protect subscription content"`.

### Task 5: Checkout e portal hospedados, sem duplicidade

**Files:** criar `src/lib/billing/{contrato,stripe-adapter,repository,checkout,portal}.ts`, `supabase/migrations/202609260003_billing.sql`, `src/app/api/billing/{checkout,portal}/route.ts`, `tests/billing-checkout.test.ts`; ampliar helper de teste.

**Interfaces:** `startCheckout(scope: Scope, input: {draftId: string; draftVersion: number}): Promise<CheckoutResult>`; `openPortal(scope: Scope): Promise<{url: string}>`. `StripeGateway` normaliza respostas e valida ambiente; não exportar tipos do SDK para os componentes. Definir em `src/lib/billing/contrato.ts`:

```ts
type RemoteCustomer = { id: string; livemode: boolean };
type RemoteCheckout = { id: string; url: string|null; livemode: boolean;
  status: 'open'|'complete'|'expired'; subscriptionId: string|null; customerId: string };
type RemoteSubscription = { id: string; livemode: boolean; customerId: string;
  status: BillingStatus; priceId: string; cancelAtPeriodEnd: boolean;
  periodStart: string|null; periodEnd: string|null; latestInvoiceId: string|null };
type RemoteInvoice = { id: string; livemode: boolean; customerId: string;
  subscriptionId: string; paid: boolean; periodStart: string; periodEnd: string };
type CheckoutInput = { customerId: string; priceId: string; workspaceId: string;
  attemptId: string; successUrl: string; cancelUrl: string };
interface StripeGateway {
  ensureCustomer(workspaceId: string, key: string): Promise<RemoteCustomer>;
  createCheckout(input: CheckoutInput, key: string): Promise<RemoteCheckout>;
  getCheckout(id: string): Promise<RemoteCheckout>;
  getSubscription(id: string): Promise<RemoteSubscription>;
  getPaidInvoice(id: string): Promise<RemoteInvoice>;
  createPortal(customerId: string, configurationId: string, returnUrl: string): Promise<{url: string}>;
}
```

Períodos normalizados derivam da linha da assinatura/fatura correspondente ao Price autorizado; não assumir campo de versão antiga do SDK nem usar valor arbitrário enviado pelo cliente. `getPaidInvoice` recusa fatura ainda não paga. Portal é criado somente com cliente/ambiente já verificados pelo adapter.

- [ ] **1. RED:** `createBillingHarness()` chama o serviço real com fake apenas na borda Stripe e adapter de repositório com falhas injetadas. Helpers `failNextWrite`, `sessions`, `start`, `scope` ficam em `tests/helpers/assinatura.ts`, nunca em classes de produção.

```ts
it('retoma sessão Stripe se a gravação local falhou', async () => {
  const h = createBillingHarness();
  h.failNextWrite('checkout_session');
  await expect(h.start(h.scope)).rejects.toThrow();
  const [a,b] = await Promise.all([h.start(h.scope), h.start(h.scope)]);
  expect(a.sessionId).toBe(b.sessionId);
  expect(h.sessions()).toHaveLength(1);
});
```

- [ ] **2. RED:** `npx vitest run tests/billing-checkout.test.ts`.
- [ ] **3. Implementar:** tabelas `billing_customers` e `checkout_attempts`, constraints únicos por ambiente/workspace e chave Stripe. `subscriptions`/`billing_events` serão consumidas na Tarefa 6. Reservar tentativa sob lock transacional e gravar chave antes de chamada externa; não manter transação aberta durante HTTP. Lease com token protege retomadas. Customer tem idempotência própria e somente uma tentativa aberta por workspace. Se existir assinatura vigente/pagamento pendente, devolver estado/portal, não segunda compra.

```ts
const params = {
  mode: 'subscription' as const,
  customer: customerId,
  payment_method_types: ['card' as const],
  line_items: [{ price: config.testPriceId, quantity: 1 }],
  metadata: { workspace_id: scope.workspaceId, attempt_id: attempt.id },
  success_url: `${config.appOrigin}/app/billing/retorno?attempt=${attempt.id}`,
  cancel_url: `${config.appOrigin}/app/billing/retorno?attempt=${attempt.id}&cancel=1`,
};
// Criar pelo adapter usando attempt.idempotencyKey; URL vem somente do servidor.
```

Definir `config`, `customerId` e `attempt` no serviço a partir de configuração validada e linhas persistidas; cliente envia apenas draftId/version. Adapter valida Price de teste BRL mensal, ambiente, Customer e assinatura. Fixar API version compatível com o SDK instalado. Portal usa configuração de teste sem troca de plano/cancelamento imediato. Rejeitar token de outra conta e return URL externa.
- [ ] **4. GREEN:** paralelo, timeout, escrita falha, sessão expirada, price adulterado, metadados sem conteúdo e portal alheio. Sem credenciais, não inventar URL Stripe nem chamar simulação de pagamento real.
- [ ] **5. Commit:** `git commit -m "feat: add recoverable Stripe test checkout and customer portal"`.

### Task 6: Webhooks, acesso reconciliado e recuperação operacional

**Files:** criar `src/lib/billing/{reconcile,events,status}.ts`, `src/app/api/billing/{webhook,status}/route.ts`, `scripts/reconciliar-billing.ts`, `tests/billing-webhook.test.ts`, `tests/billing-access.test.ts`; completar schema da Tarefa 5.

**Interfaces:** `processStripeEvent(rawBody: string, signature: string): Promise<'processed'|'duplicate'|'ignored'>`; `reconcileSubscription(subscriptionId: string): Promise<AccessState>`; `checkoutStatus(scope: Scope, attemptId: string): Promise<CheckoutStatus>`. Recebimento valida signature antes de confiar no evento; status só lê estado/owner, nunca aceita “pago” da URL.

- [ ] **1. RED:** eventos repetidos, invertidos, inválidos, live e falha de DB. Helper `createWebhookHarness()` usa relógio controlado, Stripe fake com estado atual mutável e serviço real; definir `paidEvent`, `cancelEvent`, `setRemoteStatus`, `process`, `access` nesse helper.

```ts
it('invoice antiga não reabre assinatura cancelada', async () => {
  const h = createWebhookHarness();
  h.setRemoteStatus('canceled');
  await h.process(h.cancelEvent);
  await h.process(h.paidEvent);
  await h.process(h.paidEvent);
  expect(canGeneratePaid(await h.access(), h.now)).toBe(false);
});
```

- [ ] **2. RED:** `npx vitest run tests/billing-webhook.test.ts tests/billing-access.test.ts`.
- [ ] **3. Implementar:** `req.text()` antes de parsing e SDK `constructEvent`; persistir envelope mínimo, sem cartão/endereço/documentos. UNIQUE ambiente/eventId e invoiceId por concessão. Serializar reconciliação com lease, expiração e token monotônico; SQL rejeita gravação de executor expirado. Consultar assinatura/fatura atuais e confirmar Customer/Price/ambiente antes de alterar acesso. `invoice.paid` concede período pago, não timestamp do recebimento.

```ts
// Padrão do handler; processStripeEvent valida e aplica transacionalmente.
try {
  const result = await processStripeEvent(await req.text(), req.headers.get('stripe-signature') ?? '');
  return Response.json({ received: true, result });
} catch (error) {
  return billingWebhookError(error); // 400 assinatura/ambiente; 503 falha recuperável.
}
```

Definir `billingWebhookError(error: unknown): Response` em `events.ts`, sanitizado. Só 2xx após aplicar efeito ou reconhecer duplicata/irrelevante; falhas persistem e provocam retry. Cobrir `checkout.session.completed`, `invoice.paid`, falha/ação exigida, `customer.subscription.updated/deleted/paused/resumed`, `charge.refunded` e `charge.dispute.created`. Eventos desconhecidos verificados são ignorados, sem conceder acesso. Reembolso/disputa define `riskHold` e registro para operador, sem reembolso/cancelamento automático.

Implementar comando `npx tsx scripts/reconciliar-billing.ts --test --pending`, reutilizando serviços e leases, que rejeita config live e não imprime payloads. Rodar renovação simulada com meses de durações diferentes e cancelamento agendado/imediato. Status exibe período já pago; `past_due` não estende prazo. Histórico segue permitido ao proprietário.
- [ ] **4. GREEN:** testes de worker antigo, eventos duplicados, falha entre persistir/aplicar, retorno antes da confirmação e banco indisponível; integração SQL deve provar fencing e unicidade.
- [ ] **5. Commit:** `git commit -m "feat: reconcile subscription access from verified Stripe events"`.

### Task 7: Jornada visual, retorno, biblioteca e próxima semana

**Files:** criar `src/components/auth/VerificarEmail.tsx`, `src/components/billing/{OfertaAssinatura,RetornoCheckout,ContaAssinatura}.tsx`, `src/components/app/{PreviaPauta,BibliotecaPautas}.tsx`, `src/lib/client/{drafts,billing}.ts`, `src/app/app/billing/retorno/page.tsx`, `tests/subscription-journey.test.tsx`. Modificar `AppMvp.tsx`, `TelaAjustes.tsx`, `MateriaisEmpresa.tsx`, `ResumoNegocio.tsx`, `useGeracao.ts`, `Painel.tsx`, `Calendario.tsx`, `src/app/app/page.tsx`, `src/app/page.tsx` e `landing/Secoes.tsx`.

**Interfaces:** cliente exporta `saveDraft(input: {id?: string; expectedVersion: number; body: DraftBody}): Promise<Draft>`, `loadDraft(id: string): Promise<Draft>`, `startCheckout(input: {draftId: string; draftVersion: number}): Promise<CheckoutResult>`, `checkoutStatus(attemptId: string): Promise<CheckoutStatus>` e `openPortal(): Promise<{url: string}>`. Usar fetch same-origin, sem Scope/segredos enviados pelo browser. `VerificarEmail` recebe `{email, status, erro, onEnviar, onConfirmar, onVoltar}`. `RetornoCheckout` recebe `{attemptId, consultarStatus: (id:string)=>Promise<CheckoutStatus>, carregarDraft: (id:string)=>Promise<Draft>, onRetomar: (draft:Draft)=>void}`. Os callbacks de e-mail usam strings e retornam Promise<void>.

- [ ] **1. RED:** adicionar fixture `draftV3` com brand Recallo do teste existente, contexto válido e preferências mínimas; fixture de status `canceled` aponta explicitamente versão 3. Harness usa componentes reais e apenas fetch/Auth simulados.

```tsx
it('abandono permite recuperar o rascunho, sem sucesso falso', async () => {
  const onRetomar = vi.fn();
  render(<RetornoCheckout attemptId="attempt-1"
    consultarStatus={async () => canceledV3}
    carregarDraft={async () => draftV3} onRetomar={onRetomar} />);
  fireEvent.click(await screen.findByRole('button', {name:'Voltar à minha pauta'}));
  expect(onRetomar).toHaveBeenCalledWith(draftV3);
  expect(screen.queryByText('Pagamento confirmado')).toBeNull();
});
```

Segundo teste obrigatório: preencher o componente atual de onboarding, selecionar `new File([pngFixture], 'marca.png', {type:'image/png'})`, abrir/confirmar OTP e verificar campos/arquivo preservados. Importar bytes PNG válidos do helper de arquivos existente ou gerar fixture sintética no próprio teste; não usar arquivo TXT que a UI não aceita. Testar sessão expirada no envio, OTP errado e versão obsoleta em duas abas.
- [ ] **2. RED:** `npx vitest run tests/subscription-journey.test.tsx`.
- [ ] **3. Implementar:** gate de autenticação não desmonta `TelaAjustes` nem troca `key` durante OTP. Em modo test, eliminar disparos onerosos anônimos dos efeitos atuais; seleção de arquivo fica em memória até verificação. Salvar rascunho/versionamento antes de processamento e checkout; debounce de campos manuais não sobrescreve versão mais recente. Conflito 409 exige recuperar/revisar, sem overwrite silencioso.

```ts
// Somente handler do CTA explícito, nunca no efeito de aprovação do post.
const saved = await saveDraft({ id: draft.id, expectedVersion: draft.version, body });
const checkout = await startCheckout({ draftId: saved.id, draftVersion: saved.version });
window.location.assign(checkout.url);
```

Os adapters cliente não recebem Scope do navegador; o servidor o resolve. Retorno usa `attemptId` autorizado; `cancel=1` não sobrepõe pagamento já confirmado. Status pending faz polling limitado (máximo 60 s), depois oferece “Verificar novamente”, sem novo checkout automático. Alteração posterior do rascunho ou material revogado exige revisão explícita antes da geração, preservando tanto a nova versão quanto a referência da tentativa paga.

Biblioteca consulta análises privadas paginadas, recupera personalizações e habilita “Criar próxima semana” somente por ação e acesso/cota válidos. Conectar `Painel.onNova`; não gerar ao abrir histórico. Conta usa portal e mostra período/cancelamento. Sem assinatura, histórico continua exportável. Exibir aviso para arquivos transitórios perdidos em reload e para envio ao provedor de IA; extrações privadas persistidas são explicadas.

No sandbox, substituir cartões fictícios por uma oferta sintética de teste que lê preço do servidor e declara teste. Nunca mostrar nova oferta se Stripe/config estiver indisponível; manter copy beta inalterada quando modo desabilitado. Não alterar waitlist/admin/global CSS/fontes nem inventar sidebar.
- [ ] **4. GREEN:** suite completa, fluxo mobile/teclado, ausencia de redirects em aprovação, polling cancelável ao desmontar, retorno autenticado, nenhuma geração ao ler biblioteca. A página de retorno funciona mesmo após fechar/reabrir aba.
- [ ] **5. Commit:** `git commit -m "feat: connect subscription checkout to recoverable founder journey"`.

### Task 8: Aceitação integrada, documentação e handoff sem deploy

**Files:** criar `docs/CHECKOUT-SANDBOX.md`, `docs/superpowers/reports/2026-09-26-checkout-sandbox.md`; modificar `.env.example`/`package.json` apenas para comandos documentados e verificáveis. Se forem necessários scripts de teste, mantê-los em `scripts/testar-checkout-sandbox.ts`, com verificação explícita de ambiente.

**Interfaces:** consumir contratos e serviços anteriores, sem adicionar caminho de bypass administrativo. Relatório distingue unidade, banco real, navegador simulado e Stripe/SMTP externos.

- [ ] **1. Preparar matriz reproduzível:** casos da spec seção 8 mais os cinco Review Focus. Identificar projeto de teste e usuário sintético, nunca usar leads/documentos de clientes como fixtures. Se credenciais não estiverem disponíveis, registrar bloqueio do teste externo e concluir somente testes independentes.
- [ ] **2. Rodar verificação local completa e guardar resultados reais:**

```bash
npm test
npm run lint
npx tsc --noEmit
npm run build -- --webpack
git diff --check
```

- [ ] **3. Validar banco de teste:** aplicar migrations somente no banco aprovado para sandbox; executar SQL de ownership/cota/fencing em transações controladas. Provar diferença entre anon, usuário A, B e service role autorizada. Provar falha fechada se banco cair. Não declarar essas propriedades comprovadas por Vitest com fake.
- [ ] **4. Validar integração externa:** configurar apenas Price/Customer Portal/webhook de teste após acesso disponível, conferir `livemode=false`, e usar cartões oficiais de teste Stripe para aprovação, recusa e autenticação adicional. Não usar cartão real. Simular renovação com recursos de sandbox; confirmar portal, webhook fora de ordem, abandono e retorno. Nunca alterar conta live ou projeto Vercel atual para completar esta etapa.
- [ ] **5. Verificar UX:** completar jornadas com e sem site, em 360/390 px e desktop, além de teclado; salvar capturas com dados sintéticos. Conferir OTP, arquivo/rascunho, prévia, CTA, retorno, período/cota, histórico e próxima semana manual. Se a qualidade de conteúdo depender de IA real, reportar validação separadamente.
- [ ] **6. Instrumentar e documentar:** eventos mínimos `preview_ready`, `checkout_started`, `subscription_activated`, `export_completed`, `next_week_requested`, sem conteúdo/e-mail; ativação emitida uma vez por evento persistido, não por visita ao retorno. Documentar configuração, migração, rollback por desligamento do sandbox, reprocessamento e limites sintéticos; não incluir segredos. Listar condições de produção da spec, todas fora da autorização atual.
- [ ] **7. Commit e review:** `git commit -m "test: verify subscription sandbox journey and document handoff"`; revisão independente da branch completa, corrigir problemas com regressão antes de declarar conclusão. Não fazer push, PR ou deploy sem pedido posterior para esta entrega.

## Cobertura da especificação e execução

Seções 1–3: constraints e Tarefas 1/7/8; seção 4: 1/2/4; seção 5: 3/4; seção 6: 5/6/7; seção 7: configuração desabilitada por padrão, tabelas privadas separadas e Tarefa 8; seção 8: testes de cada tarefa e aceitação integrada. Plano não inclui validação comercial nem pesquisa de preços.

**Forma escolhida pelo usuário:** implementação por subagentes, com um implementador e um revisor independente por tarefa, seguida de revisão integrada. Não executar tarefas dependentes em paralelo; paralelizar só trabalhos com contratos estáveis e arquivos distintos. Reutilizar Astra Ultra na revisão técnica de segurança/cobrança conforme autorização do usuário. O método já foi aprovado; falta a revisão deste plano escrito antes de iniciar a execução.

Referências: [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/nextjs), [Stripe Checkout](https://docs.stripe.com/payments/checkout/build-subscriptions), [webhooks](https://docs.stripe.com/webhooks), [testes Stripe](https://docs.stripe.com/testing). Durante execução, conferir SDK/API version e guias Next instalados antes de copiar exemplos.
