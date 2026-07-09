import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.OPENROUTER_API_KEY;
        if (!key) {
          return new Response(JSON.stringify({ text: "Missing OPENROUTER_API_KEY on server." }), {
            status: 500,
            headers: { "content-type": "application/json" },
          });
        }
        type Msg = { role: "user" | "assistant" | "system"; content: string };
        const body = (await request.json()) as { model?: string; messages?: Msg[] };
        const model = body.model ?? "google/gemini-2.0-flash-exp:free";
        const messages = Array.isArray(body.messages) ? body.messages : [];

        // Route hosted models via OpenRouter; fake a canned response for local models.
        if (model.startsWith("local-")) {
          const last = messages[messages.length - 1]?.content ?? "";
          return new Response(
            JSON.stringify({
              text: `(local model ${model}) I heard: "${last}". Switch to a hosted model for real responses.`,
            }),
            { headers: { "content-type": "application/json" } },
          );
        }

        try {
          const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              "content-type": "application/json",
              Authorization: `Bearer ${key}`,
              "HTTP-Referer": "https://rewritten-ai-unlimited.vercel.app",
              "X-Title": "Rewritten AI",
            },
            body: JSON.stringify({ model, messages }),
          });
          if (!res.ok) {
            const err = await res.text();
            return new Response(
              JSON.stringify({ text: `⚠ gateway ${res.status}: ${err.slice(0, 200)}` }),
              {
                headers: { "content-type": "application/json" },
              },
            );
          }
          const data = (await res.json()) as {
            choices?: { message?: { content?: string } }[];
          };
          return new Response(
            JSON.stringify({ text: data.choices?.[0]?.message?.content ?? "(empty)" }),
            { headers: { "content-type": "application/json" } },
          );
        } catch (e) {
          return new Response(JSON.stringify({ text: `⚠ ${(e as Error).message}` }), {
            headers: { "content-type": "application/json" },
          });
        }
      },
    },
  },
});
