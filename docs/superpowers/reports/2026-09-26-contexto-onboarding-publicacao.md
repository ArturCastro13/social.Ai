# Contexto e anexos — entrega para publicação

## Escopo

- Anexos opcionais PDF, PNG e JPG no onboarding existente: até 3 materiais, 3 MB por arquivo, PDF com até 20 páginas.
- Importação manual de conteúdo selecionado do Notion/Granola; não é uma conexão OAuth nem sincronização automática.
- Resumo de negócio revisável pelo founder antes dos concorrentes, com contexto e cores aprovadas utilizados na geração.
- Sem reformulação visual, checkout ou alterações próprias na lista de espera. Incorporadas as mudanças do Bruno até `947ddc5` para preservá-las.

## Verificações em 26/09/2026

- `npm test -- --reporter=dot`: 295 testes passando, 23 arquivos, após integrar a versão atual do Bruno.
- `npm run lint`: aprovado.
- `npm run build -- --webpack`: aprovado, incluindo TypeScript e rotas `/api/materiais` e `/api/contexto`.
- `git diff --check`: aprovado.
- POST real ao localhost, com Origin `http://127.0.0.1:3001`: importação manual retorna HTTP 200.
- Upload real de PDF sintético válido: retorna HTTP 503 e orientação explícita de configurar IA, porque não há chave disponível neste ambiente. Extração com provedor real e qualidade dos resultados NÃO foram validadas. Os testes automatizados do provedor usam respostas controladas.

## Correções da revisão

- Resumo e paleta persistem em memória ao retornar entre etapas, sem gravar documentos em localStorage.
- Alterar/remover uma fonte invalida o resumo inferido e suas citações; campos explicitamente editados pelo usuário são preservados.
- Origem é comparada ao Host recebido, pois o Next normaliza o endereço interno para localhost. Requisições de origem cruzada continuam rejeitadas.

## Publicação e validação pelo responsável

O GitHub autenticado tem acesso de escrita ao fork `ArturCastro13/social.Ai`, mas somente leitura ao original `bruno-dotcom12/social.Ai`. A produção observada está associada ao original. Este relatório não comprova deploy.

Antes do merge/publicação, conferir as variáveis no projeto Vercel já existente:

- `ANTHROPIC_API_KEY` válida, no ambiente a publicar. Não colocar a chave no Git, no PR nem em mensagens.
- `LLM_PROVIDER=claude` e `ANTHROPIC_MODEL` definido para um modelo habilitado na conta com suporte a PDF/imagem. O ambiente local foi preparado para `claude-sonnet-4-6`, sem chave.
- `DEMO_MODE` desabilitado para testar IA real.

No preview protegido do projeto, testar um PDF sintético, uma imagem e o site `recallo.com.br`; conferir a extração, os avisos, o resumo de negócio e as cores antes de gerar. Só então promover a versão e validar o domínio de produção. Se houver bloqueio de deploy de PR externo, o responsável deve aprovar no próprio projeto; não desabilitar proteções para contornar o bloqueio.

## Limitações e decisões

- Arquivos originais não são armazenados; conteúdo selecionado é enviado ao provedor configurado para extração. Resumos ficam temporariamente no estado da sessão. Posts gerados e paleta continuam usando a persistência já existente do produto.
- Importação manual sem IA preserva até 20 mil caracteres, respeitando o limite total de contexto. Sem chave, uploads não fingem extração bem-sucedida.
- Limites de concorrência/frequência são por processo, não autenticação nem cota distribuída. Avaliar proteção e orçamento de API antes de escalar o acesso público.
- Concorrentes gerados por IA são sugestões não verificadas, sem seleção automática.
- Build verificado com Webpack; o build padrão da Vercel deve ser acompanhado separadamente. Não alterado o comando de build do projeto de produção.
- Testes completos de navegador/mobile e extração real autenticada permanecem pendentes; não inferir aprovação visual ou funcional ponta a ponta a partir do build.
