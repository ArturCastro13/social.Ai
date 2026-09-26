# Lista de espera

A página independente está em `/lista-de-espera`, no mesmo projeto e no mesmo deploy da home. A home usa o mesmo hero, as mesmas etapas e o mesmo exemplo, mas mantém o produto funcionando com o CTA "Começar agora".

Mantém a identidade visual da landing, substitui o fluxo de experimentar por inscrição (nome da empresa e e-mail), retira preços da nova página e apresenta o produto como em desenvolvimento. Não promete data de lançamento nem acesso imediato.

Seções: topo com o formulário, vídeo de demonstração (`/video/demo*.mp4`), "Como funciona" em quatro etapas que acendem sozinhas conforme a pessoa rola (`ComoFuncionaEspera.tsx`), exemplo "Da sua fala ao post pronto" com o loop 4:5 `/video/fala-ao-post.mp4` (`VideoFalaAoPost.tsx`, só toca quando aparece), perguntas frequentes e chamada final. Com movimento reduzido, todas as etapas ficam visíveis e o vídeo mostra só o pôster.

## Persistência e publicação

O formulário usa `POST /api/lista-de-espera` e grava na tabela `leads` já definida em `supabase/schema.sql`, com `origem = 'lista-de-espera'`. O Supabase vem da Vercel Marketplace, que já cadastrou `NEXT_PUBLIC_SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` em production, preview e development (ver `DEPLOY.md`). A chave de serviço fica somente no servidor. Sem Supabase, ou se a gravação falhar, a API retorna 503 e o formulário não confirma inscrição.

A rota sai junto com o resto do app no deploy de produção (`vercel deploy --prod --yes`). Para divulgar, compartilhe `https://social-ai-beige.vercel.app/lista-de-espera`.

Para ver e exportar as inscrições, use `/admin/lista-de-espera` (senha `ADMIN_PASSWORD`, com botão de CSV) ou, no Supabase, filtre `leads.origem` por `lista-de-espera`. Os campos utilizados são `empresa` (obrigatório, de 2 a 120 caracteres), `email`, `origem` e `criado_em`. Esta versão não envia e-mail de confirmação e não faz deduplicação; inscrições repetidas ficam como linhas separadas. Atenda pedidos de saída antes de enviar novas comunicações.

## Verificação antes de divulgar

Confirme a gravação com um endereço de teste autorizado no banco do deployment, confira a origem e remova esse registro de teste. A validação local com banco simulado cobre sucesso e falha, mas não verifica credenciais ou permissões do ambiente publicado.
