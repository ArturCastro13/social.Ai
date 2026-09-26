import type { Rede } from "@/lib/types";

/**
 * Página do Canva para criar um design do tamanho certo. Não há integração com o Canva:
 * a arte é baixada e o founder arrasta o arquivo para lá.
 * Quando existir uma integração real (Canva Connect API), troque esta função pela criação
 * do design com a arte importada e devolva a URL de edição.
 */
export function urlCanva(rede: Rede): string {
  return rede === "linkedin" ? "https://www.canva.com/create/linkedin-posts/" : "https://www.canva.com/create/instagram-posts/";
}
