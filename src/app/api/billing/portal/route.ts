import { privateError, privateJson, requireAppOrigin } from "@/lib/auth/http";
import { requireScope } from "@/lib/auth/scope";
import { openPortal } from "@/lib/billing/portal";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    requireAppOrigin(request);
    return privateJson(await openPortal(await requireScope()));
  } catch (error) { return privateError(error); }
}
