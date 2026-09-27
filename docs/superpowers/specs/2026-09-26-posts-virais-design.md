# Posts virais e bonitos: design

Aprovado pelo founder em 26/09/2026. Substitui o visual dos posts, a espera da geração e a forma como a IA aprende o que viraliza.

## Problema

- A arte é chapada: fundo de uma cor, texto preto e aspas gigantes. O `[PREENCHER]` aparece dentro da imagem.
- Os posts não têm cara de viral. A base tem 74 posts fixos, 15 por nicho, e cobre só 5 nichos.
- A geração leva uns 2 minutos com a tela parada em "Escrevendo estratégia e 6 ideias de post".

## Decisões do founder

| Pergunta | Decisão |
|---|---|
| Estilo visual | Carrossel de creator (tipografia gigante, frase-chave marcada, autor no topo) |
| Imagem de IA | Na capa, automática em todos os carrosséis |
| Como achar o que viraliza | Biblioteca grande por nicho e pesquisa ao vivo dos virais do nicho do cliente |
| Nichos | Os 5 atuais mais marketing e agências, serviços e negócio local, IA e tech para devs |
| Espera | Ver os posts nascendo na tela, na velocidade atual, sem custo extra |
| Entrega | Completa, publicada uma vez só, depois de auditada |
| Orçamento de teste | Até US$ 2 da chave do amigo |
| Referências visuais | Carrosséis dos creators que mais crescem no LinkedIn e no Instagram |

## Divisão entre as IAs

O Claude pensa e escreve, inclusive o prompt de cada imagem. A OpenAI só desenha.

| IA | Faz | Recurso usado |
|---|---|---|
| Claude Sonnet 5 | Pesquisa (concorrentes, em alta, virais do nicho), posts, roteiros e a direção de arte de cada capa | Busca na web, streaming, esforço baixo. A direção de arte sai na mesma chamada dos posts |
| Claude Haiku 4.5 | Tarefas curtas; confere cada capa pronta com visão | Visão barata |
| OpenAI gpt-image-2 | A imagem da capa, sem nenhum texto | Qualidade média, 1024x1536, JPEG |

Economia: as instruções fixas do motor (cerca de 5 mil tokens) vão com cache de prompt de 5 minutos, que barateia as análises seguidas de uma demo; pesquisa, análise e capas ficam guardadas, e repetir um site não paga de novo.

## Arquitetura

### 1. Biblioteca de virais, 8 nichos

- Arquivos em `data/virais/<nicho>/itens.json`, 60 itens por nicho, cerca de 480 no total. Nos nichos novos, pelo menos 40 conferidos na fonte; nos antigos, pelo menos 30 dos itens novos.
- Nichos novos: `marketing-agencias`, `servicos-locais`, `ia-dev`. Entram no tipo `Nicho`, em `NICHOS`, nos esquemas (virais, pesquisa de mercado, contexto confirmado), nas palavras-chave do palpite de nicho, no mapa do motor, nos temas locais, na direção de imagem e no admin de virais.
- `npm run virais:catalogo` recalcula os padrões.
- O motor passa a receber os 12 melhores exemplos do nicho, com gancho literal e estrutura, priorizando verificados e carrosséis.

### 2. Pesquisa ao vivo com 4 buscas

- A pesquisa de mercado ganha uma quarta busca: posts de alto engajamento sobre o tema do cliente nos últimos 12 meses.
- Resultado novo em `pesquisa_mercado.virais_ao_vivo`: até 6 itens com gancho, formato, rede, por que funcionou, link e métrica, esta só quando aparece na fonte.
- O motor usa os virais ao vivo junto com a biblioteca.

### 3. Motor dos posts (Sonnet 5, em streaming)

- A saída começa pelos posts; depois vêm roteiros, calendário, contexto inferido, benchmark e avisos.
- Saem do pedido à IA os campos que a tela não mostra: diagnóstico, pilares, posicionamento e papel por rede. O servidor preenche o que o esquema interno exige a partir do motor local.
- Cada post traz:
  - `padrao_viral`: o padrão adaptado e a origem (biblioteca ou ao vivo);
  - carrossel como formato principal (4 ou 5 dos 6 posts), com 5 a 7 slides na estrutura gancho, tensão, valor, prova, chamada;
  - `destaque`: o trecho do título que recebe o marca-texto;
  - `direcao_capa`: cena e estilo da imagem, em inglês, sem texto, logo nem rosto identificável.
- Continuam valendo as checagens em código: números sem fonte, formato, nomes internos, voz do founder e data de hoje.

### 4. Espera ao vivo

- `POST /api/analyze` com `stream: true` responde `application/x-ndjson`, um evento por linha:
  - `inicio`: quantos virais foram lidos, os concorrentes e os temas em alta;
  - `escrevendo`: índice e gancho do post que está sendo escrito;
  - `post`: o post completo, já checado;
  - `final`: a análise inteira, com calendário e roteiros;
  - `erro`: mensagem para a tela.
- Um leitor incremental acumula o texto do stream e solta cada objeto do array de posts assim que ele fecha. Ele conta chaves e respeita aspas; não espera o fim da resposta.
- Sem `stream`, a rota responde como hoje: o contrato do `SPEC.md` e a integração da Adapta continuam valendo.
- Demo e cache respondem no mesmo formato de eventos, então a tela é uma só.
- A tela mostra o que a pesquisa achou no topo e um cartão por post: na fila, escrevendo, pintando a capa, pronto.

### 5. Capas com IA e checagem por visão

- O cliente pede a capa assim que o evento `post` chega, no máximo 3 ao mesmo tempo.
- `/api/imagem` aceita a `direcao_capa` pronta e pula a chamada de direção de arte. Se a direção citar objeto proibido (tela legível, boleto, logo), o Haiku reescreve a cena, como hoje.
- Capa automática em todos os carrosséis e nos posts de imagem única que usam foto (citação e dado de impacto).
- Depois de gerar, o Haiku olha a imagem. Se houver letra, número, logo ou rosto em close, gera de novo uma única vez.
- Se o `gpt-image-2` aceitar imagem parcial em streaming, a capa se revela aos poucos na tela; se não aceitar, a tela mostra um brilho animado até a imagem chegar.
- Limites: `LIMITE_IMAGENS_POR_IP` passa de 10 para 30 e `LIMITE_IMAGENS_DIA`, de 60 para 150.

### 6. Visual: estilo creator em todos os templates

- Linguagem comum: fundo claro no tom da marca, faixa de cor da marca no topo, autor no topo (inicial ou logo, nome e @), título display gigante com o trecho de destaque marcado, contador com barra de progresso e chamada final escura.
- Capa: imagem de IA na metade de cima e título embaixo. Sem imagem, capa só tipográfica.
- Fonte: quando a fonte da marca é genérica (Inter, Roboto, Arial, Helvetica, fonte do sistema), o título usa uma display com personalidade escolhida pelo tom; o corpo segue a fonte da marca. As fontes ficam embutidas no servidor.
- Templates: capa, desenvolvimento (slide numerado, novo), lista, checklist, citação, dado de impacto, print de post, bastidor, antes e depois.
- `[PREENCHER]` nunca entra na arte: o trecho sai da imagem, o cartão pede para completar e a arte se atualiza quando a pessoa preenche.
- Tamanhos: 1080x1350, 1080x1080, 1200x627 e 1600x900. No horizontal, a imagem vai para a esquerda.

## Custo por site novo

| Parte | Custo |
|---|---|
| Pesquisa (Sonnet, 4 buscas) | ~US$ 0,15 a 0,20 |
| Posts e direção de arte (Sonnet, saída enxuta) | ~US$ 0,11 a 0,13 |
| Capas (6 x gpt-image-2 médio) | ~US$ 0,25 |
| Checagem das capas (Haiku, visão) | ~US$ 0,01 |
| **Total** | **~US$ 0,52 a 0,59** |

Repetir um site custa quase nada. Pior caso diário com os limites: ~US$ 6 em imagens (150) e ~US$ 20 em texto (60 análises).

## Erros e casos de borda

- Stream caiu no meio: os posts recebidos ficam; o motor local completa o resto e a tela avisa.
- Imagem falhou, foi recusada pela moderação ou passou do limite: capa tipográfica no estilo creator e botão "tentar de novo".
- Pesquisa sem virais ao vivo: o motor segue só com a biblioteca.
- Nicho sem biblioteca: o motor usa o nicho mais próximo e os virais ao vivo.

## Testes e validação

- Testes automáticos: leitor incremental do stream, sequência de eventos, checagens por post, cada template com e sem foto (e sem `[PREENCHER]`), limites, nichos novos no esquema e no catálogo, direção de capa vinda do motor.
- Revisão visual sem custo: render local das artes com análises salvas das rodadas anteriores e imagens já geradas, conferida por mim e por um auditor de design.
- Validação paga, até US$ 2: 3 análises completas reais em 3 nichos (um deles novo), com auditoria de subagentes. Depois, deploy e teste em produção reaproveitando o cache.

## Fora do escopo

- Pauta primeiro com posts em paralelo.
- A OpenAI desenhando o texto dentro da imagem.
- Publicação automática nas redes.
- Atualização automática da biblioteca de virais (candidata ao lote do Claude, 50% mais barato).
