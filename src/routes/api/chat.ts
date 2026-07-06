import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) {
          return new Response(JSON.stringify({ text: "Missing LOVABLE_API_KEY on server." }), {
            status: 500,
            headers: { "content-type": "application/json" },
          });
        }
        type Msg = { role: "user" | "assistant" | "system"; content: string };
        const body = (await request.json()) as { model?: string; messages?: Msg[] };
        const model = body.model ?? "google/gemini-3-flash-preview";
        const messages = Array.isArray(body.messages) ? body.messages : [];

        // Route hosted models via Lovable AI Gateway; fake a canned response for local models.
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
          const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "Lovable-API-Key": key,
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
