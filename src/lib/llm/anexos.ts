import type { ContentBlockParam } from "@anthropic-ai/sdk/resources/messages";
export interface AnexoLLM { mime: "application/pdf" | "image/png" | "image/jpeg"; dadosBase64: string }
export function partesGemini(prompt: string, anexos: AnexoLLM[]) {
  return [{ text: prompt }, ...anexos.map(a => ({ inlineData: { mimeType: a.mime, data: a.dadosBase64 } }))];
}
export function blocosClaude(prompt: string, anexos: AnexoLLM[]): ContentBlockParam[] {
  return [{ type: "text", text: prompt }, ...anexos.map((a): ContentBlockParam => a.mime === "application/pdf"
    ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: a.dadosBase64 } }
    : { type: "image", source: { type: "base64", media_type: a.mime, data: a.dadosBase64 } })];
}
