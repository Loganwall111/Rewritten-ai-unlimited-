/**
 * WorldDrawer — slide-in details panel for a single world.
 *
 * Rate it, edit notes, rename, re-roll its seed (rebuilds terrain live), copy
 * the shareable seed, jump straight in, or delete it.
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Star,
  Compass,
  Copy,
  Check,
  RefreshCw,
  Trash2,
  Pencil,
  X,
  Globe2,
  Clock,
  Eye,
} from "lucide-react";
import type { InfinityWorld } from "@/lib/worldInfinity/types";
import { ARCHETYPES, TIME_OF_DAY } from "@/lib/worldInfinity/biomes";
import { randomSeedString } from "@/lib/worldInfinity/rng";
import { playClick, sfxHover, sfxSparkleBurst } from "@/lib/sound";

export function WorldDrawer({
  world,
  onClose,
  onEnter,
  onRate,
  onNotes,
  onRename,
  onReroll,
  onDelete,
}: {
  world: InfinityWorld | null;
  onClose: () => void;
  onEnter: (w: InfinityWorld) => void;
  onRate: (id: string, r: number) => void;
  onNotes: (id: string, n: string) => void;
  onRename: (id: string, n: string) => void;
  onReroll: (id: string, seed: string) => void;
  onDelete: (w: InfinityWorld) => void;
}) {
  const [draftName, setDraftName] = useState("");
  const [draftNotes, setDraftNotes] = useState("");
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (world) {
      setDraftName(world.name);
      setDraftNotes(world.notes);
      setConfirmDelete(false);
    }
  }, [world]);

  const arch = world ? ARCHETYPES[world.archetype] : null;

  const copySeed = async () => {
    if (!world) return;
    try {
      await navigator.clipboard.writeText(world.seed);
      setCopied(true);
      sfxSparkleBurst(world.hue);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked */
    }
  };

  return (
    <AnimatePresence>
      {world && arch && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[55] bg-black/50 backdrop-blur-sm"
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 260 }}
            className="fixed top-0 right-0 bottom-0 z-[56] w-full max-w-md overflow-y-auto"
            style={{
              background: "rgba(11,16,26,0.97)",
              borderLeft: `1px solid hsla(${world.hue},80%,55%,0.3)`,
              backdropFilter: "blur(20px)",
            }}
          >
            {/* Hero */}
            <div className="relative h-44 flex items-center justify-center overflow-hidden">
              <div
                className="absolute inset-0"
                style={{
                  background: `radial-gradient(ellipse at 50% 110%, hsla(${world.hue},80%,35%,0.6), transparent 70%)`,
                }}
              />
              <div
                className="relative w-28 h-28 rounded-full"
                style={{
                  background: `radial-gradient(circle at 32% 30%, hsl(${world.hue},90%,82%), hsl(${world.hue},65%,24%))`,
                  boxShadow: `inset -12px -16px 30px rgba(0,0,0,0.55), 0 0 60px hsla(${world.hue},90%,60%,0.7)`,
                  animation: "orbFloat 6s ease-in-out infinite",
                }}
              />
              <button
                data-nodrag
                onClick={onClose}
                className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center text-[#E0F7FA]/70 hover:text-white"
                style={{ background: "rgba(0,0,0,0.4)" }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Title */}
              <div>
                <span
                  className="inline-block px-2.5 py-1 rounded-full text-[9px] font-mono uppercase tracking-[0.2em] mb-2"
                  style={{
                    color: `hsl(${world.hue},90%,80%)`,
                    background: `hsla(${world.hue},80%,30%,0.5)`,
                    border: `1px solid hsla(${world.hue},90%,60%,0.4)`,
                  }}
                >
                  {arch.label}
                </span>
                <h2
                  className="text-2xl leading-tight"
                  style={{ fontFamily: "var(--font-display), sans-serif", color: "#E8F4FF" }}
                >
                  {world.name}
                </h2>
                <p className="text-[12px] text-[#E0F7FA]/60 leading-snug mt-1.5">{world.blurb}</p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <Stat
                  icon={<Eye className="w-3.5 h-3.5" />}
                  label="Visits"
                  value={String(world.visits)}
                />
                <Stat
                  icon={<Clock className="w-3.5 h-3.5" />}
                  label="Hour"
                  value={TIME_OF_DAY[world.timeOfDay].label}
                />
                <Stat icon={<Globe2 className="w-3.5 h-3.5" />} label="Seed" value={world.seed} />
              </div>

              {/* Rating */}
              <section>
                <Label text="Rating" />
                <div className="mt-2 flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      data-nodrag
                      onMouseEnter={sfxHover}
                      onClick={() => {
                        onRate(world.id, world.rating === n ? 0 : n);
                        playClick();
                      }}
                      className="p-1"
                    >
                      <Star
                        className="w-6 h-6 transition-transform hover:scale-110"
                        style={{
                          fill: n <= world.rating ? "#ffd24a" : "transparent",
                          color: n <= world.rating ? "#ffd24a" : "rgba(255,255,255,0.3)",
                        }}
                      />
                    </button>
                  ))}
                </div>
              </section>

              {/* Name editor */}
              <section>
                <Label text="Name" />
                <div className="mt-2 flex gap-2">
                  <input
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    maxLength={42}
                    className="flex-1 rounded-xl px-3.5 py-2.5 text-sm text-[#E8F4FF] outline-none"
                    style={{
                      background: "rgba(0,0,0,0.35)",
                      border: "1px solid rgba(140,180,255,0.18)",
                    }}
                  />
                  <button
                    data-nodrag
                    onMouseEnter={sfxHover}
                    onClick={() => {
                      onRename(world.id, draftName);
                      playClick();
                    }}
                    className="px-3.5 rounded-xl text-[#00F2FF] transition hover:scale-105"
                    style={{
                      background: "rgba(0,242,255,0.1)",
                      border: "1px solid rgba(0,242,255,0.3)",
                    }}
                    title="Save name"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>
              </section>

              {/* Notes */}
              <section>
                <Label text="Operator notes" />
                <textarea
                  value={draftNotes}
                  onChange={(e) => setDraftNotes(e.target.value)}
                  onBlur={() => onNotes(world.id, draftNotes)}
                  rows={3}
                  placeholder="What did you find here?"
                  className="mt-2 w-full rounded-xl px-3.5 py-2.5 text-sm text-[#E8F4FF] outline-none resize-none"
                  style={{
                    background: "rgba(0,0,0,0.35)",
                    border: "1px solid rgba(140,180,255,0.18)",
                  }}
                />
              </section>

              {/* Seed + reroll */}
              <section>
                <Label text="Seed (shareable)" />
                <div className="mt-2 flex gap-2">
                  <button
                    data-nodrag
                    onMouseEnter={sfxHover}
                    onClick={copySeed}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-mono text-[#E0F7FA]/80 transition hover:scale-[1.02]"
                    style={{
                      background: "rgba(0,0,0,0.35)",
                      border: "1px solid rgba(140,180,255,0.18)",
                    }}
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                    {world.seed}
                  </button>
                  <button
                    data-nodrag
                    onMouseEnter={sfxHover}
                    title="Re-roll seed (new terrain)"
                    onClick={() => {
                      onReroll(world.id, randomSeedString());
                      sfxSparkleBurst(world.hue);
                    }}
                    className="px-3.5 rounded-xl text-[#7fffe0] transition hover:scale-105"
                    style={{
                      background: "rgba(127,255,224,0.1)",
                      border: "1px solid rgba(127,255,224,0.3)",
                    }}
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </section>

              {/* Enter */}
              <button
                data-nodrag
                onMouseEnter={sfxHover}
                onClick={() => onEnter(world)}
                className="w-full inline-flex items-center justify-center gap-2.5 rounded-2xl px-6 py-3.5 text-[12px] font-mono uppercase tracking-[0.25em] transition hover:scale-[1.02]"
                style={{
                  color: `hsl(${world.hue},90%,90%)`,
                  background: `radial-gradient(ellipse at center, hsla(${world.hue},80%,40%,0.5), rgba(11,16,26,0.6))`,
                  border: `1px solid hsla(${world.hue},90%,60%,0.6)`,
                  boxShadow: `0 12px 50px -16px hsla(${world.hue},90%,60%,0.6)`,
                }}
              >
                <Compass className="w-4 h-4" /> Enter this world
              </button>

              {/* Delete */}
              <div className="pt-2">
                {!confirmDelete ? (
                  <button
                    data-nodrag
                    onClick={() => setConfirmDelete(true)}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[11px] font-mono uppercase tracking-[0.2em] text-red-300/70 hover:text-red-300 transition"
                    style={{ border: "1px solid rgba(255,80,100,0.2)" }}
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete world
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      data-nodrag
                      onClick={() => onDelete(world)}
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[11px] font-mono uppercase tracking-[0.2em] text-white"
                      style={{ background: "rgba(220,40,60,0.85)" }}
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Confirm delete
                    </button>
                    <button
                      data-nodrag
                      onClick={() => setConfirmDelete(false)}
                      className="px-4 rounded-xl text-[#E0F7FA]/60"
                      style={{ background: "rgba(255,255,255,0.05)" }}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div
      className="rounded-xl py-2.5 px-1"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(140,180,255,0.1)" }}
    >
      <div className="flex items-center justify-center text-[#00F2FF]/70 mb-1">{icon}</div>
      <p className="text-[13px] font-mono text-[#E8F4FF] truncate px-1">{value}</p>
      <p className="text-[8.5px] font-mono uppercase tracking-[0.2em] text-[#E0F7FA]/40">{label}</p>
    </div>
  );
}

function Label({ text }: { text: string }) {
  return (
    <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#E0F7FA]/45">
      {text}
    </span>
  );
}
