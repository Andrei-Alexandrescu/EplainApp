export type ExplanationLevels = {
  beginner: string;
  amateur: string;
  pro: string;
};

/**
 * Explains go through your backend (`VITE_EXPLAIN_API_URL`) so the DeepSeek key stays on the server.
 * Set env vars, then `npm run build` before loading the extension.
 */
export async function fetchExplanation(text: string): Promise<ExplanationLevels | string> {
  const url = import.meta.env.VITE_EXPLAIN_API_URL?.trim().replace(/\/$/, "");
  if (!url) {
    return "**[Setup]** Set `VITE_EXPLAIN_API_URL` in `.env` to your deployed `/api/explain` URL, then run `npm run build`.";
  }

  const gate = import.meta.env.VITE_EXPLAIN_GATE_SECRET?.trim();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (gate) {
    headers["X-Explain-Gate"] = gate;
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ text }),
    });

    const data = (await response.json()) as { levels?: ExplanationLevels; error?: string };

    if (!response.ok) {
      const msg = data.error ?? `Request failed (${response.status})`;
      return `**[Error]** ${msg}`;
    }

    if (
      data.levels &&
      typeof data.levels.beginner === "string" &&
      typeof data.levels.amateur === "string" &&
      typeof data.levels.pro === "string"
    ) {
      return data.levels;
    }

    return "**[Error]** Unexpected response from explain API.";
  } catch (e) {
    console.error("Explain API error:", e);
    return "**[Error]** Could not reach the explain API. Check the URL and your connection.";  }
}
