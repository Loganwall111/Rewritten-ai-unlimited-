import { createParser } from "eventsource-parser";
import { flushSync } from "react-dom";
import { supabase } from "@/integrations/supabase/client";

type ImageEventPayload =
  | { type: "image_generation.partial_image"; b64_json: string; partial_image_index: number }
  | { type: "image_generation.completed"; b64_json: string }
  | { type: "error"; error: { message: string; code?: string } };

export async function streamImage(
  prompt: string,
  model: string,
  onFrame: (dataUrl: string, isFinal: boolean) => void,
): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("You must be signed in.");

  const res = await fetch("/api/images", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ prompt, model }),
  });
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    let msg = `Image generation failed (${res.status})`;
    try {
      const j = JSON.parse(text) as { error?: string };
      if (j?.error) msg = j.error;
    } catch {
      if (text) msg = text.slice(0, 300);
    }
    throw new Error(msg);
  }

  let sawCompleted = false;
  let streamError: string | undefined;
  const parser = createParser({
    onEvent(event) {
      let payload: ImageEventPayload | undefined;
      try {
        payload = JSON.parse(event.data) as ImageEventPayload;
      } catch {
        /* ignore */
      }
      if (event.event === "error" || payload?.type === "error") {
        const p = payload as { error?: { message?: string } } | undefined;
        streamError = p?.error?.message ?? "Image generation failed";
        return;
      }
      if (
        event.event !== "image_generation.partial_image" &&
        event.event !== "image_generation.completed"
      )
        return;
      if (!payload) return;
      const isFinal = event.event === "image_generation.completed";
      const b64 = (payload as { b64_json: string }).b64_json;
      flushSync(() => onFrame(`data:image/png;base64,${b64}`, isFinal));
      if (isFinal) sawCompleted = true;
    },
  });

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      parser.feed(value);
    }
  } finally {
    reader.cancel().catch(() => {});
  }
  if (streamError) throw new Error(streamError);
  if (!sawCompleted) throw new Error("Image stream ended without a completed frame");
}
