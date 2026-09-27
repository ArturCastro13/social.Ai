import Anthropic from "@anthropic-ai/sdk";
import { blocosClaude, partesGemini, type AnexoLLM } from "./anexos";

// Adaptador de IA de texto: Gemini por padrão (cota gratuita), Claude quando LLM_PROVIDER=claude.
// Com Claude, cada tarefa no modelo que a auditoria mostrou valer o custo:
// - "pesquisa" (busca na web de concorrentes e do que está em alta) e "posts" (estratégia, posts e roteiros):
//   Claude Sonnet 5 com esforço baixo. Nas auditorias, o Haiku inventava dado e funcionalidade e repetia a
//   mesma tese; o Sonnet não inventou número, achou concorrentes que o Haiku perdia e escreveu mais rápido.
//   Custo medido: uns US$ 0,15 a pesquisa e US$ 0,14 os posts.
// - "rapido" (entender o negócio, ler materiais, sugestões curtas): Claude Haiku 4.5, barato.
// ANTHROPIC_MODEL_PESQUISA, ANTHROPIC_MODEL_POSTS e ANTHROPIC_MODEL trocam cada um sem mexer no código.

/** "posts": a chamada que escreve a análise. "pesquisa": a busca na web de concorrentes e do que está em alta. "rapido": o resto. */
export type UsoLLM = "posts" | "pesquisa" | "rapido";

type Esforco = "low" | "medium" | "high";

export interface LLM {
  nome: string;
  gerar(sistema: string, prompt: string): Promise<string>;
  gerarComAnexos?(sistema: string, prompt: string, anexos: AnexoLLM[]): Promise<string>;
  /** Como gerar, mas o modelo pode buscar na web (até maxBuscas vezes). Só existe no Claude. */
  pesquisar?(sistema: string, prompt: string, op: { maxBuscas: number; prazoMs: number }): Promise<string>;
  /** Como gerar, mas entrega o texto aos pedaços enquanto o modelo escreve. Só existe no Claude. */
  gerarEmStream?(sistema: string, prompt: string, aoTexto: (delta: string) => void, sinal?: AbortSignal): Promise<string>;
}

class GeminiLLM implements LLM {
  nome: string;
  constructor(
    private chave: string,
    private modelo = process.env.GEMINI_MODEL || "gemini-flash-latest",
  ) {
    this.nome = `gemini:${this.modelo}`;
  }
  async gerar(sistema: string, prompt: string): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.modelo}:generateContent`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": this.chave },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: sistema }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.8, maxOutputTokens: 16000 },
      }),
      signal: AbortSignal.timeout(80_000),
    });
    if (!res.ok) throw new Error(`Gemini HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const txt = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    if (!txt) throw new Error("Gemini respondeu vazio");
    return txt;
  }
  async gerarComAnexos(sistema: string, prompt: string, anexos: AnexoLLM[]): Promise<string> {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${this.modelo}:generateContent`, {
      method: "POST", headers: { "content-type": "application/json", "x-goog-api-key": this.chave },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: sistema }] }, contents: [{ role: "user", parts: partesGemini(prompt, anexos) }], generationConfig: { responseMimeType: "application/json", temperature: 0.1, maxOutputTokens: 6000 } }),
      signal: AbortSignal.timeout(45_000),
    });
    if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);
    const data = await res.json();
    const candidate = data.candidates?.[0];
    if (candidate?.finishReason !== "STOP") throw new Error("Resposta incompleta ou recusada pelo modelo");
    const txt = candidate.content?.parts?.filter((p: { thought?: boolean }) => !p.thought).map((p: { text?: string }) => p.text ?? "").join("");
    if (!txt) throw new Error("Resposta vazia");
    return txt;
  }
}

/** Linha de log de uma chamada: tokens (inclusive cache), buscas e tempo. Nada do conteúdo. */
export function linhaUso(modelo: string, tipo: string, u: Anthropic.Usage, ms: number): string {
  const buscas = u.server_tool_use?.web_search_requests ?? 0;
  const leitura = u.cache_read_input_tokens ?? 0;
  const escrita = u.cache_creation_input_tokens ?? 0;
  return (
    `[ia] ${tipo} ${modelo} entrada=${u.input_tokens} saida=${u.output_tokens}` +
    (leitura ? ` cache_leitura=${leitura}` : "") +
    (escrita ? ` cache_escrita=${escrita}` : "") +
    (buscas ? ` buscas=${buscas}` : "") +
    ` ${ms}ms`
  );
}

/** Tokens de cada chamada nos logs, para acompanhar o gasto da chave (nada do conteúdo). */
function registrarUso(modelo: string, tipo: string, u: Anthropic.Usage, inicio: number) {
  console.info(linhaUso(modelo, tipo, u, Date.now() - inicio));
}

/** Falha da chamada nos logs: só o tipo do erro e o tempo, porque a mensagem pode repetir o pedido. */
function registrarFalha(modelo: string, tipo: string, e: unknown, inicio: number) {
  console.error(`[ia] ${tipo} ${modelo} falhou ${e instanceof Error ? e.name : "erro"} ${Date.now() - inicio}ms`);
}

/**
 * Corpo do pedido ao Claude. As instruções fixas grandes vão com cache de prompt de 5 minutos: o Sonnet cacheia a
 * partir de 1.024 tokens (6 mil caracteres dão folga) e o Haiku só a partir de 4.096, por isso fica de fora.
 */
export function parametrosDoPedido(modelo: string, op: { maxTokens: number; esforco?: Esforco }, sistema: string, prompt: string) {
  const haiku = modelo.startsWith("claude-haiku");
  const cache = !haiku && sistema.length >= 6000;
  return {
    model: modelo,
    max_tokens: op.maxTokens,
    system: cache ? [{ type: "text" as const, text: sistema, cache_control: { type: "ephemeral" as const } }] : sistema,
    messages: [{ role: "user" as const, content: prompt }],
    ...(op.esforco && !haiku ? { output_config: { effort: op.esforco } } : {}),
  };
}

class ClaudeLLM implements LLM {
  nome: string;
  private client: Anthropic;
  constructor(
    chave: string,
    private modelo: string,
    private op: { timeoutMs: number; maxTokens: number; esforco?: Esforco },
  ) {
    this.client = new Anthropic({ apiKey: chave, timeout: op.timeoutMs, maxRetries: 0 });
    this.nome = `claude:${this.modelo}`;
  }
  async gerar(sistema: string, prompt: string): Promise<string> {
    const inicio = Date.now();
    const stream = this.client.messages.stream(parametrosDoPedido(this.modelo, this.op, sistema, prompt));
    const msg = await stream.finalMessage().catch((e: unknown) => {
      registrarFalha(this.modelo, "gerar", e, inicio);
      throw e;
    });
    registrarUso(this.modelo, "gerar", msg.usage, inicio);
    if (msg.stop_reason === "refusal") throw new Error("Claude recusou a solicitação");
    if (msg.stop_reason === "max_tokens") throw new Error("Claude parou no limite de tamanho da resposta");
    return msg.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  }

  async gerarEmStream(sistema: string, prompt: string, aoTexto: (delta: string) => void, sinal?: AbortSignal): Promise<string> {
    const inicio = Date.now();
    const stream = this.client.messages.stream(parametrosDoPedido(this.modelo, this.op, sistema, prompt), sinal ? { signal: sinal } : undefined);
    stream.on("text", (delta) => aoTexto(delta));
    const msg = await stream.finalMessage().catch((e: unknown) => {
      registrarFalha(this.modelo, "gerar-ao-vivo", e, inicio);
      throw e;
    });
    registrarUso(this.modelo, "gerar-ao-vivo", msg.usage, inicio);
    if (msg.stop_reason === "refusal") throw new Error("Claude recusou a solicitação");
    if (msg.stop_reason === "max_tokens") throw new Error("Claude parou no limite de tamanho da resposta");
    return msg.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  }
  async gerarComAnexos(sistema: string, prompt: string, anexos: AnexoLLM[]): Promise<string> {
    const inicio = Date.now();
    const msg = await this.client.messages
      .create({ model: this.modelo, max_tokens: 6000, system: sistema, messages: [{ role: "user", content: blocosClaude(prompt, anexos) }] }, { timeout: 45_000, maxRetries: 0 })
      .catch((e: unknown) => {
        registrarFalha(this.modelo, "anexos", e, inicio);
        throw e;
      });
    registrarUso(this.modelo, "anexos", msg.usage, inicio);
    if (msg.stop_reason !== "end_turn") throw new Error("Resposta incompleta ou recusada pelo modelo");
    return msg.content.map(b => b.type === "text" ? b.text : "").join("");
  }

  async pesquisar(sistema: string, prompt: string, op: { maxBuscas: number; prazoMs: number }): Promise<string> {
    const fim = Date.now() + op.prazoMs;
    const messages: Anthropic.MessageParam[] = [{ role: "user", content: prompt }];
    // pause_turn: o servidor parou no meio das buscas; manda de novo com o que já veio para ele continuar.
    for (let volta = 0; volta < 3; volta++) {
      const inicio = Date.now();
      const msg = await this.client.messages.create(
        {
          model: this.modelo,
          max_tokens: 8000,
          system: sistema,
          messages,
          tools: [
            {
              // Busca básica em todos os modelos. A com filtragem dinâmica (web_search_20260209) dobrou os tokens de
              // entrada nos testes e, numa rodada, devolveu a resposta final incompleta.
              type: "web_search_20250305",
              name: "web_search",
              max_uses: op.maxBuscas,
              user_location: { type: "approximate", country: "BR", timezone: "America/Sao_Paulo" },
            },
          ],
          ...(this.op.esforco && !this.modelo.startsWith("claude-haiku") ? { output_config: { effort: this.op.esforco } } : {}),
        },
        { timeout: Math.max(5_000, fim - Date.now()) },
      ).catch((e: unknown) => {
        registrarFalha(this.modelo, "pesquisar", e, inicio);
        throw e;
      });
      registrarUso(this.modelo, "pesquisar", msg.usage, inicio);
      const consultas = msg.content.flatMap((b) => (b.type === "server_tool_use" && typeof (b.input as { query?: unknown }).query === "string" ? [(b.input as { query: string }).query] : []));
      if (consultas.length) console.info(`[ia] buscas: ${consultas.join(" | ").slice(0, 600)}`);
      if (msg.stop_reason === "refusal") throw new Error("Claude recusou a solicitação");
      if (msg.stop_reason === "pause_turn" && Date.now() < fim) {
        messages.push({ role: "assistant", content: msg.content });
        continue;
      }
      // O texto depois do último resultado de ferramenta: antes dele o modelo costuma narrar o que vai procurar.
      // Se ali não houver o JSON inteiro, devolve todo o texto e o leitor procura o JSON.
      const texto = (blocos: typeof msg.content) => blocos.map((b) => (b.type === "text" ? b.text : "")).join("");
      const ultimaFerramenta = msg.content.findLastIndex((b) => b.type.endsWith("_tool_result"));
      const final = texto(msg.content.slice(ultimaFerramenta + 1));
      return /"concorrentes"|"sugestoes"|"em_alta"/.test(final) ? final : texto(msg.content);
    }
    throw new Error("Pesquisa não terminou no prazo");
  }
}

/** Tempo máximo de uma chamada que escreve a análise. Abaixo do maxDuration de /api/analyze (300 s). */
export const PRAZO_POSTS_MS = 240_000;

function claude(chave: string, uso: UsoLLM): ClaudeLLM {
  if (uso === "posts") {
    const esforco = process.env.ANTHROPIC_EFFORT_POSTS as Esforco | undefined;
    return new ClaudeLLM(chave, process.env.ANTHROPIC_MODEL_POSTS || "claude-sonnet-5", {
      timeoutMs: PRAZO_POSTS_MS,
      maxTokens: 32000,
      esforco: esforco && ["low", "medium", "high"].includes(esforco) ? esforco : "low",
    });
  }
  if (uso === "pesquisa") {
    return new ClaudeLLM(chave, process.env.ANTHROPIC_MODEL_PESQUISA || "claude-sonnet-5", {
      timeoutMs: 80_000,
      maxTokens: 16000,
      esforco: "low",
    });
  }
  return new ClaudeLLM(chave, process.env.ANTHROPIC_MODEL || "claude-haiku-4-5", { timeoutMs: 80_000, maxTokens: 16000 });
}

/** Devolve o provedor configurado, ou null quando não há chave (o motor cai para o modo local). */
export function provedorConfigurado(uso: UsoLLM = "rapido"): LLM | null {
  if (process.env.DEMO_MODE === "1" || process.env.DEMO_MODE === "true") return null;
  const escolha = (process.env.LLM_PROVIDER || "gemini").toLowerCase();
  if (escolha === "claude" && process.env.ANTHROPIC_API_KEY) return claude(process.env.ANTHROPIC_API_KEY, uso);
  if (process.env.GEMINI_API_KEY) return new GeminiLLM(process.env.GEMINI_API_KEY);
  if (process.env.ANTHROPIC_API_KEY) return claude(process.env.ANTHROPIC_API_KEY, uso);
  return null;
}
