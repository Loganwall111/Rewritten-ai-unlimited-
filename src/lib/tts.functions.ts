import { createServerFn } from "@tanstack/react-start";
import { getVoiceById } from "./voices";

/**
 * Text-to-speech server function.
 * Primary: ElevenLabs (if ELEVENLABS_API_KEY set)
 * Falls through to browser SpeechSynthesis voice (handled client-side).
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

    // No TTS provider configured — throw so the client falls back to browser voice.
    throw new Error("No TTS provider available");
  });
