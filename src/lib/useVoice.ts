import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { synthesizeSpeech } from "@/lib/tts.functions";
import {
  speakWithBestBrowserVoice,
  loadBrowserVoices,
  describeBestBrowserVoice,
  type VoiceFlavor,
} from "@/lib/browserVoice";

const VOICE_KEY = "rewritten_voice_id";

export function getSelectedVoiceId(): string {
  if (typeof localStorage === "undefined") return "aria";
  return localStorage.getItem(VOICE_KEY) || "aria";
}
export function setSelectedVoiceId(id: string) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(VOICE_KEY, id);
  window.dispatchEvent(new Event("voice-change"));
}

/**
 * Voice hook — three-tier pipeline:
 *   1. ElevenLabs neural TTS (via /tts server fn — needs ELEVENLABS_API_KEY)
 *   2. OpenAI TTS via Lovable AI Gateway (needs LOVABLE_API_KEY)
 *   3. Best available browser SpeechSynthesis voice (always works — but we
 *      now pick a REAL human-sounding one: Google UK Female, Samantha, MS
 *      Aria Online, etc. — not the old robotic default).
 *
 * Whichever tier succeeds first sets `provider` to a label the UI can show.
 */
export function useVoice() {
  const tts = useServerFn(synthesizeSpeech);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [provider, setProvider] = useState<string>("");

  // Warm up browser voices ASAP so the list is populated when we need it
  useEffect(() => {
    void loadBrowserVoices();
    void describeBestBrowserVoice().then((label) => {
      // Only set the label if we haven't already spoken (real provider wins)
      if (!provider && label) setProvider(`browser · ${label}`);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      try {
        audioRef.current.pause();
      } catch {
        /* noop */
      }
      audioRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        speechSynthesis.cancel();
      } catch {
        /* noop */
      }
    }
    setSpeaking(false);
  }, []);

  const speak = useCallback(
    async (text: string, voiceId?: string) => {
      const t = text?.trim();
      if (!t) return;
      stop();
      const v = voiceId ?? getSelectedVoiceId();
      setSpeaking(true);

      // Tier 1 + 2: server-side neural TTS (ElevenLabs → Lovable AI)
      try {
        const res = await tts({ data: { text: t, voiceId: v } });
        if (res?.audio) {
          setProvider(res.provider);
          const url = `data:${res.mime};base64,${res.audio}`;
          const audio = new Audio(url);
          audioRef.current = audio;
          await new Promise<void>((resolve) => {
            let settled = false;
            const settle = () => {
              if (settled) return;
              settled = true;
              setSpeaking(false);
              audioRef.current = null;
              resolve();
            };
            audio.onended = settle;
            audio.onerror = settle;
            audio.play().catch(() => settle());
          });
          return;
        }
      } catch (e) {
        console.warn("Neural TTS unavailable, falling back to browser voice:", e);
      }

      // Tier 3: high-quality browser SpeechSynthesis voice
      // (Google UK Female / Samantha / MS Aria Online — NOT the robot default)
      const flavor: VoiceFlavor = /brian|atlas|charlie|callum|onyx|male/i.test(v)
        ? "narrator-male"
        : "warm-female";
      const label = await describeBestBrowserVoice(flavor);
      setProvider(label ? `browser · ${label}` : "browser");
      const result = await speakWithBestBrowserVoice(t, flavor);
      setSpeaking(false);
      if (!result.ok) {
        console.warn("Browser TTS also failed — audio may be muted");
      }
    },
    [stop, tts],
  );

  return { speak, stop, speaking, provider };
}
