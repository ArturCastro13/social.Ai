# social.Ai

Um CMO de IA para o founder que cuida de tudo sozinho. Você cola a URL do site e os @ das redes, e o social.Ai lê a identidade visual da marca, compara com o que viraliza no seu nicho, entrega um diagnóstico com estratégia e gera posts estáticos prontos para publicar, com legenda para Instagram, LinkedIn, X e Facebook e um calendário de publicação.

Projeto do Hackathon Adapta.

## Como rodar

```bash
npm install
cp .env.example .env.local   # preencha o que tiver; nada é obrigatório
npm run dev                  # http://localhost:3000
```

Sem nenhuma chave o app funciona em modo demo: as 3 empresas de exemplo já vêm processadas em `data/demo/` e qualquer outra URL passa pelo leitor de marca de verdade (que não usa API) e recebe uma estratégia montada pelo motor local de regras. Com `GEMINI_API_KEY` a estratégia e os posts passam a ser escritos pela IA, com uma única chamada por análise e cache por URL.

Para forçar o modo demo no palco, mesmo com chave configurada, use `DEMO_MODE=1`.

## Ideias do dia e métricas

Depois da análise, o painel mostra as ideias de post em um baralho. Arraste para a direita para aprovar e para a esquerda para pular. Os botões e as setas do teclado fazem o mesmo. A pilha vem ordenada pelo Opportunity Score (`src/lib/oportunidade.ts`), que combina três sinais com pesos de 40%, 40% e 20%: força do padrão no nicho (frequência na base curada), aderência à marca (aprovações e engajamento informado, com suavização) e frescor (não repetir o formato que acabou de ser aprovado). Ao lado do baralho aparecem a nota da carta do topo, os motivos e a legenda por rede.

Cada decisão vai para `POST /api/feedback` e também fica no `localStorage` do navegador, por domínio. Com 4 decisões ou mais, o resumo entra no prompt da próxima análise da mesma marca. Depois de publicar, o founder pode informar alcance, curtidas, comentários e salvos de cada post aprovado, e o painel mostra aprovação e engajamento por formato. Ao lado fica o Radar do nicho (`GET /api/radar`), com os posts da base que passaram de 1,5x a mediana de curtidas do nicho.

Ainda não existe: velocidade de tendência (precisa de série temporal das redes) e leitura automática das métricas pelas APIs do Instagram, LinkedIn e X. Hoje os números são digitados pelo founder.

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
src/app/api/brand        leitor de marca (sem API de IA)
src/app/api/analyze      motor de análise e estratégia (uma chamada de IA)
src/app/api/render       artes em PNG via Satori, a partir de templates
src/app/api/feedback     decisões do baralho e resultados de posts publicados
src/app/api/radar        frequência dos padrões e outliers do nicho na base curada
src/app/api/validacao    respostas do formulário de dor (a landing não mostra mais o formulário; o GET alimenta o admin)
src/app/admin            páginas internas (virais e entrevistas)
src/lib/brand            extração de HTML, paleta e fontes
src/lib/llm              adaptador Gemini ou Claude, prompt e schema zod
src/lib/render           templates JSX das artes e contraste automático
src/lib/oportunidade.ts  Opportunity Score e sinais do nicho
src/lib/feedback.ts      resumo das decisões e trecho do prompt com as preferências
src/lib/store            Supabase quando configurado, arquivo local quando não
src/components/baralho   baralho de arrastar (aprovar ou pular)
src/components/estudio   painel de resultado, com ideias do dia, métricas e radar
data/virais              base curada de virais, uma pasta por nicho
data/demo                análises pré-processadas para o modo demo
supabase/schema.sql      tabelas do banco
public/exemplos          artes estáticas de exemplo (PNG) da landing, servidas via next/image
public/video             vídeo curto da landing (demo.mp4) e o pôster
video                    fonte do vídeo em HyperFrames (index.html, BRIEF.md, assets)
```

## Vídeo da landing

`public/video/demo.mp4` tem 12 segundos, cerca de 290 KB, sem áudio. Foi feito com HyperFrames e a fonte está em `video/`. Para refazer:

```bash
cd video && npx hyperframes render -o renders/master.mp4
ffmpeg -y -i renders/master.mp4 -c:v libx264 -crf 27 -pix_fmt yuv420p -movflags +faststart -an ../public/video/demo.mp4
```

Documentos do time: `PLANO.md` (divisão de frentes), `NOMES.md`, `SPEC.md` (contratos da API), `ADAPTA_PROMPT.md`, `PITCH.md`, `DEPLOY.md` e `STATUS.md`.
