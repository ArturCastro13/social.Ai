import type { BrandProfile } from "@/lib/types";
import type { Preferencias } from "@/lib/motor/contrato";
import type { ContextoConfirmado } from "@/lib/contexto/contrato";
import type { Personalizacao } from "@/lib/client/artes";

export type Scope = { userId: string; workspaceId: string };
export type UsageKind = "material_extract" | "context_analyze" | "competitor_suggest" | "preview_generate" | "week_generate";
export type BillingStatus = "none" | "incomplete" | "incomplete_expired" | "trialing" | "active" | "past_due" | "unpaid" | "paused" | "canceled";
export type AccessState = {
  status: BillingStatus;
  paidFrom: string | null;
  paidThrough: string | null;
  cancelAtPeriodEnd: boolean;
  riskHold: boolean;
};
export type DraftBody = {
  brand: BrandProfile | null;
  preferencias: Preferencias;
  contexto: ContextoConfirmado | null;
  personalizacoes: Record<string, Personalizacao>;
};
export type Draft = { id: string; workspaceId: string; version: number; body: DraftBody };
export type CheckoutResult = { attemptId: string; sessionId: string; url: string };
export type CheckoutStatus = {
  state: "pending" | "active" | "canceled" | "expired";
  draftId: string;
  draftVersion: number;
  access: AccessState;
};
