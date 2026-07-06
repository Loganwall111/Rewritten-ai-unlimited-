import { createServerFn } from "@tanstack/react-start";
import { getVoiceById } from "./voices";

/**
 * Text-to-speech server function.
 * Primary: ElevenLabs (if ELEVENLABS_API_KEY set)
 * Fallback: Lovable AI Gateway openai/gpt-4o-mini-tts
 * Returns base64-encoded MP3 audio.
 */
export const synthesizeSpeech = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    const d = input as { text?: string; voiceId?: string };
    return {
      text: String(d.text ?? "").slice(0, 4000),
      voiceId: String(d.voiceId ?? "aria"),
    };
  })
  .handler(async ({ data }) => {
    const voice = getVoiceById(data.voiceId);
    const text = data.text.trim();
    if (!text) return { audio: "", mime: "audio/mpeg", provider: "none" as const };

    const elevenKey = process.env.ELEVENLABS_API_KEY;
    if (elevenKey) {
      try {
        const res = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${voice.elevenVoiceId}?output_format=mp3_44100_128`,
          {
            method: "POST",
            headers: {
              "xi-api-key": elevenKey,
              "Content-Type": "application/json",
              Accept: "audio/mpeg",
            },
            body: JSON.stringify({
              text,
              model_id: "eleven_turbo_v2_5",
              voice_settings: { stability: 0.5, similarity_boost: 0.8, use_speaker_boost: true },
            }),
          },
        );
        if (res.ok) {
          const buf = await res.arrayBuffer();
          return {
            audio: Buffer.from(buf).toString("base64"),
            mime: "audio/mpeg",
            provider: "elevenlabs" as const,
          };
        }
        console.warn("ElevenLabs failed", res.status, await res.text().catch(() => ""));
      } catch (e) {
        console.warn("ElevenLabs error", e);
      }
    }

    // Fallback: Lovable AI Gateway TTS
    const lovableKey = process.env.LOVABLE_API_KEY;
    if (!lovableKey) throw new Error("No TTS provider available");
    const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini-tts",
        input: text,
        voice: voice.openaiVoice,
        response_format: "mp3",
      }),
    });
    if (!res.ok) {
      const err = await res.text().catch(() => "");
      throw new Error(`Lovable AI TTS ${res.status}: ${err.slice(0, 200)}`);
    }
    const buf = await res.arrayBuffer();
    return {
      audio: Buffer.from(buf).toString("base64"),
      mime: "audio/mpeg",
      provider: "lovable-ai" as const,
    };
  });
