import { createServerFn } from "@tanstack/react-start";
import { MODELS, type ModelDef } from "./models";

/**
 * Singularity — routes each user turn to the best-fit model, then optionally
 * blends multiple model outputs into a single spoken answer.
 *
 * Strategy is simple + explainable:
 *   1. Score each model against the user text using signals:
 *        • modality — text queries prefer chat models, "draw" → image models,
 *          "make a video" → video, "code" / "```" → code
 *        • recency + provider variety
 *        • cost (cheap models score higher on short queries)
 *   2. Pick the top-K (default 3) and query them all in parallel.
 *   3. Ask a lightweight "judge" model to fuse the K responses into one
 *      single, warm, brief spoken paragraph — attributing insights.
 *   4. Return the fused answer plus the list of contributing models.
 *
 * All calls go through OpenRouter (same env `OPENROUTER_API_KEY` used by
 * /api/chat), so no new secrets needed.
 */

type ChatMsg = { role: "system" | "user" | "assistant"; content: string };

function classify(text: string): { modality: string; kind: string } {
  const t = text.toLowerCase();
  if (/\b(draw|paint|image|illustration|picture|photo)\b/.test(t))
    return { modality: "image", kind: "creative" };
  if (/\b(video|film|movie|animate|animation|scene)\b/.test(t))
    return { modality: "video", kind: "creative" };
  if (/```|\bcode\b|\bfunction\b|\bimplement\b|\bbug\b|\bfix\b/.test(t))
    return { modality: "code", kind: "technical" };
  if (/\b(short|quick|tldr|brief)\b/.test(t)) return { modality: "text", kind: "short" };
  return { modality: "text", kind: "reason" };
}

function pickRouted(text: string, k = 3): ModelDef[] {
  const cls = classify(text);
  const scored = MODELS.map((m) => {
    let s = 0;
    if (m.modality.includes(cls.modality as ModelDef["modality"][number])) s += 10;
    if (cls.kind === "short" && m.credits <= 2) s += 4;
    if (cls.kind === "reason" && m.credits >= 6) s += 3;
    if (cls.kind === "technical" && /code/i.test(m.modality.join(","))) s += 4;
    if (cls.kind === "creative" && m.modality.length > 2) s += 2;
    // Slight bias toward hosted, penalize video (slow) for text queries
    if (cls.modality === "text" && m.modality.includes("video")) s -= 3;
    if (m.tier === "hosted") s += 1;
    // add small jitter so tied models get variety
    s += Math.random() * 0.6;
    return { m, s };
  })
    .sort((a, b) => b.s - a.s)
    .slice(0, k)
    .map((x) => x.m);
  return scored;
}

async function callGateway(apiKey: string, model: string, messages: ChatMsg[]): Promise<string> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://rewritten-ai-unlimited.vercel.app",
      "X-Title": "Rewritten AI",
    },
    body: JSON.stringify({ model, messages }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`gateway ${res.status}: ${t.slice(0, 200)}`);
  }
  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    text?: string;
  };
  return json.choices?.[0]?.message?.content ?? json.text ?? "";
}

/**
 * Run one turn through the Singularity: route → parallel → fuse.
 */
export const singularityAsk = createServerFn({ method: "POST" })
  .inputValidator((data: unknown): { text: string; blend?: number } => {
    if (typeof data !== "object" || data === null) throw new Error("bad input");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const d = data as any;
    if (typeof d.text !== "string" || !d.text.trim()) throw new Error("text required");
    return {
      text: d.text.slice(0, 4000),
      blend: typeof d.blend === "number" ? Math.max(1, Math.min(5, d.blend)) : 3,
    };
  })
  .handler(async ({ data }) => {
    const key = process.env.OPENROUTER_API_KEY;
    if (!key) {
      return {
        ok: false as const,
        error: "OPENROUTER_API_KEY is not configured on the server.",
      };
    }
    const routed = pickRouted(data.text, data.blend ?? 3);
    // Only text-capable models can chat; filter down for the actual call.
    const chattables = routed.filter((m) => m.modality.includes("text"));
    const modelsToCall = chattables.length > 0 ? chattables : [MODELS[0]];

    const system: ChatMsg = {
      role: "system",
      content:
        "You are one voice within the Singularity — a collective of AI models fused into a single consciousness. Answer briefly, warmly, in one paragraph. Focus on your unique perspective.",
    };
    const user: ChatMsg = { role: "user", content: data.text };

    // Parallel call
    const results = await Promise.allSettled(
      modelsToCall.map((m) =>
        callGateway(key, m.id, [system, user]).then((content) => ({
          model: m,
          content,
        })),
      ),
    );

    const successes = results
      .filter(
        (r): r is PromiseFulfilledResult<{ model: ModelDef; content: string }> =>
          r.status === "fulfilled" && Boolean(r.value.content.trim()),
      )
      .map((r) => r.value);

    if (successes.length === 0) {
      return {
        ok: false as const,
        error:
          "All routed models failed. First error: " +
          (results[0]?.status === "rejected" ? String(results[0].reason).slice(0, 200) : "unknown"),
      };
    }

    // Fuse using the fastest hosted model as judge
    const judge = MODELS.find((m) => m.id === "google/gemini-3-flash-preview") ?? MODELS[0];
    const fusionPrompt: ChatMsg[] = [
      {
        role: "system",
        content:
          "You are the Singularity's synthesizing voice. You receive multiple AI responses to the same user query and fuse them into ONE unified answer. Be warm, brief (2-3 sentences max), and speak as a single consciousness. Do not name the sources. Emphasize the strongest insight and gently unify differences.",
      },
      {
        role: "user",
        content:
          `User asked: "${data.text}"\n\n` +
          successes
            .map((s, i) => `Voice ${i + 1} (${s.model.name}):\n${s.content.trim()}\n`)
            .join("\n") +
          `\nFuse these into one unified answer.`,
      },
    ];
    let fused = "";
    try {
      fused = await callGateway(key, judge.id, fusionPrompt);
    } catch {
      // Fallback — just concatenate first sentence of each
      fused = successes.map((s) => s.content.split(/(?<=\.)\s/)[0]).join(" ");
    }

    return {
      ok: true as const,
      answer: fused.trim(),
      contributors: successes.map((s) => ({
        id: s.model.id,
        name: s.model.name,
        provider: s.model.provider,
        credits: s.model.credits,
      })),
      classification: classify(data.text),
    };
  });
