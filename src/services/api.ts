import { getOrCreateUserId } from "./storage";

export function getApiBase(): string | null {
  const explain = import.meta.env.VITE_EXPLAIN_API_URL?.trim();
  if (!explain) return null;
  return explain.replace(/\/api\/explain\/?$/i, "");
}

export async function buildApiHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const gate = import.meta.env.VITE_EXPLAIN_GATE_SECRET?.trim();
  if (gate) headers["X-Explain-Gate"] = gate;
  headers["X-User-Id"] = await getOrCreateUserId();
  return headers;
}
