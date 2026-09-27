import type { AccessState } from "./contrato";

export function canGeneratePaid(a: AccessState, now: Date): boolean {
  if (a.riskHold || (a.status !== "active" && a.status !== "past_due")) return false;
  if (a.paidFrom === null || a.paidThrough === null) return false;
  const from = Date.parse(a.paidFrom);
  const through = Date.parse(a.paidThrough);
  return Number.isFinite(from) && Number.isFinite(through) && from <= now.getTime() && now.getTime() < through;
}
