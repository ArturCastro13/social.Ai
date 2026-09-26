# Lista de espera

A página independente está em `/lista-de-espera`. A home e as rotas do MVP continuam disponíveis sem mudanças.

Mantém a identidade visual e os exemplos da landing, substitui o fluxo de experimentar por inscrição, retira preços da nova página e apresenta o produto como em desenvolvimento. Não promete data de lançamento, resultado comercial ou acesso imediato.

## Persistência e publicação

O formulário usa `POST /api/lista-de-espera` e grava na tabela `leads` já definida em `supabase/schema.sql`, com `origem = 'lista-de-espera'`. Configure `NEXT_PUBLIC_SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` no ambiente do novo deploy. A chave de serviço fica somente no servidor. Sem Supabase, ou se a gravação falhar, a API retorna 503 e o formulário não confirma inscrição.

Publique esta branch em um projeto/preview separado na Vercel e compartilhe a rota `/lista-de-espera`. Não é necessário substituir o deployment do Bruno. Se o fork estiver ligado a um deployment automático, confira a branch de produção antes de promover.

No Supabase, filtre `leads.origem` por `lista-de-espera` para consultar/exportar os contatos. Os campos utilizados são `empresa` (obrigatório, 2–120 caracteres), `email`, `origem` e `criado_em`. Esta versão não envia e-mail de confirmação e não faz deduplicação; inscrições repetidas ficam como linhas separadas. Atenda pedidos de saída antes de enviar novas comunicações.

## Verificação antes de divulgar

Confirme a gravação com um endereço de teste autorizado no banco do deployment, confira a origem e remova esse registro de teste. A validação local com banco simulado cobre sucesso e falha, mas não verifica credenciais ou permissões do ambiente publicado.
