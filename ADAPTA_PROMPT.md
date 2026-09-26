# Prompts para a Adapta

Dois prompts prontos. O primeiro recria a interface do social.Ai dentro do Adapta One usando o **Skip** (o construtor de apps da Adapta), chamando a nossa API na Vercel. O segundo gera os slides do pitch no módulo **Apresentações ONE 27**.

Antes de colar, confira se `{{BASE_URL}}` abaixo é o endereço atual do deploy. A API tem CORS aberto, então o app da Adapta pode chamar direto do navegador. Se o Skip preferir chamar por backend, use uma Edge Function como proxy; não há chave para esconder, a nossa API é pública.

---

## Prompt 1: interface no Skip

```
Crie um app web de uma página chamado "social.Ai", em português do Brasil, que é a interface de um CMO de IA para founders de startup. O app NÃO tem lógica de IA própria: ele só chama a API pública abaixo e mostra os resultados. Não invente dados; tudo que aparece na tela vem das respostas da API.

API base: {{BASE_URL}}

1) Tela inicial
- Título grande: "Você fundou uma startup, não uma agência de marketing."
- Subtítulo: "Cole o site da sua empresa. Em um minuto o social.Ai lê sua marca, compara com o que viraliza no seu nicho e te entrega diagnóstico, estratégia e posts prontos, na sua identidade visual."
- Campo de texto para a URL do site (placeholder "suaempresa.com.br"), seletor de quantidade de posts (3, 6, 9 ou 12, padrão 6) e campos opcionais para @ do Instagram, LinkedIn, X e Facebook.
- Botão "Gerar minha pauta".
- Abaixo, três botões de exemplo que preenchem a URL e já disparam a análise: "cora.com.br", "pipefy.com", "sallve.com.br".

2) Ao clicar em gerar
- Mostre uma tela de progresso com estas etapas, marcando cada uma como concluída conforme avança: "Lendo o site", "Tirando paleta, fontes e logo", "Descobrindo nicho e público", "Comparando com a base de virais", "Escrevendo estratégia e posts", "Diagramando as artes".
- Passo A: POST {{BASE_URL}}/api/brand com JSON {"url": <url>, "instagram": <opcional>, "linkedin": <opcional>, "x": <opcional>, "facebook": <opcional>}. Quando responder, mostre na tela de progresso as cores de "paleta.primaria", "paleta.secundaria", "paleta.destaque" e o nome em "nome".
- Passo B: POST {{BASE_URL}}/api/analyze com JSON {"brand": <resposta inteira do passo A>, "quantidade": <número escolhido>}. A resposta traz a análise completa.
- Se qualquer chamada devolver erro, mostre o texto do campo "erro" da resposta e volte para o formulário.

3) Tela de resultado (use os campos da resposta do /api/analyze)
- Cabeçalho: "posicionamento" em letra grande, o nicho ("nicho") e um selo com "origem" (ia = "Escrito pela IA", demo = "Exemplo pré-processado", local = "Motor local, sem IA", cache = "Análise salva"). Se "avisos" tiver itens, mostre numa caixa discreta.
- Seção Diagnóstico: "resumo_negocio", "publico", "tom_de_voz" e a lista "diagnostico" (cada item com "titulo" e "texto").
- Seção Estratégia: os 3 "pilares" em cartões (nome e descricao) e a lista "estrategia" (rede, frequencia_semanal por semana, foco).
- Seção Calendário: a lista "calendario" agrupada por semana, cada linha com data (formato dd/mm), dia_semana, horario, rede e o "gancho" do post cujo "id" é igual ao "post_id".
- Seção Posts: uma grade de cartões, um por item de "posts". Em cada cartão:
  - a imagem da arte: <img src="{{BASE_URL}}/api/render/{post.id}?tamanho=feed">. Se post.template for "capa-gancho", é um carrossel: mostre setas para trocar o slide usando o parâmetro &slide=0, 1, 2... até post.slides.length - 1.
  - IMPORTANTE: se a análise NÃO for de origem "demo", acrescente à URL da imagem o parâmetro d, que é o base64url (base64 com - no lugar de +, _ no lugar de / e sem =) do JSON {"post": <o post sem o campo legendas>, "brand": {"nome", "dominio", "url", "logo", "handles", "paleta", "fontes"} da análise}. Isso permite desenhar a arte mesmo quando a análise não ficou salva no servidor.
  - bolinhas de cor com paleta.primaria, paleta.secundaria e paleta.destaque; ao clicar, recarregue a imagem com &cor=<hex com # codificado como %23>.
  - um seletor de modelo com as opções capa-gancho, lista, citacao, dado-impacto, print-x, bastidor, antes-depois, checklist; ao trocar, recarregue a imagem com &template=<valor>.
  - o "gancho" como título, abas Instagram, LinkedIn, X e Facebook mostrando o texto de post.legendas[rede], com botão "Copiar legenda".
  - uma linha "Por que funciona:" com post.por_que.
  - botão "Baixar arte" que abre a URL da imagem em nova aba.
- Antes do primeiro download, peça o e-mail num modal e envie POST {{BASE_URL}}/api/leads com {"email": <email>, "url": <url analisada>, "empresa": brand.nome, "analise_id": id, "origem": "download"}.
- No fim do resultado, um formulário "Ajuda a gente a entender sua rotina?" com 5 perguntas de múltipla escolha e envio para POST {{BASE_URL}}/api/validacao com {"analise_id": id, "email": <se tiver>, "respostas": {"quem_cuida", "horas_semana", "dor", "usaria", "pagaria"}}. Perguntas e opções:
  1. quem_cuida: "Quem cuida do marketing da sua empresa hoje?" opções "Eu mesmo, sozinho", "Alguém do time, no tempo que sobra", "Freelancer ou agência", "Ninguém, está parado"
  2. horas_semana: "Quantas horas por semana isso te toma?" opções "Menos de 1 hora", "De 1 a 3 horas", "De 4 a 6 horas", "Mais de 6 horas"
  3. dor: "De 1 a 5, quanto te incomoda não postar com constância?" opções "1" a "5"
  4. usaria: "Você publicaria os posts que o social.Ai gerou para você?" opções "Sim, do jeito que estão", "Sim, com pequenos ajustes", "Só alguns", "Não"
  5. pagaria: "Quanto pagaria por mês para ter isso toda semana?" opções "Nada", "Até R$ 50", "De R$ 51 a R$ 150", "De R$ 151 a R$ 400", "Mais de R$ 400"

4) Visual
- Estilo editorial de redação de jornal: fundo creme (#f4efe6), texto quase preto (#16130f), destaque vermelho-alaranjado (#ff4a1c) e um verde-limão de apoio (#d7f25c).
- Títulos numa serifada elegante (Instrument Serif, itálico para ênfase), interface em Bricolage Grotesque, rótulos pequenos em JetBrains Mono em caixa alta com espaçamento largo.
- Bordas finas escuras, sombras duras deslocadas (sem desfoque) nos botões principais, nada de gradiente roxo.
- Mobile first: tudo precisa funcionar bem num celular de 390px de largura.
- Nenhum texto da interface pode usar o caractere travessão "—".
```

---

## Prompt 2: slides do pitch no Apresentações ONE 27

```
Crie uma apresentação de pitch de 3 minutos, em português do Brasil, com 8 slides, para o social.Ai, um CMO de IA para founders de startup. Visual editorial: fundo creme #f4efe6, texto #16130f, destaque #ff4a1c, títulos em serifada (Instrument Serif), textos em sans (Bricolage Grotesque). Pouco texto por slide, uma ideia por slide, frases curtas. Nunca use o caractere travessão "—".

Slide 1, capa: "social.Ai". Subtítulo: "O CMO de IA do founder que faz tudo sozinho."

Slide 2, a dor: título "Você fundou uma startup, não uma agência de marketing." Texto: o founder cuida de produto, venda e investidor; marketing fica para depois, a rede fica parada e a marca não cresce. Deixe um espaço para uma frase real de founder entrevistado hoje (vou colar depois).

Slide 3, a dor paga: título "Quem resolve isso já fatura." Texto: "A Doxa faturou R$ 30 milhões em 2025 com mais de 1.500 clientes, fazendo vídeo com avatar clonado a partir do que viraliza." Fonte pequena no rodapé: "BrazilCham e Money Report, 2026". Mensagem: o mercado já paga por conteúdo guiado por padrões virais.

Slide 4, a solução: "Cola o site. Recebe a pauta." Três passos lado a lado: 1. Lê a marca (cores, fontes, posicionamento) 2. Cruza com uma base curada de posts virais do nicho 3. Entrega diagnóstico, estratégia, calendário e posts prontos na identidade da marca.

Slide 5, demo: título "Ao vivo" e só a frase "Vamos rodar com uma startup daqui do hackathon." (é o momento da demonstração).

Slide 6, diferencial: tabela simples comparando social.Ai, Doxa e social media freelancer em quatro linhas: formato (post estático e estratégia / vídeo com avatar / o que a pessoa fizer), o que precisa do cliente (só a URL do site / foto e áudio para clonar o avatar / briefing e reuniões), para quem (founder de startup sem time de marketing / quem quer vídeo em escala / quem pode contratar), preço (ferramenta / serviço / salário ou contrato).

Slide 7, validação e modelo: título "Validado hoje, no corredor." Espaço para três números que vou preencher (founders ouvidos, quantos cuidam do marketing sozinhos, quanto pagariam por mês). Abaixo: "Assinatura mensal a partir de R$ 49 (hipótese em teste)".

Slide 8, próximo passo: "Hoje: post estático. Depois: vídeo, agendamento e publicação direta." Rodapé com o endereço {{BASE_URL}}.
```
