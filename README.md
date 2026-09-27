# social.Ai

Seu negócio está na sua cabeça. Seu marketing não deveria estar.

O social.Ai transforma o que o founder sabe sobre o mercado, o produto e o cliente em marketing pronto. A pessoa cola a URL do site (ou clica em "Não tenho site"), responde três perguntas diretas sobre o negócio e recebe a semana: posts estáticos com arte na identidade da marca, legendas para Instagram, LinkedIn, X e Facebook, roteiros de vídeo para gravar e o dia e horário de cada um.

Projeto do Hackathon Adapta.

## Como rodar

```bash
npm install
cp .env.example .env.local   # preencha o que tiver; nada é obrigatório
npm run dev                  # http://localhost:3000
```

Sem nenhuma chave o app funciona em modo demo: as 3 empresas de exemplo já vêm processadas em `data/demo/` e qualquer outra URL passa pelo leitor de marca de verdade (que não usa API) e recebe uma estratégia montada pelo motor local de regras. Com `GEMINI_API_KEY` a estratégia e os posts passam a ser escritos pela IA, com uma única chamada por análise e cache por URL.

Para forçar o modo demo no palco, mesmo com chave configurada, use `DEMO_MODE=1`.

## Páginas

- `/`: a página inicial. O produto roda aqui: "Começar agora" abre o campo de URL, com "Não tenho site" logo abaixo, e leva para `/app`.
- `/app`: onboarding (três perguntas e ajustes) e o painel em três abas: Hoje, Calendário e Resultados.
- `/lista-de-espera`: a mesma proposta, sem o produto. Pede nome da empresa e e-mail e grava na tabela `leads` do Supabase com `origem = 'lista-de-espera'`. Ver `WAITLIST.md`.
- `/admin`: área do time, atrás de uma tela de senha (`ADMIN_PASSWORD`). `/admin/lista-de-espera` (inscrições e CSV), `/admin/entrevistas` e `/admin/virais`. Como trocar a senha está em `DEPLOY.md`.

Depois de publicar um post, o founder informa alcance, curtidas, comentários, salvos e compartilhamentos em "Já postei". Esses números voltam na próxima análise e mudam a próxima pauta. Ainda não existe leitura automática das métricas pelas APIs das redes: os números são digitados.

## Comandos

| Comando | O que faz |
| --- | --- |
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` | build de produção |
| `npm run lint` | lint |
| `npm test` | testes (vitest) |
| `npm run virais:catalogo` | recalcula o catálogo de padrões a partir de `data/virais/` |
| `npm run demo:gerar` | reprocessa as empresas de exemplo e salva em `data/demo/` |

## Estrutura

```
src/app/page.tsx              página inicial (o produto roda aqui)
src/app/app                   onboarding e painel em três abas
src/app/lista-de-espera       página da lista de espera
src/app/admin                 área do time: lista de espera, entrevistas e virais (tela de senha)
src/app/api/brand             leitor de marca (sem API de IA)
src/app/api/analyze           motor de análise e estratégia (uma chamada de IA)
src/app/api/inferir           preenche a tela de ajustes a partir do site, sem IA
src/app/api/concorrentes      sugere concorrentes e referências do nicho
src/app/api/render            artes em PNG via Satori, a partir de templates
src/app/api/feedback          decisões de aprovar e recusar e resultados de posts publicados
src/app/api/radar             frequência dos padrões e outliers do nicho na base curada
src/app/api/lista-de-espera   inscrição na lista (grava em leads, só com Supabase)
src/app/api/admin             rotas do time (senha no header x-admin-password)
src/app/api/validacao         respostas do formulário de dor (o GET alimenta o admin)
src/lib/brand                 extração de HTML, paleta e fontes
src/lib/motor                 contrato, contexto, motor local, roteiros e aprendizados
src/lib/llm                   adaptador Gemini ou Claude, prompts e schema zod
src/lib/render                templates JSX das artes e contraste automático
src/lib/store                 Supabase quando configurado, arquivo local quando não
src/components/landing        seções da home e da lista de espera, vídeos e Como funciona
src/components/onboarding     três perguntas, empresa sem site, ajustes e turbo
src/components/estudio        painel de resultado: Hoje, Calendário e Resultados
src/components/admin          tela de senha e moldura das páginas do time
data/virais                   base curada de virais, uma pasta por nicho
data/demo                     análises pré-processadas para o modo demo
supabase/schema.sql           tabelas do banco
public/exemplos               artes estáticas de exemplo (PNG)
public/video                  vídeos das páginas públicas e os pôsteres
video                         fonte em HyperFrames de demo.mp4 (16:9, 12 s)
video-vertical                fonte em HyperFrames de demo-vertical.mp4 (4:5, 12 s, para o celular)
video-fala-post               fonte em HyperFrames de fala-ao-post.mp4 (4:5, 10 s, "Da sua fala ao post pronto")
```

## Vídeos das páginas públicas

Os três são feitos com HyperFrames, sem áudio, e ficam em `public/video/`. Cada pasta tem um `BRIEF.md` com a ideia do vídeo. Para refazer, renderize o master e comprima para a web.

`demo.mp4` (16:9, 1280x720, 12 s), usado em telas a partir de 640 px:

```bash
cd video && npx hyperframes render -o renders/master.mp4
ffmpeg -y -i renders/master.mp4 -c:v libx264 -crf 27 -pix_fmt yuv420p -movflags +faststart -an ../public/video/demo.mp4
```

`demo-vertical.mp4` (4:5, 12 s), usado abaixo de 640 px. O master sai em 1080x1350 e o arquivo publicado tem 720x900:

```bash
cd video-vertical && npx hyperframes render -o renders/master.mp4
ffmpeg -y -i renders/master.mp4 -vf scale=720:900 -c:v libx264 -crf 27 -pix_fmt yuv420p -movflags +faststart -an ../public/video/demo-vertical.mp4
```

`fala-ao-post.mp4` (4:5, 10 s), o exemplo "Da sua fala ao post pronto" da home e da lista de espera. Também sai em 1080x1350 e é publicado em 720x900:

```bash
cd video-fala-post && npx hyperframes render -o renders/master.mp4
ffmpeg -y -i renders/master.mp4 -vf scale=720:900 -c:v libx264 -crf 27 -pix_fmt yuv420p -movflags +faststart -an ../public/video/fala-ao-post.mp4
```

Cada vídeo tem um pôster (`demo-poster.jpg`, `demo-vertical-poster.jpg`, `fala-ao-post-poster.jpg`), que aparece antes de tocar e com movimento reduzido. Se o vídeo mudar muito, troque o pôster por um quadro novo, no mesmo tamanho do vídeo publicado.

Documentos do time: `SPEC.md` (produto e contratos da API), `STATUS.md`, `DEPLOY.md`, `WAITLIST.md`, `PITCH.md`, `PLANO.md`, `NOMES.md` e `ADAPTA_PROMPT.md`.
