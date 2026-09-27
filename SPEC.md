# social.Ai: especificação do produto e da API

Base de produção: `https://social-ai-beige.vercel.app`

## O produto em um parágrafo

O founder sabe mais do que ninguém sobre o próprio mercado, produto e cliente, mas esse conhecimento fica na cabeça dele e não vira marketing, porque falta tempo e estrutura. A frase das páginas públicas resume a proposta: "Seu negócio está na sua cabeça. Seu marketing não deveria estar." O social.Ai transforma o que o founder sabe em marketing pronto, sem que ele passe horas pesquisando, criando, revisando ou ensinando uma IA sobre a própria empresa. Na prática: a pessoa cola a URL do site (ou clica em "Não tenho site" e conta a empresa), responde três perguntas diretas (o problema que resolve, a dúvida que mais aparece antes da compra e o diferencial) e recebe a semana: posts estáticos com arte na identidade da marca, legendas para Instagram, LinkedIn, X e Facebook, roteiros de vídeo para gravar e o dia e horário de cada um. O painel tem três abas (Hoje, Calendário e Resultados) e aprende com as métricas que o founder digita. O modelo de negócio é assinatura mensal com preço de ferramenta.

As quatro etapas do "Como funciona" (`src/components/landing/ComoFuncionaEspera.tsx`, iguais na home e na lista de espera) e o que existe de cada uma no produto hoje:

1. **Entendemos a sua empresa.** Existe: leitura do site (`/api/brand`), empresa sem site (`brandSemSite`), as três perguntas (`conhecimento_founder`), @ das redes, brand book colado em texto e transcrição de áudio na tela opcional de turbo.
2. **Entendemos o mercado.** Existe: concorrentes sugeridos (`/api/concorrentes`), leitura da página pública dos concorrentes informados (`benchmark_concorrentes`) e a base curada de posts do nicho com fonte (`/api/radar`). Ainda não existe: monitoramento de tendências, sinais de interesse do público e leitura de vídeos virais. A base curada só tem post estático e é uma foto, não uma série no tempo.
3. **Transformamos insight em estratégia.** Existe: o motor (`/api/analyze`) define objetivo, público e ação esperada de cada post (`enderecamento`), a rede e o calendário com a fonte de cada horário.
4. **Entregamos pronto.** Existe: posts com arte na marca, legendas por rede, roteiros de vídeo, chamada final e link de destino com UTM. Em cada post, três linhas mostram **Para quem** (`enderecamento.publico` e `acao_esperada`), **Por que funciona** (`padrao_referencia`, com link para a fonte) e **Veio de** (`origem_tema`), com o selo "da sua cabeça" quando o post nasceu do que o founder contou.

## Princípios que guiam as decisões

Gasto de API perto de zero: a arte é desenhada por código (Satori), nunca por IA de imagem, e a IA de texto é chamada uma vez por análise, com cache por URL. A demo nunca quebra: três empresas vêm pré-processadas e, sem chave de IA, um motor local de regras monta a análise a partir do texto do site. Nenhuma métrica é inventada: a base de virais só tem número quando ele foi lido na fonte. O motor fica isolado em rotas `/api`, com CORS aberto, para que qualquer interface (inclusive uma recriada dentro da Adapta) consiga usar.

## Páginas públicas

**Página inicial (`/`).** Hero com a frase acima e o subtítulo "Transforme o que você sabe sobre o seu mercado, produto e cliente em marketing que gera resultado. Sem passar horas pesquisando, criando, revisando ou ensinando uma IA sobre a sua própria empresa." O botão "Começar agora" abre o campo de URL no topo (`src/components/estudio/Estudio.tsx` e `Formulario.tsx`), com "Não tenho site" logo abaixo; enviar leva para `/app`. Depois vêm a dor, o vídeo curto do produto (`VideoDemo`: `demo-vertical.mp4` 4:5 abaixo de 640 px, `demo.mp4` 16:9 acima), o Como funciona em quatro etapas que acendem com a rolagem, o exemplo "Da sua fala ao post pronto" (`VideoFalaAoPost`, loop 4:5 de `/video/fala-ao-post.mp4` com a marca fictícia Rota ERP), os planos em teste, as perguntas e a chamada final. Aqui o CTA é "Começar agora" porque o produto já roda nesta página.

**Lista de espera (`/lista-de-espera`).** Mesmo hero, mesmas quatro etapas e mesmo exemplo, sem preços e sem o campo de URL. O formulário (`FormularioEspera.tsx`) pede nome da empresa e e-mail, com o botão "Quero ser um dos primeiros a testar", e grava pela `POST /api/lista-de-espera` na tabela `leads` com `origem = 'lista-de-espera'`. A página diz que o produto está em desenvolvimento e não promete data. Detalhes em `WAITLIST.md`.

## Fluxos

**Onboarding (`/app`).** A home ou `/app` pede só a URL. Com site, a tela seguinte é o passo "O que só você sabe" (`PassoSaber.tsx`): três perguntas diretas, uma por vez, por texto ou voz, com "Pular por agora" sempre visível, enquanto o site é lido em segundo plano. Depois vem a tela de ajustes já preenchida por `/api/inferir` (público, link de destino, quem assina, redes e quantidade de posts, objetivo com botões e texto livre, concorrentes com sugestões de `/api/concorrentes`, tom, formatos, frequência e o turbo opcional com brand book, áudio e inspirações). Os links "ver exemplo" (Cora, Pipefy, Sallve) pulam o onboarding e abrem a demo direto. Enquanto espera, a tela de carregamento mostra as etapas reais (lendo o site, achando a paleta, descobrindo o nicho, comparando com a base, escrevendo, diagramando).

**Sem site.** Abaixo do campo de URL, "Não tenho site" leva a `/app?semsite=1`. Lá a pessoa conta a empresa (nome, o que faz, para quem, nicho), as redes (cada uma com "Não tenho essa rede social") e, se quiser, até 3 concorrentes. A marca é montada no navegador por `brandSemSite` (`src/lib/brand/sem-site.ts`), com endereço interno `https://sem-site.social.ai/{slug}` que nunca aparece na arte, e vai como `brand` para `/api/inferir` e `/api/analyze`. `readBrand` recusa esse endereço. O nicho escolhido (`nicho_informado`) vale mais que o palpite. Depois segue para as três perguntas e os ajustes.

**Painel em três abas** (`src/components/estudio/Painel.tsx` e `abas.tsx`; no computador as abas ficam no cabeçalho, no celular numa barra fixa embaixo).

- **Hoje** (`Hoje.tsx`): só o post do dia, o próximo pendente pela ordem do calendário, com Aprovar e Recusar numa barra fixa. Decidir passa para o seguinte. Se houver vídeo marcado para hoje ou para o mesmo dia, ele aparece junto. A aba mostra quantos posts ainda estão sem decisão.
- **Calendário** (`Calendario.tsx`): a semana (`SuaSemana.tsx`, 7 dias a partir da primeira data do calendário, com horário, rede, gancho, a fonte do horário "hipótese do nicho", "teste" ou "sua audiência" e o selo "da sua cabeça"), todos os posts e os vídeos para gravar, "Aprovar todos os pendentes", "Aprovar selecionados" e "Baixar tudo em ZIP".
- **Resultados** (`SeusResultados.tsx` e `Concorrentes.tsx`): o que foi aprovado, os números do que foi postado, o que o motor aprendeu com eles (`aprendizados`) e "Concorrentes e nicho", com o `benchmark_concorrentes` (sem número de desempenho) e os posts do nicho que passaram de 1,5x a mediana na base curada (`/api/radar`).

Em cada post há Aprovar, Recusar, Customizar (edita gancho, slides e legenda, e a arte é redesenhada), Editar no Canva (baixa a arte e abre o Canva no formato da rede; sem integração oficial) e Já postei (alcance, curtidas, comentários, salvos, compartilhamentos). Cada roteiro de vídeo (`roteiros`) traz o gancho dos 3 primeiros segundos, as cenas, a chamada final, a legenda, a dica de gravação e a agenda. Diagnóstico, estratégia e virais ficam dentro do motor e não aparecem no painel.

**Aprendizado com as métricas.** As métricas digitadas voltam no próximo CONTEXTO como `desempenho_proprio` (com gancho, formato, padrão, origem do tema, dia e horário) e `aprendizados_calculados` (`src/lib/motor/aprendizados.ts`: média por grupo comparada com a mediana do próprio founder, com "amostra pequena" abaixo de 3 posts). A IA devolve `aprendizados { funcionou, nao_funcionou, ajuste }` e aplica. Sem IA, o motor local escreve os aprendizados e reordena padrões e posts. A chave de cache ganha `#r:<hash>` dos resultados.

**Learning loop das decisões.** Cada decisão vai para `POST /api/feedback` e também fica no `localStorage` do navegador, na chave `socialai:historico:{dominio}`, para as métricas sobreviverem a uma nova análise do mesmo site. Na próxima `POST /api/analyze` com IA, o motor lê as decisões e os resultados da marca (`store.listarDecisoes` e `store.listarResultados`) e, com pelo menos 4 decisões, `textoPreferencias` (`src/lib/feedback.ts`) acrescenta ao prompt a seção "O que este founder aprovou antes", com a taxa de aprovação e o engajamento informado por formato. As demos e o cache (a mesma URL em até 7 dias) não usam esse histórico. Aprovações e métricas dos vídeos ficam só no navegador, porque `/api/feedback` aceita só formatos de post estático. Os números são digitados pelo founder: não há integração com as APIs do Instagram, do LinkedIn ou do X.

**Download.** O download é direto, sem pedir e-mail. O ZIP é montado no navegador: uma pasta por post com as imagens (uma por slide no carrossel), um `legendas.md` com as quatro legendas e a data sugerida, e um `calendario.csv` na raiz.

**Ideias do dia (fora da tela).** O baralho de arrastar (`src/components/baralho/Baralho.tsx`, montado em `src/components/estudio/IdeiasEMetricas.tsx`) e o Opportunity Score seguem no repositório, mas o painel de três abas não os usa.

**Validação de dor.** A landing não tem mais formulário de dor. `POST /api/validacao` continua aceitando respostas e o `GET` alimenta `/admin/entrevistas`.

**Área do time.** `/admin/lista-de-espera` mostra as inscrições da lista de espera (total, hoje, últimos 7 dias, e-mails únicos e repetidos), com busca, atualização a cada 30 segundos e botão para baixar CSV. `/admin/virais` cadastra e verifica itens da base. `/admin/entrevistas` registra entrevistas com founders pelo celular e calcula os números do pitch ao vivo. `/admin` redireciona para `/admin/entrevistas`. Todas as páginas passam por uma tela de senha (`PortaoAdmin.tsx`) que confere `GET /api/admin/verificar`; a senha certa fica no `localStorage` do navegador para a próxima visita. As rotas de dados exigem o header `x-admin-password` igual a `ADMIN_PASSWORD`. Sem `ADMIN_PASSWORD`, ficam abertas só em desenvolvimento local e fechadas na Vercel.

**Modo demo.** `cora.com.br`, `pipefy.com` e `sallve.com.br` respondem na hora com análises pré-processadas, com ou sem internet e com ou sem chave. `DEMO_MODE=1` desliga a IA para qualquer URL e força o motor local. Enquanto não houver `GEMINI_API_KEY` ou `ANTHROPIC_API_KEY` em produção, qualquer site fora das demos passa pelo motor local.

## Contratos da API

Todas as rotas respondem JSON (exceto a de arte, que devolve PNG), aceitam `OPTIONS` e mandam `access-control-allow-origin: *`. A exceção é `POST /api/lista-de-espera`, feita só para o formulário da própria página: não tem `OPTIONS` nem CORS aberto. Erros seguem `{ "erro": "mensagem em português", ...detalhes }` com o status HTTP adequado.

### POST /api/brand

Lê o site e devolve o perfil de marca. Não usa IA. Nunca falha por site lento ou bloqueado: devolve o que conseguiu com avisos.

Entrada:

```json
{
  "url": "cora.com.br",
  "instagram": "@cora.contapj",
  "linkedin": "linkedin.com/company/cora-contapj",
  "x": "@cora",
  "facebook": "facebook.com/cora.contapj",
  "paletaInstagram": ["#fe3e6d", "#1a1a1a"]
}
```

Só `url` é obrigatório. `paletaInstagram` são cores extraídas no navegador de um print do grid do Instagram (a interface faz isso com node-vibrant, sem enviar a imagem).

Saída (resumida):

```json
{
  "url": "https://www.cora.com.br/",
  "dominio": "cora.com.br",
  "nome": "Cora",
  "title": "Cora - Conta Digital PJ sem Taxas e com Gestão Financeira Simplificada",
  "description": "...",
  "og": { "title": "...", "description": "...", "image": "https://www.cora.com.br/assets/og-image.png" },
  "favicon": "https://www.cora.com.br/favicon.ico",
  "appleTouchIcon": null,
  "logo": "https://www.cora.com.br/assets/logo-cora.svg",
  "themeColor": null,
  "headings": { "h1": ["A Conta PJ de quem faz acontecer"], "h2": ["..."] },
  "paragrafos": ["Conta + Cartão PJ Cora sem anuidade..."],
  "redesEncontradas": { "instagram": "https://www.instagram.com/cora.contapj/", "linkedin": "..." },
  "handles": { "instagram": "@cora.contapj", "linkedin": "@cora-contapj", "facebook": "@cora.contapj" },
  "paleta": {
    "primaria": "#fe3e6d",
    "secundaria": "#007aff",
    "destaque": "#fc82a0",
    "fundo": "#ffffff",
    "texto": "#3b3b3b",
    "todas": [{ "hex": "#fe3e6d", "fonte": "css", "peso": 10 }]
  },
  "fontes": { "titulo": "Plus Jakarta Sans", "corpo": "Plus Jakarta Sans", "encontradas": ["larkenFont"], "sugeridas": true },
  "avisos": ["O site usa larkenFont, que não está no Google Fonts. Sugeri Plus Jakarta Sans como alternativa parecida."],
  "lidoEm": "2026-09-26T04:49:30.090Z"
}
```

Como a paleta é montada: cores do CSS inline, das tags `<style>` e de até três folhas de estilo, ranqueadas por frequência (variáveis com nome de marca valem mais, paletas inteiras de framework são ignoradas), pretos, brancos e cinzas separados, completadas com node-vibrant sobre o logo e a `og:image`. Fontes vêm do CSS e dos links do Google Fonts; se nenhuma for uma família do Google, sugere um par compatível.

Erros: `400` sem `url`, `422` para endereço inválido ou interno.

### POST /api/analyze

Classifica o nicho, escolhe os padrões virais do nicho e gera diagnóstico, estratégia, calendário e posts. Uma chamada de IA por análise (com uma nova tentativa só se o JSON vier inválido). Saída validada por zod e sem travessões.

Entrada:

```json
{
  "brand": { "...": "objeto devolvido por /api/brand" },
  "quantidade": 6,
  "email": "founder@startup.com.br",
  "forcarNovo": false
}
```

Também aceita `{ "url": "cora.com.br", "quantidade": 6 }` sem `brand`, e nesse caso lê a marca sozinho (útil para integrações simples). `quantidade` vai de 1 a 12. `email` é usado no limite da demo (padrão 3 análises com IA por e-mail; sem e-mail, conta por IP). `forcarNovo` ignora o cache, mas só vale com o header `x-admin-password` certo (ignorar o cache custa uma chamada de IA); sem ele, é ignorado.

Ordem de decisão: empresa de exemplo, cache da mesma URL e quantidade (7 dias), IA configurada (Gemini por padrão, Claude com `LLM_PROVIDER=claude`), motor local. Qualquer falha de IA cai para o motor local com um aviso; a rota não devolve erro por causa da IA.

Saída (resumida, exemplo real do modo demo):

```json
{
  "id": "demo-cora",
  "url": "https://www.cora.com.br/",
  "nicho": "fintech",
  "resumo_negocio": "A Cora é uma conta digital PJ sem mensalidade nem taxa de manutenção...",
  "publico": "Donos de pequenas empresas e prestadores de serviço PJ...",
  "tom_de_voz": "Corajoso, próximo e direto...",
  "posicionamento": "Para quem empreende sem departamento financeiro, a Cora é a conta PJ que cobra, recebe e organiza o dinheiro sem cobrar tarifa por isso.",
  "pilares": [{ "nome": "Dinheiro de PJ sem mistério", "descricao": "..." }],
  "diagnostico": [{ "titulo": "O nicho vence com contraste, e a Cora ainda fala baixo", "texto": "..." }],
  "estrategia": [{ "rede": "instagram", "frequencia_semanal": 3, "foco": "..." }],
  "posts": [
    {
      "id": "cora-p1",
      "rede_principal": "instagram",
      "formato": "carrossel",
      "template": "capa-gancho",
      "gancho": "Como cobrar cliente atrasado sem virar o chato",
      "slides": [
        { "titulo": "Como cobrar cliente atrasado sem virar o chato", "texto": "4 passos que funcionam para qualquer PJ" },
        { "titulo": "1. Combine antes", "texto": "Data de vencimento, multa e juros no primeiro contato..." }
      ],
      "legendas": { "instagram": "...", "linkedin": "...", "x": "...", "facebook": "..." },
      "hashtags": ["contapj", "empreendedorismo"],
      "padrao_inspirador": "carrossel--erro-comum",
      "por_que": "Ataca a dor mais emocional do PJ com um passo a passo salvável..."
    }
  ],
  "calendario": [{ "data": "2026-09-28", "dia_semana": "segunda", "horario": "19:00", "rede": "instagram", "post_id": "cora-p1" }],
  "brand": { "...": "perfil de marca usado" },
  "origem": "demo",
  "provedor": "pré-processado",
  "avisos": ["Exemplo pré-processado do modo demo, gerado a partir do site público da empresa."],
  "criadoEm": "2026-09-26T04:23:00.000Z"
}
```

`origem` pode ser `ia` (escrita agora pelo LLM), `cache`, `demo` ou `local` (motor de regras). Formatos: `carrossel`, `imagem-unica`, `print-tweet`, `citacao`, `lista`, `antes-depois`, `dado-impacto`, `bastidor-founder`. Templates: `capa-gancho`, `lista`, `citacao`, `dado-impacto`, `print-x`, `bastidor`, `antes-depois`, `checklist`.

#### Campo opcional `preferencias` (motor de posts)

`POST /api/analyze` aceita `preferencias`, o resultado das telas 1 a 3 do onboarding em camadas. Schema em `src/lib/motor/contrato.ts` (`preferenciasSchema`); tudo é opcional e tem padrão:

```json
{
  "preferencias": {
    "perfil_alvo": "founder | empresa | ambos",
    "publico_alvo": "Donos de pequenas empresas que fazem o financeiro sozinhos pelo celular",
    "founder": { "nome": "", "instagram": "", "linkedin": "", "x": "", "transcricao_audio": "" },
    "objetivos": ["autoridade_founder", "gerar_clientes"],
    "tom_de_voz": { "formal_descontraido": 0.5, "tecnico_simples": 0.5, "serio_humor": 0.3, "cauteloso_provocador": 0.4 },
    "formatos_permitidos": ["estatico", "carrossel", "noticia_comentada", "print_de_tweet", "citacao", "dado_de_impacto", "bastidor"],
    "frequencia_escolhida": "leve | constante | intenso",
    "proibicoes": ["nada de política"],
    "inspiracoes": [{ "url": "https://...", "tipo": "post | perfil | video" }],
    "conhecimento_founder": {
      "problema_cliente": "Dono de pequena empresa cobra no papel e perde dinheiro sem perceber.",
      "objecao_cliente": "Todo cliente pergunta se precisa trocar de banco para usar a conta.",
      "diferencial": "Cobrança e conta no mesmo app, com o caixa do dia no celular."
    },
    "objetivo_livre": "Fechar mais clientes pelo LinkedIn até dezembro",
    "link_destino": "https://wa.me/5511999999999",
    "concorrentes": ["https://concorrente.com.br"],
    "brand_book_texto": "",
    "noticias": [{ "titulo": "", "resumo": "", "url": "https://...", "data": "2026-09-20" }]
  }
}
```

Se vier inválido, a rota responde 400 com `erro` em português e `detalhes` no formato `preferencias.campo: motivo`. Os @ do founder vão só para o contexto do motor, não para `brand.handles`.

Com preferências e IA configurada, o motor monta o objeto CONTEXTO da Parte 2 de `PROMPT_MOTOR_POSTS.md` (`src/lib/motor/contexto.ts`: site lido sem IA, base curada do nicho, histórico de decisões e métricas digitadas, og:title e og:description das inspirações lidos em até 4 s cada) e usa o system prompt da Parte 3 (`src/lib/llm/prompt-motor.ts`). Horários de audiência e benchmarks saem sempre como `nao_disponivel`: nada é inventado. A saída do modelo passa por um schema tolerante e é convertida para o formato de sempre (`src/lib/motor/saida.ts`). Sem IA, o motor local gera candidatos a mais e filtra por formato permitido, proibições e perfil (`src/lib/motor/local-filtros.ts`). A chave de cache inclui um hash das preferências. Sem `preferencias`, o fluxo é idêntico ao anterior; o modo demo responde igual.

#### Conhecimento do founder (`conhecimento_founder`)

Respostas opcionais, até 600 caracteres cada (acima disso, 400 com "Cada resposta pode ter até 600 caracteres."), vindas do passo "O que só você sabe" (`src/components/onboarding/PassoSaber.tsx`), que aparece logo depois da URL e aproveita o tempo de leitura do site. Cada pergunta aceita texto ou voz (Web Speech API no navegador, `useDitado`), e "Pular por agora" fica sempre à vista. As três perguntas da tela:

- `problema_cliente`: o problema que a empresa resolve para o cliente.
- `objecao_cliente`: a dúvida que mais aparece antes de alguém comprar.
- `diferencial`: por que o cliente escolhe a empresa e não outra opção.

`crenca_contraria` ("O que o seu mercado acredita que você acha errado?") e `historia` ("Conta um momento da empresa que mudou como você enxerga o problema.") são da versão anterior da tela. Continuam aceitas (preferências salvas no navegador) e usadas do mesmo jeito. `CHAVES_CONHECIMENTO` lista as cinco.

No CONTEXTO do motor, `conhecimento_founder` vem logo depois de `publico_alvo`, sempre com as cinco chaves (resposta vazia vira `null`; tudo vazio vira `null`), e convive com `founder.transcricao_audio`. O system prompt põe as fontes de **tema** nesta ordem: conhecimento do founder, transcrição, site, brand book, notícias (a hierarquia de evidências para métrica e horário não muda). Com respostas, pelo menos metade dos posts nasce delas:

- problema vira post educativo de `gerar_clientes`, com gancho de erro comum ou de pergunta que descreve o problema como o cliente vive;
- objeção vira post de `gerar_clientes` com gancho de pergunta que desmonta a dúvida (sem a resposta nas fontes, `[PREENCHER: a sua resposta]` e pedido em `precisa_revisao`);
- diferencial vira antes e depois ou comparação, com o texto do founder no "depois" e a alternativa descrita de forma neutra, nunca pelo nome do concorrente;
- crença vira gancho contraintuitivo ou de polêmica; história vira bastidor.

O que o founder escreveu pode ser usado como fato; número ou cliente além disso continua proibido. Continua sendo uma chamada de IA por análise.

Sem IA (`src/lib/motor/local-founder.ts`), cada resposta vira um post determinístico, na ordem problema, objeção, diferencial, crença, história, intercalado na frente do lote (founder, outro, founder...), sem passar pelo filtro de formatos nem de proibições:

- problema: carrossel quando o texto tem de 3 a 6 frases (capa, uma frase do founder por slide, fechamento para salvar); senão imagem única (template `citacao`) com gancho de erro comum. Objetivo `gerar_clientes`.
- objeção: print de tweet com gancho de pergunta e objetivo `gerar_clientes`, marcado para o founder acrescentar a resposta.
- diferencial: com problema contado, antes e depois (antes = o problema com as palavras do founder, depois = o diferencial); sem problema, imagem única com a frase do diferencial. Objetivo `gerar_clientes`.
- crença: citação com gancho contraintuitivo. História: bastidor do founder.

O texto é a resposta do founder mais frases neutras de ligação. Os roteiros de vídeo sem IA (`src/lib/motor/roteiros-locais.ts`) preferem problema e objeção, depois a história quando existe. No vídeo do problema, a cena de "como a gente resolve" usa o diferencial do founder; sem ele, fica `[PREENCHER]` e o pedido em `precisa_revisao`. Nas demos (Cora, Pipefy, Sallve), os mesmos posts entram intercalados na análise pré-processada, que continua instantânea e offline; sem respostas, a demo fica igual.

#### Objetivo escrito pelo founder (`objetivo_livre`)

Texto opcional de até 200 caracteres, ao lado dos botões de objetivo. Vai no CONTEXTO como `objetivo_livre` (vazio vira `null`) e entra no hash de cache das preferências. O system prompt trata o texto como o objetivo nas palavras do founder: `enderecamento.objetivo` continua sendo sempre um id (sem botão escolhido, o id mais próximo do texto), e o texto orienta `acao_esperada` e `chamada_final`. Sem IA, o texto só entra no rodízio de objetivos quando aponta claramente para um id (`objetivoDoTextoLivre` em `src/lib/motor/enderecamento.ts`: pistas de um objetivo só; "contratar e vender" ou "crescer" não contam) e ainda cabe no máximo de 2; senão é ignorado.

#### Benchmark dos concorrentes (`benchmark_concorrentes`)

Quando `preferencias.concorrentes` tem links, a análise devolve `benchmark_concorrentes`: um item por concorrente com `{ url, nome, formatos, angulos, oportunidade }`. Com IA, sai da mesma chamada da análise (seção 1c do system prompt), feito só com `concorrencia[].descricao_extraida` (og:title e og:description da página pública, lidos em até 4 s). A saída passa por `limparBenchmark` (`src/lib/motor/benchmark.ts`): só concorrentes que o founder informou, na ordem dele, sem número de audiência nem frase de desempenho. Sem IA, `benchmarkLocal` monta um item por página lida: nome pelo og:title (ou domínio), `formatos` vazio, `angulos` por palavras da página (preço, rapidez, simplicidade, segurança, público específico...) e uma frase neutra de oportunidade; página que não foi lida fica de fora. A demo nunca lê concorrentes e não tem benchmark. A interface deve dizer que não há número de desempenho: as redes não liberam esses dados.

#### De onde veio o assunto (`origem_tema`)

Todo post novo traz `origem_tema`: `founder`, `site`, `noticia` ou `nicho`. A saída da IA passa por `normalizarOrigemTema` (`src/lib/motor/saida.ts`): ausente ou desconhecido vira `site`, sem derrubar a análise. O motor local marca `site` quando o modelo de post usa fato do site e `nicho` quando parte do tema do nicho. Demo e cache antigos não têm o campo; a interface mostra "seu site".

#### Link de destino com UTM (`link_destino`)

Campo opcional de uma linha na tela de ajustes: "Para onde você quer mandar quem gostar do post?". Se vier, cada legenda dos posts com `enderecamento.objetivo = "gerar_clientes"` termina com "Quer conversar sobre isso?" e o link com `utm_source={rede da legenda}&utm_medium=social&utm_campaign=socialai&utm_content={post_id}` (`src/lib/motor/link-destino.ts`). Parâmetros que o link já tinha são mantidos. No X (280) e no LinkedIn (3000), o corpo da legenda é cortado para caber, nunca o link. É idempotente e vale para IA, motor local e demo. Nenhum outro rastreamento, e a interface não promete conversão.

Campos extras na saída (todos opcionais; demo e cache antigos não têm):

- Em cada post: `trilho` (`founder` ou `empresa`), `objetivo`, `enderecamento` (ver abaixo), `formato_motor` (id do motor), `origem_tema`, `padrao_referencia` `{ nome, fonte_url }` (quando falta, é completado pelo catálogo com o nome do padrão e o link do primeiro exemplo verificado), `chamada_final`, `precisa_revisao` (lista do que conferir antes de publicar).
- Na análise: `contexto_inferido` `{ nicho, publico, tom_resumo, objetivos, confianca }`, `por_rede` `[{ rede, papel }]`, `comentario_frequencia`, `o_que_aprendi`, `perfil_alvo`, `benchmark_concorrentes` (só com concorrentes informados, ver acima).
- Em cada item do calendário: `fonte` (`sua audiência`, `hipótese do nicho` ou `teste`) quando o calendário veio do modelo. Se os slots do modelo não forem coerentes, o calendário é montado pelas janelas de sempre.

#### Objetivo endereçado (`enderecamento`)

Todo post que sai de `POST /api/analyze` (IA com ou sem preferências, motor local, demo e cache) traz `enderecamento`, para dizer quem precisa se reconhecer nele e por quê:

```json
{
  "enderecamento": {
    "objetivo": "gerar_clientes",
    "publico": "Dona de agência pequena que mistura conta pessoal e PJ",
    "gatilho_identificacao": "Ainda lidar com burocracias ou taxas escondidas",
    "acao_esperada": "Salvar o post para consultar depois e mandar para quem precisa"
  }
}
```

- `objetivo`: um id de `OBJETIVOS` (`autoridade_founder`, `gerar_clientes`, `lancar_produto`, `contratar`, `atrair_investidor`, `comunidade`).
- `publico`: recorte concreto do público-alvo (papel e situação), nunca genérico.
- `gatilho_identificacao`: a dor, o desejo ou a situação que faz essa pessoa pensar "isso sou eu", tirada do site, do brand book, da transcrição ou das notícias.
- `acao_esperada`: o que a pessoa deve fazer depois de ler.

O público-alvo vem de `preferencias.publico_alvo` (texto livre, até 300 caracteres); vazio, vale o inferido do site (`publicoAlvoDoSite`, o mesmo que `/api/inferir` devolve). Ele vai no CONTEXTO do motor como `publico_alvo` e faz parte do hash de cache das preferências. Os dois system prompts exigem `enderecamento` em todo post, com o gancho e o primeiro slide falando direto com o gatilho; no fluxo sem preferências, os objetivos alternam entre `gerar_clientes` e `autoridade_founder`.

A saída do modelo passa por um schema tolerante (`enderecamentoIASchema`): campo ausente, vazio ou inválido nunca derruba a análise. O que faltar é completado de forma determinística (`src/lib/motor/enderecamento.ts`): objetivo em rodízio pelos objetivos da preferência (sem escolha: os do perfil, ou os sugeridos pelo site), público do `publico_alvo` ou do `contexto_inferido.publico`, gatilho a partir do gancho e ação a partir da `chamada_final`, do fim da legenda ou do objetivo. Quando isso acontece com texto da IA (ou com análise antiga do cache), o post ganha `"Confirmar público deste post"` em `precisa_revisao`. No motor local e na demo, o gatilho vem das dores escritas no próprio site (frases de dor e o que vem depois de "sem ..."), com a situação do tema do nicho quando o site quase não fala de dor; esses posts não são marcados para revisão.

### POST /api/inferir

Preenche a tela 2 do onboarding a partir do site, sem IA. Entrada: `{ "brand": { "...": "objeto de /api/brand" } }` ou `{ "url": "cora.com.br" }`. Saída (`SugestoesOnboarding`, exemplo real para a Cora):

```json
{
  "nicho": "fintech",
  "publico_alvo": "Donos de pequenas empresas e MEIs que pagam tarifa no banco tradicional e cuidam do financeiro pelo celular, entre um cliente e outro.",
  "objetivos": ["gerar_clientes", "autoridade_founder"],
  "tom_de_voz": { "formal_descontraido": 0.74, "tecnico_simples": 0.75, "serio_humor": 0.26, "cauteloso_provocador": 0.36 },
  "exemplo_tom": "Olha o que mudou quando a gente simplificou esse processo.",
  "formatos": ["carrossel", "citacao", "dado_de_impacto", "bastidor"],
  "frequencia": "constante",
  "porque_frequencia": "5 posts por semana dão constância para o algoritmo e ainda cabem na rotina de um founder."
}
```

`nicho` usa os ids do app (`saas-b2b`, `fintech`, `healthtech`, `edtech`, `ecommerce-dtc`). `publico_alvo` é uma frase editável, nunca vazia: o público do tema detectado no texto do site mais os segmentos que o site cita literalmente (PMEs, MEIs, contadores, clínicas...). Objetivos por palavras do site (vagas, lançamento, B2B), no máximo 2. Réguas de tom pelo uso de "você", informalidade, exclamações e jargão técnico. Formatos pela base curada do nicho, com carrossel sempre e dado de impacto só se o site tiver número real. Frequência `constante`, ou `leve` quando o foco é autoridade e o site é enxuto. Erros: 400 para entrada inválida, 422 para endereço que não dá para ler.

### POST /api/concorrentes

Sugere até 5 concorrentes ou referências para a tela de ajustes. Entrada: `{ "brand": { "...": "objeto de /api/brand ou da empresa sem site" }, "publico": "opcional, até 300 caracteres" }`, com a mesma checagem mínima de `/api/inferir` (`brandParaInferencia`). Saída:

```json
{
  "sugestoes": [
    { "nome": "Feegow", "url": "https://feegow.com.br/", "motivo": "Software de gestão para clínicas.", "fonte": "ia" },
    { "nome": "Tatiana Pimenta (CEO e fundadora da Vittude)", "url": "https://pt.linkedin.com/posts/...", "motivo": "Referência do nicho na nossa base curada, com post verificado.", "fonte": "base_nicho" }
  ]
}
```

Com IA configurada (`src/lib/motor/concorrentes.ts`): uma chamada pequena pede empresas reais do mesmo mercado no Brasil, com o site oficial e um motivo de uma linha, só em JSON. Cada site passa pelo fetch seguro (sem rede interna, 3 s no máximo, em paralelo); site que não responde, dá 404 ou repete domínio sai, e a própria empresa nunca entra (recusa de robô, 403, conta como site que existe). Essas saem com `fonte: "ia"`. O que faltar para 5 vem da base curada do nicho (`palpiteNicho`, com o nicho informado valendo para quem não tem site): itens verificados com autor e `link_fonte`, um por autor, sem a própria marca, com `fonte: "base_nicho"`. Sem IA, com a IA fora do prazo (12 s), com erro ou sem nenhum site confirmado, a resposta é só a base. Empresas de exemplo (demo) usam só a base, na hora e sem rede. Nenhuma URL é inventada. Limite em memória por instância: `LIMITE_CONCORRENTES_POR_IP` (padrão 10) e `LIMITE_CONCORRENTES_DIA` (padrão 200) chamadas de IA por dia; passou disso, só a base. A rota nunca devolve erro por falha de IA ou de rede; 400 só para entrada inválida.

### GET /api/analise/{id}

Devolve uma análise salva (ou uma das demos, com `demo-cora`, `demo-pipefy`, `demo-sallve`). `404` se não existir; sem Supabase, análises feitas em produção podem expirar.

### GET /api/render/{postId}

Devolve o PNG da arte. Parâmetros de consulta, todos opcionais:

| Parâmetro | Valores | Padrão |
| --- | --- | --- |
| `slide` | índice do slide (carrossel) | `0` |
| `tamanho` | `feed` (1080x1350), `quadrado` (1080x1080), `linkedin` (1200x627), `x` (1600x900) | pela rede do post; carrossel sempre `feed` |
| `template` | um dos 8 templates; o conteúdo é readaptado sem IA | o do post |
| `cor` | hex da cor principal, ex. `%23ff4a1c` | a primária da marca |
| `foto` | URL de uma foto para o template `bastidor` | nenhuma |
| `d` | base64url de `{ "post": PostGerado sem legendas, "brand": perfil mínimo }` | usado quando a análise não está salva |

Exemplos: `https://social-ai-beige.vercel.app/api/render/cora-p1?slide=2`, `https://social-ai-beige.vercel.app/api/render/pipefy-p3?tamanho=x`, `https://social-ai-beige.vercel.app/api/render/sallve-p1?template=citacao&cor=%23111111`.

O contraste é garantido automaticamente: todo par texto e fundo passa por checagem WCAG e é ajustado se não passar. Fontes da marca vêm do Google Fonts; sem internet, usa as fontes embutidas.

### GET /api/demo

Lista as empresas de exemplo: `[{ "id": "demo-cora", "nome": "Cora", "url": "...", "dominio": "cora.com.br", "nicho": "fintech", "cor": "#fe3e6d", "posts": 8 }]`.

### POST /api/feedback

Registra uma decisão (aprovar ou recusar) ou o resultado de um post publicado. O campo `tipo` define o formato.

Decisão:

```json
{
  "tipo": "decisao",
  "analise_id": "demo-cora",
  "post_id": "cora-p1",
  "dominio": "cora.com.br",
  "nicho": "fintech",
  "formato": "carrossel",
  "template": "capa-gancho",
  "padrao": "carrossel--erro-comum",
  "rede": "instagram",
  "decisao": "aprovado"
}
```

`decisao` é `aprovado` ou `pulado` (o botão Recusar grava `pulado`). `nicho` e `formato` precisam ser valores conhecidos; `padrao` é opcional (padrão `""`).

Resultado:

```json
{
  "tipo": "resultado",
  "analise_id": "demo-cora",
  "post_id": "cora-p1",
  "dominio": "cora.com.br",
  "formato": "carrossel",
  "alcance": 1800,
  "curtidas": 95,
  "comentarios": 7,
  "salvamentos": 12,
  "compartilhamentos": 3
}
```

Os números são inteiros de 0 a 1 bilhão ou `null` quando o founder não informou. `compartilhamentos` é opcional (a coluna entrou depois em `metricas`). O `dominio` é guardado em minúsculas.

Saída: `{ "ok": true }`. Erros: `400` para dados inválidos, `503` quando o armazenamento falha. Com Supabase, decisões vão para a tabela `feedback` e resultados para `metricas`; sem Supabase, para `.data/` (ou `/tmp` na Vercel).

### GET /api/feedback?dominio={dominio}

Resumo por formato de uma marca. Conta só a decisão mais recente de cada post e o resultado mais recente de cada post. Formatos ordenados pela taxa de aprovação.

```json
{
  "total": 5,
  "aprovados": 3,
  "formatos": [
    { "formato": "carrossel", "aprovados": 2, "pulados": 0, "taxa": 1, "engajamento": 0.0633, "publicados": 1 },
    { "formato": "citacao", "aprovados": 1, "pulados": 2, "taxa": 0.3333, "engajamento": null, "publicados": 0 }
  ]
}
```

Exemplo ilustrativo. `taxa` e `engajamento` vão de 0 a 1. `engajamento` fica `null` quando nenhum post do formato tem alcance informado. Erro: `400` sem `dominio`.

### GET /api/radar?nicho={nicho}

Sinais do nicho na base curada (arquivo mais Supabase). Nichos: `saas-b2b`, `fintech`, `healthtech`, `edtech`, `ecommerce-dtc`.

Saída (resumida, fintech com a base atual):

```json
{
  "nicho": "fintech",
  "totalBase": 15,
  "frequencias": { "print-tweet--prova-social": 2, "carrossel--erro-comum": 1, "imagem-unica--polemica": 1 },
  "outliers": [
    {
      "id": "fintech-03",
      "gancho": "Fomos eleitos a marca de banco número 1 do mundo. E não foi por causa de anúncio.",
      "autor": "Cristina Junqueira (Nubank)",
      "rede": "linkedin",
      "formato": "imagem-unica",
      "link": "https://www.linkedin.com/posts/crisjunqueira_...",
      "curtidas": 1323,
      "multiplo": 1.64
    }
  ]
}
```

`frequencias` conta os itens do nicho por padrão (`formato--tipo_gancho`). Outlier só entra se o item está `verificado`, tem curtidas lidas na fonte e `link_fonte`. A mediana é calculada sobre esses itens, e entram os que chegam a 1,5x ela, do maior `multiplo` para o menor. Erro: `400` sem nicho válido.

### POST /api/validacao

```json
{
  "email": "founder@startup.com.br",
  "analise_id": "demo-cora",
  "respostas": {
    "quem_cuida": "Eu mesmo, sozinho",
    "horas_semana": "De 1 a 3 horas",
    "dor": "4",
    "usaria": "Sim, com pequenos ajustes",
    "pagaria": "De R$ 51 a R$ 150",
    "comentario": "..."
  }
}
```

`GET /api/validacao` (admin) lista as respostas.

### POST /api/lista-de-espera

Inscrição na lista de espera. Entrada:

```json
{ "empresa": "Rota ERP", "email": "voce@suaempresa.com", "website": "" }
```

`empresa` de 2 a 120 caracteres, `email` válido até 254 (guardado em minúsculas). `website` é um campo escondido contra robôs: se vier preenchido, a rota responde 400. Corpo acima de 2 KB responde 413.

Saída: `{ "ok": true }`. Grava em `leads` com `origem = 'lista-de-espera'`. Só confirma com Supabase configurado: sem banco, ou se a gravação falhar, responde 503 com `erro` e o formulário não mostra sucesso. Não junta inscrições repetidas e não manda e-mail de confirmação.

### Rotas de admin

Todas exigem o header `x-admin-password` igual a `ADMIN_PASSWORD` e respondem 401 com `erro` quando ele falta ou está errado. Sem `ADMIN_PASSWORD`, abrem só em desenvolvimento local.

`GET /api/admin/verificar`: `{ "ok": true }` com a senha certa. É o que a tela de senha do admin usa; cada erro espera 400 ms antes de responder.

`GET /api/admin/lista-de-espera`: inscrições da lista, mais novas primeiro, sem juntar e-mails repetidos.

```json
{
  "itens": [{ "empresa": "Rota ERP", "email": "voce@suaempresa.com", "criado_em": "2026-09-26T22:10:00.000Z" }],
  "total": 1,
  "armazenamento": "supabase",
  "persistente": true
}
```

`persistente` é `false` quando não há Supabase. Falha de leitura responde 500.

`GET` e `POST /api/admin/virais`: lista a base e o catálogo de padrões; cadastra ou atualiza um item, validado com as regras de curadoria (verificado exige fonte, métrica exige observação de onde foi lida, nenhum travessão).

`GET`, `POST` e `DELETE /api/admin/entrevistas`: lista, grava e remove entrevistas; toda resposta inclui `numeros`, os indicadores do pitch calculados só a partir do que foi registrado.

## Opportunity Score

Fora do painel atual: só o baralho de Ideias do dia (`IdeiasEMetricas.tsx`), que não está na tela, usa o score. Calculado no navegador por `pontuar` em `src/lib/oportunidade.ts`, de 0 a 100, com três sinais que o produto consegue medir hoje:

- **Força do padrão no nicho (40%).** Frequência do `padrao_inspirador` do post na base curada, relativa ao padrão mais frequente do nicho: `0,25 + 0,75 x freq / freqMax`. Sem dados do radar, fica em 0,5.
- **Aderência à marca (40%).** Aprovações do founder no mesmo formato com suavização: `(aprovados + 1) / (decisões + 2)`, que dá 50% sem histórico. Se houver resultados com alcance no formato, mistura 70% disso com 30% do engajamento informado (5% de engajamento ou mais conta como nota cheia).
- **Frescor (20%).** `1 / (1 + 0,5 x aprovações recentes do formato)`, olhando as últimas 10 decisões. Evita repetir o formato que acabou de ser aprovado.

Cada sinal gera um motivo em texto só quando há número real por trás (por exemplo, "Você aprovou 2 de 3 ideias em carrossel."). Empate no score é desfeito pelo id do post.

**Próximos passos, ainda não implementados.** Velocidade de tendência: o score não mede se um padrão está crescendo, porque para isso é preciso uma série temporal das redes, e a base curada é uma foto. Integração com as APIs do Instagram, do LinkedIn e do X: hoje as métricas dos posts publicados são digitadas pelo founder.

## Dados

Supabase, provisionado pela Vercel Marketplace (variáveis em `DEPLOY.md`) e com `supabase/schema.sql` aplicado: `virais`, `analises` (cache), `uso` (limite da demo), `leads` (as inscrições da lista de espera ficam com `origem = 'lista-de-espera'`), `validacao`, `entrevistas`, `feedback` (decisões de aprovar e recusar), `metricas` (resultados informados dos posts) e o bucket público `posts`. Sem Supabase, tudo vai para `.data/` localmente (ou para `/tmp` na Vercel, que é temporário).

Base de virais versionada em `data/virais/<nicho>/itens.json` e catálogo em `data/virais/catalogo.json` (`npm run virais:catalogo`). Demos em `data/demo/`, geradas por `npm run demo:gerar` a partir de `data/demo/conteudo/`.
