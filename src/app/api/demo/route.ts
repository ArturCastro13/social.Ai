import { DEMOS } from "@/lib/engine/demo";
import { json, options } from "@/lib/http";

export const OPTIONS = options;

/** Lista as empresas de exemplo do modo demo. */
export async function GET() {
  return json(
    DEMOS.map((a) => ({
      id: `demo-${a.id}`,
      nome: a.brand.nome,
      url: a.brand.url,
      dominio: a.brand.dominio,
      nicho: a.nicho,
      cor: a.brand.paleta.primaria,
      posts: a.posts.length,
    })),
  );
}
