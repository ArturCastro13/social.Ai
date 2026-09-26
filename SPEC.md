# social.Ai: especificação do produto e da API

Base de produção: `https://social-ai-beige.vercel.app`

## O produto em um parágrafo

O social.Ai é um CMO de IA para o founder de startup que cuida de tudo sozinho. A pessoa cola a URL do site (e, se quiser, os @ das redes). O sistema lê a identidade visual e o posicionamento da marca, identifica o nicho, cruza com uma base curada de posts de alto desempenho daquele nicho e devolve um diagnóstico, uma estratégia de conteúdo por rede, um calendário de publicação e N posts estáticos prontos, com arte na identidade da marca e legenda para Instagram, LinkedIn, X e Facebook. O modelo de negócio é assinatura mensal com preço de ferramenta.

## Princípios que guiam as decisões

Gasto de API perto de zero: a arte é desenhada por código (Satori), nunca por IA de imagem, e a IA de texto é chamada uma vez por análise, com cache por URL. A demo nunca quebra: três empresas vêm pré-processadas e, sem chave de IA, um motor local de regras monta a análise a partir do texto do site. Nenhuma métrica é inventada: a base de virais só tem número quando ele foi lido na fonte. O motor fica isolado em rotas `/api`, com CORS aberto, para que qualquer interface (inclusive uma recriada dentro da Adapta) consiga usar.

## Fluxos

**Fluxo principal (página inicial).** O usuário digita a URL e escolhe quantos posts quer (3, 6, 9 ou 12). A interface chama `POST /api/brand`, mostra a paleta e as fontes assim que chegam, e em seguida chama `POST /api/analyze` com o perfil de marca. Enquanto espera, a tela de redação mostra as etapas reais (lendo o site, achando a paleta, descobrindo o nicho, comparando com a base, escrevendo, diagramando). Com a resposta, o painel exibe posicionamento, diagnóstico, pilares, estratégia por rede, calendário e a grade de posts. Cada post mostra a arte (`GET /api/render/{postId}`), permite trocar a cor principal e o template, e traz a legenda de cada rede com botão de copiar.

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

## Dados

Supabase (rode `supabase/schema.sql`): `virais`, `analises` (cache), `uso` (limite da demo), `leads`, `validacao`, `entrevistas` e o bucket público `posts`. Sem Supabase, tudo vai para `.data/` localmente (ou para `/tmp` na Vercel, que é temporário).

Base de virais versionada em `data/virais/<nicho>/itens.json` e catálogo em `data/virais/catalogo.json` (`npm run virais:catalogo`). Demos em `data/demo/`, geradas por `npm run demo:gerar` a partir de `data/demo/conteudo/`.
