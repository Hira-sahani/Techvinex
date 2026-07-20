// Minimal Lovable AI Gateway client for MCP tools.
// Uses fetch — no SDK — to keep the bundled edge function small.

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const DEFAULT_MODEL = "google/gemini-2.5-flash";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function chatComplete(
  messages: ChatMessage[],
  opts: { model?: string; temperature?: number } = {},
): Promise<{ text: string; model: string; usage?: unknown }> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY not configured on the MCP function");

  const model = opts.model ?? DEFAULT_MODEL;
  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: opts.temperature ?? 0.4,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (res.status === 429) throw new Error(`AI rate limit (429): ${body.slice(0, 200)}`);
    if (res.status === 402) throw new Error(`AI credits exhausted (402): ${body.slice(0, 200)}`);
    throw new Error(`AI gateway ${res.status}: ${body.slice(0, 300)}`);
  }

  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    usage?: unknown;
  };
  const text = json.choices?.[0]?.message?.content ?? "";
  return { text, model, usage: json.usage };
}
