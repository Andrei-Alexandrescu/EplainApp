import type { VercelRequest, VercelResponse } from "@vercel/node";

const LEVELS_JSON_SYSTEM = `You explain the user's text at three distinct depth levels. Reply with ONLY valid JSON (no markdown code fences, no text before or after) using exactly this shape:
{"beginner":"","amateur":"","pro":""}

Each value is one string explaining the same source text:

- "beginner": For a complete beginner — very plain language, avoid jargon or define it immediately, short sentences, analogies when helpful. Easiest to read.

- "amateur": For a curious reader with general education but no specialist background — correct terms with brief definitions, show how ideas connect, noticeably more detail than beginner but not a specialist monologue.

- "pro": For someone who already knows the field — use domain terminology freely, skip remedial basics, focus on mechanisms, implications, subtleties, and technical nuance.

The three strings must be genuinely different in depth and vocabulary, not copies of each other. Use \\n inside a string for paragraph breaks if needed.`;

const MAX_TEXT_LEN = 15_000;

function cors(res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Explain-Gate");
  res.setHeader("Access-Control-Max-Age", "86400");
}

function stripJsonFence(raw: string): string {
  let s = raw.trim();
  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  }
  return s.trim();
}

function parseLevels(content: string): {
  beginner: string;
  amateur: string;
  pro: string;
} | null {
  try {
    const o = JSON.parse(stripJsonFence(content)) as Record<string, unknown>;
    if (
      typeof o.beginner === "string" &&
      typeof o.amateur === "string" &&
      typeof o.pro === "string"
    ) {
      return { beginner: o.beginner, amateur: o.amateur, pro: o.pro };
    }
  } catch {
    /* ignore */
  }
  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const gate = process.env.EXPLAIN_GATE_SECRET;
  const sent = req.headers["x-explain-gate"];
  if (gate && sent !== gate) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const rawBody = req.body;
  let body: Record<string, unknown>;
  if (typeof rawBody === "string") {
    try {
      body = JSON.parse(rawBody || "{}") as Record<string, unknown>;
    } catch {
      return res.status(400).json({ error: "Invalid JSON" });
    }
  } else if (rawBody && typeof rawBody === "object" && !Array.isArray(rawBody)) {
    body = rawBody as Record<string, unknown>;
  } else {
    body = {};
  }

  const text = body.text;
  if (typeof text !== "string" || text.trim().length === 0) {
    return res.status(400).json({ error: "Missing or invalid text" });
  }
  if (text.length > MAX_TEXT_LEN) {
    return res.status(400).json({ error: "Text too long" });
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey?.trim()) {
    return res.status(500).json({ error: "Server missing DEEPSEEK_API_KEY" });
  }

  const payloadBase = {
    model: "deepseek-chat",
    messages: [
      { role: "system" as const, content: LEVELS_JSON_SYSTEM },
      { role: "user" as const, content: text },
    ],
    temperature: 0.35,
  };

  try {
    let deepseekRes = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        ...payloadBase,
        response_format: { type: "json_object" },
      }),
    });

    if (!deepseekRes.ok && deepseekRes.status === 400) {
      deepseekRes = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payloadBase),
      });
    }

    if (!deepseekRes.ok) {
      const errText = await deepseekRes.text();
      console.error("DeepSeek error:", deepseekRes.status, errText);
      return res.status(502).json({ error: "Upstream model error" });
    }

    const data = (await deepseekRes.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      return res.status(502).json({ error: "Invalid upstream response" });
    }

    const levels = parseLevels(content);
    if (!levels) {
      return res.status(502).json({ error: "Could not parse model JSON" });
    }

    return res.status(200).json({ levels });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Internal error" });
  }
}
