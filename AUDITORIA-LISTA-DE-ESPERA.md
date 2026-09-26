# Auditoria da lista de espera — 26/09/2026

## Escopo entregue

- Rota independente `/lista-de-espera`; home e componentes do MVP preservados.
- Headline original recuperada, com Instrument Serif em itálico laranja.
- Textos mais curtos, exemplos de WhatsApp/reuniões/clientes, sem promessa de aquisição ou viralização.
- Nome da empresa obrigatório (2–120 caracteres), e-mail obrigatório e origem fixa `lista-de-espera`.
- Vídeo com controles manuais, sem autoplay, pré-carregamento desativado e indicação de produto em desenvolvimento.
- Três etapas interativas, com conteúdo concreto, teclado (setas/Home/End), foco visível e respeito a movimento reduzido.
- Três imagens geradas com IA, convertidas em WebP de 800px: Cora 108 KB, Pipefy 63 KB, Sallve 80 KB aproximadamente. Tipografia dos exemplos em HTML, não embutida nas imagens.
- Conceitos ilustrativos identificados explicitamente: não são resultados do produto nem campanhas/parcerias oficiais.
- Sem seção de preços; CTAs levam ao formulário, não ao MVP.

## Verificações realizadas

- Build de produção com webpack e TypeScript: aprovado.
- ESLint dos arquivos alterados: aprovado.
- Suíte completa: 165 testes aprovados, incluindo 17 de inscrição.
- API: normalização de e-mail/empresa, limites, campos ausentes, honeypot, JSON inválido, payload grande, banco indisponível e falha de gravação.
- Browser: conferência visual desktop e celular 390px; largura 320px sem overflow horizontal (scrollWidth = clientWidth = 320).
- Navegação por seta mudou a etapa e seu painel; troca de marca mudou imagem e texto.
- Envio real no preview sem banco exibiu indisponibilidade, sem falso sucesso.

## Pendências antes de captar contatos reais

1. Configurar Supabase no ambiente de hospedagem e testar gravação real de empresa, e-mail e origem. Credenciais não estão configuradas neste checkout; testes usam banco simulado.
2. Não há deduplicação, rate limiting distribuído ou e-mail de confirmação. O honeypot não substitui proteção contra abuso.
3. Definir canal operacional para pedidos de exclusão e política de privacidade antes de divulgar amplamente. O formulário já informa a finalidade dos e-mails, mas isto não é uma auditoria jurídica/LGPD.
4. Não foi realizada medição Lighthouse/Core Web Vitals em produção, teste em aparelho físico ou validação completa com leitor de tela. Responsividade inspecionada por viewport de navegador.

## Decisões visuais

A original social-ai-beige.vercel.app e os prints fornecidos são a referência principal. Mantivemos Bricolage, Instrument Serif, papel #f7f6f2, tinta #16130f e laranja #ff4a1c. A skill frontend-design orientou a troca de blocos genéricos por exemplos concretos e a restrição de animação às interações. As imagens foram geradas na etapa anterior com imagegen: cotidiano de pequeno negócio para Cora; caminhos de papel azul para Pipefy; natureza-morta de skincare verde para Sallve. Não se alterou a marca nem o código compartilhado do MVP.
