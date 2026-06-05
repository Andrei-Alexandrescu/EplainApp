const LEVELS_JSON_SYSTEM = `You explain the user's text at three distinct depth levels. Reply with ONLY valid JSON (no markdown code fences, no text before or after) using exactly this shape:
{"beginner":"","amateur":"","pro":""}

Each value is one string explaining the same source text:

- "beginner": For a complete beginner — very plain language, avoid jargon or define it immediately, short sentences, analogies when helpful. Easiest to read.

- "amateur": For a curious reader with general education but no specialist background — correct terms with brief definitions, show how ideas connect, noticeably more detail than beginner but not a specialist monologue.

- "pro": For someone who already knows the field — use domain terminology freely, skip remedial basics, focus on mechanisms, implications, subtleties, and technical nuance.

The three strings must be genuinely different in depth and vocabulary, not copies of each other. Use \\n inside a string for paragraph breaks if needed.`;

function stripJsonFence(raw: string): string {
  let s = raw.trim();
  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  }
  return s.trim();
}

export async function fetchExplanationLevels(text: string): Promise<{
  beginner: string;
  amateur: string;
  pro: string;
} | null> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey?.trim()) {
    throw new Error("Server missing DEEPSEEK_API_KEY");
  }

  const payloadBase = {
    model: "deepseek-chat",
    messages: [
      { role: "system" as const, content: LEVELS_JSON_SYSTEM },
      { role: "user" as const, content: text },
    ],
    temperature: 0.35,
  };

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
    throw new Error("Upstream model error");
  }

  const data = (await deepseekRes.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== "string") return null;

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
