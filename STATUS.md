# Status: o que ficou pronto, o que falta e por onde começar

Última atualização: madrugada de 26/09/2026, antes do dia do hackathon.

Produção: **https://social-ai-beige.vercel.app** · Repositório: https://github.com/bruno-dotcom12/social.Ai

## Motor de distribuição, noite de 26/09/2026

Feito:
- **Sem site:** "Não tenho site" abaixo do campo leva à tela da empresa (nome, o que faz, para quem, nicho, redes com "Não tenho essa rede social", concorrentes). A marca é montada com `brandSemSite` e segue para as três perguntas e os ajustes.
- **Resultado só com a recomendação:** Sua semana (Postar e Gravar), posts prontos, vídeos para gravar e Seus resultados. Diagnóstico, estratégia, radar e baralho ficam só no motor.
- **Ações em cada post:** Aprovar, Recusar, Customizar (texto e arte), Editar no Canva (baixa a arte e abre o Canva), Já postei (métricas).
- **Motor:**
  - roteiros de vídeo em toda análise;
  - concorrentes lidos por dentro;
  - referências do nicho com o gancho real e o porquê de cada viral;
  - aprendizado com as métricas digitadas: a IA explica e aplica, o motor local reordena;
  - cache que muda com resultados novos.
- **Verificação:** lint, `tsc` e 191 testes. Fluxos sem site e demo percorridos no navegador, com aprovar e customizar.

Pendente:
- **Chaves:** `GEMINI_API_KEY` ou `ANTHROPIC_API_KEY` (o padrão `claude-opus-5` em `src/lib/llm/index.ts` não é um id válido; usar `ANTHROPIC_MODEL`), as variáveis do Supabase e `ADMIN_PASSWORD`. Ver `DEPLOY.md`.
- **Supabase:** rodar o `supabase/schema.sql` de novo; `metricas` ganhou `compartilhamentos`.
- **Vídeos no feedback:** aprovações e métricas dos vídeos ficam só no navegador, porque `/api/feedback` só aceita formatos de post estático.
- **"Desfazer":** tira a decisão só do navegador; no servidor fica a última.
- **Canva:** sem integração de verdade, precisa de app no Canva Developers.
- **Métricas das redes:** digitadas pelo founder, sem API do Instagram, LinkedIn ou X.
- **Vídeos virais:** o motor não assiste a vídeo; a base curada só tem post estático.

## Reposicionamento (PROMPT_3_REPOSICIONAR.md), tarde de 26/09/2026

Feito:
- **Onboarding:** passo "O que só você sabe" logo depois da URL: três perguntas (objeção do cliente, crença contrária, história), por texto ou voz, com "Pular por agora" sempre visível. O site é lido em segundo plano enquanto o founder responde. As respostas vão em `preferencias.conhecimento_founder` (até 600 caracteres cada) e entram no hash do cache.
- **Motor:** `conhecimento_founder` é a primeira fonte de tema no CONTEXTO e no prompt, e pelo menos metade dos posts deve nascer dele. Todo post tem `origem_tema`. Sem IA, cada resposta vira um post determinístico; nas demos, esses posts entram intercalados e a resposta continua instantânea.
- **Resultado:** bloco "Sua semana" com horário e fonte do horário, três linhas por post (Para quem, Por que funciona, Veio de), selo "da sua cabeça" e análise completa recolhida.
- **Aquisição:** campo "Para onde você quer mandar quem gostar do post?"; os posts de gerar cliente terminam com o link e o UTM da rede.
- **Landing:** hero, Como funciona, FAQ e meta a partir da nova tese; saíram Manifesto, Métricas de exemplo e o vídeo antigo.
- **Verificação:** lint, `tsc` e 168 testes passando. Fluxo completo percorrido no navegador (Playwright, desktop e celular) com cora.com.br e contaazul.com respondendo as três perguntas. Esse teste pegou e corrigiu um bug: as artes dos posts do founder na demo davam 404.

Pendente:
- **Caminho com IA:** o motor novo não foi testado com chave de verdade. A regra "pelo menos metade do founder" depende só do prompt; nada completa com posts locais se o modelo ignorar as respostas.
- **Motor local e demo:** um post por resposta, ou seja, 3 de 9 posts, não metade.
- **Post da objeção:** vai para revisão pedindo a resposta do founder, porque ele conta a dúvida mas não a resposta, e o motor não inventa uma.
- **"Sua semana":** mostra os 7 dias a partir da primeira data do calendário, em ordem cronológica, e não segunda a domingo fixos. É uma decisão: o calendário começa amanhã.
- **Vídeo da landing:** saiu porque mostrava o fluxo antigo; `public/video/demo.mp4` continua no repositório e precisa ser refeito.

## Primeira coisa de manhã (em ordem)

1. **Ligar a IA.** Hoje a produção roda sem chave: Cora, Pipefy e Sallve respondem com as análises pré-processadas e qualquer outro site passa pelo motor local, que é honesto mas genérico. Com `GEMINI_API_KEY` a estratégia e os posts passam a ser escritos pela IA. São cinco minutos; os comandos estão em `DEPLOY.md`. Depois disso, rodar 3 sites de startups presentes no evento e ler os posts gerados com olho crítico.
2. **Ligar o Supabase.** Sem ele, leads, entrevistas e respostas do formulário ficam em `/tmp` da Vercel e se perdem a cada deploy. Como as entrevistas de hoje viram os números do pitch, isso não pode ficar para depois. Passo a passo em `DEPLOY.md`.
3. **Definir `ADMIN_PASSWORD`.** Por segurança, `/admin/virais` e `/admin/entrevistas` ficam **fechados em produção** até existir a senha (localmente, com `npm run dev`, abrem sem senha). Sem isso, ninguém registra entrevista pelo celular. Comando em `DEPLOY.md`; depois é só digitar a senha no campo do topo das páginas admin.
4. **Começar as entrevistas** com `validacao/ROTEIRO_ENTREVISTA.md` e registrar em `/admin/entrevistas` pelo celular. Meta: 10 founders.
5. **Ler o regulamento** para confirmar o que precisa rodar dentro da Adapta e usar `ADAPTA_PROMPT.md`.

## O que está pronto

**Leitor de marca** (`POST /api/brand`, sem IA). Lê título, descrições, og:image, favicon, logo, theme-color, h1, h2, parágrafos e links de redes; tira a paleta do CSS (até 3 folhas) com node-vibrant no logo e na og:image; acha fontes do CSS e do Google Fonts e sugere um par quando não acha. Trata timeout, bloqueio e site em JavaScript puro sem quebrar. Testado com Nubank, Cora, Pipefy, Alice, Descomplica, Sallve, Conta Azul, Rocketseat e RD Station. O print do grid do Instagram é lido no navegador, sem subir a imagem.

**Base de virais.** 74 itens em 5 nichos (SaaS B2B 15, fintech 15, healthtech 14, edtech 15, e-commerce/DTC 15), 52 com fonte verificada e 22 marcados "a verificar". Métricas só onde a fonte mostra o número; o resto fica vazio. Conferimos por amostragem 5 números direto na fonte (posts de Paulo Silveira, Matheus Weigand, Cristina Junqueira, Kevin McDonnell e o estudo da DirectoryGems) e todos bateram. Catálogo de 37 padrões em `data/virais/catalogo.json`. Página `/admin/virais` e guia `data/virais/COMO_CURAR.md`.

**Motor** (`POST /api/analyze`). Uma chamada de IA por análise, Gemini por padrão e Claude trocável por variável; saída validada por zod, sem travessão; cache por URL; limite de 3 análises com IA por e-mail na demo; motor local como rede de segurança. Calendário das próximas semanas com um post por dia no máximo.

**Artes** (`GET /api/render/{postId}`). 8 templates em Satori (carrossel com capa, lista, citação, dado de impacto, print de post, bastidor, antes e depois, checklist), 4 tamanhos (1080x1350, 1080x1080, 1200x627, 1600x900), contraste checado automaticamente, troca de cor e de template por post, fontes embutidas para funcionar sem internet, ZIP com artes, legendas e calendário.

**Landing e painel.** Página única que é a própria demo, tela de redação mostrando as etapas reais, painel com diagnóstico, estratégia, calendário e posts, download direto. A landing tem só o campo de URL: lista de espera, captura de e-mail e formulário de dor saíram na revisão de design. Mobile first, conferida no navegador em desktop e celular.

**Ideias do dia** (ainda sem commit). No painel de resultado, as ideias viram um baralho: direita aprova, esquerda pula, também pelos botões e pelas setas do teclado. A pilha é ordenada pelo Opportunity Score (`src/lib/oportunidade.ts`), que combina força do padrão no nicho (frequência na base curada), aderência à marca (aprovações e engajamento informado, com suavização) e frescor (não repetir formato recém aprovado). Ao lado, a nota da carta do topo com os motivos em texto, cada um apoiado em número real.

**Learning loop.** Decisões e resultados vão para `POST /api/feedback` e ficam também no `localStorage` do navegador, por domínio. `GET /api/feedback?dominio=` devolve o resumo por formato. Com 4 decisões ou mais, esse resumo entra no prompt da próxima análise com IA da mesma marca (`src/lib/engine/index.ts`, `src/lib/llm/prompt.ts`).

**Métricas e radar.** O painel mostra aprovação por formato em barras, os resultados de cada post aprovado (alcance, curtidas, comentários, salvos, digitados pelo founder) e o engajamento por formato. O Radar do nicho (`GET /api/radar?nicho=`) traz a frequência dos padrões e os outliers da base curada: posts verificados, com curtidas e fonte, a partir de 1,5x a mediana do nicho. Tabelas novas `feedback` e `metricas` no `supabase/schema.sql`.

**Vídeo e artes de exemplo.** `public/video/demo.mp4` (12 s, cerca de 290 KB, sem áudio) feito com HyperFrames, com a fonte em `video/` e o comando para refazer no `README.md`. Artes estáticas de exemplo em `public/exemplos/*.png` (22 PNGs de Cora, Pipefy e Sallve). A landing usa essas artes no baralho do topo (`BaralhoHero`, que recomeça quando acaba) e nas seções de exemplo, sempre via `next/image`. O vídeo entra numa seção própria (`VideoDemo`), que só baixa e toca quando aparece na tela e não toca com movimento reduzido ativado.

**Kit de validação.** Roteiro, `/admin/entrevistas` com números do pitch ao vivo (atualiza a cada 15 segundos em todos os celulares).

**Documentos.** `SPEC.md` (contratos da API com exemplos reais), `ADAPTA_PROMPT.md` (prompt para o Skip recriar a interface chamando nossa API, e prompt para o Apresentações ONE 27 gerar os slides), `PITCH.md` (roteiro de 3 minutos com perguntas prováveis do júri), `PLANO.md`, `NOMES.md` (5 nomes com domínio .com.br e .ai checados de verdade), `DEPLOY.md`.

**Verificação.** Build de produção, lint, `tsc` e 32 testes passando. Depois das ideias do dia: lint, `tsc` e 38 testes passando (6 novos em `tests/feedback.test.ts` e `tests/oportunidade.test.ts`); o build de produção não foi rodado de novo. Fluxo completo testado em produção com 3 sites fora do demo (RD Station, Conta Azul e Alice) e pelo navegador, em desktop e celular.

**Auditorias da última fase.** Duas revisões independentes rodaram no fim da noite:
- *Copy*: tirei afirmações sem base (superlativos como "o formato que mais converte", uma anedota inventada nas legendas da Cora, um "80/20" sem fonte, o selo "mais pedido" nos planos), corrigi artigos, crase e anglicismos, e reforcei o prompt da IA para não repetir esses vícios.
- *Código e segurança*: corrigi SSRF no leitor de sites e na rota de arte (DNS checado, redirects checados salto a salto, IPv4 mapeado em IPv6), rotas admin abertas, falhas do Satori derrubando a conexão, regex que travava com CSS gigante, custo de IA sem teto (limite por e-mail e por IP registrado antes da chamada, teto diário, prazo total), calendário em UTC e o carrossel que não contava os slides ao trocar de modelo.

## O que ficou pendente

- **O caminho com IA não foi testado de ponta a ponta**, porque não havia chave. O código do Gemini e do Claude está pronto e cai para o motor local se algo falhar, mas o primeiro teste real é o item 1 da manhã. Se o Gemini devolver JSON fora do esquema com frequência, ajustar `src/lib/llm/prompt.ts`.
- **22 itens da base estão "a verificar".** Frente A do `PLANO.md`.
- **Download individual e ZIP no navegador** foram validados por script (mesmas URLs, 13 imagens da Cora e 8 de um site fora do demo). Não disparei o download de arquivo no navegador sem ninguém por perto; vale clicar uma vez de manhã.
- **O motor local escreve texto genérico** para sites fora do demo quando não há IA. Serve de rede de segurança, não é o produto.
- **Sem Supabase, uma análise feita em produção pode não ser encontrada** por `GET /api/analise/{id}` depois. A interface não depende disso: as artes vão com os dados do post na própria URL.
- **Com o Supabase ligado, rodar o `supabase/schema.sql` de novo** para criar `feedback` e `metricas`. Sem essas tabelas, `POST /api/feedback` responde 503 e o histórico fica só no navegador.
- **Velocidade de tendência** não existe no Opportunity Score. Precisa de série temporal das redes; a base curada é uma foto. Próximo passo, sem prazo.
- **Integração com as APIs do Instagram, LinkedIn e X** não existe. As métricas dos posts publicados são digitadas pelo founder. Próximo passo, sem prazo.
- **O learning loop só age em análise nova com IA.** Demo, cache de 7 dias e motor local ignoram as preferências.
- **Domínio próprio.** Nenhum nome de `NOMES.md` foi comprado.
- **Riscos residuais conhecidos:** a checagem de DNS contra SSRF acontece antes do fetch (um ataque de DNS rebinding ainda seria possível em tese); sem Supabase, os limites de uso da IA valem por instância da Vercel. Nada disso afeta a demo, mas fica anotado para depois do hackathon.

## Decisões que tomei sozinho durante a noite

- As 3 empresas do demo são Cora (fintech), Pipefy (SaaS B2B) e Sallve (DTC), escolhidas por serem nichos e paletas bem diferentes. O conteúdo delas foi escrito usando só o que aparece nos sites públicos, e a página avisa que não há vínculo com as marcas.
- Planos de hipótese: Solo R$ 49, Tração R$ 129 e Time R$ 290 por mês, com o aviso "Preços em teste. Ainda não cobramos ninguém."
- Direção visual "redação editorial": papel creme, tinta, vermelhão de pauta, Instrument Serif e Bricolage Grotesque.
- O número da Doxa (R$ 30 milhões em 2025, mais de 1.500 clientes) foi confirmado em BrazilCham e Money Report; os links estão no `PITCH.md`.
