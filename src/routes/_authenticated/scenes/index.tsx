/**
 * /scenes — the Babylon cinematic scene gallery.
 *
 * A living grid of every scene entry from the registry. Each tile is a
 * procedurally-lit orb that previews the scene's hue, with category filtering
 * and a "random dive" that drops you into a surprise scene. This is the
 * "3D navigation menu" entry point to all the Babylon worlds.
 */

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Dices, Filter } from "lucide-react";
import { SCENES, SCENE_COUNT, type SceneEntry } from "@/lib/babylon/registry";
import { playClick, sfxHover, sfxSparkleBurst } from "@/lib/sound";

export const Route = createFileRoute("/_authenticated/scenes/")({
  head: () => ({
    meta: [
      { title: "Cinematic Scenes · Rewritten AI" },
      {
        name: "description",
        content: "A gallery of immersive Babylon.js 3D worlds.",
      },
    ],
  }),
  component: ScenesGallery,
});

const CATEGORIES = ["All", "Flagship", "Cosmos", "Nature", "Mind", "Worlds", "Concept"] as const;

function ScenesGallery() {
  const navigate = useNavigate();
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("All");

  const filtered = useMemo(
    () => (category === "All" ? SCENES : SCENES.filter((s) => s.category === category)),
    [category],
  );

  const randomDive = () => {
    const pick = SCENES[Math.floor(Math.random() * SCENES.length)];
    sfxSparkleBurst(pick.hue);
    navigate({ to: "/scenes/$slug", params: { slug: pick.slug } });
  };

  return (
    <div className="relative min-h-screen z-10 pb-24">
      <header className="px-6 sm:px-10 pt-8 pb-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Link
              to="/home"
              onMouseEnter={sfxHover}
              className="w-9 h-9 rounded-full flex items-center justify-center text-[#E0F7FA]/60 hover:text-[#00F2FF] transition"
              style={{ background: "rgba(15,25,45,0.5)", backdropFilter: "blur(12px)", border: "1px solid rgba(140,180,255,0.15)" }}
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.5em] text-[#00F2FF]/70">Babylon · Engine</p>
              <h1
                className="text-3xl sm:text-4xl leading-none"
                style={{
                  fontFamily: "var(--font-display), sans-serif",
                  color: "#E0F7FA",
                  textShadow: "-2px 0 rgba(0,242,255,0.4), 2px 0 rgba(236,72,153,0.3), 0 0 40px rgba(120,180,255,0.4)",
                }}
              >
                Cinematic Scenes
              </h1>
            </div>
          </div>
          <button
            data-nodrag
            onClick={randomDive}
            onMouseEnter={sfxHover}
            className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[11px] font-mono uppercase tracking-[0.25em] text-yellow-200 transition hover:scale-105"
            style={{ background: "rgba(255,210,80,0.12)", border: "1px solid rgba(255,210,80,0.4)" }}
          >
            <Dices className="w-4 h-4" /> Random dive
          </button>
        </div>
        <p className="mt-4 text-sm text-[#E0F7FA]/60 max-w-2xl">
          {SCENE_COUNT} immersive worlds rendered with the Babylon.js engine — WebGPU-ready, PBR
          materials, real-time shadows, HDR reflections, and volumetric particles. Drag to orbit,
          scroll to zoom. Each scene is fully procedural.
        </p>
      </header>

      {/* Category filter */}
      <div className="px-6 sm:px-10 max-w-7xl mx-auto flex items-center gap-2 flex-wrap">
        <Filter className="w-4 h-4 text-[#E0F7FA]/40" />
        {CATEGORIES.map((c) => (
          <button
            key={c}
            data-nodrag
            onMouseEnter={sfxHover}
            onClick={() => {
              playClick();
              setCategory(c);
            }}
            className="rounded-full px-3.5 py-1.5 text-[10px] font-mono uppercase tracking-[0.2em] transition hover:scale-105"
            style={{
              color: category === c ? "#001417" : "#9fd8ff",
              background: category === c ? "linear-gradient(135deg, #7fffe0, #00F2FF)" : "rgba(11,16,26,0.5)",
              border: category === c ? "none" : "1px solid rgba(140,180,255,0.15)",
            }}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Grid */}
      <main className="px-6 sm:px-10 max-w-7xl mx-auto mt-7">
        <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <AnimatePresence mode="popLayout">
            {filtered.map((entry, i) => (
              <SceneTile key={entry.slug} entry={entry} index={i} />
            ))}
          </AnimatePresence>
        </motion.div>
      </main>

      <div className="mt-16 text-center">
        <p className="text-[10px] font-mono uppercase tracking-[0.4em] text-[#E0F7FA]/30">
          Babylon.js · WebGPU · PBR · volumetric · shadows · reflections
        </p>
      </div>
    </div>
  );
}

function SceneTile({ entry, index }: { entry: SceneEntry; index: number }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 24, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85 }}
      transition={{ delay: Math.min(index * 0.04, 0.4), duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        to="/scenes/$slug"
        params={{ slug: entry.slug }}
        onMouseEnter={sfxHover}
        className="group relative block rounded-2xl overflow-hidden h-64"
        style={{
          background: `radial-gradient(ellipse at 50% 120%, hsla(${entry.hue},80%,30%,0.4), rgba(11,16,26,0.8))`,
          border: "1px solid rgba(140,180,255,0.14)",
        }}
      >
        {/* Procedural orb preview */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="w-28 h-28 rounded-full transition-transform duration-700 group-hover:scale-110"
            style={{
              background: `radial-gradient(circle at 32% 30%, hsl(${entry.hue},90%,82%) 0%, hsl(${entry.hue},75%,50%) 35%, hsl(${entry.hue},65%,18%) 100%)`,
              boxShadow: `inset -12px -16px 30px rgba(0,0,0,0.55), 0 0 60px hsla(${entry.hue},90%,60%,0.6)`,
              animation: "orbFloat 6s ease-in-out infinite",
            }}
          />
          <div
            className="absolute w-40 h-40 rounded-full border opacity-30 group-hover:opacity-60 transition-opacity"
            style={{ borderColor: `hsla(${entry.hue},90%,70%,0.5)` }}
          />
        </div>

        <span className="absolute top-3 left-3 text-3xl drop-shadow-lg">{entry.icon}</span>
        <span
          className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-[9px] font-mono uppercase tracking-[0.2em]"
          style={{
            color: `hsl(${entry.hue},90%,80%)`,
            background: `hsla(${entry.hue},80%,30%,0.5)`,
            border: `1px solid hsla(${entry.hue},90%,60%,0.4)`,
          }}
        >
          {entry.category}
        </span>

        <div className="absolute bottom-0 left-0 right-0 p-4"
          style={{ background: "linear-gradient(0deg, rgba(11,16,26,0.95), transparent)" }}
        >
          <h3
            className="text-base leading-tight"
            style={{ fontFamily: "var(--font-display), sans-serif", color: "#E8F4FF" }}
          >
            {entry.title}
          </h3>
          <p className="mt-1 text-[11px] text-[#E0F7FA]/55 line-clamp-2 leading-snug">{entry.blurb}</p>
        </div>
      </Link>
    </motion.div>
  );
}
