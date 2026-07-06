/**
 * Floating "unmute the sea" button (bottom-right). Starts / stops the
 * ambient underwater+cosmic loop. Persists preference in localStorage.
 *
 * Renders as a small liquid-orb-styled button so it fits the aesthetic.
 * Browsers block auto-play with sound, so the first click is required
 * anyway — we surface a big glowing pulse until the user acts.
 */
import { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { startAmbient, stopAmbient, isAmbientPlaying } from "@/lib/sound";

const KEY = "rewritten_ambient_on";

export default function AmbientToggle() {
  const [on, setOn] = useState(false);
  const [pulse, setPulse] = useState(true);

  // Restore preference (but don't auto-start — browser will block)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem(KEY);
    if (saved === "1") {
      // We *want* it on, but must wait for a user interaction. Prime a
      // one-shot click listener that starts it, then removes itself.
      const prime = () => {
        startAmbient();
        setOn(isAmbientPlaying());
        setPulse(false);
        window.removeEventListener("click", prime);
      };
      window.addEventListener("click", prime, { once: true });
    }
  }, []);

  const toggle = () => {
    if (on) {
      stopAmbient();
      setOn(false);
      localStorage.setItem(KEY, "0");
    } else {
      startAmbient();
      setOn(isAmbientPlaying());
      localStorage.setItem(KEY, "1");
      setPulse(false);
    }
  };

  return (
    <button
      onClick={toggle}
      title={on ? "Silence the sea" : "Unmute ambient sound"}
      aria-label={on ? "Silence ambient" : "Unmute ambient"}
      className="fixed bottom-6 right-6 z-40 rounded-full flex items-center justify-center transition-all hover:scale-110"
      style={{
        width: 48,
        height: 48,
        background:
          "radial-gradient(circle at 32% 28%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.1) 15%, hsla(200,85%,65%,0.55) 40%, hsla(260,90%,40%,0.55) 75%, rgba(5,8,20,0.95) 100%)",
        boxShadow: on
          ? "inset -6px -8px 16px rgba(0,0,0,0.5), 0 0 30px rgba(0,242,255,0.85), 0 0 12px rgba(0,242,255,0.6)"
          : "inset -6px -8px 16px rgba(0,0,0,0.5), 0 6px 20px rgba(0,242,255,0.35)",
        animation: pulse ? "ambientPulse 2s ease-in-out infinite" : undefined,
      }}
    >
      <div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, transparent 62%, rgba(180,220,255,0.35) 76%, rgba(200,225,255,0.55) 84%, transparent 90%)",
        }}
      />
      <div
        className="absolute pointer-events-none rounded-full"
        style={{
          top: "12%",
          left: "18%",
          width: "48%",
          height: "30%",
          background:
            "radial-gradient(ellipse at 30% 30%, rgba(255,255,255,0.9) 0%, transparent 65%)",
          filter: "blur(1px)",
          transform: "rotate(-25deg)",
        }}
      />
      {on ? (
        <Volume2
          className="relative w-4 h-4 text-white"
          strokeWidth={1.8}
          style={{ filter: "drop-shadow(0 0 6px rgba(0,242,255,0.95))" }}
        />
      ) : (
        <VolumeX className="relative w-4 h-4 text-white/85" strokeWidth={1.6} />
      )}
    </button>
  );
}
