# Deploy

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

## Ligar o Supabase

Sem Supabase a produção grava leads, entrevistas, análises, decisões do baralho e métricas informadas em `/tmp` da função, que some a cada novo deploy ou quando a função esfria. Para o dia do hackathon, ligue o Supabase logo cedo:

1. Crie um projeto em https://supabase.com (região São Paulo).
2. Em SQL Editor, cole e rode o arquivo `supabase/schema.sql` inteiro. Se o banco já existia, rode de novo: o arquivo usa `if not exists` e cria só o que falta, como as tabelas `feedback` (ideias aprovadas ou puladas) e `metricas` (resultados informados dos posts).
3. Em Project Settings, API, copie a URL, a anon key e a service_role key.
4. Cadastre e publique:

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add ADMIN_PASSWORD production      # senha simples para /admin
vercel deploy --prod --yes
```

5. Para subir a base de virais do repositório para o Supabase, abra `/admin/virais` e salve os itens que editar; o motor já junta arquivo e banco automaticamente, então não é obrigatório migrar tudo.

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
