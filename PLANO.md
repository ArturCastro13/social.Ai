# Plano do dia do hackathon

Somos três programadores e temos o dia inteiro. O júri olha duas coisas: MVP funcionando e dor validada. Então o plano tem uma regra simples: a demo precisa rodar do começo ao fim a qualquer momento do dia, e a validação com founders começa cedo, não no fim da tarde.

A base já está no repositório (leitor de marca, motor, gerador de artes, landing, modo demo). O trabalho de amanhã é deixar cada parte afiada e juntar tudo no pitch.

## Frente A: base de virais e curadoria

Dono: pessoa 1.

A base em `data/virais/` foi pré-preenchida com padrões pesquisados, mas boa parte está marcada como "a verificar". Esse é o ativo que sustenta a frase "analisamos o que viraliza no seu nicho", então ele precisa estar sólido na hora do pitch.

Manhã: abrir `/admin/virais`, passar item por item, confirmar o link da fonte e mudar o status para verificado. Onde houver métrica pública visível no post, preencher. Onde não houver, deixar vazio. Nunca estimar número.

Tarde: adicionar pelo menos 5 itens novos no nicho da empresa que vamos usar na demo ao vivo, rodar `npm run virais:catalogo` e conferir se o catálogo de padrões mudou.

Também é dessa frente o roteiro de entrevistas: ouvir 10 founders ao longo do dia e registrar em `/admin/entrevistas`. A pessoa 1 lidera, mas todo mundo entrevista quem encontrar no corredor.

## Frente B: motor (leitura do site, análise, geração)

Dono: pessoa 2.

Manhã: colocar `GEMINI_API_KEY` e as chaves do Supabase, rodar `supabase/schema.sql`, testar o fluxo com 5 sites de startups presentes no hackathon. Anotar onde o leitor de marca erra a cor principal ou a fonte e corrigir.

Tarde: refinar o prompt em `src/lib/llm/prompt.ts` olhando os posts gerados. O critério é simples: o founder postaria isso sem editar? Se não, ajustar. Depois ajustar os templates de arte em `src/lib/render/templates.tsx` para os casos em que o contraste ou o tamanho do texto ficam ruins.

## Frente C: página, painel de resultado e integração com Adapta

Dono: pessoa 3.

Manhã: confirmar o deploy na Vercel, testar a landing no celular de verdade e revisar a copy em voz alta. Ler o regulamento e confirmar o que precisa rodar dentro da Adapta.

Tarde: usar `ADAPTA_PROMPT.md` para recriar a interface no Adapta One chamando a nossa API, montar os slides com o segundo prompt do mesmo arquivo, e ensaiar o pitch de `PITCH.md` pelo menos três vezes com cronômetro.

## Horários de sincronização

Às 10h, 13h e 16h, dez minutos em pé: o que está quebrado, quem está travado, quantas entrevistas já temos. Às 17h a gente congela o código. Depois disso só entra correção de bug que aparece na demo.

## Plano B

Se a internet do evento cair ou a IA ficar sem cota, ligamos `DEMO_MODE=1` e apresentamos com as empresas pré-processadas. A demo continua idêntica na tela.
