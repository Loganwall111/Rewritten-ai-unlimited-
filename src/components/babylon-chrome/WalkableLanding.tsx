/**
 * WalkableLanding — orchestrates StudioIntro → CharacterCreator → walkable world.
 *
 * This is the new public front door: a cinematic studio card, optional character
 * creation, then the Gateway walkable world with a world-picker overlay.
 */

import { useCallback, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Compass, DoorOpen, LogIn, Map, Sparkles, User } from "lucide-react";
import { StudioIntro } from "./StudioIntro";
import { CharacterCreator } from "./CharacterCreator";
import { WalkableHost } from "@/lib/babylon/WalkableHost";
import { PLAYABLE_WORLDS, getPlayable, type PlayableEntry } from "@/lib/babylon/playableRegistry";
import { loadSavedAvatar } from "@/lib/babylon/avatar";
import { sfxHover, playClick, sfxPortalBoom } from "@/lib/sound";

type Stage = "intro" | "creator" | "world";

const CREATOR_FLAG = "rewritten.avatar.seen";

function hasSeenCreator(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(CREATOR_FLAG) === "1" || !!loadSavedAvatar();
  } catch {
    return false;
  }
}

function markCreatorSeen() {
  try {
    localStorage.setItem(CREATOR_FLAG, "1");
  } catch {
    /* ignore */
  }
}

export function WalkableLanding() {
  const [stage, setStage] = useState<Stage>("intro");
  const [pickerOpen, setPickerOpen] = useState(false);
  const navigate = useNavigate();

  const gateway = getPlayable("gateway")!;

  const finishIntro = useCallback(() => {
    if (hasSeenCreator()) {
      setStage("world");
    } else {
      setStage("creator");
    }
  }, []);

  const finishCreator = useCallback(() => {
    markCreatorSeen();
    setStage("world");
  }, []);

  const enterWorld = useCallback(
    (w: PlayableEntry) => {
      playClick();
      sfxPortalBoom();
      navigate({ to: "/play/$world", params: { world: w.slug } });
    },
    [navigate],
  );

  return (
    <div className="fixed inset-0 z-0 bg-black">
      <AnimatePresence mode="wait">
        {stage === "intro" && <StudioIntro key="intro" onDone={finishIntro} durationMs={4200} />}

        {stage === "creator" && (
          <CharacterCreator key="creator" onComplete={finishCreator} onSkip={finishCreator} />
        )}

        {stage === "world" && (
          <motion.div
            key="world"
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
          >
            <WalkableHost
              setup={gateway.builder}
              cinematic={gateway.options.cinematic ?? "soft"}
              dayNight={gateway.options.dayNight ?? true}
              weather={gateway.options.weather ?? "clear"}
              spawn={gateway.options.spawn ?? [0, 2, 8]}
              showAvatar
              hdr
              ambient={0.55}
              sun={{
                direction: [-0.5, -1, -0.7],
                intensity: 1.6,
                shadowMapSize: 2048,
                shadowFrustum: 80,
              }}
              className="absolute inset-0"
            >
              {/* Top chrome */}
              <div className="absolute top-0 left-0 right-0 p-5 flex items-start justify-between pointer-events-none">
                <div
                  className="pointer-events-auto rounded-2xl px-5 py-3"
                  style={{
                    background: "rgba(11,16,26,0.55)",
                    backdropFilter: "blur(16px)",
                    border: "1px solid rgba(0,242,255,0.3)",
                  }}
                >
                  <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-[#00F2FF]/80">
                    One Block Away Studio
                  </p>
                  <h1
                    className="text-lg leading-tight text-[#E8F4FF]"
                    style={{ fontFamily: "var(--font-display), sans-serif" }}
                  >
                    Gateway
                  </h1>
                  <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#E0F7FA]/45 mt-0.5">
                    {PLAYABLE_WORLDS.length} walkable worlds · no login
                  </p>
                </div>

                <div className="flex items-center gap-2 pointer-events-auto">
                  <button
                    type="button"
                    onMouseEnter={sfxHover}
                    onClick={() => {
                      playClick();
                      setStage("creator");
                    }}
                    className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[10px] font-mono uppercase tracking-[0.25em] text-[#E0F7FA]/80 hover:text-white transition hover:scale-105"
                    style={{
                      background: "rgba(11,16,26,0.55)",
                      backdropFilter: "blur(16px)",
                      border: "1px solid rgba(140,180,255,0.18)",
                    }}
                  >
                    <User className="w-3.5 h-3.5" /> Avatar
                  </button>
                  <button
                    type="button"
                    onMouseEnter={sfxHover}
                    onClick={() => {
                      playClick();
                      setPickerOpen(true);
                    }}
                    className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[10px] font-mono uppercase tracking-[0.25em] text-[#001018] font-semibold transition hover:scale-105"
                    style={{
                      background: "linear-gradient(135deg, #00F2FF, #7C5CFF)",
                      boxShadow: "0 0 24px rgba(0,242,255,0.35)",
                    }}
                  >
                    <Map className="w-3.5 h-3.5" /> Worlds
                  </button>
                  <Link
                    to="/world"
                    onMouseEnter={sfxHover}
                    className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[10px] font-mono uppercase tracking-[0.25em] text-[#E0F7FA]/80 hover:text-white transition hover:scale-105"
                    style={{
                      background: "rgba(11,16,26,0.55)",
                      backdropFilter: "blur(16px)",
                      border: "1px solid rgba(140,180,255,0.18)",
                    }}
                  >
                    <DoorOpen className="w-3.5 h-3.5" /> Hub
                  </Link>
                  <Link
                    to="/auth"
                    search={{ mode: "login" }}
                    onMouseEnter={sfxHover}
                    className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[10px] font-mono uppercase tracking-[0.25em] text-[#E0F7FA]/80 hover:text-white transition hover:scale-105"
                    style={{
                      background: "rgba(11,16,26,0.55)",
                      backdropFilter: "blur(16px)",
                      border: "1px solid rgba(140,180,255,0.18)",
                    }}
                  >
                    <LogIn className="w-3.5 h-3.5" /> Sign in
                  </Link>
                </div>
              </div>

              {/* Feature pills */}
              <div className="absolute top-24 left-5 flex flex-wrap gap-2 pointer-events-none max-w-md">
                {["WASD walk", "Space jump", "Shift sprint", "Swim worlds", "Day / night"].map(
                  (f) => (
                    <span
                      key={f}
                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[9px] font-mono uppercase tracking-[0.2em] text-[#E0F7FA]/65"
                      style={{
                        background: "rgba(11,16,26,0.5)",
                        backdropFilter: "blur(10px)",
                        border: "1px solid rgba(140,180,255,0.12)",
                      }}
                    >
                      <Sparkles className="w-2.5 h-2.5 text-[#00F2FF]" />
                      {f}
                    </span>
                  ),
                )}
              </div>
            </WalkableHost>

            {/* World picker modal */}
            <AnimatePresence>
              {pickerOpen && (
                <WorldPicker
                  onClose={() => setPickerOpen(false)}
                  onSelect={(w) => {
                    setPickerOpen(false);
                    enterWorld(w);
                  }}
                />
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function WorldPicker({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (w: PlayableEntry) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[560] flex items-center justify-center p-4 sm:p-8"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(12px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12 }}
        transition={{ type: "spring", stiffness: 280, damping: 28 }}
        className="w-full max-w-4xl max-h-[85vh] overflow-y-auto rounded-3xl p-6 sm:p-8"
        style={{
          background: "rgba(11,16,26,0.92)",
          border: "1px solid rgba(0,242,255,0.25)",
          boxShadow: "0 30px 80px -20px rgba(0,242,255,0.25)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#00F2FF]/80 flex items-center gap-2">
              <Compass className="w-3.5 h-3.5" /> Playable atlas
            </p>
            <h2
              className="text-2xl mt-1 text-[#E8F4FF]"
              style={{ fontFamily: "var(--font-display), sans-serif" }}
            >
              {PLAYABLE_WORLDS.length} walkable worlds
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            onMouseEnter={sfxHover}
            className="rounded-full px-4 py-2 text-[10px] font-mono uppercase tracking-widest text-[#E0F7FA]/60 hover:text-white"
            style={{ border: "1px solid rgba(140,180,255,0.2)" }}
          >
            Close
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {PLAYABLE_WORLDS.map((w) => (
            <button
              key={w.slug}
              type="button"
              onMouseEnter={sfxHover}
              onClick={() => onSelect(w)}
              className="rounded-2xl p-4 text-left transition hover:scale-[1.02]"
              style={{
                background: "rgba(0,0,0,0.35)",
                border: `1px solid hsla(${w.hue}, 70%, 55%, 0.35)`,
              }}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">{w.icon}</span>
                <div>
                  <p className="text-sm text-[#E8F4FF] font-medium">{w.title}</p>
                  <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#E0F7FA]/40">
                    {w.mode} · {w.category}
                  </p>
                </div>
              </div>
              <p className="mt-2 text-[11px] text-[#E0F7FA]/55 leading-snug">{w.blurb}</p>
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
