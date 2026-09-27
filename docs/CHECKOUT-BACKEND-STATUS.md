# Backend de assinatura — entrega para revisão

## Escopo

Tarefas 1, 2, 3, 5 e 6: Supabase Auth por código, workspace privado e rascunhos
versionados, reserva de uso, Checkout/portal Stripe sandbox, webhook, retorno
autenticado via API e reconciliação operacional. `BILLING_MODE` continua
`disabled` por padrão. Nada foi aplicado à Vercel ou a banco remoto.

Tarefas 4 e 7 continuam bloqueadas pelo aviso explícito do Bruno: integração
das telas, prévia sobre o motor novo, proteção das rotas atuais, caches por
workspace e capas privadas. A main observada em `78ac602` contém o redesenho;
esta branch não o integrou nem alterou seus arquivos. A checagem de merge do
Git não apontou conflitos textuais; isso não comprova integração funcional.

## Evidências locais

- Suíte após a implementação: 401 testes em 36 arquivos, passando.
- TypeScript e ESLint passaram; a revisão incluiu correções de recuperação de
  checkout, troca de rascunho, assinatura em outro Price e fencing SQL.
- Quatro migrations e quatro suítes SQL passaram em PGlite 0.5.8 com shim
  mínimo de roles/Auth. O runner reproduzível está em
  `supabase/tests/embedded.mjs`; instruções em `CHECKOUT-SANDBOX.md`.
- `npm run build -- --webpack` passou. **O comando padrão `npm run build`
  não passou neste ambiente**: Turbopack recebeu `Operation not permitted`
  ao abrir uma porta interna, mesmo após concessão de rede. Nenhuma fonte,
  tela, configuração ou script de build foi alterado para esconder a falha.

O build padrão precisa ser confirmado no ambiente do Bruno/CI antes do merge.
Não apresentar testes simulados como validação de cobrança externa.

## Verificações externas pendentes

Bruno revisa/aplica SQL no Supabase de teste, configura SMTP/OTP/CAPTCHA e
credenciais próprias, executa concorrência em duas conexões e valida o Stripe
sandbox: permissões da chave, listener, pagamento aprovado/recusado/3DS,
renovação, cancelamento, replay e risco. Nenhuma cobrança real foi realizada.

As instruções completas estão em `CHECKOUT-SANDBOX.md` e `DEPLOY.md`.
Publicar backend não torna a jornada visual de assinatura disponível.

## Limitação conhecida

O débito de frequência do checkout e o registro de seu resultado usam duas
transações. Uma falha entre elas pode consumir outro slot de frequência no
retry e antecipar um bloqueio temporário. Não cria outra compra: tentativa e
chave Stripe já são persistidas. Essa limitação não foi tratada como quota de
IA nem como consumo financeiro; deve constar da revisão antes da ativação.

## Custos e oferta

As cotas são fixtures de sandbox, incluindo imagens. Não são preço comercial,
medição de tokens nem teto financeiro garantido. O Price informado é R$1/mês
para testes; os preços antigos não estão validados. Análise de custo por
cliente e definição da oferta permanecem uma frente separada.
