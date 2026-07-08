/**
 * BabylonLandingHero — the new front door.
 *
 * A full-bleed Babylon "Cosmic Gateway" scene (glowing icosphere, orbital
 * rings, 3,000-particle nebula) rendered as the landing's hero background,
 * with the sign-in / sign-up CTAs floating over it in 3D space.
 *
 * Crucially this needs NO environment variables and NO login to render — it's
 * pure Babylon. Visitors see the graphics overhaul the instant they arrive.
 */

import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { LogIn, UserPlus, Sparkles, DoorOpen } from "lucide-react";
import { BabylonSceneHost } from "@/lib/babylon/BabylonSceneHost";
import { buildLanding } from "@/lib/babylon/scenes/landing";
import { sfxHover } from "@/lib/sound";

export function BabylonLandingHero() {
  return (
    <div className="fixed inset-0 -z-0">
      {/* Full-bleed Babylon canvas — the graphics overhaul, day one */}
      <BabylonSceneHost
        setup={buildLanding}
        hdr
        ambient={0.5}
        camera={{
          alpha: -Math.PI / 2,
          beta: Math.PI / 2.3,
          radius: 34,
          autoRotate: true,
          lowerRadius: 20,
          upperRadius: 70,
        }}
        sun={{ direction: [-0.5, -1, -0.7], intensity: 1.4, shadowMapSize: 0 }}
        postProcess={{
          bloom: true,
          bloomWeight: 0.9,
          bloomThreshold: 0.3,
          imageProcessing: true,
          exposure: 1.2,
          contrast: 1.2,
          vignette: true,
          vignetteWeight: 1.2,
          fxaa: true,
        }}
        className="absolute inset-0"
      />

      {/* UI overlay */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between px-6 sm:px-10 py-6">
          <p className="font-mono text-[11px] tracking-[0.5em] uppercase text-[#00F2FF] drop-shadow-[0_0_8px_rgba(0,242,255,0.6)]">
            Rewritten · AI
          </p>
          <nav className="flex items-center gap-3">
            <Link
              to="/auth"
              search={{ mode: "login" }}
              onMouseEnter={sfxHover}
              className="text-xs font-mono uppercase tracking-widest text-[#E0F7FA]/70 hover:text-[#00F2FF] transition"
            >
              Sign in
            </Link>
            <Link
              to="/auth"
              search={{ mode: "register" }}
              onMouseEnter={sfxHover}
              className="portal-tab active rounded-full px-5 py-2 text-xs font-mono uppercase tracking-widest text-[#00F2FF]"
            >
              Enter the lens
            </Link>
          </nav>
        </header>

        {/* Hero content */}
        <main className="flex-1 flex flex-col items-center justify-center px-6 pb-20 text-center">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="font-mono text-[10px] uppercase tracking-[0.5em] text-[#00F2FF]/80"
          >
            Babylon engine · every model · every voice
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.55, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="mt-4 text-5xl sm:text-7xl lg:text-8xl leading-none"
            style={{
              fontFamily: "var(--font-display)",
              color: "#E0F7FA",
              textShadow:
                "-2px 0 rgba(0,242,255,0.4), 2px 0 rgba(236,72,153,0.3), 0 0 60px rgba(120,180,255,0.5)",
            }}
          >
            A lensed portal to <span className="text-[#00F2FF]">every model</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.8 }}
            className="mx-auto mt-6 max-w-xl text-sm text-[#E0F7FA]/75"
          >
            Chat, code, images, video, and voice — all warped through gravitational lenses, drifting
            whales, and spinning black holes. Powered by a WebGPU-ready Babylon engine.
          </motion.p>

          {/* CTA orbs */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0, duration: 0.8 }}
            className="mt-14 flex items-center justify-center gap-8 sm:gap-14"
          >
            <Link
              to="/auth"
              search={{ mode: "login" }}
              onMouseEnter={sfxHover}
              className="group flex flex-col items-center"
            >
              <div
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-full flex items-center justify-center transition-transform group-hover:scale-110"
                style={{
                  background:
                    "radial-gradient(circle at 32% 30%, rgba(127,200,255,0.95) 0%, rgba(0,160,255,0.6) 35%, rgba(10,40,90,1) 100%)",
                  boxShadow: "inset -8px -10px 24px rgba(0,0,0,0.55), 0 0 50px rgba(0,180,255,0.6)",
                }}
              >
                <LogIn
                  className="w-6 h-6 text-white"
                  strokeWidth={1.6}
                  style={{ filter: "drop-shadow(0 0 8px rgba(255,255,255,0.9))" }}
                />
              </div>
              <span className="mt-3 text-[11px] font-mono uppercase tracking-widest text-[#E0F7FA]/70 group-hover:text-[#00F2FF] transition-colors">
                Sign in
              </span>
            </Link>

            <Link
              to="/auth"
              search={{ mode: "register" }}
              onMouseEnter={sfxHover}
              className="group flex flex-col items-center"
            >
              <div
                className="w-32 h-32 sm:w-40 sm:h-40 rounded-full flex items-center justify-center transition-transform group-hover:scale-110"
                style={{
                  background:
                    "radial-gradient(circle at 32% 30%, rgba(200,150,255,0.95) 0%, rgba(140,60,255,0.6) 35%, rgba(40,10,90,1) 100%)",
                  boxShadow:
                    "inset -10px -12px 28px rgba(0,0,0,0.6), 0 0 70px rgba(150,80,255,0.7)",
                }}
              >
                <UserPlus
                  className="w-8 h-8 text-white"
                  strokeWidth={1.5}
                  style={{ filter: "drop-shadow(0 0 10px rgba(255,255,255,0.95))" }}
                />
              </div>
              <span className="mt-3 text-[12px] font-mono uppercase tracking-widest text-[#00F2FF]">
                Enter the lens →
              </span>
            </Link>
          </motion.div>

          {/* Feature pills */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.3, duration: 1 }}
            className="mt-16 flex flex-wrap items-center justify-center gap-3"
          >
            {[
              "22 cinematic worlds",
              "Real-time shadows",
              "PBR reflections",
              "Havok physics",
              "WebGPU-ready",
            ].map((f) => (
              <span
                key={f}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-mono uppercase tracking-[0.2em] text-[#E0F7FA]/70"
                style={{
                  background: "rgba(11,16,26,0.5)",
                  backdropFilter: "blur(10px)",
                  border: "1px solid rgba(140,180,255,0.15)",
                }}
              >
                <Sparkles className="w-3 h-3 text-[#00F2FF]" />
                {f}
              </span>
            ))}
          </motion.div>

          {/* Explore hub link */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5, duration: 1 }}
            className="mt-8"
          >
            <Link
              to="/world"
              onMouseEnter={sfxHover}
              className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[#00F22FF]/60 hover:text-[#00F2FF] transition"
            >
              <DoorOpen className="w-4 h-4" />
              Explore the Hub of Doors — no sign-in required
            </Link>
          </motion.div>
        </main>

        {/* Scroll hint */}
        <div className="pb-6 text-center">
          <p className="text-[10px] font-mono uppercase tracking-[0.4em] text-[#E0F7FA]/40">
            Drag to orbit · scroll to zoom
          </p>
        </div>
      </div>
    </div>
  );
}
