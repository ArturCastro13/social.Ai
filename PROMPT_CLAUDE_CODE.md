# Prompt para o Claude Code: MVP do "CMO de IA para founders" (Hackathon Adapta)

Repositório: https://github.com/bruno-dotcom12/social.Ai.git (clonar com `git clone https://github.com/bruno-dotcom12/social.Ai.git` e abrir o Claude Code dentro da pasta). Nome de trabalho do produto: social.Ai.

Cole tudo abaixo no Claude Code, dentro da pasta do repositório. Ele deve trabalhar etapa por etapa, commitando ao fim de cada uma, sem parar para pedir confirmação, a não ser que falte uma credencial.

---

## Contexto do produto

Estamos num hackathon patrocinado pela Adapta. Temos o dia de amanhã inteiro para construir, time de 3 programadores. O júri avalia MVP funcionando e dor validada. Entregáveis: pitch, site e MVP funcionando.

**O produto (nome provisório: social.Ai).** Um CMO de IA para founder de startup que cuida de tudo sozinho e não tem social media nem freelancer. O founder cola a URL do site e os @ das redes. O sistema:

1. Lê o site e extrai identidade visual (cores, fontes, logo, imagem de capa) e posicionamento (o que vende, para quem, tom de voz).
2. Identifica o nicho e cruza com uma base curada de posts virais daquele nicho, olhando gancho, formato, estrutura e padrão visual.
3. Entrega um diagnóstico e uma estratégia de CMO (posicionamento, público, pilares de conteúdo, o que os virais do nicho fazem que ele não faz, frequência por rede).
4. Gera N posts estáticos prontos para postar (quantidade escolhida pelo usuário), na identidade visual da marca, com legenda para Instagram, LinkedIn, X e Facebook, e um calendário de publicação.

Promessa: visualizações e branding para a marca do founder. Modelo: assinatura mensal (preço ainda aberto; no pitch usar como hipótese uma faixa bem abaixo do custo de uma social media).

**Referência de mercado que valida o modelo:** a Doxa (doxascale.com) faturou R$ 30 milhões em 2025 com mais de 1.500 clientes, analisando padrões de viralização e produzindo vídeo com avatar clonado do cliente. Nossa diferença: post estático e estratégia de CMO, sem precisar gravar nem clonar ninguém, focado no founder de startup, preço de ferramenta e não de serviço. Vídeo fica para depois.

## Restrições que mandam em todas as decisões

- **Gasto de API perto de zero.** Nada de gerar imagem com IA por padrão. As artes são renderizadas por código a partir de templates (Satori ou @vercel/og gerando PNG), com a paleta, fontes e logo da marca. IA de texto só em uma chamada por análise, com cache por URL.
- **Modo demo que nunca falha.** Precisa existir um modo offline com 3 empresas de exemplo pré-processadas (resultado salvo em JSON), para a apresentação funcionar mesmo sem internet ou sem crédito.
- **Nunca inventar métricas.** A base de virais não pode ter número de curtidas ou views inventado. Campo sem dado verificado fica vazio e marcado como "a preencher pelo time".
- **Portabilidade para a Adapta.** O regulamento provavelmente exige finalizar na plataforma da Adapta. Então o motor fica isolado como API (rotas em /api), e a interface consome essa API. Gerar ao fim um SPEC.md e um ADAPTA_PROMPT.md que permitam recriar a interface dentro da Adapta chamando a nossa API.
- **Idioma:** tudo em português do Brasil.
- **Texto da página sem cara de IA:** frases naturais, sem excesso de bullet points e sem travessões (o caractere "—" não pode aparecer em nenhuma copy).

## Stack

Next.js (App Router) com TypeScript e Tailwind, Supabase (banco e storage), deploy na Vercel. IA de texto: Gemini Flash como padrão (tem cota gratuita), com adaptador trocável para Claude via variável de ambiente. Extração de cor de imagem com node-vibrant, sem API. Renderização de arte com Satori/@vercel/og. Download dos posts em ZIP com jszip.

Variáveis de ambiente em .env.example: GEMINI_API_KEY, ANTHROPIC_API_KEY (opcional), LLM_PROVIDER, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, DEMO_MODE.

Se faltar alguma chave, não pare: implemente com o modo demo funcionando e deixe o resto pronto para ligar quando a chave chegar.

---

## Etapa 0: Planejamento e esqueleto

- Trabalhar no repositório social.Ai, fazendo push para a branch main ao fim de cada etapa.
- Criar o projeto, estrutura de pastas, .env.example, README com como rodar.
- Criar PLANO.md com a divisão em três frentes para o time amanhã: Frente A (base de virais e curadoria), Frente B (motor: leitura do site, análise, geração), Frente C (página, painel de resultado e integração com Adapta).
- Propor 5 nomes para o produto com domínio .com.br e .ai provavelmente livres (não afirmar que estão livres sem checar), em NOMES.md.
- Commit.

## Etapa 1: Leitor de marca (sem API)

Rota POST /api/brand recebendo { url, instagram?, linkedin?, x?, facebook? }.

- Baixar o HTML do site no servidor e extrair: title, meta description, og:title, og:description, og:image, favicon e apple-touch-icon, theme-color, textos de h1, h2 e parágrafos principais, links de redes sociais presentes no rodapé.
- Extrair paleta: cores do CSS (inline, tags style e até 3 folhas de estilo linkadas), ranqueadas por frequência, descartando pretos, brancos e cinzas puros para achar a cor de marca; completar com node-vibrant sobre og:image e logo.
- Extrair fontes do CSS e dos links do Google Fonts; se não achar, sugerir par de fontes do Google Fonts compatível.
- Identidade do Instagram sem API: aceitar upload opcional de um print do grid do perfil e extrair a paleta com node-vibrant no navegador. Os @ ficam salvos como contexto.
- Tratar site que bloqueia, que é SPA vazia ou que dá timeout: devolver o que conseguiu e um aviso, nunca quebrar.
- Testes com pelo menos 5 sites reais de startups brasileiras diferentes. Commit.

## Etapa 2: Base curada de virais

- Esquema em Supabase e espelho em /data/virais/*.json, uma pasta por nicho. Começar com 5 nichos de startup: SaaS B2B, fintech, healthtech, edtech e e-commerce/DTC.
- Cada item: nicho, rede, formato (carrossel, imagem única, print de tweet, citação, lista, antes e depois, dado de impacto, bastidor do founder), tipo de gancho, texto do gancho, estrutura slide a slide, padrão visual (fundo, contraste, densidade de texto, uso de rosto), por que funciona, link da fonte, métricas (vazias se não verificadas), status de verificação.
- Pesquisar na web padrões reais de posts de alto desempenho de founders e startups (LinkedIn e Instagram principalmente) e pré-preencher de 10 a 15 itens por nicho com link de fonte. Tudo que não tiver fonte fica com status "a verificar".
- Criar /data/virais/COMO_CURAR.md explicando para o time como adicionar item em 3 minutos e uma página interna /admin/virais simples para cadastrar e verificar itens.
- Extrair da base um catálogo de padrões (ganchos e formatos que se repetem), que é o que o motor usa. Commit.

## Etapa 3: Motor de análise e estratégia (uma chamada de IA)

Rota POST /api/analyze recebendo o resultado do leitor de marca, os @ e a quantidade de posts desejada.

- Classificar o nicho (a própria chamada de IA faz isso) e selecionar os padrões virais daquele nicho.
- Uma única chamada ao LLM com saída JSON validada por zod contendo: resumo do negócio, público, tom de voz, posicionamento em uma frase, 3 pilares de conteúdo, diagnóstico (o que os virais do nicho fazem que a marca ainda não faz), estratégia por rede com frequência sugerida, e os N posts. Cada post: rede principal, formato, template visual a usar, gancho, conteúdo slide a slide, legenda adaptada para Instagram, LinkedIn, X e Facebook, hashtags quando fizer sentido, e qual padrão viral inspirou o post.
- Calendário de publicação para as próximas semanas conforme a quantidade de posts.
- Cache por URL no Supabase para não pagar duas vezes pela mesma análise. Limite de uso por e-mail na demo.
- Fallback: se a IA falhar ou não houver chave, usar o modo demo. Commit.

## Etapa 4: Gerador de artes por template (sem API de imagem)

- Criar de 6 a 8 templates em JSX para Satori, cada um espelhando um formato viral da base: carrossel de lista, citação forte, dado de impacto, print estilo post de X, bastidor do founder (texto grande com foto opcional), antes e depois, checklist, capa de carrossel com gancho.
- Tamanhos: 1080x1350 (Instagram e Facebook feed), 1080x1080, 1200x627 (LinkedIn), 1600x900 (X).
- Aplicar paleta, fontes e logo da marca extraídos. Garantir contraste legível automaticamente.
- Rota /api/render/[postId] devolvendo PNG, e botão de baixar todos em ZIP.
- Permitir ao usuário trocar a cor principal e o template de cada post no painel (customização leve). Commit.

## Etapa 5: Landing page de vendas e fluxo completo

Página única em português com:

- Hero falando da dor do founder que faz tudo sozinho e não consegue cuidar do marketing, com o campo de URL e os @ logo no topo (a página é a própria demo).
- Como funciona em três passos, prova do método (análise de virais do nicho), exemplos de antes e depois gerados pelo próprio motor, comparação com contratar social media ou agência, planos como hipótese (sem checkout real, botão leva para lista de espera), FAQ.
- Tela de carregamento que mostra o que o sistema está fazendo (lendo o site, achando a paleta, comparando com virais do nicho).
- Painel de resultado: diagnóstico, estratégia, calendário e grade dos posts com download.
- Captura de e-mail antes de liberar o download, salvando no Supabase.
- Formulário curto de validação de dor (5 perguntas) oferecido depois do resultado.
- Mobile first, rápida, visual limpo e com personalidade. Commit.

## Etapa 6: Kit de validação de dor para o pitch

Gerar /validacao com:

- ROTEIRO_ENTREVISTA.md: 5 perguntas para founders no próprio hackathon (quem cuida do marketing hoje, quanto tempo por semana, o que já tentou, quanto pagaria, última vez que deixou de postar e por quê). Meta: 10 founders ouvidos amanhã.
- Tabela no Supabase e página /admin/entrevistas para o time registrar respostas pelo celular, com painel que calcula os números ao vivo para colocar no pitch.
- Commit.

## Etapa 7: Portabilidade para Adapta e material de pitch

- SPEC.md: descrição completa do produto, fluxos, contratos das APIs (entrada e saída com exemplos).
- ADAPTA_PROMPT.md: prompt pronto para colar no Adapta One recriando a interface e chamando nossa API na Vercel, e um segundo prompt para gerar os slides do pitch no gerador de slides da Adapta.
- PITCH.md: roteiro de 3 minutos (dor, prova de que a dor paga com a Doxa como referência, demo ao vivo com uma empresa real do hackathon, diferencial, modelo de assinatura, números da validação, próximo passo com vídeo).
- Commit.

## Etapa 8: Verificação final

- Rodar build, lint e testes. Rodar o fluxo completo em modo demo e com 3 sites reais.
- Revisar toda a copy procurando travessões, excesso de bullets e frases com cara de IA, e corrigir.
- Conferir que nenhuma métrica da base de virais foi inventada.
- Se houver credenciais da Vercel e do Supabase no ambiente, fazer deploy; se não, deixar DEPLOY.md com os comandos exatos.
- Escrever STATUS.md dizendo o que ficou pronto, o que ficou pendente e o que o time deve fazer primeiro de manhã. Commit final.
