# social.Ai

Um CMO de IA para o founder que cuida de tudo sozinho. Você cola a URL do site e os @ das redes, e o social.Ai lê a identidade visual da marca, compara com o que viraliza no seu nicho, entrega um diagnóstico com estratégia e gera posts estáticos prontos para postar, com legenda para Instagram, LinkedIn, X e Facebook e um calendário de publicação.

Projeto do Hackathon Adapta.

## Como rodar

```bash
npm install
cp .env.example .env.local   # preencha o que tiver; nada é obrigatório
npm run dev                  # http://localhost:3000
```

Sem nenhuma chave o app funciona em modo demo: as 3 empresas de exemplo já vêm processadas em `data/demo/` e qualquer outra URL passa pelo leitor de marca de verdade (que não usa API) e recebe uma estratégia montada pelo motor local de regras. Com `GEMINI_API_KEY` a estratégia e os posts passam a ser escritos pela IA, com uma única chamada por análise e cache por URL.

Para forçar o modo demo no palco, mesmo com chave configurada, use `DEMO_MODE=1`.

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
src/app/api/leads        e-mails capturados antes do download
src/app/api/validacao    respostas do formulário de dor
src/app/admin            páginas internas (virais e entrevistas)
src/lib/brand            extração de HTML, paleta e fontes
src/lib/llm              adaptador Gemini ou Claude, prompt e schema zod
src/lib/render           templates JSX das artes e contraste automático
src/lib/store            Supabase quando configurado, arquivo local quando não
data/virais              base curada de virais, uma pasta por nicho
data/demo                análises pré-processadas para o modo demo
supabase/schema.sql      tabelas do banco
```

Documentos do time: `PLANO.md` (divisão de frentes), `NOMES.md`, `SPEC.md` (contratos da API), `ADAPTA_PROMPT.md`, `PITCH.md`, `DEPLOY.md` e `STATUS.md`.
