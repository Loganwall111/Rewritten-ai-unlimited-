/**
 * Voice welcome + skippable tutorial.
 *
 * Fires ONCE per browser (localStorage key) after the boot screen finishes.
 * Order:
 *   1. TTS says: "Welcome to Rewritten AI Unlimited. All systems ready to go."
 *   2. A "Skip tutorial" button appears immediately.
 *   3. TTS then walks through 5 steps, each spoken while a spotlight ring
 *      highlights the on-screen element it's describing.
 *
 * Uses:
 *   • useVoice (ElevenLabs → Lovable AI TTS → browser SpeechSynthesis
 *     fallback) — same voice engine as the mic page.
 *   • sfxTutorialNext between steps.
 *
 * Fully skippable: users can hit Skip or press Esc at any time.
 */

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Play, Volume2 } from "lucide-react";
import { useVoice } from "@/lib/useVoice";
import { sfxTutorialNext, sfxPortalBoom } from "@/lib/sound";

const KEY = "rewritten_welcome_seen_v1";

type Step = {
  say: string;
  title: string;
  hint: string;
  /** CSS selector for the element to spotlight; null = center screen */
  spotlight?: string | null;
};

const WELCOME_LINE = "Welcome to Rewritten AI Unlimited. All systems ready to go.";

const STEPS: Step[] = [
  {
    say: "You can navigate with the orbs on either side, or press command K for the palette.",
    title: "Navigate the portal.",
    hint: "Sidebar orbs or ⌘K",
    spotlight: 'nav[class*="left-3"]',
  },
  {
    say: "The multiverse is a black hole full of AI models. Scroll to zoom into it.",
    title: "Enter the multiverse.",
    hint: "Sidebar → Multi orb, or press G+U",
    spotlight: 'a[href="/multiverse"]',
  },
  {
    say: "The Singularity fuses every model into one voice. Ask it anything.",
    title: "One brain, all models.",
    hint: "Sidebar → One orb, or press G+O",
    spotlight: 'a[href="/singularity"]',
  },
  {
    say: "Tap the microphone orb in the corner to speak with the portal directly.",
    title: "Speak to the portal.",
    hint: "Bottom-left mic orb",
    spotlight: '[aria-label="Open voice portal"]',
  },
  {
    say: "Drag anywhere to warp the field. The whole world is yours to explore.",
    title: "Drag to warp.",
    hint: "Click + drag empty space",
    spotlight: null,
  },
];

export default function WelcomeTutorial({ ready }: { ready: boolean }) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<"welcome" | "tour" | "done">("welcome");
  const [step, setStep] = useState(0);
  const { speak, stop, provider } = useVoice();
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);
  const startedRef = useRef(false);

  // Fire once boot is done + this session hasn't seen it
  useEffect(() => {
    if (!ready) return;
    if (typeof window === "undefined") return;
    if (localStorage.getItem(KEY) === "1") return;
    if (startedRef.current) return;
    startedRef.current = true;
    setOpen(true);
    // Small delay so the boot fade-out completes cleanly
    const t = setTimeout(async () => {
      sfxPortalBoom();
      // Speak the welcome line
      try {
        await speak(WELCOME_LINE);
      } catch {
        /* fallback handled by useVoice */
      }
      setPhase("tour");
      setStep(0);
    }, 400);
    return () => clearTimeout(t);
  }, [ready, speak]);

  // Auto-advance the tour: speak the line, wait, next
  useEffect(() => {
    if (phase !== "tour") return;
    if (step >= STEPS.length) {
      finish();
      return;
    }
    const s = STEPS[step];
    // Update spotlight target
    if (s.spotlight) {
      const el = document.querySelector<HTMLElement>(s.spotlight);
      setSpotlightRect(el?.getBoundingClientRect() ?? null);
    } else {
      setSpotlightRect(null);
    }
    let cancelled = false;
    (async () => {
      sfxTutorialNext();
      try {
        await speak(s.say);
      } catch {
        /* noop */
      }
      // Give the user a beat to look at the highlight
      if (cancelled) return;
      const t = setTimeout(() => {
        if (!cancelled) setStep((n) => n + 1);
      }, 900);
      return () => clearTimeout(t);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, step]);

  // Recompute spotlight on resize
  useEffect(() => {
    if (!spotlightRect) return;
    const s = STEPS[step];
    if (!s?.spotlight) return;
    const onResize = () => {
      const el = document.querySelector<HTMLElement>(s.spotlight!);
      setSpotlightRect(el?.getBoundingClientRect() ?? null);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [spotlightRect, step]);

  // Esc to skip
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const finish = () => {
    stop();
    setPhase("done");
    setOpen(false);
    if (typeof window !== "undefined") localStorage.setItem(KEY, "1");
  };

  const skip = () => {
    finish();
  };

  if (!open) return null;

  const currentStep = phase === "tour" ? STEPS[step] : null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4 }}
        className="pointer-events-none fixed inset-0 z-[195]"
      >
        {/* Dimming veil — only during welcome, softens for tour so users see the highlighted element */}
        <div
          className="absolute inset-0 transition-opacity duration-500"
          style={{
            background:
              phase === "welcome"
                ? "radial-gradient(ellipse at center, rgba(2,4,15,0.55) 0%, rgba(0,0,0,0.75) 100%)"
                : "radial-gradient(ellipse at center, rgba(2,4,15,0.35) 0%, rgba(0,0,0,0.55) 100%)",
            backdropFilter: "blur(2px)",
          }}
        />

        {/* Spotlight ring around the target element */}
        {spotlightRect && phase === "tour" && (
          <motion.div
            key={step}
            initial={{ opacity: 0, scale: 1.4 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-none absolute rounded-full"
            style={{
              left: spotlightRect.left - 16,
              top: spotlightRect.top - 16,
              width: spotlightRect.width + 32,
              height: spotlightRect.height + 32,
              boxShadow:
                "0 0 0 4px rgba(0,242,255,0.65), 0 0 40px 10px rgba(0,242,255,0.55), 0 0 100px 30px rgba(124,58,237,0.4)",
              border: "1px solid rgba(220,240,255,0.8)",
              animation: "spotlightBreath 2s ease-in-out infinite",
            }}
          />
        )}

        {/* Central message + controls */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center justify-center px-4">
          <motion.div
            key={phase + step}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-auto glass-panel-strong rounded-3xl px-8 py-6 max-w-xl text-center"
            style={{
              boxShadow:
                "0 40px 120px -30px rgba(0,242,255,0.5), 0 20px 80px -20px rgba(124,58,237,0.4), 0 0 60px rgba(0,242,255,0.3)",
              border: "1px solid rgba(0,242,255,0.35)",
            }}
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <Volume2 className="w-3.5 h-3.5 text-[#00F2FF]" />
              <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#00F2FF]/80">
                {phase === "welcome"
                  ? "Booting voice…"
                  : `Tutorial · ${step + 1} / ${STEPS.length}`}
              </p>
            </div>
            <h2
              className="text-2xl md:text-3xl text-[#E0F7FA]"
              style={{
                fontFamily: "var(--font-display)",
                textShadow:
                  "-1px 0 rgba(0,242,255,0.35), 1px 0 rgba(236,72,153,0.25), 0 0 24px rgba(120,180,255,0.35)",
              }}
            >
              {phase === "welcome"
                ? "Welcome to Rewritten AI Unlimited."
                : (currentStep?.title ?? "")}
            </h2>
            {phase === "welcome" && (
              <p className="mt-3 text-sm text-[#E0F7FA]/75">All systems ready to go.</p>
            )}
            {phase === "tour" && currentStep && (
              <>
                <p className="mt-3 text-sm text-[#E0F7FA]/75 leading-relaxed">{currentStep.say}</p>
                <p className="mt-2 text-[10px] font-mono uppercase tracking-widest text-[#00F2FF]/60">
                  {currentStep.hint}
                </p>
              </>
            )}
            {provider && phase === "tour" && (
              <p className="mt-3 text-[9px] font-mono text-[#E0F7FA]/40">
                voice via <span className="text-[#00F2FF]">{provider}</span>
              </p>
            )}
            <div className="mt-6 flex items-center justify-center gap-2">
              {phase === "tour" && step < STEPS.length - 1 && (
                <button
                  onClick={() => setStep((n) => n + 1)}
                  className="rounded-full portal-tab active px-5 py-2 text-xs uppercase tracking-widest text-[#00F2FF] flex items-center gap-2"
                >
                  <Play className="w-3 h-3" />
                  Next
                </button>
              )}
              <button
                onClick={skip}
                className="rounded-full glass-panel px-5 py-2 text-xs uppercase tracking-widest text-[#E0F7FA]/80 hover:text-[#00F2FF] flex items-center gap-2"
              >
                <X className="w-3 h-3" />
                Skip tutorial
              </button>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
