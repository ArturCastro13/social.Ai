import { CORS_HEADERS } from "@/lib/http";
import type { EventoAoVivo, EventoDoMotor } from "@/lib/motor/contrato";
import type { Analise } from "@/lib/types";

type Inicio = Extract<EventoAoVivo, { tipo: "inicio" }>;

/**
 * Resposta NDJSON da geração ao vivo, um evento por linha. O primeiro leva 1 KB de preenchimento porque o Safari
 * só mostra um stream depois do primeiro quilobyte. Posts que não saíram ao vivo (demo, cache, motor local) saem
 * juntos antes do evento final.
 */
export function respostaAoVivo(inicio: Inicio, executar: (emitir: (e: EventoDoMotor) => void) => Promise<Analise>): Response {
  const cod = new TextEncoder();
  const corpo = new ReadableStream<Uint8Array>({
    async start(controller) {
      let aberto = true;
      const enviar = (e: EventoAoVivo) => {
        if (!aberto) return;
        try {
          controller.enqueue(cod.encode(JSON.stringify(e) + "\n"));
        } catch {
          aberto = false; // a pessoa fechou a página
        }
      };
      enviar({ ...inicio, preenchimento: " ".repeat(1024) });
      const emitidos = new Set<number>();
      try {
        const analise = await executar((e) => {
          if (e.tipo === "post") emitidos.add(e.indice);
          enviar(e);
        });
        analise.posts.forEach((post, indice) => {
          if (!emitidos.has(indice)) enviar({ tipo: "post", indice, post, previa: false });
        });
        enviar({ tipo: "final", analise });
      } catch (e) {
        console.error("[analyze]", (e as Error).message);
        enviar({ tipo: "erro", mensagem: "O motor tropeçou nesta análise. Tente de novo ou use um dos exemplos." });
      } finally {
        if (aberto) controller.close();
      }
    },
  });
  return new Response(corpo, {
    headers: {
      ...CORS_HEADERS,
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no",
      "x-content-type-options": "nosniff",
    },
  });
}

/** O que a tela mostra no topo enquanto os posts nascem: concorrentes, temas em alta e virais ao vivo. */
export function inicioDaPesquisa(pesquisa?: { concorrentes?: { nome: string }[]; em_alta?: { tema: string }[]; virais_ao_vivo?: unknown[] }): Inicio {
  return {
    tipo: "inicio",
    concorrentes: (pesquisa?.concorrentes ?? []).map((c) => c.nome).slice(0, 5),
    em_alta: (pesquisa?.em_alta ?? []).map((t) => t.tema).slice(0, 4),
    virais_ao_vivo: pesquisa?.virais_ao_vivo?.length ?? 0,
  };
}
