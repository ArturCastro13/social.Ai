import Anthropic from "@anthropic-ai/sdk";

// Adaptador de IA de texto: Gemini por padrão (cota gratuita), Claude quando LLM_PROVIDER=claude.

export interface LLM {
  nome: string;
  gerar(sistema: string, prompt: string): Promise<string>;
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
      signal: AbortSignal.timeout(90_000),
    });
    if (!res.ok) throw new Error(`Gemini HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const txt = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    if (!txt) throw new Error("Gemini respondeu vazio");
    return txt;
  }
}

class ClaudeLLM implements LLM {
  nome: string;
  private client: Anthropic;
  constructor(
    chave: string,
    private modelo = process.env.ANTHROPIC_MODEL || "claude-opus-5",
  ) {
    this.client = new Anthropic({ apiKey: chave, timeout: 120_000, maxRetries: 1 });
    this.nome = `claude:${this.modelo}`;
  }
  async gerar(sistema: string, prompt: string): Promise<string> {
    const stream = this.client.messages.stream({
      model: this.modelo,
      max_tokens: 32000,
      system: sistema,
      messages: [{ role: "user", content: prompt }],
    });
    const msg = await stream.finalMessage();
    if (msg.stop_reason === "refusal") throw new Error("Claude recusou a solicitação");
    return msg.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  }
}

/** Devolve o provedor configurado, ou null quando não há chave (o motor cai para o modo local). */
export function provedorConfigurado(): LLM | null {
  if (process.env.DEMO_MODE === "1" || process.env.DEMO_MODE === "true") return null;
  const escolha = (process.env.LLM_PROVIDER || "gemini").toLowerCase();
  if (escolha === "claude" && process.env.ANTHROPIC_API_KEY) return new ClaudeLLM(process.env.ANTHROPIC_API_KEY);
  if (process.env.GEMINI_API_KEY) return new GeminiLLM(process.env.GEMINI_API_KEY);
  if (process.env.ANTHROPIC_API_KEY) return new ClaudeLLM(process.env.ANTHROPIC_API_KEY);
  return null;
}
