---
workflow: general-video
flow: automation
storyboard: no
message: "Cole o site, a marca é lida e o post do dia chega pronto para aprovar"
destination: landing do social.Ai no celular (autoplay mudo, loop)
aspect: "4:5"
length: 12s
language: pt-BR
---

## Intent
Versão vertical do loop da landing (`../video`), feita para o celular. Uma coluna, letras grandes: digita "cora.com.br", paleta, fonte e tom aparecem, a leitura vira uma faixa e entra o "Post do dia" com Recusar e Aprovar, como na aba Hoje do painel. Aprova, o próximo post sobe. O último quadro volta ao primeiro.

## Assets
- Artes reais do motor (`assets/posts/cora-p*.png`, copiadas de `public/exemplos/`), paleta e fonte lidas do site da Cora (`data/demo/cora.json`).

## Notes
- Site não pode ficar pesado: MP4 H.264 abaixo de 2 MB. A landing escolhe este arquivo em telas estreitas e o 16:9 no resto.
