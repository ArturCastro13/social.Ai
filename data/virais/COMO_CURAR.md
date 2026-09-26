# Como curar a base de virais

A base é o que sustenta a frase "a gente analisa o que viraliza no seu nicho". Cada item precisa ser defensável na frente do júri, então a regra é: se você não viu, não escreve.

## O caminho rápido: /admin/virais

1. Abra `/admin/virais` (local: http://localhost:3000/admin/virais). Se o time definiu `ADMIN_PASSWORD`, digite a senha no campo do topo.
2. Clique em **+ Novo item**. O id já vem preenchido com o próximo número do nicho filtrado.
3. Escolha nicho, rede, formato e tipo de gancho.
4. Cole o gancho. Se o post original é em inglês, traduza e deixe o original em notas. Se você está descrevendo um padrão e não copiando um post específico, deixe o autor vazio.
5. Escreva a estrutura, um slide por linha ("Slide 1: número grande com o resultado").
6. Em uma frase, diga por que funciona. Pense no leitor rolando o feed: o que fez ele parar?
7. Cole o link da fonte.
8. Métricas: só preencha se você viu o número na página. Reações do LinkedIn vão em "curtidas". No campo de observação diga onde leu e quando, por exemplo "lido na página pública do post em 27/09". Se não viu, deixe vazio.
9. Marque "Abri a fonte e ela confirma" só se abriu mesmo. Salve.

Localmente o item é gravado direto em `data/virais/<nicho>/itens.json`. Faça commit desse arquivo para o resto do time receber. Com o Supabase configurado, o item vai para a tabela `virais` e aparece para todo mundo na hora.

Para verificar um item que já existe, clique em "a verificar" na lista. Se ele já tem link, vira verificado. Se não tem, abre o editor para você colar a fonte primeiro.

## O caminho pelo arquivo

Se preferir editar o JSON, copie um item existente do mesmo nicho, troque o id pelo próximo número e ajuste os campos. Depois rode:

```bash
npm run virais:catalogo
```

O comando valida todos os itens (esquema, fonte obrigatória para verificado, observação obrigatória para métrica, nenhum travessão) e recalcula `data/virais/catalogo.json`. Se aparecer um ✗, corrija antes de commitar.

## O que conta como fonte

Vale o próprio post público, uma matéria ou estudo que mostra o post, ou o perfil do autor quando o post não tem link fixo (nesse caso, anote nas notas). Não vale print sem origem, lembrança de ter visto, nem "todo mundo sabe que funciona".

## O que o motor faz com isso

O motor agrupa os itens por formato e tipo de gancho e forma o catálogo de padrões. Quando alguém cola um site, ele pega os padrões do nicho daquela empresa, dá preferência aos verificados, e usa como referência para escrever o diagnóstico e os posts. Cada post gerado diz qual padrão o inspirou. Quanto mais itens verificados num nicho, melhor fica a estratégia daquele nicho.
