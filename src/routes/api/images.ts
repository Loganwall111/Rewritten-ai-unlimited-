/**
 * Server route for image generation via Google Imagen 3.
 *
 * Auth: verifies the caller's Supabase session token, spends credits, records
 * a generation_jobs row on success. Returns an SSE stream in the same format
 * as the old gateway so the frontend doesn't change.
 *
 * Body: { model: string, prompt: string }
 */
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { getModel } from "@/lib/models";

async function verifyUser(request: Request): Promise<string | null> {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.slice(7);
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  const sb = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}`, apikey: key } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data } = await sb.auth.getUser(token);
  return data.user?.id ?? null;
}

export const Route = createFileRoute("/api/images")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const userId = await verifyUser(request);
        if (!userId) return new Response("Unauthorized", { status: 401 });

        const geminiKey = process.env.GEMINI_API_KEY;
        if (!geminiKey) return new Response("GEMINI_API_KEY missing", { status: 500 });

        const body = (await request.json().catch(() => null)) as {
          model?: string;
          prompt?: string;
        } | null;
        if (!body?.prompt) return new Response("Missing prompt", { status: 400 });

        const modelId = body.model ?? "google/imagen-3";
        const model = getModel(modelId);
        if (!model || !model.modality.includes("image")) {
          return new Response(`Not an image model: ${modelId}`, { status: 400 });
        }

        // Charge credits atomically via ledger.
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: bal } = await supabaseAdmin
          .from("credit_balances")
          .select("balance")
          .eq("user_id", userId)
          .maybeSingle();
        const current = bal?.balance ?? 0;
        if (current < model.credits) {
          return new Response(
            JSON.stringify({
              error: `Insufficient credits (have ${current}, need ${model.credits}).`,
            }),
            { status: 402, headers: { "content-type": "application/json" } },
          );
        }
        await supabaseAdmin.from("credit_ledger").insert({
          user_id: userId,
          delta: -model.credits,
          reason: "image_generation",
          metadata: { model: model.id, prompt: body.prompt.slice(0, 200) },
        });

        try {
          const imagenUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${geminiKey}`;

          const upstream = await fetch(imagenUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              instances: [{ prompt: body.prompt }],
              parameters: { sampleCount: 1 },
            }),
          });

          if (!upstream.ok) {
            const err = await upstream.text().catch(() => "");
            // Refund credits on hard failure
            await supabaseAdmin.from("credit_ledger").insert({
              user_id: userId,
              delta: model.credits,
              reason: "refund_image_gen_failed",
              metadata: { model: model.id, status: upstream.status },
            });
            return new Response(err || `Imagen ${upstream.status}`, { status: upstream.status });
          }

          const data = (await upstream.json()) as {
            predictions?: { bytesBase64Encoded?: string }[];
          };

          const b64 = data.predictions?.[0]?.bytesBase64Encoded;
          if (!b64) {
            await supabaseAdmin.from("credit_ledger").insert({
              user_id: userId,
              delta: model.credits,
              reason: "refund_image_gen_failed",
              metadata: { model: model.id, status: "no_image" },
            });
            return new Response(JSON.stringify({ error: "Imagen returned no image" }), {
              status: 502,
              headers: { "content-type": "application/json" },
            });
          }

          // Best-effort record — insert immediately so history shows the request.
          await supabaseAdmin.from("generation_jobs").insert({
            user_id: userId,
            kind: "image",
            model: modelId,
            prompt: body.prompt,
            status: "completed",
            credits_spent: model.credits,
          });

          // Return as SSE stream matching the old gateway format so
          // src/lib/streamImage.ts can parse it without changes.
          const sseBody = [
            `event: image_generation.completed`,
            `data: ${JSON.stringify({ type: "image_generation.completed", b64_json: b64 })}`,
            "",
          ].join("\n");

          return new Response(sseBody, {
            headers: {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache",
              "X-Credits-Spent": String(model.credits),
            },
          });
        } catch (e) {
          // Refund credits on unexpected errors
          await supabaseAdmin.from("credit_ledger").insert({
            user_id: userId,
            delta: model.credits,
            reason: "refund_image_gen_failed",
            metadata: { model: model.id, error: (e as Error).message?.slice(0, 200) },
          });
          return new Response(
            JSON.stringify({ error: `Image generation error: ${(e as Error).message}` }),
            { status: 500, headers: { "content-type": "application/json" } },
          );
        }
      },
    },
  },
});
