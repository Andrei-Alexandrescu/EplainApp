import type { AccountSnapshot } from "./billing-types";
import { buildApiHeaders } from "./api";

export type ExplanationLevels = {
  beginner: string;
  amateur: string;
  pro: string;
};

export type ExplainResult =
  | { ok: true; levels: ExplanationLevels; usage: AccountSnapshot }
  | { ok: false; message: string; code?: string; usage?: AccountSnapshot };

/**
 * Explains go through your backend (`VITE_EXPLAIN_API_URL`) so the DeepSeek key stays on the server.
 */
export async function fetchExplanation(text: string): Promise<ExplainResult> {
  const url = import.meta.env.VITE_EXPLAIN_API_URL?.trim().replace(/\/$/, "");
  if (!url) {
    return {
      ok: false,
      message:
        "Set VITE_EXPLAIN_API_URL in .env to your deployed /api/explain URL, then run npm run build.",
    };
  }

  try {
    const headers = await buildApiHeaders();
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ text }),
    });

    const data = (await response.json()) as {
      levels?: ExplanationLevels;
      error?: string;
      code?: string;
      usage?: AccountSnapshot;
    };

    if (!response.ok) {
      return {
        ok: false,
        message: data.error ?? `Request failed (${response.status})`,
        code: data.code,
        usage: data.usage,
      };
    }

    if (
      data.levels &&
      typeof data.levels.beginner === "string" &&
      typeof data.levels.amateur === "string" &&
      typeof data.levels.pro === "string" &&
      data.usage
    ) {
      return { ok: true, levels: data.levels, usage: data.usage };
    }

    return { ok: false, message: "Unexpected response from explain API." };
  } catch (e) {
    console.error("Explain API error:", e);
    return {
      ok: false,
      message: "Could not reach the explain API. Check the URL and your connection.",
    };
  }
}
