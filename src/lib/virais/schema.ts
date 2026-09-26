import { z } from "zod";

export const nichoSchema = z.enum(["saas-b2b", "fintech", "healthtech", "edtech", "ecommerce-dtc"]);
export const redeSchema = z.enum(["instagram", "linkedin", "x", "facebook"]);
export const formatoSchema = z.enum([
  "carrossel", "imagem-unica", "print-tweet", "citacao", "lista", "antes-depois", "dado-impacto", "bastidor-founder",
]);
export const tipoGanchoSchema = z.enum([
  "numero", "contraintuitivo", "pergunta", "historia-pessoal", "erro-comum", "promessa", "polemica", "prova-social", "curiosidade",
]);

const metrica = z.number().int().nonnegative().nullable();

export const viralItemSchema = z
  .object({
    id: z.string().min(3),
    nicho: nichoSchema,
    rede: redeSchema,
    formato: formatoSchema,
    tipo_gancho: tipoGanchoSchema,
    texto_gancho: z.string().min(5),
    estrutura: z.array(z.string()).min(1).max(12),
    padrao_visual: z.object({
      fundo: z.string(),
      contraste: z.enum(["alto", "medio", "baixo"]),
      densidade_texto: z.enum(["baixa", "media", "alta"]),
      uso_rosto: z.boolean(),
    }),
    por_que_funciona: z.string(),
    autor_ou_marca: z.string().nullable(),
    link_fonte: z.string().url().nullable(),
    metricas: z.object({
      curtidas: metrica,
      comentarios: metrica,
      compartilhamentos: metrica,
      visualizacoes: metrica,
      observacao: z.string(),
    }),
    status: z.enum(["verificado", "a verificar"]),
    notas_curadoria: z.string().optional(),
  })
  .superRefine((item, ctx) => {
    // Regras da curadoria: verificado exige fonte; métrica preenchida exige explicar a origem.
    if (item.status === "verificado" && !item.link_fonte) {
      ctx.addIssue({ code: "custom", path: ["status"], message: "Item verificado precisa de link_fonte." });
    }
    const temNumero = [item.metricas.curtidas, item.metricas.comentarios, item.metricas.compartilhamentos, item.metricas.visualizacoes].some(
      (v) => v !== null,
    );
    if (temNumero && (!item.link_fonte || item.metricas.observacao.trim().length < 10)) {
      ctx.addIssue({ code: "custom", path: ["metricas"], message: "Métrica preenchida precisa de fonte e de observação dizendo onde foi lida." });
    }
  });

export type ViralItemInput = z.input<typeof viralItemSchema>;
