import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  checkGate,
  parseJsonBody,
  readUserId,
  setCors,
} from "../lib/cors.js";
import { fetchExplanationLevels } from "../lib/deepseek.js";
import { buildUsageSnapshot, checkAndConsumeQuota } from "../lib/usage.js";

const MAX_TEXT_LEN = 15_000;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!checkGate(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const userId = readUserId(req);
  if (!userId) {
    return res.status(400).json({ error: "Missing or invalid X-User-Id header" });
  }

  let body: Record<string, unknown>;
  try {
    body = parseJsonBody(req.body);
  } catch {
    return res.status(400).json({ error: "Invalid JSON" });
  }

  const text = body.text;
  if (typeof text !== "string" || text.trim().length === 0) {
    return res.status(400).json({ error: "Missing or invalid text" });
  }
  if (text.length > MAX_TEXT_LEN) {
    return res.status(400).json({ error: "Text too long" });
  }

  const quota = await checkAndConsumeQuota(userId);
  if (!quota.allowed) {
    const status = quota.code === "LIMIT_REACHED" ? 402 : 503;
    const usage = await buildUsageSnapshot(userId);
    return res.status(status).json({
      error: quota.error,
      code: quota.code,
      usage,
    });
  }

  try {
    const levels = await fetchExplanationLevels(text);
    if (!levels) {
      return res.status(502).json({ error: "Could not parse model JSON" });
    }

    const usage = await buildUsageSnapshot(userId);
    return res.status(200).json({ levels, usage });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Internal error" });
  }
}
