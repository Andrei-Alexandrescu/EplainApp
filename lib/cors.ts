import type { VercelResponse } from "@vercel/node";

export function setCors(res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, X-Explain-Gate, X-User-Id"
  );
  res.setHeader("Access-Control-Max-Age", "86400");
}

export function parseJsonBody(rawBody: unknown): Record<string, unknown> {
  if (typeof rawBody === "string") {
    return JSON.parse(rawBody || "{}") as Record<string, unknown>;
  }
  if (rawBody && typeof rawBody === "object" && !Array.isArray(rawBody)) {
    return rawBody as Record<string, unknown>;
  }
  return {};
}

export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function readUserId(req: { headers: Record<string, string | string[] | undefined> }): string | null {
  const raw = req.headers["x-user-id"];
  const id = Array.isArray(raw) ? raw[0] : raw;
  if (!id || !UUID_RE.test(id)) return null;
  return id;
}

export function checkGate(req: { headers: Record<string, string | string[] | undefined> }): boolean {
  const gate = process.env.EXPLAIN_GATE_SECRET;
  if (!gate) return true;
  const sent = req.headers["x-explain-gate"];
  const value = Array.isArray(sent) ? sent[0] : sent;
  return value === gate;
}
