# Status: o que ficou pronto, o que falta e por onde começar

Última atualização: fim da noite de 26/09/2026.

Produção: **https://social-ai-beige.vercel.app** · Repositório: https://github.com/bruno-dotcom12/social.Ai

## 26/09/2026 fim da noite: IA ligada, pesquisa de mercado e auditoria

A chave da Anthropic está na Vercel (production e preview) e o caminho com IA foi testado de ponta a ponta, inclusive em produção (Nuvemshop: leitura 2,7 s, pesquisa 22 s, posts 115 s, tudo pela IA).

Feito:
- **PR #2 do Arthur (anexos e contexto revisável)** entrou na `main`. Ajuste no fluxo dele: a busca de concorrentes voltou a sair assim que o site é lido (em segundo plano, enquanto o founder responde), porque é o que o founder pediu. Confirmar o resumo do negócio só refaz a busca quando o nicho confirmado é diferente do que a pesquisa achou. Os concorrentes achados pela IA voltaram a vir marcados.
- **Pesquisa de mercado na web** (`POST /api/concorrentes`, `src/lib/motor/concorrentes.ts`): Claude com busca na web (3 buscas) acha concorrentes reais (site conferido), o que eles publicam e o que está em alta no nicho, com a fonte. A tela mostra "Em alta no seu mercado". Vai para o motor em `preferencias.pesquisa_mercado`; pelo menos 2 posts partem de um tema em alta ligado a um fato da empresa. Fica guardada 7 dias (memória e tabela `analises`, chave `pesquisa:...`).
- **Causa das "inspirações sem nada a ver"**: o nicho vinha de contagem de palavra-chave (o próprio social.Ai virava "e-commerce") e a lista era completada com perfis da base curada. Agora o nicho vem da pesquisa ou do contexto confirmado, e perfis da base só aparecem quando não há IA.
- **Travas contra invenção** (vieram das auditorias): o leitor de site guarda provas com rótulo e depoimentos (`brand.provas`); número sem fonte sai do texto ou vira `[PREENCHER: número real]` e o post vai para revisão (`src/lib/motor/checar-numeros.ts`); markdown, "link na bio" fora do Instagram e nome técnico são tratados em código; JSON quebrado é consertado (`jsonrepair`); campo longo é aparado em vez de derrubar a análise; a IA recebe a data de hoje.
- **Modelos** (`src/lib/llm/index.ts`): pesquisa e posts com **Claude Sonnet 5** (esforço baixo); tarefas curtas com **Haiku 4.5**. Trocar sem mexer no código: `ANTHROPIC_MODEL_PESQUISA`, `ANTHROPIC_MODEL_POSTS`, `ANTHROPIC_MODEL`.
- **Custo medido**: uns US$ 0,10 a 0,15 a pesquisa e US$ 0,14 os posts, ou seja, US$ 0,25 a 0,30 por site novo. Repetir o site não paga. Limites: 3 análises por e-mail, 5 pesquisas por IP por dia, 60 análises por dia (`LIMITE_GLOBAL_DIA`).
- **`npm run ia:auditar -- <url> [saida.json] [sem-founder]`**: roda pesquisa e análise com IA para um site e salva o JSON (uns US$ 0,30).
- **Imagem do post com IA** (`POST /api/imagem`, `src/lib/imagem/`): o Claude Haiku escreve a direção de arte, a OpenAI (`gpt-image-2`, qualidade média, 1024x1536, JPEG) gera a imagem sem texto, e o template põe o texto do post por cima com a fonte e as cores da marca. Botão "Criar imagem com IA" no cartão do post (capa do carrossel, citação, dado de impacto e print de post). A imagem fica no bucket público `posts` do Supabase (`ia/<dominio>/<hash>.jpg`), e o mesmo post não gera de novo. Custo: uns US$ 0,04 por imagem, 20 a 40 s. Limites: 10 por IP e 60 por dia (`LIMITE_IMAGENS_POR_IP`, `LIMITE_IMAGENS_DIA`). Trocar modelo ou qualidade: `OPENAI_IMAGE_MODEL`, `OPENAI_IMAGE_QUALITY`. Testado em produção com a Pipefy.
- **Verificação**: lint, `tsc`, 330 testes e build de produção. Dois deploys em produção nesta noite.

Auditoria (subagentes independentes conferindo na web, nota de 0 a 10):

| Rodada | Concorrentes | Em alta | Posts | Publicável? |
|---|---|---|---|---|
| Haiku, antes das travas (Conta Azul, Alice) | 5 a 6 | 5 a 7 | 3 | Não: números e depoimentos inventados |
| Haiku, com travas | 4 a 6 | 4 a 7 | 3 a 5 | Não: inventava funcionalidade e repetia a tese |
| Sonnet 5, com travas | 4 a 6 | 5 a 7 | 5 | Metade das peças saía pronta; o resto pedia ajustes de minutos |

Pendente:
- **Limite de gasto**: definir teto mensal no Console da Anthropic e da OpenAI (a chave é de um amigo).
- **Imagens**: lista, checklist e antes e depois ainda não usam a imagem; no LinkedIn e no X (horizontal) a imagem vertical é cortada para caber. As 2 imagens de teste do desenvolvimento ficaram em `ia/teste/` no bucket.
- **Ainda não é "publicar sem olhar"**: o que mais sobra é número verdadeiro usado no contexto errado e tese repetida entre peças. Post com risco aparece marcado para revisar.

## 26/09/2026 noite

A mensagem pública mudou e foi aprovada pelo founder. Hero: "Seu negócio está na sua cabeça. Seu marketing não deveria estar." Subtítulo: "Transforme o que você sabe sobre o seu mercado, produto e cliente em marketing que gera resultado. Sem passar horas pesquisando, criando, revisando ou ensinando uma IA sobre a sua própria empresa."

Feito:
- **Lista de espera (`/lista-de-espera`):** hero novo, mobile first, formulário com nome da empresa e e-mail e o botão "Quero ser um dos primeiros a testar". Grava em `leads` com `origem = 'lista-de-espera'`. Sem preços e sem data de lançamento.
- **Como funciona em quatro etapas** (`ComoFuncionaEspera.tsx`), que acendem conforme a rolagem: Entendemos a sua empresa, Entendemos o mercado, Transformamos insight em estratégia, Entregamos pronto. O mesmo componente está na home e na lista.
- **Exemplo "Da sua fala ao post pronto":** loop 4:5 de 10 s (`public/video/fala-ao-post.mp4`, fonte em `video-fala-post/`), com a marca fictícia Rota ERP. Só toca quando aparece; com movimento reduzido, fica o pôster.
- **Home (`/`):** mesmo hero, mesmas etapas e mesmo exemplo. O CTA continua "Começar agora", porque o produto roda ali (URL ou "Não tenho site").
- **Vídeo vertical para o celular:** `public/video/demo-vertical.mp4` (4:5, 12 s, fonte em `video-vertical/`). Abaixo de 640 px a página usa essa versão; acima, o `demo.mp4` 16:9.
- **Admin da lista (`/admin/lista-de-espera`):** total, hoje, últimos 7 dias, e-mails repetidos, busca e CSV, atualizado a cada 30 s. Todas as páginas `/admin` passam por uma tela de senha que confere `GET /api/admin/verificar`.
- **Painel em três abas:** Hoje (o post do dia), Calendário (a semana, todos os posts e vídeos, aprovação em massa e ZIP) e Resultados (números, aprendizados e concorrentes e nicho).
- **Onboarding:** três perguntas diretas (`problema_cliente`, `objecao_cliente`, `diferencial`), uma por vez, com texto ou voz. Objetivo em texto livre. Concorrentes sugeridos por `/api/concorrentes`.
- **Motor:** roteiros de vídeo em toda análise e aprendizado com as métricas digitadas (a IA explica e aplica; o motor local reordena).
- **Infra:** Supabase provisionado pela Vercel Marketplace, com as variáveis em production, preview e development, e `supabase/schema.sql` aplicado. `ADMIN_PASSWORD` definido em production e preview. Com isso, os itens "variáveis do Supabase", "ADMIN_PASSWORD" e "rodar o schema de novo" da seção abaixo estão resolvidos.

Pendente:
- **Chave de IA:** ainda não há `GEMINI_API_KEY` nem `ANTHROPIC_API_KEY`. Cora, Pipefy e Sallve respondem com as demos; qualquer outro site passa pelo motor local, que é honesto mas genérico. A regra de pelo menos metade dos posts vindos do founder e as sugestões de concorrentes pela IA ainda não rodaram com chave de verdade.
- **Inscrições repetidas:** a lista não junta e-mails repetidos. Cada envio vira uma linha; o admin só mostra quantas são repetidas.
- **Sem e-mail de confirmação:** quem se inscreve vê a mensagem na página e mais nada. Também não há limite de envios por IP além do campo escondido contra robôs, nem política de privacidade publicada.
- **Canva:** sem integração oficial. "Editar no Canva" baixa a arte e abre a página de criar post do Canva (Instagram ou LinkedIn); o founder arrasta o arquivo para lá. A integração real pede um app no Canva Developers (Canva Connect API).
- **Métricas das redes:** digitadas pelo founder. Não há API do Instagram, LinkedIn, X ou TikTok.
- **Promessas da etapa "Entendemos o mercado" que ainda não existem:** a página fala em acompanhar tendências, sinais de interesse do público e os vídeos que viralizam no nicho. Hoje o motor não monitora tendências, não lê sinais de interesse e não assiste a vídeo. O que existe é a base curada de posts estáticos (uma foto, sem série no tempo), os concorrentes sugeridos e a leitura da página pública deles.
- **"Materiais" na etapa 1:** o que dá para conectar hoje é o site, os @ das redes, o brand book colado como texto e um áudio transcrito. Não há upload de arquivo.
- **Lista e home juntas:** a lista diz "Ainda não" para "Já posso usar?", e a home deixa usar agora. Quem visitar as duas vê as duas respostas. Sugestões de texto no relatório de revisão desta noite.
- **Inscrição de teste em produção:** conferir uma vez com um e-mail do time (passo em `WAITLIST.md`) e apagar a linha depois, se isso ainda não foi feito.

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

Nota da noite de 26/09: os itens 2 e 3 já foram feitos (Supabase pela Vercel Marketplace e `ADMIN_PASSWORD` em production e preview). O item 1 continua pendente.

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
