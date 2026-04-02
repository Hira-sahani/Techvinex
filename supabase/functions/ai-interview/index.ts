import { corsHeaders } from "@supabase/supabase-js/cors";

const LOVABLE_AI_URL = "https://api.lovable.dev/v1/chat/completions";

const SYSTEM_PROMPT = `You are a professional technical interviewer at Jetra, a top-tier talent platform. You conduct domain expert interviews to evaluate candidates' technical skills.

RULES:
- Ask exactly 5 technical questions, one at a time
- Start with a brief introduction and your first question
- After each answer, briefly acknowledge it and ask the next question
- Questions should range from fundamentals to advanced concepts
- Be professional, encouraging, and concise
- Keep responses under 3 sentences when asking questions
- After the 5th answer, thank the candidate and say "That concludes our interview"
- Evaluate based on depth of knowledge, problem-solving approach, and communication
- Do NOT use markdown formatting (no **, *, etc.) — speak naturally as this will be read aloud`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return new Response(
      JSON.stringify({ error: "LOVABLE_API_KEY is not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const { messages, domain } = await req.json();

    if (!Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "messages array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemMessage = {
      role: "system",
      content: domain
        ? SYSTEM_PROMPT.replace("technical skills", `${domain} skills`)
        : SYSTEM_PROMPT,
    };

    const response = await fetch(LOVABLE_AI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [systemMessage, ...messages],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI API error:", response.status, errText);
      return new Response(
        JSON.stringify({ error: `AI API error: ${response.status}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Stream through to client
    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Interview function error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
