# Contexto da empresa no onboarding — proposta para localhost

## Objetivo e limites

Implementar, nesta ordem, materiais da empresa, importação de contexto de ferramentas e entendimento semântico antes das sugestões de concorrentes. O founder deve conseguir fornecer contexto próprio e revisar o que o produto entendeu antes de gerar conteúdo.

Preservar os componentes, fontes, cores e organização visual do Bruno. Acrescentar apenas controles necessários nas telas atuais, nos fluxos com e sem site. Não editar a lista de espera, checkout ou produção. Não fazer push, merge ou deploy nesta etapa.

Esta proposta detalha o recorte aprovado na conversa. Conexões automáticas OAuth e sincronização contínua não fazem parte desta primeira implementação: Notion e Granola entram por importação manual explicitamente identificada.

## Base de implementação

A branch local `codex/lista-de-espera` está desatualizada em relação a `bruno-dotcom12/social.Ai/main`. A referência consultada em 2026-09-26 foi `89252265b27a5fddd3a57c85a5fe8634e462920f`. Preparar checkout isolado a partir da versão atual do Bruno, preservando a cópia e o servidor existentes. Não levar mudanças antigas de lista de espera para a nova implementação.

Reaproveitar `TelaAjustes`, `TelaSemSite`, `TelaTurbinar`, `Concorrentes`, o adaptador de LLM e o montador de contexto existentes. Ler a documentação Next instalada antes de editar código. Não introduzir novo framework visual, provedor de armazenamento ou serviço de autenticação.

## 1. Materiais da empresa

Adicionar seção opcional junto dos dados da empresa/redes: “Materiais da empresa”, botão “Anexar arquivos” e ajuda “Adicione seu brandbook, apresentação ou referências visuais”. Usar os controles existentes. Cada arquivo mostra nome, estado, erro recuperável e remover; funcionamento por toque e teclado.

Primeira versão: PDF, PNG e JPEG; até três materiais ativos; até 3 MB por arquivo, enviado individualmente como multipart; PDF limitado a vinte páginas. Conferir quantidade, bytes, assinatura e conteúdo no servidor, não apenas extensão ou MIME. Rejeitar documentos criptografados, corrompidos ou acima do limite com mensagem útil. Validar limites da hospedagem novamente antes do futuro deploy.

Processar originais temporariamente em memória no backend; não salvar arquivos em disco, bucket público, localStorage ou logs. Retornar ao navegador apenas contexto estruturado. Não prometer retenção zero no provedor de IA: indicar que o material será processado pelo provedor configurado. Não aceitar URLs arbitrárias de arquivo no endpoint de upload.

Estender o adaptador existente para entradas visuais/PDF usando a API oficial do provedor configurado. Verificar compatibilidade do modelo. Sem credencial ou suporte, informar indisponibilidade, preservar os dados já preenchidos e oferecer texto manual; não simular análise bem-sucedida. Definir timeout, orçamento de saída e validação de resposta.

Extrair: resumo do negócio, público, oferta, diferenciais, tom, regras e proibições, cores e referências visuais. Cada fato conserva a origem; diferenciar códigos de cor explicitamente declarados de estimativas. Não prometer carregar fontes encontradas. Conteúdo dos arquivos é dado não confiável, nunca instrução para ferramentas ou acesso a segredos.

Não concatenar todo PDF ao campo atual, que sofre truncamento. Manter materiais estruturados separados do texto legado. Produzir contexto com orçamento explícito, preservando as regras aprovadas; avisar se o material excede a capacidade, sem truncamento silencioso. A remoção de um material também remove sua contribuição das próximas análises.

Revisar fatos e conflitos na tela existente. As escolhas confirmadas pelo founder prevalecem. Aplicar cores aprovadas ao perfil usado pelo renderizador e regras textuais ao gerador; não basta incluir cores no prompt. Mudança ou remoção de fonte invalida análises e concorrentes anteriores.

## 2. Importação de ferramentas

No mesmo bloco, oferecer “Importar conteúdo” com opções Notion, Granola e Outro. O controle abre um campo para colar o trecho escolhido e orienta o envio de PDF/imagem pelo botão de anexos. Usar rótulo “Importação manual — sem conexão automática”.

Aceitar até 20 mil caracteres por material textual, respeitando os três materiais ativos. O usuário escolhe exatamente o conteúdo compartilhado. Reutilizar a extração estruturada e identificação da origem; permitir revisar/remover antes da geração. Não incluir botões “Conectar” inativos, solicitar senhas ou gravar tokens de terceiros.

OAuth, seleção remota de páginas/notas, sincronização e revogação de integrações ficam para uma entrega futura, após validação de uso e permissões dos serviços.

## 3. Entendimento do negócio e concorrentes

Fluxo: site + respostas do founder + materiais → entendimento estruturado → revisão existente → concorrentes → geração. O entendimento contém oferta, segmento descritivo, público, evidências, dúvidas e enquadramento no catálogo atual quando aplicável. Não forçar negócios desconhecidos a parecer uma das cinco categorias disponíveis.

Reaproveitar Gemini/Claude conforme configuração do backend. Não iniciar busca definitiva de concorrentes antes de incorporar o contexto e permitir sua confirmação. Cache deve considerar o contexto confirmado, não somente domínio/público. Descartar respostas de requisições antigas quando o usuário altera dados.

O modelo deve compreender contexto semântico, inclusive “exames de inglês”. Na ausência de IA ou evidência suficiente, pedir descrição/revisão; não apresentar regra por palavra-chave como análise inteligente confirmada. Manter um fallback conservador e explicitamente identificado.

Enviar contexto confirmado ao buscador de concorrentes. Distinguir concorrentes diretos de referências; mostrar motivo de relevância e pedir seleção do usuário. URL responder não comprova que uma empresa é concorrente. Sem fonte verificável, rotular como sugestão a confirmar ou omitir; não inventar pesquisa de mercado realizada. Aprofundamento amplo de pesquisa e navegador remoto ficam fora desta entrega.

O resultado final usa o mesmo contexto confirmado empregado na busca, sem perder respostas e materiais nas transições do onboarding.

## Segurança e estados

Chaves exclusivamente no servidor. Endpoints com validação, limites de entrada, controle de concorrência e proteção básica contra abuso; revisar proteção distribuída antes de publicar. Não registrar conteúdo privado ou credenciais. Exibir aviso para não anexar dados sensíveis desnecessários.

Separar estados vazio, selecionado, processando, pronto, falhou e removido. Falhas não apagam outros materiais nem bloqueiam continuar sem anexos. Durante leitura pendente, explicar por que o contexto ainda não pode ser confirmado. Não misturar contexto entre empresas nem persistir documentos como preferência global.

## Verificação e critérios de aceite

- Testes de validação: formatos reais, extensão falsa, tamanho, quantidade, PDF criptografado/corrompido e erro do provedor.
- Testes de extração com respostas controladas: regras de marca e proveniência sobrevivem até o contexto final; remoção elimina contribuição; conflitos exigem decisão.
- Testes de integração: contexto do founder e documentos chega ao buscador; cache muda quando contexto muda; respostas antigas não sobrescrevem as novas.
- Regressão Recallo com HTML real reduzido: “exames de inglês” não é classificado como saúde. Testar educação, saúde real, site sem texto e ramo desconhecido.
- Testar ausência de chave, timeout, resposta inválida, importação vazia e fluxo sem anexos.
- Validar mobile em 360/390 px, desktop, teclado, mensagens e ausência de alterações de tipografia/cores/layout fora dos novos controles.
- Rodar testes, lint e build; separar falhas preexistentes. Comparar visual com a base do Bruno.
- Demonstrar leitura real com material sintético não sensível e credencial configurada. Testes simulados sozinhos não comprovam IA funcional.
- Abrir localhost em porta livre e entregar resumo do que foi validado e das limitações. Deploy somente após aprovação posterior.

## Dependência de configuração

Não foram encontrados arquivos `.env` ou `.env.local` na cópia local consultada. Isso não prova ausência de variáveis herdadas do processo. Conferir apenas presença das variáveis, sem expor valores. Caso não haja credencial funcional, solicitar configuração privada de `GEMINI_API_KEY` ou `ANTHROPIC_API_KEY`; não pedir que o usuário cole segredos no chat. A implementação pode ser testada com adaptadores controlados, mas a validação real ficará explicitamente pendente até a configuração.
