import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Sparkles, Waves, Zap, LogIn, UserPlus } from "lucide-react";
import LiquidOrb from "@/components/LiquidOrb";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Rewritten AI Unlimited — every model, every voice, one lens" },
      {
        name: "description",
        content:
          "Chat, code, images, video, and voice — all warped through gravitational lenses, drifting whales, and spinning black holes. Sign in to enter the portal.",
      },
      { property: "og:title", content: "Rewritten AI Unlimited" },
      {
        property: "og:description",
        content: "A lensed portal to every model, every voice, every creation.",
      },
    ],
  }),
  component: Landing,
});

const FEATURE_ORBS = [
  {
    icon: Sparkles,
    title: "Every model",
    desc: "GPT-5, Gemini 3, Nano Banana, Seedance.",
    hue: 200,
  },
  {
    icon: Waves,
    title: "Realistic voice",
    desc: "ElevenLabs primary · Lovable AI TTS fallback.",
    hue: 285,
  },
  {
    icon: Zap,
    title: "One lens",
    desc: "Wormhole intro, ripples, whales, vortexes.",
    hue: 320,
  },
];

function Landing() {
  return (
    <div className="min-h-screen relative z-10 flex flex-col">
      <header className="flex items-center justify-between px-8 py-6">
        <p className="font-mono text-[11px] tracking-[0.5em] uppercase text-[#00F2FF] drop-shadow-[0_0_8px_rgba(0,242,255,0.6)]">
          Rewritten · AI
        </p>
        <nav className="flex items-center gap-3">
          <Link
            to="/auth"
            search={{ mode: "login" }}
            className="text-xs font-mono uppercase tracking-widest text-[#E0F7FA]/70 hover:text-[#00F2FF]"
          >
            Sign in
          </Link>
          <Link
            to="/auth"
            search={{ mode: "register" }}
            className="portal-tab active rounded-full px-5 py-2 text-xs font-mono uppercase tracking-widest text-[#00F2FF]"
          >
            Enter the lens
          </Link>
        </nav>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-5xl text-center"
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.5em] text-[#00F2FF]/70">
            Unlimited · voice · video · code · vision
          </p>
          <h1
            className="mt-4 text-5xl sm:text-7xl leading-tight"
            style={{
              fontFamily: "var(--font-display)",
              color: "#E0F7FA",
              textShadow:
                "-2px 0 rgba(0,242,255,0.35), 2px 0 rgba(236,72,153,0.28), 0 0 40px rgba(120,180,255,0.4)",
            }}
          >
            A lensed portal to <span className="text-[#00F2FF]">every model</span>.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-sm text-[#E0F7FA]/70">
            Chat, code, images, video, and voice — all warped through gravitational lenses, drifting
            whales, and spinning black holes. Realistic ElevenLabs voice included.
          </p>

          {/* PRIMARY CTAs — big orb-buttons */}
          <div className="mt-14 flex items-center justify-center gap-12 md:gap-20">
            <Link
              to="/auth"
              search={{ mode: "login" }}
              className="group flex flex-col items-center"
              aria-label="Sign in"
            >
              <LiquidOrb size={140} hue={200} hue2={260} index={0}>
                <div className="flex flex-col items-center text-white pointer-events-none">
                  <LogIn
                    className="w-6 h-6"
                    strokeWidth={1.6}
                    style={{
                      filter: "drop-shadow(0 0 10px rgba(255,255,255,0.9))",
                    }}
                  />
                  <span
                    className="mt-1 text-[10px] font-mono uppercase tracking-[0.3em]"
                    style={{ textShadow: "0 2px 6px rgba(0,0,0,0.8)" }}
                  >
                    Sign in
                  </span>
                </div>
              </LiquidOrb>
              <span
                className="mt-4 text-[11px] font-mono uppercase tracking-widest text-[#E0F7FA]/70 group-hover:text-[#00F2FF] transition-colors"
                style={{ textShadow: "0 2px 6px rgba(0,0,0,0.8)" }}
              >
                Existing operator
              </span>
            </Link>

            <Link
              to="/auth"
              search={{ mode: "register" }}
              className="group flex flex-col items-center"
              aria-label="Create account"
            >
              <LiquidOrb size={180} hue={285} hue2={320} index={1} active>
                <div className="flex flex-col items-center text-white pointer-events-none">
                  <UserPlus
                    className="w-8 h-8"
                    strokeWidth={1.5}
                    style={{
                      filter: "drop-shadow(0 0 12px rgba(255,255,255,0.95))",
                    }}
                  />
                  <span
                    className="mt-2 text-xs font-mono uppercase tracking-[0.3em]"
                    style={{ textShadow: "0 2px 6px rgba(0,0,0,0.8)" }}
                  >
                    Sign up
                  </span>
                </div>
              </LiquidOrb>
              <span
                className="mt-4 text-[11px] font-mono uppercase tracking-widest text-[#00F2FF]"
                style={{ textShadow: "0 0 12px rgba(0,242,255,0.6)" }}
              >
                Enter the lens →
              </span>
            </Link>
          </div>

          {/* Feature trio */}
          <div className="mt-20 flex flex-wrap items-start justify-center gap-14">
            {FEATURE_ORBS.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 18, scale: 0.85 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{
                    delay: 0.4 + i * 0.12,
                    duration: 0.6,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="flex flex-col items-center"
                >
                  <LiquidOrb size={120} hue={f.hue} index={i + 2}>
                    <Icon
                      className="w-6 h-6 text-white/95 pointer-events-none"
                      strokeWidth={1.5}
                      style={{
                        filter: `drop-shadow(0 0 8px hsla(${f.hue},95%,70%,0.9))`,
                      }}
                    />
                  </LiquidOrb>
                  <h3
                    className="mt-4 text-sm font-medium text-[#E0F7FA]"
                    style={{ textShadow: "0 2px 8px rgba(0,0,0,0.7)" }}
                  >
                    {f.title}
                  </h3>
                  <p className="mt-1 max-w-[200px] text-[11px] text-[#E0F7FA]/60">{f.desc}</p>
                </motion.div>
              );
            })}
          </div>

          {/* Navigation hint */}
          <div className="mt-16 flex items-center justify-center gap-6 text-[10px] font-mono tracking-widest text-[#E0F7FA]/40">
            <span>⌖ DRAG TO ORBIT</span>
            <span>·</span>
            <span>WASD TO STRAFE</span>
            <span>·</span>
            <span>SCROLL TO DOLLY</span>
            <span>·</span>
            <span>SPACE TO RECENTER</span>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
