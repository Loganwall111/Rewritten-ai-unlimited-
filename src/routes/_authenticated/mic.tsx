import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Mic, Square, X, ArrowLeft } from "lucide-react";
import LiquidOrb from "@/components/LiquidOrb";
import VoiceSelector from "@/components/VoiceSelector";
import { useVoice } from "@/lib/useVoice";
import { playClick } from "@/lib/sound";

/**
 * Portal Mic — a full-page voice interface reached by clicking the small
 * floating mic. The room dissolves, the mic BECOMES the world:
 *   • Giant Siri-style liquid orb (420px), gravitationally-lens-warped
 *   • Concentric expanding rings pulse while listening
 *   • Live transcript floats above, model reply floats below
 *   • Voice selector + provider label in a glass panel
 *   • A "return to portal" button in the corner
 */
export const Route = createFileRoute("/_authenticated/mic")({
  head: () => ({
    meta: [
      { title: "Voice · Rewritten AI" },
      {
        name: "description",
        content: "Speak to the portal.",
      },
    ],
  }),
  component: MicPage,
});

type SR = {
  new (): {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onresult: ((e: unknown) => void) | null;
    onend: (() => void) | null;
    onerror: ((e: unknown) => void) | null;
    start: () => void;
    stop: () => void;
  };
};

function getRecognitionCtor(): SR | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SR;
    webkitSpeechRecognition?: SR;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function MicPage() {
  const navigate = useNavigate();
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [reply, setReply] = useState("");
  const [thinking, setThinking] = useState(false);
  const { speak, speaking, stop, provider } = useVoice();

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  const askAndSpeak = async (text: string) => {
    setThinking(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content:
                "You are Rewritten AI Unlimited, a warm, brief voice assistant. Answer in one short spoken paragraph.",
            },
            { role: "user", content: text },
          ],
        }),
      });
      const data = (await res.json()) as { text?: string };
      const answer = data.text ?? "";
      setReply(answer);
      if (answer) await speak(answer);
    } catch (e) {
      console.error(e);
    } finally {
      setThinking(false);
    }
  };

  const startListen = () => {
    playClick();
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setReply("Voice input isn't supported in this browser — try Chrome.");
      return;
    }
    const rec = new Ctor();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = "en-US";
    setListening(true);
    setTranscript("");
    setReply("");
    rec.onresult = (e: unknown) => {
      const ev = e as {
        resultIndex: number;
        results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
      };
      let interim = "";
      let final = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const r = ev.results[i];
        if (r.isFinal) final += r[0].transcript;
        else interim += r[0].transcript;
      }
      setTranscript(final || interim);
      if (final) {
        rec.stop();
        askAndSpeak(final);
      }
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    rec.start();
  };

  const active = listening || speaking || thinking;
  const stateLabel = listening
    ? "Listening…"
    : thinking
      ? "Thinking…"
      : speaking
        ? "Speaking…"
        : "Tap to speak";

  return (
    <div className="relative -mx-24 -my-10 min-h-screen overflow-hidden flex flex-col items-center">
      {/* Return button */}
      <button
        onClick={() => {
          playClick();
          navigate({ to: "/home" });
        }}
        className="absolute top-24 left-8 z-20 rounded-full glass-panel px-4 py-2 text-xs uppercase tracking-widest text-[#E0F7FA]/80 hover:text-[#00F2FF] hover:border-[#00F2FF]/50 flex items-center gap-2 transition"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Portal
      </button>

      {/* Eyebrow */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="mt-28 mb-4 flex flex-col items-center gap-2"
      >
        <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 glass-panel">
          <span
            className="inline-block w-1.5 h-1.5 rounded-full bg-[#00F2FF]"
            style={{
              boxShadow: "0 0 10px 2px rgba(0,242,255,0.7)",
              animation: active ? "ambientPulse 1.2s ease-in-out infinite" : undefined,
            }}
          />
          <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#00F2FF]/80">
            Voice · Portal Mic
          </p>
        </div>
        <h1
          className="text-3xl md:text-4xl text-[#E0F7FA]"
          style={{
            fontFamily: "var(--font-display)",
            textShadow:
              "-1px 0 rgba(0,242,255,0.35), 1px 0 rgba(236,72,153,0.25), 0 0 24px rgba(120,180,255,0.35)",
          }}
        >
          Speak to the portal.
        </h1>
      </motion.div>

      {/* Transcript above */}
      <div className="min-h-[48px] max-w-2xl px-6 text-center mb-4">
        {transcript && (
          <motion.p
            key={transcript}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-base text-[#E0F7FA]/90 italic"
            style={{ textShadow: "0 2px 8px rgba(0,0,0,0.7)" }}
          >
            &ldquo;{transcript}&rdquo;
          </motion.p>
        )}
      </div>

      {/* The giant orb, with gravitational-lens-warped pulse rings */}
      <div className="relative flex items-center justify-center" style={{ perspective: 1400 }}>
        {/* Concentric pulse rings — behind the orb */}
        {active &&
          [0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="absolute rounded-full border pointer-events-none"
              style={{
                width: 460 + i * 90,
                height: 460 + i * 90,
                borderColor: i % 2 === 0 ? "rgba(0,242,255,0.4)" : "rgba(124,58,237,0.35)",
                animation: `micRing 3.4s ease-out ${i * 0.35}s infinite`,
              }}
            />
          ))}

        {/* Halo behind the orb (always on) */}
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 640,
            height: 640,
            background:
              "conic-gradient(from 0deg, rgba(0,242,255,0.15), rgba(124,58,237,0.10), rgba(236,72,153,0.10), rgba(0,242,255,0.15))",
            filter: "blur(50px)",
            animation: "slowSpin 40s linear infinite",
            opacity: active ? 1 : 0.6,
            transition: "opacity 0.5s",
          }}
        />

        {/* THE big mic orb — wrapped in the gravitational lens SVG filter */}
        <div
          className="relative lens-warp-strong cursor-pointer group"
          onClick={active ? undefined : startListen}
          role="button"
          aria-label={stateLabel}
        >
          <LiquidOrb
            size={420}
            hue={active ? (listening ? 200 : speaking ? 320 : 45) : 260}
            hue2={active ? (listening ? 260 : speaking ? 260 : 15) : 320}
            intensity={active ? 1.7 : 1.1}
            glow={active ? 1.7 : 1.1}
            active={active}
            index={0}
          >
            <div className="flex flex-col items-center text-white pointer-events-none">
              <Mic
                className="w-14 h-14"
                strokeWidth={1.3}
                style={{
                  filter:
                    "drop-shadow(0 0 24px rgba(255,255,255,0.95)) drop-shadow(0 0 12px rgba(0,242,255,0.85))",
                }}
              />
              <span
                className="mt-3 text-xs font-mono uppercase tracking-[0.5em]"
                style={{ textShadow: "0 2px 8px rgba(0,0,0,0.9)" }}
              >
                {stateLabel}
              </span>
            </div>
          </LiquidOrb>
        </div>

        {/* Refractive floor puddle */}
        <div
          className="absolute pointer-events-none"
          style={{
            width: 380,
            height: 60,
            bottom: -20,
            background:
              "radial-gradient(ellipse at center, rgba(0,242,255,0.6) 0%, rgba(124,58,237,0.25) 40%, transparent 75%)",
            filter: "blur(14px)",
            opacity: active ? 0.95 : 0.65,
            transition: "opacity 0.5s",
          }}
        />
      </div>

      {/* Reply below */}
      <div className="min-h-[60px] max-w-2xl px-6 text-center mt-6">
        {reply && (
          <motion.p
            key={reply}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm text-[#00F2FF] leading-relaxed"
            style={{ textShadow: "0 0 12px rgba(0,242,255,0.6)" }}
          >
            {reply}
          </motion.p>
        )}
        {!transcript && !reply && (
          <p className="text-xs font-mono text-[#E0F7FA]/40 tracking-widest uppercase">
            Tap the orb and speak.
          </p>
        )}
      </div>

      {/* Controls + voice picker */}
      <div className="mt-6 flex flex-col items-center gap-4 w-full max-w-lg px-6 pb-10">
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={startListen}
            disabled={active}
            className="rounded-full glass-panel-strong px-8 py-3 text-sm tracking-widest uppercase text-[#00F2FF] disabled:opacity-50 hover:scale-105 transition-transform"
            style={{
              boxShadow: "inset 0 0 30px rgba(0,242,255,0.25), 0 0 30px rgba(0,242,255,0.35)",
            }}
          >
            {listening ? "Listening…" : "▸ Speak"}
          </button>
          {(speaking || thinking) && (
            <button
              onClick={() => stop()}
              className="rounded-full glass-panel px-6 py-3 text-xs uppercase tracking-widest text-[#E0F7FA]/80 hover:text-[#00F2FF] flex items-center gap-2"
            >
              <Square className="w-3.5 h-3.5" />
              Stop
            </button>
          )}
          <button
            onClick={() => {
              setTranscript("");
              setReply("");
              stop();
            }}
            className="rounded-full glass-panel px-6 py-3 text-xs uppercase tracking-widest text-[#E0F7FA]/60 hover:text-[#00F2FF]/80 flex items-center gap-2"
          >
            <X className="w-3.5 h-3.5" />
            Clear
          </button>
        </div>

        <div className="w-full glass-panel rounded-2xl p-4">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-[#E0F7FA]/50">
            Voice
          </p>
          <VoiceSelector />
          {provider && (
            <p className="mt-2 text-[9px] font-mono text-[#E0F7FA]/40">
              via <span className="text-[#00F2FF]">{provider}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
