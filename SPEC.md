# social.Ai: especificação do produto e da API

Base de produção: `https://social-ai-beige.vercel.app`

## O produto em um parágrafo

Startups têm conhecimento de mercado, produto e cliente concentrado no founder, mas faltam estrutura e tempo para transformar esse conhecimento em aquisição de forma consistente. O social.Ai converte o conhecimento do founder em conteúdo de autoridade que atrai o cliente certo, usando padrões que já geraram alcance no nicho, com a pauta da semana pronta e o melhor dia e horário para cada post. Na prática: a pessoa cola a URL do site (de onde saem marca, paleta, fontes e posicionamento) e responde três perguntas curtas sobre o que só ela sabe. O sistema cruza isso com uma base curada de posts de alto desempenho do nicho e devolve a semana: posts estáticos com arte na identidade da marca, legenda para Instagram, LinkedIn, X e Facebook, e em cada post para quem ele é, qual padrão da base usou e de onde veio o assunto. O modelo de negócio é assinatura mensal com preço de ferramenta.

As quatro promessas e onde cada uma aparece no produto:

1. **Conhecimento do founder**: passo "O que só você sabe" no onboarding (`conhecimento_founder`) e selo "da sua cabeça" nos posts com `origem_tema: "founder"`.
2. **Cliente certo**: linha "Para quem" em cada post (`enderecamento.publico` e `acao_esperada`) e o link de destino com UTM nos posts de `gerar_clientes`.
3. **Padrões que já geraram alcance no nicho**: linha "Por que funciona" com o `padrao_referencia` (nome e link da fonte verificada).
4. **Pauta da semana com melhor dia e horário**: bloco "Sua semana", com a fonte de cada horário.

## Princípios que guiam as decisões

Gasto de API perto de zero: a arte é desenhada por código (Satori), nunca por IA de imagem, e a IA de texto é chamada uma vez por análise, com cache por URL. A demo nunca quebra: três empresas vêm pré-processadas e, sem chave de IA, um motor local de regras monta a análise a partir do texto do site. Nenhuma métrica é inventada: a base de virais só tem número quando ele foi lido na fonte. O motor fica isolado em rotas `/api`, com CORS aberto, para que qualquer interface (inclusive uma recriada dentro da Adapta) consiga usar.

## Fluxos

**Fluxo principal (página inicial).** O usuário digita a URL e escolhe quantos posts quer (3, 6, 9 ou 12). A interface chama `POST /api/brand`, mostra a paleta e as fontes assim que chegam, e em seguida chama `POST /api/analyze` com o perfil de marca. Enquanto espera, a tela de redação mostra as etapas reais (lendo o site, achando a paleta, descobrindo o nicho, comparando com a base, escrevendo, diagramando). Com a resposta, o painel exibe posicionamento, diagnóstico, pilares, estratégia por rede, calendário e a grade de posts. Cada post mostra a arte (`GET /api/render/{postId}`), permite trocar a cor principal e o template, e traz a legenda de cada rede com botão de copiar.

**Onboarding.** `/app` pede só a URL. A tela seguinte começa pelo passo "O que só você sabe" (três perguntas, texto ou voz, "Pular por agora" sempre visível) enquanto o site é lido em segundo plano, e depois mostra os ajustes já preenchidos (público, link de destino, quem assina, redes, objetivo, tom, formatos, frequência e o turbo opcional).

**Sua semana.** No resultado, logo abaixo do posicionamento, o bloco "Sua semana" (`src/components/estudio/SuaSemana.tsx`) mostra os 7 dias a partir da primeira data do calendário: 7 colunas no desktop, lista por dia no celular. Cada slot tem horário, rede, gancho, a etiqueta da fonte do horário ("hipótese do nicho", "teste" ou "sua audiência"; sem fonte, "hipótese do nicho") e o selo "da sua cabeça" quando o post veio do founder. Posts depois do sétimo dia ficam numa lista curta "Depois desta semana". Em cada post, três linhas fixas: **Para quem** (público e ação esperada), **Por que funciona** (padrão da base com link para a fonte) e **Veio de** ("o que você contou", "seu site", "notícia" ou "padrão do nicho"). Diagnóstico e estratégia ficam recolhidos em "Ver análise completa".

**Ideias do dia.** Logo abaixo do cabeçalho do resultado e antes do diagnóstico, as ideias de post aparecem em um baralho (`src/components/baralho/Baralho.tsx`, montado em `src/components/estudio/IdeiasEMetricas.tsx`). Arrastar para a direita aprova, para a esquerda pula. Os dois botões e as setas do teclado fazem o mesmo. A pilha é ordenada pelo Opportunity Score uma vez, com o histórico de quando a análise abriu, para que decidir uma carta não reembaralhe as outras. Ideias já decididas nesta análise não voltam. Ao lado do baralho ficam a nota da carta do topo, os motivos, o `por_que` do post e a legenda por rede com botão de copiar.

**Learning loop.** Cada decisão vai para `POST /api/feedback` e também fica no `localStorage` do navegador, na chave `socialai:historico:{dominio}`, para as métricas sobreviverem a uma nova análise do mesmo site. Na próxima `POST /api/analyze` com IA, o motor lê as decisões e os resultados da marca (`store.listarDecisoes` e `store.listarResultados`) e, com pelo menos 4 decisões, `textoPreferencias` (`src/lib/feedback.ts`) acrescenta ao prompt a seção "O que este founder aprovou antes", com a taxa de aprovação e o engajamento informado por formato. Com menos de 4 decisões, o prompt fica igual. As demos, o cache (a mesma URL em até 7 dias volta do cache, a não ser com `forcarNovo`) e o motor local não usam esse histórico.

**Métricas.** No painel, o bloco de métricas mostra ideias avaliadas, aprovadas e a taxa de aprovação, e um gráfico de barras com a aprovação por formato. Para cada post aprovado, o founder pode informar alcance, curtidas, comentários e salvos (qualquer campo pode ficar vazio). O engajamento é (curtidas + comentários + salvos) / alcance e só é calculado quando há alcance informado. Esses números são digitados pelo founder: não há integração com as APIs do Instagram, do LinkedIn ou do X.

**Radar do nicho.** Ao lado das métricas, o painel chama `GET /api/radar` e lista até 4 posts da base curada que passaram de 1,5x a mediana de curtidas do nicho, com autor, formato e link para o original.

**Download.** O download é direto, sem pedir e-mail. O ZIP é montado no navegador: uma pasta por post com as imagens (uma por slide no carrossel), um `legendas.md` com as quatro legendas e a data sugerida, e um `calendario.csv` na raiz.

**Validação de dor.** A landing não tem mais formulário. `POST /api/validacao` continua aceitando respostas e o `GET` alimenta `/admin/entrevistas`.

**Área do time.** `/admin/virais` para cadastrar e verificar itens da base. `/admin/entrevistas` para registrar entrevistas com founders pelo celular, com um painel que calcula os números do pitch ao vivo. Se `ADMIN_PASSWORD` estiver definido, essas rotas exigem o header `x-admin-password`.

**Modo demo.** `cora.com.br`, `pipefy.com` e `sallve.com.br` respondem na hora com análises pré-processadas, com ou sem internet e com ou sem chave. `DEMO_MODE=1` desliga a IA para qualquer URL e força o motor local.

## Contratos da API

Todas as rotas respondem JSON (exceto a de arte, que devolve PNG), aceitam `OPTIONS` e mandam `access-control-allow-origin: *`. Erros seguem `{ "erro": "mensagem em português", ...detalhes }` com o status HTTP adequado.

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

Também aceita `{ "url": "cora.com.br", "quantidade": 6 }` sem `brand`, e nesse caso lê a marca sozinho (útil para integrações simples). `quantidade` vai de 1 a 12. `email` é usado no limite da demo (padrão 3 análises com IA por e-mail; sem e-mail, conta por IP). `forcarNovo` ignora o cache.

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
      "objecao_cliente": "Todo cliente pergunta se precisa trocar de banco para usar a conta.",
      "crenca_contraria": "O mercado acha que PME não liga para gestão financeira. Liga, só não tem tempo.",
      "historia": "Um cliente fechou as portas com dinheiro para receber porque cobrava tudo no papel."
    },
    "link_destino": "https://wa.me/5511999999999",
    "brand_book_texto": "",
    "noticias": [{ "titulo": "", "resumo": "", "url": "https://...", "data": "2026-09-20" }]
  }
}
```

Se vier inválido, a rota responde 400 com `erro` em português e `detalhes` no formato `preferencias.campo: motivo`. Os @ do founder vão só para o contexto do motor, não para `brand.handles`.

Com preferências e IA configurada, o motor monta o objeto CONTEXTO da Parte 2 de `PROMPT_MOTOR_POSTS.md` (`src/lib/motor/contexto.ts`: site lido sem IA, base curada do nicho, histórico de decisões e métricas digitadas, og:title e og:description das inspirações lidos em até 4 s cada) e usa o system prompt da Parte 3 (`src/lib/llm/prompt-motor.ts`). Horários de audiência e benchmarks saem sempre como `nao_disponivel`: nada é inventado. A saída do modelo passa por um schema tolerante e é convertida para o formato de sempre (`src/lib/motor/saida.ts`). Sem IA, o motor local gera candidatos a mais e filtra por formato permitido, proibições e perfil (`src/lib/motor/local-filtros.ts`). A chave de cache inclui um hash das preferências. Sem `preferencias`, o fluxo é idêntico ao anterior; o modo demo responde igual.

#### Conhecimento do founder (`conhecimento_founder`)

Três respostas opcionais, até 600 caracteres cada (acima disso, 400 com "Cada resposta pode ter até 600 caracteres."), vindas do passo "O que só você sabe" (`src/components/onboarding/PassoSaber.tsx`), que aparece logo depois da URL e aproveita o tempo de leitura do site. Cada pergunta aceita texto ou voz (Web Speech API no navegador, `useDitado`), e "Pular por agora" fica sempre à vista.

- `objecao_cliente`: "Qual a objeção ou dúvida que você mais ouve do seu cliente?"
- `crenca_contraria`: "O que o seu mercado acredita que você acha errado?"
- `historia`: "Conta um momento da empresa que mudou como você enxerga o problema."

No CONTEXTO do motor, `conhecimento_founder` vem logo depois de `publico_alvo` (respostas vazias viram `null`) e convive com `founder.transcricao_audio`. O system prompt põe as fontes de **tema** nesta ordem: conhecimento do founder, transcrição, site, brand book, notícias (a hierarquia de evidências para métrica e horário não muda). Com respostas, pelo menos metade dos posts nasce delas: a objeção vira post de `gerar_clientes`, a crença vira gancho contraintuitivo ou de polêmica, a história vira bastidor. O que o founder escreveu pode ser usado como fato; número ou cliente além disso continua proibido. Continua sendo uma chamada de IA por análise.

Sem IA (`src/lib/motor/local-founder.ts`), cada resposta vira um post determinístico, intercalado na frente do lote (founder, outro, founder...), sem passar pelo filtro de formatos nem de proibições: objeção vira print de tweet com gancho de pergunta e objetivo `gerar_clientes` (marcado para o founder acrescentar a resposta), crença vira citação com gancho contraintuitivo, história vira bastidor do founder. O texto é a resposta do founder mais frases neutras de ligação. Nas demos (Cora, Pipefy, Sallve), os mesmos posts entram intercalados na análise pré-processada, que continua instantânea e offline; sem respostas, a demo fica igual.

#### De onde veio o assunto (`origem_tema`)

Todo post novo traz `origem_tema`: `founder`, `site`, `noticia` ou `nicho`. A saída da IA passa por `normalizarOrigemTema` (`src/lib/motor/saida.ts`): ausente ou desconhecido vira `site`, sem derrubar a análise. O motor local marca `site` quando o modelo de post usa fato do site e `nicho` quando parte do tema do nicho. Demo e cache antigos não têm o campo; a interface mostra "seu site".

#### Link de destino com UTM (`link_destino`)

Campo opcional de uma linha na tela de ajustes: "Para onde você quer mandar quem gostar do post?". Se vier, cada legenda dos posts com `enderecamento.objetivo = "gerar_clientes"` termina com "Quer conversar sobre isso?" e o link com `utm_source={rede da legenda}&utm_medium=social&utm_campaign=socialai&utm_content={post_id}` (`src/lib/motor/link-destino.ts`). Parâmetros que o link já tinha são mantidos. No X (280) e no LinkedIn (3000), o corpo da legenda é cortado para caber, nunca o link. É idempotente e vale para IA, motor local e demo. Nenhum outro rastreamento, e a interface não promete conversão.

Campos extras na saída (todos opcionais; demo e cache antigos não têm):

- Em cada post: `trilho` (`founder` ou `empresa`), `objetivo`, `enderecamento` (ver abaixo), `formato_motor` (id do motor), `origem_tema`, `padrao_referencia` `{ nome, fonte_url }` (quando falta, é completado pelo catálogo com o nome do padrão e o link do primeiro exemplo verificado), `chamada_final`, `precisa_revisao` (lista do que conferir antes de publicar).
- Na análise: `contexto_inferido` `{ nicho, publico, tom_resumo, objetivos, confianca }`, `por_rede` `[{ rede, papel }]`, `comentario_frequencia`, `o_que_aprendi`, `perfil_alvo`.
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

Registra uma decisão do baralho ou o resultado de um post publicado. O campo `tipo` define o formato.

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

`decisao` é `aprovado` ou `pulado`. `nicho` e `formato` precisam ser valores conhecidos; `padrao` é opcional (padrão `""`).

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
  "salvamentos": 12
}
```

Os quatro números são inteiros de 0 a 1 bilhão ou `null` quando o founder não informou. O `dominio` é guardado em minúsculas.

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

### Rotas de admin

`GET` e `POST /api/admin/virais`: lista a base e o catálogo de padrões; cadastra ou atualiza um item, validado com as regras de curadoria (verificado exige fonte, métrica exige observação de onde foi lida, nenhum travessão).

`GET`, `POST` e `DELETE /api/admin/entrevistas`: lista, grava e remove entrevistas; toda resposta inclui `numeros`, os indicadores do pitch calculados só a partir do que foi registrado.

## Opportunity Score

Calculado no navegador por `pontuar` em `src/lib/oportunidade.ts`, de 0 a 100, com três sinais que o produto consegue medir hoje:

- **Força do padrão no nicho (40%).** Frequência do `padrao_inspirador` do post na base curada, relativa ao padrão mais frequente do nicho: `0,25 + 0,75 x freq / freqMax`. Sem dados do radar, fica em 0,5.
- **Aderência à marca (40%).** Aprovações do founder no mesmo formato com suavização: `(aprovados + 1) / (decisões + 2)`, que dá 50% sem histórico. Se houver resultados com alcance no formato, mistura 70% disso com 30% do engajamento informado (5% de engajamento ou mais conta como nota cheia).
- **Frescor (20%).** `1 / (1 + 0,5 x aprovações recentes do formato)`, olhando as últimas 10 decisões. Evita repetir o formato que acabou de ser aprovado.

Cada sinal gera um motivo em texto só quando há número real por trás (por exemplo, "Você aprovou 2 de 3 ideias em carrossel."). Empate no score é desfeito pelo id do post.

**Próximos passos, ainda não implementados.** Velocidade de tendência: o score não mede se um padrão está crescendo, porque para isso é preciso uma série temporal das redes, e a base curada é uma foto. Integração com as APIs do Instagram, do LinkedIn e do X: hoje as métricas dos posts publicados são digitadas pelo founder.

## Dados

Supabase (rode `supabase/schema.sql`): `virais`, `analises` (cache), `uso` (limite da demo), `leads`, `validacao`, `entrevistas`, `feedback` (decisões do baralho), `metricas` (resultados informados dos posts) e o bucket público `posts`. Sem Supabase, tudo vai para `.data/` localmente (ou para `/tmp` na Vercel, que é temporário).

Base de virais versionada em `data/virais/<nicho>/itens.json` e catálogo em `data/virais/catalogo.json` (`npm run virais:catalogo`). Demos em `data/demo/`, geradas por `npm run demo:gerar` a partir de `data/demo/conteudo/`.
