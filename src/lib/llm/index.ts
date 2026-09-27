import Anthropic from "@anthropic-ai/sdk";
import { blocosClaude, partesGemini, type AnexoLLM } from "./anexos";

// Adaptador de IA de texto: Gemini por padrão (cota gratuita), Claude quando LLM_PROVIDER=claude.
// Com Claude, dois usos: "posts" escreve a estratégia e os posts, "rapido" faz pesquisa, sugestões e leitura de
// materiais. Os dois usam o Haiku 4.5 por padrão, que é barato; ANTHROPIC_MODEL_POSTS troca só o modelo dos
// posts (ex.: claude-sonnet-5 escreve melhor, custa uns US$ 0,25 por análise e leva perto de 4 minutos).

/** "posts": a chamada que escreve a análise. "rapido": todo o resto. */
export type UsoLLM = "posts" | "rapido";

type Esforco = "low" | "medium" | "high";

export interface LLM {
  nome: string;
  gerar(sistema: string, prompt: string): Promise<string>;
  gerarComAnexos?(sistema: string, prompt: string, anexos: AnexoLLM[]): Promise<string>;
  /** Como gerar, mas o modelo pode buscar na web (até maxBuscas vezes). Só existe no Claude. */
  pesquisar?(sistema: string, prompt: string, op: { maxBuscas: number; prazoMs: number }): Promise<string>;
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

/** Tokens de cada chamada nos logs, para acompanhar o gasto da chave (nada do conteúdo). */
function registrarUso(modelo: string, tipo: string, u: Anthropic.Usage) {
  const buscas = u.server_tool_use?.web_search_requests ?? 0;
  console.info(`[ia] ${tipo} ${modelo} entrada=${u.input_tokens} saida=${u.output_tokens}${buscas ? ` buscas=${buscas}` : ""}`);
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
    const stream = this.client.messages.stream({
      model: this.modelo,
      max_tokens: this.op.maxTokens,
      system: sistema,
      messages: [{ role: "user", content: prompt }],
      // O Haiku 4.5 não aceita esforço; nos outros, ele segura quanto o modelo pensa (e quanto custa).
      ...(this.op.esforco && !this.modelo.startsWith("claude-haiku") ? { output_config: { effort: this.op.esforco } } : {}),
    });
    const msg = await stream.finalMessage();
    registrarUso(this.modelo, "gerar", msg.usage);
    if (msg.stop_reason === "refusal") throw new Error("Claude recusou a solicitação");
    if (msg.stop_reason === "max_tokens") throw new Error("Claude parou no limite de tamanho da resposta");
    return msg.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  }
  async gerarComAnexos(sistema: string, prompt: string, anexos: AnexoLLM[]): Promise<string> {
    const msg = await this.client.messages.create({ model: this.modelo, max_tokens: 6000, system: sistema, messages: [{ role: "user", content: blocosClaude(prompt, anexos) }] }, { timeout: 45_000, maxRetries: 0 });
    if (msg.stop_reason !== "end_turn") throw new Error("Resposta incompleta ou recusada pelo modelo");
    return msg.content.map(b => b.type === "text" ? b.text : "").join("");
  }

  async pesquisar(sistema: string, prompt: string, op: { maxBuscas: number; prazoMs: number }): Promise<string> {
    const fim = Date.now() + op.prazoMs;
    const messages: Anthropic.MessageParam[] = [{ role: "user", content: prompt }];
    // pause_turn: o servidor parou no meio das buscas; manda de novo com o que já veio para ele continuar.
    for (let volta = 0; volta < 3; volta++) {
      const msg = await this.client.messages.create(
        {
          model: this.modelo,
          max_tokens: 8000,
          system: sistema,
          messages,
          tools: [
            {
              type: "web_search_20250305",
              name: "web_search",
              max_uses: op.maxBuscas,
              user_location: { type: "approximate", country: "BR", timezone: "America/Sao_Paulo" },
            },
          ],
        },
        { timeout: Math.max(5_000, fim - Date.now()) },
      );
      registrarUso(this.modelo, "pesquisar", msg.usage);
      if (msg.stop_reason === "refusal") throw new Error("Claude recusou a solicitação");
      if (msg.stop_reason === "pause_turn" && Date.now() < fim) {
        messages.push({ role: "assistant", content: msg.content });
        continue;
      }
      // Só o texto depois da última busca: antes dela o modelo costuma narrar o que vai procurar.
      const ultimaBusca = msg.content.findLastIndex((b) => b.type === "web_search_tool_result");
      return msg.content
        .slice(ultimaBusca + 1)
        .map((b) => (b.type === "text" ? b.text : ""))
        .join("");
    }
    throw new Error("Pesquisa não terminou no prazo");
  }
}

/** Tempo máximo de uma chamada que escreve a análise. Abaixo do maxDuration de /api/analyze (300 s). */
export const PRAZO_POSTS_MS = 240_000;

function claude(chave: string, uso: UsoLLM): ClaudeLLM {
  if (uso === "posts") {
    const esforco = process.env.ANTHROPIC_EFFORT_POSTS as Esforco | undefined;
    return new ClaudeLLM(chave, process.env.ANTHROPIC_MODEL_POSTS || process.env.ANTHROPIC_MODEL || "claude-haiku-4-5", {
      timeoutMs: PRAZO_POSTS_MS,
      maxTokens: 32000,
      esforco: esforco && ["low", "medium", "high"].includes(esforco) ? esforco : "medium",
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
