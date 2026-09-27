# Checkout de assinatura — sandbox

## Escopo e bloqueio de produção

Este primeiro PR entrega backend: identidade por código de e-mail, workspaces,
rascunhos versionados, cotas e integração Stripe. Não ativa o checkout nas telas
nem protege as rotas legadas de geração. Essa integração aguarda o redesenho do
Bruno e um segundo PR. **Manter `BILLING_MODE=disabled` em produção.**

Não usar esta entrega para cobrar clientes reais. Preço e franquias comerciais
ainda não foram validados. Os IDs abaixo foram informados pelo responsável;
o adapter deve confirmar que pertencem ao sandbox correto.

## Ambiente local isolado

Em `.env.local`, nunca no Git:

```dotenv
BILLING_MODE=test
APP_ORIGIN=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
FREQUENCY_HMAC_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_TEST_PRICE_ID=price_1UK8zeA8V7kdEuoTxxss9Wyb
STRIPE_TEST_PORTAL_CONFIGURATION_ID=bpc_1UK99SA8V7kdEuoTBBMUMYAr
```

Use um Supabase de teste separado. `FREQUENCY_HMAC_KEY` deve ser aleatória, ter
pelo menos 32 bytes e ser estável entre instâncias; protege os identificadores
do controle de frequência. Não é chave do Stripe. Configuração ou banco ausente
falham de forma fechada: não há fallback local para dados de assinatura.

A chave Stripe deve ser própria do sandbox (`rk_test_` preferencialmente;
`sk_test_` também aceita). Não usar chave live nem compartilhar segredos no chat.
Conceder apenas as permissões necessárias aos endpoints usados: escrita em
Customers, Checkout Sessions e Customer portal; leitura em Prices, Products,
Subscriptions, Invoices e Events. A reconciliação de riscos também precisa ler
os objetos de pagamento utilizados pelo adapter. Não ampliar para acesso total
para contornar um erro de permissão.

O produto de teste é mensal em BRL, R$1,00 informado pelo responsável. O portal
deve permitir cartão, faturas e cancelamento ao fim do período, sem troca de
plano. A chave, Price e configuração do portal precisam pertencer ao mesmo
sandbox. Nunca deduzir ambiente apenas pelo prefixo de um Price ID.

## Supabase Auth e SQL

1. Bruno revisa e aplica manualmente as migrations aditivas, em ordem, conforme
   `DEPLOY.md`. Não substituir o schema legado nem executar SQL em produção.
2. Habilitar autenticação por e-mail. No template **Magic Link**, incluir
   `{{ .Token }}` para enviar o código em vez de somente um link.
3. Configurar SMTP e destinatários permitidos no projeto de teste. Configurar
   Site URL/redirects para a origem local exata. Não misturar `localhost` e
   `127.0.0.1`: cookies e validação de origem devem usar o mesmo host.
4. Configurar CAPTCHA e limites do Supabase. A API aceita `captchaToken`; o
   widget será conectado no segundo PR. Não desligar proteções de produção.
5. Testar dois usuários: cada um deve ler somente seu workspace e rascunhos.
   Testar código incorreto, expirado, reutilizado, logout e cookie persistente.

Referência: [OTP por e-mail no Supabase](https://supabase.com/docs/guides/auth/auth-email-passwordless).

## Stripe CLI e cartões de teste

Em um terminal, autenticar na conta/sandbox correto e iniciar o encaminhamento:

```bash
stripe login
stripe listen --forward-to localhost:3000/api/billing/webhook
```

Copiar o `whsec_...` exibido pelo listener para `STRIPE_WEBHOOK_SECRET` local e
reiniciar `npm run dev`. O segredo do listener não é o segredo de um endpoint
do Dashboard. Para obter o segredo via CLI, há também
`stripe listen --print-secret`. Manter o listener aberto durante o teste.

Usar somente cartões fictícios, validade futura e CVC fictício de três dígitos:

| Cenário | Cartão de teste |
| --- | --- |
| Pagamento aprovado | `4242 4242 4242 4242` |
| Saldo insuficiente | `4000 0000 0000 9995` |
| Autenticação 3DS em pagamento on-session | `4000 0025 0000 3155` |

Fonte: [cartões de teste Stripe](https://docs.stripe.com/testing), consultada em
27/09/2026. Não usar cartões reais, mesmo no sandbox.

Testar o checkout criado pela aplicação, não apenas `stripe trigger`: eventos
sintéticos genéricos não têm o vínculo de Customer/workspace/tentativa exigido.
O redirecionamento de sucesso não comprova pagamento. A confirmação exige
reconciliação autenticada e fatura válida; webhook e retorno devem convergir.

## Critérios de integração externa

- Duplo clique e repetição de requisição reutilizam a tentativa; não criam duas
  assinaturas. Mudar a versão do rascunho expira a sessão anterior; uma corrida
  com pagamento concluído não autoriza nova compra.
- Webhook repetido não duplica concessão. Evento antigo não reabre assinatura
  cancelada. Falha de banco retorna erro recuperável, nunca sucesso fictício.
- Pagamento pendente/recusado não libera cota paga. Renovação usa período da
  fatura, não soma 30 dias. Cancelamento agendado mantém apenas período pago.
- Duas assinaturas, reembolso e disputa exigem revisão do operador. Não há
  cancelamento, reembolso ou remoção automática de bloqueio de risco.
- Testar proprietário diferente, Price/Customer divergentes, assinatura de
  webhook inválida, objetos live e resposta Stripe incerta.
- Rodar os SQLs em `supabase/tests/` somente em banco descartável. O script
  `subscription_usage_concurrency.sh` exige PostgreSQL local, banco com sufixo
  `_test` ou `_disposable` e `USAGE_TEST_DISPOSABLE=YES`; valida duas conexões.

Preview protegido da Vercel não recebe necessariamente o webhook público.
Preferir o listener local; qualquer bypass exige configuração autorizada e
restrita. Não desativar a proteção do projeto para viabilizar um teste.

## Cotas, custos e próximo PR

As cotas de teste não são preços comerciais: gratuito tem 3 materiais,
2 contextos, 1 busca de concorrentes, 1 prévia e 1 imagem; pago tem 10 materiais,
10 contextos, 10 buscas, 4 semanas e 24 imagens por período reconhecido.
Há teto global de 60 operações novas/dia UTC e frequência por workspace.
Isso limita operações, **não mede tokens nem garante orçamento em dólares**.
Configurar limites de gasto nos provedores e validar custos separadamente.

No segundo PR, manter `reservarUso*` como guardas de frequência, excluir a
franquia demo por e-mail do caminho pago e nunca entregar motor local calado
como análise paga. Cache de pesquisa/imagens deve ser por workspace; acerto
válido não consome cota. Busca automática no onboarding não pode gastar a
amostra. Capas privadas exigem bucket privado e URLs assinadas, não `posts`.

## Verificação local exigida

```bash
npx vitest run
npx tsc --noEmit -p .
npx eslint
npm run build
```

Registrar resultados e pendências na descrição do PR. Testes com mocks e SQL
em memória não comprovam entrega de e-mail, configuração da conta Stripe,
RLS no projeto remoto ou concorrência real. Essas verificações externas devem
ser realizadas por Bruno no ambiente de teste antes de ativar a jornada.
