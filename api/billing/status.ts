import type { VercelRequest, VercelResponse } from "@vercel/node";
import { checkGate, readUserId, setCors } from "../../lib/cors.js";
import { buildUsageSnapshot } from "../../lib/usage.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!checkGate(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const userId = readUserId(req);
  if (!userId) {
    return res.status(400).json({ error: "Missing or invalid X-User-Id header" });
  }

  const usage = await buildUsageSnapshot(userId);
  return res.status(200).json(usage);
}
