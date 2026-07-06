/**
 * Async video generation jobs.
 *
 * Video generation is long-running, so we:
 *  1) Charge credits + insert a `queued` row synchronously.
 *  2) Fire the upstream provider call in the background (best-effort).
 *  3) Client polls `getJobStatus` until `completed` or `failed`.
 *
 * Real providers are only used if their key is configured:
 *   sora-2         → OPENAI_API_KEY
 *   runway-gen4    → RUNWAY_API_KEY
 *   seedance-2.0   → REPLICATE_API_TOKEN
 *
 * If no key is configured, the job stays queued and reports which secret to add,
 * so the flow doesn't lie about generating a video.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { getModel } from "./models";

const createSchema = z.object({
  model: z.string().min(1),
  prompt: z.string().min(1).max(2000),
});

export const createVideoJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createSchema.parse(input))
  .handler(async ({ context, data }) => {
    const { userId } = context;
    const model = getModel(data.model);
    if (!model || !model.modality.includes("video")) {
      throw new Error(`Unknown video model: ${data.model}`);
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Check + spend credits atomically-ish
    const { data: bal } = await supabaseAdmin
      .from("credit_balances")
      .select("balance")
      .eq("user_id", userId)
      .maybeSingle();
    const current = bal?.balance ?? 0;
    if (current < model.credits) {
      throw new Error(`Insufficient credits (have ${current}, need ${model.credits}).`);
    }

    // Spend
    await supabaseAdmin.from("credit_ledger").insert({
      user_id: userId,
      delta: -model.credits,
      reason: "video_generation",
      metadata: { model: model.id },
    });

    // Queue job
    const { data: job, error } = await supabaseAdmin
      .from("generation_jobs")
      .insert({
        user_id: userId,
        kind: "video",
        model: model.id,
        prompt: data.prompt,
        status: "queued",
        credits_spent: model.credits,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    // Check if a provider key is configured; if not, mark the job as failed
    // with a clear message so the user knows what to add.
    const requiredKey = model.requiresKey;
    if (requiredKey && !process.env[requiredKey]) {
      await supabaseAdmin
        .from("generation_jobs")
        .update({
          status: "failed",
          error: `Missing ${requiredKey}. Add it in Project Settings → Secrets to enable ${model.name}.`,
        })
        .eq("id", job.id);
      // Refund
      await supabaseAdmin.from("credit_ledger").insert({
        user_id: userId,
        delta: model.credits,
        reason: "refund_missing_provider_key",
        metadata: { job_id: job.id, model: model.id },
      });
      return { jobId: job.id };
    }

    // Fire-and-forget the upstream call. We don't await it — the request
    // returns immediately and the client polls status.
    processVideoJob(job.id, model.id, data.prompt).catch(async (err) => {
      console.error("[video] job failed", err);
      const { supabaseAdmin: sa } = await import("@/integrations/supabase/client.server");
      await sa
        .from("generation_jobs")
        .update({ status: "failed", error: String(err?.message ?? err) })
        .eq("id", job.id);
    });

    return { jobId: job.id };
  });

async function processVideoJob(jobId: string, modelId: string, prompt: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("generation_jobs").update({ status: "running" }).eq("id", jobId);

  // Right now every hosted video provider requires a per-user API key. The
  // scaffolding below routes to the correct provider once a key exists.
  // Without one, the branch above already failed the job with a clear
  // message, so this function only runs when a key is present.
  let outputUrl: string | null = null;
  let providerJobId: string | null = null;

  if (modelId === "seedance-2.0") {
    const res = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version: "bytedance/seedance-1-lite",
        input: { prompt, duration: 5 },
      }),
    });
    if (!res.ok) throw new Error(`Replicate ${res.status}: ${await res.text()}`);
    const pred = (await res.json()) as { id: string };
    providerJobId = pred.id;
    // Poll Replicate
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 5000));
      const p = await fetch(`https://api.replicate.com/v1/predictions/${pred.id}`, {
        headers: { Authorization: `Token ${process.env.REPLICATE_API_TOKEN}` },
      });
      const pj = (await p.json()) as { status: string; output?: string | string[] };
      if (pj.status === "succeeded") {
        outputUrl = Array.isArray(pj.output) ? pj.output[0] : pj.output ?? null;
        break;
      }
      if (pj.status === "failed" || pj.status === "canceled") throw new Error(`Replicate ${pj.status}`);
    }
  } else {
    // Sora / Runway: provider-specific request. Stubbed here — implement per provider
    // once the user confirms which video provider they want to use.
    throw new Error(
      `${modelId} runtime call not yet implemented. Confirm provider so we can wire the exact API.`,
    );
  }

  if (!outputUrl) throw new Error("Generation timed out.");

  await supabaseAdmin
    .from("generation_jobs")
    .update({ status: "completed", output_url: outputUrl, provider_job_id: providerJobId })
    .eq("id", jobId);
}

export const getJobStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: job, error } = await supabase
      .from("generation_jobs")
      .select("id, kind, model, prompt, status, output_url, output_b64, error, credits_spent, created_at")
      .eq("id", data.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return job;
  });

export const listJobs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ kind: z.enum(["image", "video"]).optional() }).parse(input ?? {}))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    let q = supabase
      .from("generation_jobs")
      .select("id, kind, model, prompt, status, output_url, error, credits_spent, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(24);
    if (data.kind) q = q.eq("kind", data.kind);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
