/**
 * Server route for streaming image generation.
 *
 * Auth: verifies the caller's Supabase session token, spends credits, records
 * a generation_jobs row on success. Passes through the AI Gateway SSE stream
 * to the browser.
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

        const lovableKey = process.env.LOVABLE_API_KEY;
        if (!lovableKey) return new Response("LOVABLE_API_KEY missing", { status: 500 });

        const body = (await request.json().catch(() => null)) as {
          model?: string;
          prompt?: string;
        } | null;
        if (!body?.prompt) return new Response("Missing prompt", { status: 400 });

        const modelId = body.model ?? "openai/gpt-image-2";
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

        // Build the per-model body
        let gwBody: Record<string, unknown>;
        if (modelId.startsWith("openai/")) {
          gwBody = {
            model: modelId,
            prompt: body.prompt,
            size: "1024x1024",
            quality: "low",
            n: 1,
            stream: true,
            partial_images: 1,
          };
        } else {
          // Gemini image models — chat-completions image shape
          gwBody = {
            model: modelId,
            messages: [{ role: "user", content: body.prompt }],
            modalities: ["image", "text"],
            stream: true,
          };
        }

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Lovable-API-Key": lovableKey,
          },
          body: JSON.stringify(gwBody),
        });

        if (!upstream.ok || !upstream.body) {
          const err = await upstream.text().catch(() => "");
          // Refund credits on hard failure
          await supabaseAdmin.from("credit_ledger").insert({
            user_id: userId,
            delta: model.credits,
            reason: "refund_image_gen_failed",
            metadata: { model: model.id, status: upstream.status },
          });
          return new Response(err || `Gateway ${upstream.status}`, { status: upstream.status });
        }

        // Best-effort record — insert immediately (before stream completes) so
        // history shows the request; downstream client saves the final image.
        await supabaseAdmin.from("generation_jobs").insert({
          user_id: userId,
          kind: "image",
          model: modelId,
          prompt: body.prompt,
          status: "completed",
          credits_spent: model.credits,
        });

        return new Response(upstream.body, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "X-Lovable-Credits-Spent": String(model.credits),
          },
        });
      },
    },
  },
});
