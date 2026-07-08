/**
 * GenesisPanel — the "Create a New World" wizard.
 *
 * Pick an archetype, a time of day, optionally a custom name + seed, then
 * spawn. Includes a "surprise me" randomiser and a live seed re-roll so the
 * operator can feel the procedural variety before committing.
 */

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dices, Sparkles, Wand2, X, ArrowRight } from "lucide-react";
import {
  ARCHETYPE_LIST,
  TIME_OF_DAY,
} from "@/lib/worldInfinity/biomes";
import type { ArchetypeId, CreateWorldInput, TimeOfDay } from "@/lib/worldInfinity/types";
import { randomSeedString, Rng } from "@/lib/worldInfinity/rng";
import { generateBlurb, generateWorldName } from "@/lib/worldInfinity/names";
import { ARCHETYPES } from "@/lib/worldInfinity/biomes";
import { playClick, sfxHover, sfxSparkleBurst, sfxPortalBoom } from "@/lib/sound";

export function GenesisPanel({
  onCreate,
  onClose,
}: {
  onCreate: (input: CreateWorldInput) => void;
  onClose: () => void;
}) {
  const [archetype, setArchetype] = useState<ArchetypeId>("verdant");
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>("noon");
  const [name, setName] = useState("");
  const [seed, setSeed] = useState(() => randomSeedString());

  const arch = ARCHETYPES[archetype];

  // Live preview of what the current seed+archetype would produce.
  const preview = useMemo(() => {
    const a = ARCHETYPES[archetype];
    return {
      name: name.trim() || generateWorldName(a, seed),
      blurb: generateBlurb(a, seed),
    };
  }, [archetype, seed, name]);

  const surprise = () => {
    const ids = ARCHETYPE_LIST.map((a) => a.id);
    const tod = Object.keys(TIME_OF_DAY) as TimeOfDay[];
    const r = new Rng(Date.now());
    setArchetype(r.pick(ids));
    setTimeOfDay(r.pick(tod));
    setSeed(randomSeedString(r.fork("seed")));
    setName("");
    sfxSparkleBurst(arch.hue);
  };

  const rerollSeed = () => {
    setSeed(randomSeedString(new Rng(Date.now())));
    sfxHover();
  };

  const commit = () => {
    playClick();
    sfxPortalBoom();
    onCreate({ archetype, timeOfDay, seed, name: name.trim() || undefined });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-md px-4"
      data-nodrag
    >
      <motion.div
        initial={{ scale: 0.92, y: 24, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.92, y: 24, opacity: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-3xl max-h-[88vh] overflow-y-auto rounded-3xl"
        style={{
          background: "rgba(11,16,26,0.96)",
          border: "1px solid rgba(0,242,255,0.3)",
          boxShadow: "0 40px 120px -30px rgba(0,242,255,0.45)",
        }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-7 py-5"
          style={{
            background: "linear-gradient(180deg, rgba(11,16,26,0.98), rgba(11,16,26,0.85))",
            borderBottom: "1px solid rgba(140,180,255,0.12)",
          }}
        >
          <div className="flex items-center gap-3">
            <Wand2 className="w-5 h-5 text-[#00F2FF]" />
            <div>
              <h2 className="text-lg" style={{ fontFamily: "var(--font-display), sans-serif" }}>
                Genesis Engine
              </h2>
              <p className="text-[11px] text-[#E0F7FA]/50">Forge a brand-new world from a seed.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              data-nodrag
              onClick={surprise}
              onMouseEnter={sfxHover}
              className="inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-[10px] font-mono uppercase tracking-[0.2em] text-yellow-200 transition hover:scale-105"
              style={{ background: "rgba(255,210,80,0.12)", border: "1px solid rgba(255,210,80,0.4)" }}
            >
              <Dices className="w-3.5 h-3.5" /> Surprise me
            </button>
            <button
              data-nodrag
              onClick={onClose}
              className="w-9 h-9 rounded-full flex items-center justify-center text-[#E0F7FA]/60 hover:text-white"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="px-7 py-6 space-y-7">
          {/* Archetype grid */}
          <section>
            <SectionLabel num="01" text="Choose an archetype" />
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {ARCHETYPE_LIST.map((a) => {
                const active = a.id === archetype;
                return (
                  <button
                    key={a.id}
                    data-nodrag
                    onMouseEnter={sfxHover}
                    onClick={() => {
                      setArchetype(a.id);
                      playClick();
                    }}
                    className="relative rounded-xl p-3 text-left transition-all"
                    style={{
                      background: active
                        ? `radial-gradient(ellipse at top, hsla(${a.hue},80%,40%,0.5), rgba(11,16,26,0.6))`
                        : "rgba(255,255,255,0.03)",
                      border: active
                        ? `1px solid hsla(${a.hue},90%,65%,0.7)`
                        : "1px solid rgba(140,180,255,0.1)",
                    }}
                  >
                    <div
                      className="w-9 h-9 rounded-full mb-2"
                      style={{
                        background: `radial-gradient(circle at 30% 30%, hsl(${a.hue},90%,80%), hsl(${a.hue},65%,30%))`,
                        boxShadow: `0 0 16px hsla(${a.hue},90%,60%,0.6)`,
                      }}
                    />
                    <p className="text-[12px] font-medium" style={{ color: "#E8F4FF" }}>
                      {a.label}
                    </p>
                    <p className="text-[9.5px] text-[#E0F7FA]/45 mt-0.5 leading-snug">{a.tagline}</p>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Time of day */}
          <section>
            <SectionLabel num="02" text="Set the hour" />
            <div className="mt-3 flex flex-wrap gap-2.5">
              {(Object.keys(TIME_OF_DAY) as TimeOfDay[]).map((t) => {
                const td = TIME_OF_DAY[t];
                const active = t === timeOfDay;
                return (
                  <button
                    key={t}
                    data-nodrag
                    onMouseEnter={sfxHover}
                    onClick={() => {
                      setTimeOfDay(t);
                      playClick();
                    }}
                    className="rounded-full px-4 py-2 text-[11px] font-mono uppercase tracking-[0.2em] transition hover:scale-105"
                    style={{
                      color: active ? "#001417" : "#9fd8ff",
                      background: active
                        ? "linear-gradient(135deg, #7fffe0, #00F2FF)"
                        : "rgba(0,242,255,0.08)",
                      border: active ? "none" : "1px solid rgba(0,242,255,0.3)",
                    }}
                  >
                    <span className="mr-1.5">{td.icon}</span>
                    {td.label}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Name + seed */}
          <section>
            <SectionLabel num="03" text="Name & seed" />
            <div className="mt-3 grid sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#E0F7FA]/45">
                  Custom name <span className="opacity-50">(optional)</span>
                </span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={preview.name}
                  maxLength={42}
                  className="mt-1.5 w-full rounded-xl px-3.5 py-2.5 text-sm text-[#E8F4FF] outline-none"
                  style={{
                    background: "rgba(0,0,0,0.35)",
                    border: "1px solid rgba(140,180,255,0.18)",
                  }}
                />
              </label>
              <label className="block">
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#E0F7FA]/45">
                  Seed
                </span>
                <div className="mt-1.5 flex gap-2">
                  <input
                    value={seed}
                    onChange={(e) => setSeed(e.target.value.slice(0, 24))}
                    className="flex-1 rounded-xl px-3.5 py-2.5 text-sm font-mono text-[#E8F4FF] outline-none"
                    style={{
                      background: "rgba(0,0,0,0.35)",
                      border: "1px solid rgba(140,180,255,0.18)",
                    }}
                  />
                  <button
                    data-nodrag
                    onClick={rerollSeed}
                    title="Re-roll seed"
                    className="px-3 rounded-xl text-[#00F2FF] transition hover:scale-105"
                    style={{ background: "rgba(0,242,255,0.1)", border: "1px solid rgba(0,242,255,0.3)" }}
                  >
                    <Dices className="w-4 h-4" />
                  </button>
                </div>
              </label>
            </div>
          </section>

          {/* Live preview */}
          <section
            className="rounded-2xl p-5"
            style={{
              background: `radial-gradient(ellipse at 30% 0%, hsla(${arch.hue},70%,30%,0.35), rgba(11,16,26,0.6))`,
              border: `1px solid hsla(${arch.hue},80%,55%,0.3)`,
            }}
          >
            <div className="flex items-start gap-4">
              <div
                className="shrink-0 w-16 h-16 rounded-full"
                style={{
                  background: `radial-gradient(circle at 32% 30%, hsl(${arch.hue},90%,82%), hsl(${arch.hue},65%,24%))`,
                  boxShadow: `inset -6px -8px 16px rgba(0,0,0,0.5), 0 0 30px hsla(${arch.hue},90%,60%,0.6)`,
                  animation: "orbFloat 5s ease-in-out infinite",
                }}
              />
              <div className="min-w-0">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={preview.name + seed}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2 }}
                  >
                    <h3
                      className="text-lg truncate"
                      style={{ fontFamily: "var(--font-display), sans-serif", color: "#E8F4FF" }}
                    >
                      {preview.name}
                    </h3>
                    <p className="text-[12px] text-[#E0F7FA]/60 leading-snug mt-0.5">
                      {preview.blurb}
                    </p>
                    <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#E0F7FA]/40 mt-2">
                      {arch.label} · {TIME_OF_DAY[timeOfDay].label} · seed {seed}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex items-center justify-between px-7 py-4"
          style={{
            background: "linear-gradient(0deg, rgba(11,16,26,0.98), rgba(11,16,26,0.8))",
            borderTop: "1px solid rgba(140,180,255,0.12)",
          }}
        >
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#E0F7FA]/40">
            Same seed → same world, forever.
          </p>
          <button
            data-nodrag
            onClick={commit}
            onMouseEnter={sfxHover}
            className="inline-flex items-center gap-2.5 rounded-full px-7 py-3 text-[12px] font-mono uppercase tracking-[0.25em] text-[#001417] transition hover:scale-105"
            style={{
              background: "linear-gradient(135deg, #7fffe0, #00F2FF)",
              boxShadow: "0 10px 40px -10px rgba(0,242,255,0.7)",
            }}
          >
            <Sparkles className="w-4 h-4" /> Forge world <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function SectionLabel({ num, text }: { num: string; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className="font-mono text-[10px] tracking-[0.3em] text-[#00F2FF]/60"
        style={{ textShadow: "0 0 8px rgba(0,242,255,0.4)" }}
      >
        {num}
      </span>
      <h3 className="text-sm font-medium text-[#E0F7FA]">{text}</h3>
    </div>
  );
}
