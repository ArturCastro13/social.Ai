# Deploy

## Backend de assinatura: não ativar em produção

O backend Stripe desta branch é **somente sandbox**. Preservar
`BILLING_MODE=disabled` por padrão. O merge não ativa cobrança nem altera as
telas atuais; integração de rotas/telas depende do redesenho e de outro PR.
Não alterar variáveis Vercel nem aplicar SQL remoto como parte deste PR.

O schema legado continua em `supabase/schema.sql`. Para a assinatura, usar
as migrations aditivas de `supabase/migrations/`, em ordem lexicográfica,
**uma vez cada**, no SQL Editor de um projeto Supabase de teste, após revisão
do Bruno. Registrar quais foram aplicadas. Elas não são substituídas pela
reexecução do schema legado e não são idempotentes por padrão; não reaplicar
nem remover tabelas para contornar um erro. Não há aplicação automática no
build. Em caso de falha, inspecionar o estado antes de qualquer nova execução.

Executar os arquivos de `supabase/tests/` apenas em banco descartável; usam
usuários sintéticos e verificações de privilégios. A receita de concorrência
exige duas conexões PostgreSQL reais. Seguir [CHECKOUT-SANDBOX.md](docs/CHECKOUT-SANDBOX.md)
para Auth por código, segredos locais, Stripe CLI e cartões de teste.

As instruções legadas de publicação abaixo não autorizam habilitar cobrança
real. O fallback `.data/`/demo descrito para o produto antigo não se aplica ao
backend de assinatura, que falha fechado quando uma dependência não responde.

Produção: **https://social-ai-beige.vercel.app** (projeto `social-ai` na conta `bruno-dotcom12`, ligado a esta pasta por `.vercel/`).

## Publicar uma nova versão

```bash
vercel deploy --prod --yes
```

O `vercel.json` fixa o framework como Next.js. Sem ele, a Vercel criou o projeto com o preset "Other" e tudo respondia 404; não remova.

## Ligar a IA (Gemini, cota gratuita)

1. Gere a chave em https://aistudio.google.com/apikey.
2. Cadastre na Vercel e publique de novo:

```bash
vercel env add GEMINI_API_KEY production     # cola a chave quando pedir
vercel env add LLM_PROVIDER production       # digite: gemini
vercel deploy --prod --yes
```

Para usar Claude em vez de Gemini: `vercel env add ANTHROPIC_API_KEY production`, `LLM_PROVIDER=claude` e, se quiser gastar menos, `ANTHROPIC_MODEL=claude-haiku-4-5`.

Localmente, coloque as mesmas variáveis em `.env.local` (esse arquivo já existe, criado pela Vercel CLI; só acrescente as linhas).

## Supabase (Vercel Marketplace)

O banco vem da integração do Supabase na Vercel Marketplace, ligada ao projeto `social-ai`. A integração cadastrou sozinha as variáveis em production, preview e development: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (as duas que o app lê, em `src/lib/store/index.ts`), `NEXT_PUBLIC_SUPABASE_ANON_KEY` e as outras `SUPABASE_*` e `POSTGRES_*`. O `supabase/schema.sql` já foi aplicado.

- **Abrir o painel do Supabase:** no painel da Vercel, projeto `social-ai`, aba Storage, abra o banco do Supabase e use o botão que leva ao painel do Supabase.
- **Mudou o schema:** cole o `supabase/schema.sql` inteiro no SQL Editor do Supabase e rode. Ele usa `if not exists` e `add column if not exists`, então só cria o que falta.
- **Rodar local com o banco de verdade:** `vercel env pull .env.local` traz as variáveis de development. Sem elas, o app grava em `.data/`.
- As variáveis do Supabase são gerenciadas pela integração. Para trocar de banco, mexa na integração, não nas variáveis.

A base de virais do repositório não precisa ser migrada: o motor junta arquivo e banco. Itens salvos em `/admin/virais` vão para o banco.

## Ver as inscrições da lista de espera

1. Abra `https://social-ai-beige.vercel.app/admin/lista-de-espera` e digite a senha do time (`ADMIN_PASSWORD`). O navegador guarda a senha para a próxima visita; "Sair" apaga.
2. A página mostra o total, as de hoje, as dos últimos 7 dias e quantas repetem o mesmo e-mail, com busca e atualização a cada 30 segundos. "Baixar CSV" exporta empresa, e-mail e data.
3. Direto no banco: no painel do Supabase, Table Editor, tabela `leads`, filtro `origem` igual a `lista-de-espera`.

Inscrições repetidas não são juntadas e ninguém recebe e-mail de confirmação (ver `WAITLIST.md`).

## Trocar a senha do admin (`ADMIN_PASSWORD`)

A senha está em production e preview. Nunca escreva o valor em arquivo do repositório, em commit ou em mensagem de chat. Para trocar:

```bash
vercel env rm ADMIN_PASSWORD production --yes
vercel env add ADMIN_PASSWORD production      # digite a senha nova quando pedir
vercel env rm ADMIN_PASSWORD preview --yes
vercel env add ADMIN_PASSWORD preview         # a mesma ou outra, também só no prompt
vercel deploy --prod --yes
```

A senha nova só vale depois do deploy: a variável é lida quando a função sobe. Quem tinha a senha antiga salva no navegador cai de volta na tela de senha e precisa digitar a nova. Localmente, sem `ADMIN_PASSWORD` no `.env.local`, o admin abre sem senha; na Vercel, sem a variável, ele fica fechado.

## Plano B no palco

Se a internet ou a cota da IA falharem, ligue o modo demo e publique:

```bash
vercel env add DEMO_MODE production   # digite: 1
vercel deploy --prod --yes
```

Com `DEMO_MODE=1`, Cora, Pipefy e Sallve continuam idênticos e qualquer outra URL passa pelo motor local, sem IA. Para desligar: `vercel env rm DEMO_MODE production` e publique de novo.

## Conferir que está tudo de pé

```bash
B=https://social-ai-beige.vercel.app
curl -s -o /dev/null -w "%{http_code}\n" $B/
curl -s $B/api/demo
curl -s "$B/api/radar?nicho=fintech" | head -c 300
curl -s "$B/api/feedback?dominio=cora.com.br"
curl -s -o /dev/null -w "%{http_code} %{content_type}\n" "$B/api/render/cora-p1"
curl -s -X POST $B/api/analyze -H 'content-type: application/json' -d '{"url":"rdstation.com","quantidade":3}' | head -c 300
```
