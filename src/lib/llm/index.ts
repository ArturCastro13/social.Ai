import Anthropic from "@anthropic-ai/sdk";
import { blocosClaude, partesGemini, type AnexoLLM } from "./anexos";

// Adaptador de IA de texto: Gemini por padrão (cota gratuita), Claude quando LLM_PROVIDER=claude.

export interface LLM {
  nome: string;
  gerar(sistema: string, prompt: string): Promise<string>;
  gerarComAnexos?(sistema: string, prompt: string, anexos: AnexoLLM[]): Promise<string>;
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

class ClaudeLLM implements LLM {
  nome: string;
  private client: Anthropic;
  constructor(
    chave: string,
    private modelo = process.env.ANTHROPIC_MODEL || "claude-opus-5",
  ) {
    this.client = new Anthropic({ apiKey: chave, timeout: 80_000, maxRetries: 0 });
    this.nome = `claude:${this.modelo}`;
  }
  async gerar(sistema: string, prompt: string): Promise<string> {
    const stream = this.client.messages.stream({
      model: this.modelo,
      max_tokens: 16000,
      system: sistema,
      messages: [{ role: "user", content: prompt }],
    });
    const msg = await stream.finalMessage();
    if (msg.stop_reason === "refusal") throw new Error("Claude recusou a solicitação");
    return msg.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  }
  async gerarComAnexos(sistema: string, prompt: string, anexos: AnexoLLM[]): Promise<string> {
    const msg = await this.client.messages.create({ model: this.modelo, max_tokens: 6000, system: sistema, messages: [{ role: "user", content: blocosClaude(prompt, anexos) }] }, { timeout: 45_000, maxRetries: 0 });
    if (msg.stop_reason !== "end_turn") throw new Error("Resposta incompleta ou recusada pelo modelo");
    return msg.content.map(b => b.type === "text" ? b.text : "").join("");
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
