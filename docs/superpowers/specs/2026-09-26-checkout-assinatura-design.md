# Assinatura e checkout Stripe — especificação para aprovação

## Revisão aprovada em 27/09/2026 — coordenação com Bruno

Esta revisão prevalece sobre divergências no texto original. PR #3 integrado à main; entregar backend (Tarefas 1/2/3/5/6) em um PR para Bruno revisar. Proteção das rotas e interface (4/7) ficam em outro PR, somente após o aviso de merge do redesenho. Atualizar então a branch e preservar NDJSON de `/api/analyze`, `postMotorSchema`/`postDoMotor`, `PostCard`, `AoVivo`, `useGeracao`, `Painel` e capas automáticas novos, sem telas paralelas.

- Incluir `image_generate` na fixture sintética: 1 imagem gratuita e 24 por período pago (4 semanas × 6 capas), não oferta comercial. Cada imagem nova é uma operação; acerto de cache privado não consome cota. Proteção de `/api/imagem` e integração das capas pertencem ao segundo PR.
- Capas privadas terão bucket privado, caminhos por workspace e URL assinada curta após autorização. Não reutilizar bucket público `posts` nem migrar imagens legadas automaticamente. Storage/políticas serão entregues no segundo PR, sem aplicação remota por agentes.
- `reservarUso*` e limites globais continuam como frequência/segurança junto ao ledger. `LIMITE_ANALISES_POR_EMAIL` não será a franquia paga; workspace define a cota. Não entregar fallback local silencioso como análise paga. Caches de pesquisa/imagens incluem workspace. Concorrentes não podem consumir a amostra automaticamente.
- APIs novas mantêm `{erro, codigo}`; reutilizam `protegerOrigem`/`lerCorpoLimitado`, acrescentando no-store e APP_ORIGIN estrito nas mutações. Exportar schemas BrandProfile/Personalizacao. `DraftBody.contexto` é canônico: duplicata divergente em `preferencias.contexto_empresa` é rejeitada; cópia idêntica é removida antes de persistir.
- Migrations aditivas ordenadas, manuais e documentadas no DEPLOY.md; não substituir/reexecutar destrutivamente schema legado. Bruno aplica SQL após revisão; nenhum banco remoto será alterado nesta execução.
- Retorno do checkout sincroniza Stripe sob os mesmos leases/fencing do webhook. Rascunho diferente expira checkout anterior antes de nova compra, reconciliando corridas com conclusão. Detectar segunda assinatura e bloquear nova compra, com intervenção registrada, sem cancelar/reembolsar automaticamente. `subscription_data.metadata` inclui workspace/tentativa opacos. Concessão de fatura paga aceita apenas `subscription_create`/`subscription_cycle`, além de Customer, Price, ambiente e período válidos.
- Adicionar frequência persistente OTP/checkout, teto global persistente de operações onerosas e suporte a CAPTCHA no Supabase Auth. O teto sintético de 60 operações novas/dia não é promessa de orçamento monetário; configurar também limites de gasto nos provedores. Widget vem no segundo PR.
- Configuração relatada pelo responsável: Price `price_1UK8zeA8V7kdEuoTxxss9Wyb`, R$1/mês; portal `bpc_1UK99SA8V7kdEuoTBBMUMYAr`. IDs não secretos, sujeitos a validação remota. Segredos continuam no ambiente do responsável; nenhuma mudança na Vercel. Convite, chave própria `rk_test` e Stripe CLI dependem de acesso efetivo, não presumido.
- Esforço médio, lotes delimitados. Parar ao cumprir aceite ou depender de ação externa. Antes do PR: `npx vitest run`, `npx tsc --noEmit -p .`, `npx eslint`, `npm run build`. Identificar testes externos pendentes. Merge é do Bruno.

## 1. Decisões e objetivo

Jornada e Stripe aprovados pelo Artur. Objetivo: permitir que o founder reconheça valor numa amostra personalizada e contrate a continuidade por assinatura mensal, sem perder seu trabalho ao pagar. Preservar componentes, fontes, cores e organização visual do Bruno; ajustes mobile-first e acessíveis.

Os valores R$49/129/290 atuais são fictícios, não preços validados. Custos, preço de lançamento e franquias comerciais serão analisados separadamente para o pitch. Esta entrega se limita a localhost/preview protegido e Stripe em modo de teste. Não autoriza cobrança real nem migração de clientes para um plano pago.

Sucesso técnico: jornada recuperável, pagamento confirmado corretamente, dados isolados entre clientes e nenhuma liberação indevida. Sucesso comercial futuro: pagamento real, utilização, retorno e renovação; sandbox não demonstra conversão.

## 2. Jornada de ponta a ponta

1. **Entrada:** explicar que há uma amostra gratuita e continuidade por assinatura. No sandbox, rotular preço e pagamento como testes. Antes de produção, substituir os preços fictícios pela oferta aprovada, com valor, periodicidade e franquia visíveis antes do onboarding.
2. **Briefing:** aceitar URL ou empresa sem site, perguntas e escolhas atuais. Preenchimento leve pode ocorrer sem conta. Antes de enviar documentos ou chamar processamento personalizado com custo, pedir e-mail e código de verificação no próprio fluxo.
3. **Conta e contexto:** autenticar, criar workspace de um proprietário, salvar rascunho e processar materiais. Mostrar entendimento para revisão. Não associar conta a uma empresa apenas porque ela informou seu domínio.
4. **Prévia:** gerar e devolver somente um post completo utilizável e três títulos de pauta. Informar esse limite antes de começar. Permitir corrigir contexto; uma nova geração consome a cota de teste, apresentada na interface. Aprovar um post não abre checkout automaticamente.
5. **Oferta:** CTA explícito “Assinar e liberar minha semana”. Mostrar conteúdo incluído, frequência de renovação, limites, cancelamento e valor antes de encaminhar ao Stripe. Uma oferta mensal, uma marca por workspace neste MVP; sem plano anual, upsell, cupom ou promessa de uso ilimitado.
6. **Checkout:** salvar versão do rascunho antes do redirecionamento. Abandono retorna à mesma prévia; confirmação pendente não pede novo pagamento. Pagamento confirmado libera a geração da semana completa a partir do contexto salvo.
7. **Continuidade:** biblioteca de pautas e ação “Criar próxima semana”, acionada pelo usuário. Permitir atualizar novidades e contexto; informar consumo disponível. Não prometer geração agendada, publicação automática nem coleta automática de métricas.
8. **Conta:** visualizar plano, próxima renovação, cota e acessar “Gerenciar assinatura” no portal Stripe.

O envio do código e sua confirmação preservam os campos e arquivos selecionados em memória. Rascunhos autenticados são recuperáveis após recarregar. Arquivos ainda não processados precisam ser selecionados novamente se a página for fechada; a interface deve explicar isso.

## 3. Limites desta entrega

Inclui autenticação por código de e-mail via Supabase Auth, persistência privada, prévia limitada, checkout hospedado de assinatura, portal, webhooks, autorização e cotas, retorno ao rascunho e próxima pauta manual.

Não inclui OAuth de Notion/Granola, agendamento social, Pix, boleto, múltiplos membros, múltiplas marcas por workspace, migração automática de registros legados, avaliação de preço/custos, experimento comercial ou pagamentos reais. Exemplos públicos curados continuam demonstrativos, sem consumir franquia pessoal.

Credenciais, SMTP de autenticação e projeto Supabase de teste são dependências de integração externa. Sem acesso a eles, testes locais usam infraestrutura e respostas simuladas explicitamente identificadas; não declarar o sandbox externo validado.

## 4. Identidade, dados e autorização

Usar sessão Supabase validada no servidor. Rotas privadas exigem usuário e workspace pertencente a ele; `email`, domínio, IDs enviados pelo navegador e senha de admin não substituem essa verificação. Aplicar RLS por workspace; consultas com service role também precisam de filtro/autorização explícitos.

Organização proposta:

- `workspaces`: proprietário autenticado e marca; MVP com um workspace por usuário.
- `drafts`: workspace, versão, briefing, preferências, contexto confirmado e materiais extraídos.
- Análises, posts, personalizações, decisões e métricas: vinculados ao workspace e ao rascunho, com versão e classificação de prévia.
- `billing_customers`: vínculo único workspace/Customer/ambiente Stripe.
- `subscriptions`: ID Stripe, preço permitido, estado reconciliado, período pago e cancelamento agendado.
- `checkout_attempts`: tentativa, sessão, rascunho/versão, estado e chave idempotente.
- `billing_events`: ID do evento único por ambiente, estado de processamento e tentativas.
- `usage_operations`: operação única, workspace, tipo, período e reserva/consumo.

Cache e histórico personalizados incluem workspace e versão do contexto. Domínio não é chave de autorização. Não devolver a semana inteira para escondê-la no navegador. Proteger análise, recuperação por ID, renderização, exportação, feedback, materiais, contexto e concorrentes. Render privado não aceita conteúdo arbitrário em `?d=` nem usa cache público; exemplos públicos seguem uma lista explícita.

Arquivos originais permanecem transitórios, sem novo armazenamento permanente. Persistir apenas extrações/contexto selecionados, de forma privada, para retomada e geração. Remover material elimina sua extração do rascunho, invalida inferências e impede reuso na próxima geração; não reescreve posts já produzidos. Não enviar documentos, briefing ou e-mail em URLs, logs ou metadados Stripe. Informar envio ao provedor de IA; não prometer política de retenção do provedor que não foi verificada.

Cancelamento não apaga trabalho: histórico continua acessível ao proprietário, mas não libera novas gerações pagas fora do período coberto. Disponibilizar exclusão autenticada do conteúdo; a retenção dos registros financeiros mínimos segue política separada a definir antes de produção. Sem fallback para arquivo/memória quando a persistência da assinatura falhar.

## 5. Consumo e amostra

Manter catálogo de capacidades e cotas exclusivamente no servidor. O modo de teste usa configuração sintética documentada: uma marca, uma prévia inicial de um post mais três títulos e limites finitos por tipo de operação. A franquia paga de teste não é oferta comercial; os valores operacionais ficam numa fixture única usada também pela interface e pelos testes.

Fixture inicial de teste: por conta gratuita, 3 extrações, 2 análises de contexto, 1 sugestão de concorrentes e 1 geração de prévia; por período mensal pago simulado, 10 extrações, 10 análises de contexto, 10 sugestões e 4 gerações de semana, com 6 posts por geração. São limites para exercitar o sistema, não recomendação de preço ou pacote. Editar texto manualmente não consome IA; reprocessar consome a operação correspondente. Não habilitar essa fixture em modo live.

Reservar cota atomicamente no banco antes de extração, resumo, sugestão de concorrentes ou geração. Usar identificador idempotente da operação para que retries não consumam duas vezes nem entreguem duplicatas. O período de cota paga corresponde ao período de faturamento reconhecido; mensalidade não significa 30 dias fixos.

Falha antes de chamar o provedor libera reserva. Depois de iniciar processamento, manter registro de consumo/custo e reconciliar timeouts; não repetir automaticamente uma operação incerta. Falhas sem entrega podem receber reposição controlada, sem apagar o histórico de custo. Recusar novas operações quando a verificação persistente falhar. Aplicar limitação adicional de frequência/concorrência, inclusive no envio de OTP; conta verificada não é proteção suficiente contra abuso.

## 6. Stripe e estado de acesso

`POST /api/billing/checkout` valida sessão, workspace, oferta permitida e ausência de assinatura vigente. Cria sessão hospedada com `mode=subscription`, cartão e Customer do workspace. O navegador não escolhe preço arbitrário, valor, Customer ou permissões. URLs de retorno vêm de configuração permitida, sem redirecionamento aberto.

Bloqueio por workspace e chave idempotente impedem assinaturas simultâneas. Reutilizar checkout ainda aberto; após expiração, permitir nova tentativa. Se Stripe concluir e a escrita local falhar, recuperar a operação com a mesma chave antes de criar outra. Nunca gravar cartão no app.

`POST /api/billing/portal` cria uma sessão do portal para o Customer do proprietário autenticado. Nesta versão, permitir atualizar pagamento, consultar faturas e cancelar ao final do período; não expor troca de plano ou cancelamento imediato pelo portal.

`POST /api/billing/webhook` verifica assinatura sobre corpo bruto e ambiente correto. O recebimento deve ser durável e idempotente; processamento falho permanece recuperável. Persistir eventos duplicados sem duplicar efeitos e serializar reconciliação por assinatura. Consultar o estado atual no Stripe diante de eventos atrasados/fora de ordem; não confiar apenas na ordem de chegada ou no timestamp do evento.

- `checkout.session.completed`: vincula tentativa, Customer e assinatura; não libera acesso sozinho.
- `invoice.paid`: após validar assinatura, oferta e período, concede/renova acesso uma única vez.
- Pagamento inicial pendente, negado ou exigindo autenticação: preservar prévia e contexto, orientar conclusão, sem acesso pago.
- Renovação falha: manter apenas o período já pago; depois, bloquear novas gerações e oferecer recuperação no portal. Sem carência extra nesta versão.
- Cancelamento agendado: acesso até o fim do período pago, com data visível.
- Cancelamento imediato, `unpaid` ou `paused`: sem novas gerações pagas; manter histórico privado. `incomplete`/`incomplete_expired` não concedem acesso. Trial Stripe não faz parte do primeiro fluxo.
- Reembolso/disputa: registrar, alertar operador e suspender novas gerações vinculadas ao período contestado até decisão registrada. Não emitir reembolso nem cancelar assinatura automaticamente sem política aprovada.

Retorno em `/app/billing/retorno` consulta status autenticado e recupera rascunho. Mostrar “Confirmando pagamento” enquanto houver confirmação pendente. A URL de sucesso não concede acesso. No MVP, o webhook persiste e processa dentro da requisição: só confirma 2xx após aplicar o efeito ou reconhecer duplicata/evento irrelevante. Falha recuperável retorna erro para retry do Stripe; disponibilizar comando de manutenção idempotente para reconciliar eventos persistidos. Não depender de processo em memória depois que a função responder.

## 7. Compatibilidade e lançamento

Desenvolver isoladamente do trabalho do Bruno. Validar em projeto/banco/Stripe de teste, com indicação visível do ambiente. Não instalar gate pago silenciosamente na produção atual.

Preservar exemplos, inscrições da lista e dados legados. Não vincular análises antigas a contas por domínio/e-mail informado: eventual recuperação exige comprovação e operação do time. Conteúdo legado não vira cache de clientes novos. A migração de beta, seus avisos e condições comerciais precisam de aprovação própria antes da ativação pública; ninguém é cobrado retroativamente.

Produção fica bloqueada até: conta Stripe habilitada, preço e franquia aprovados após custos, política de cancelamento/reembolso/retenção e transição do beta definidas, variáveis live segregadas, SMTP operacional, testes sandbox aprovados e autorização explícita de deploy. O frontend não deve anunciar oferta ativa se a configuração de servidor estiver incompleta.

## 8. Critérios de aceitação e testes

- Completar briefing, verificar e-mail, corrigir contexto, ver amostra, abandonar/retomar checkout e recuperar exatamente o rascunho/versionamento.
- Confirmar que o payload de prévia não contém conteúdo pago oculto; acesso direto a APIs, IDs e renderizações de outro workspace é negado.
- Dois usuários com o mesmo domínio permanecem isolados; cache, feedback e arquivos não se misturam.
- Cartão de teste aprovado, recusado e com autenticação adicional; retorno anterior ao webhook; sessão expirada; usuário fecha a aba e retorna.
- Clique duplo e requisições paralelas não criam assinaturas nem consumos duplicados. Eventos repetidos/invertidos e falhas de banco não ampliam acesso.
- Simular renovação, falha, recuperação, fim de período, cancelamento e disputa; verificar cota e política de acesso.
- Gerar próxima semana a partir de contexto atualizado e recuperar histórico; nenhum disparo automático em segundo plano.
- Verificar mobile 360/390 px e desktop, teclado, foco, labels, estados de carregamento/erro e preservação do visual.
- Suite existente, novas regressões, lint, TypeScript, build e fluxo sandbox externo devem ser relatados separadamente, com limitações explícitas.

Instrumentar eventos internos mínimos sem texto de documentos: prévia pronta, checkout iniciado, pagamento confirmado, exportação e próxima pauta. Usar IDs pseudônimos e datas, sem tratar cliques como receita ou testes internos como validação comercial.

## 9. Referências e próximo passo

- [Stripe Checkout para assinaturas](https://docs.stripe.com/payments/checkout/build-subscriptions).
- [Eventos de assinatura e pagamento](https://docs.stripe.com/billing/subscriptions/webhooks).
- [Verificação e entrega de webhooks](https://docs.stripe.com/webhooks).
- [Customer Portal](https://docs.stripe.com/customer-management).
- [Supabase: autenticação por e-mail sem senha](https://supabase.com/docs/guides/auth/auth-email-passwordless).

Este documento formaliza o desenho proposto; não registra implementação ou teste de cobrança. Após aprovação escrita, elaborar o plano incremental de implementação e apresentar a forma de execução antes de alterar o produto.
