/**
 * WorldCard — a gallery tile for a saved world. Renders a procedural mini-orb
 * (CSS-only, themed by archetype hue), name, blurb, stats, and quick actions.
 */

import { motion } from "framer-motion";
import { Star, Trash2, Eye, Compass, Sparkles } from "lucide-react";
import type { InfinityWorld } from "@/lib/worldInfinity/types";
import { ARCHETYPES } from "@/lib/worldInfinity/biomes";
import { sfxHover, sfxPlanetPing, sfxSparkleBurst, playClick } from "@/lib/sound";

export function WorldCard({
  world,
  index,
  onEnter,
  onOpen,
  onFavorite,
  onDelete,
}: {
  world: InfinityWorld;
  index: number;
  onEnter: (w: InfinityWorld) => void;
  onOpen: (w: InfinityWorld) => void;
  onFavorite: (w: InfinityWorld) => void;
  onDelete: (w: InfinityWorld) => void;
}) {
  const arch = ARCHETYPES[world.archetype];

  const enter = (e: React.MouseEvent) => {
    e.stopPropagation();
    playClick();
    sfxPlanetPing(world.hue);
    onEnter(world);
  };
  const open = (e: React.MouseEvent) => {
    e.stopPropagation();
    playClick();
    onOpen(world);
  };
  const fav = (e: React.MouseEvent) => {
    e.stopPropagation();
    sfxSparkleBurst(world.hue);
    onFavorite(world);
  };
  const del = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(world);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 24, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85 }}
      transition={{ delay: Math.min(index * 0.035, 0.4), duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      onMouseEnter={() => sfxHover()}
      onClick={open}
      className="group relative cursor-pointer rounded-2xl overflow-hidden"
      style={{
        background: "rgba(11,16,26,0.72)",
        backdropFilter: "blur(14px)",
        border: "1px solid rgba(140,180,255,0.14)",
        boxShadow: "0 18px 50px -24px rgba(0,0,0,0.8)",
      }}
    >
      {/* Glow halo on hover */}
      <div
        className="pointer-events-none absolute -inset-px opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: `radial-gradient(circle at 50% 0%, hsla(${world.hue},90%,60%,0.18), transparent 60%)`,
        }}
      />

      {/* Mini procedural orb */}
      <div className="relative h-40 flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse at 50% 120%, hsla(${world.hue},80%,40%,0.5), transparent 70%)`,
          }}
        />
        <div className="relative" style={{ animation: "orbFloat 6s ease-in-out infinite" }}>
          <div
            className="w-24 h-24 rounded-full"
            style={{
              background: `radial-gradient(circle at 32% 30%, hsl(${world.hue},90%,82%) 0%, hsl(${world.hue},75%,52%) 30%, hsl(${world.hue},65%,22%) 100%)`,
              boxShadow: `inset -10px -14px 26px rgba(0,0,0,0.55), 0 0 50px hsla(${world.hue},90%,60%,0.6)`,
            }}
          />
          {/* Atmosphere ring */}
          <div
            className="absolute -inset-2 rounded-full pointer-events-none"
            style={{
              border: `1px solid hsla(${world.hue},90%,70%,0.35)`,
              boxShadow: `0 0 22px hsla(${world.hue},90%,60%,0.4)`,
            }}
          />
        </div>

        {/* Favorite star */}
        <button
          data-nodrag
          onClick={fav}
          title={world.favorite ? "Unpin" : "Pin to top"}
          className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition"
          style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(6px)" }}
        >
          <Star
            className="w-4 h-4"
            style={{
              fill: world.favorite ? "#ffd24a" : "transparent",
              color: world.favorite ? "#ffd24a" : "rgba(255,255,255,0.5)",
            }}
          />
        </button>

        {/* Archetype badge */}
        <span
          className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[9px] font-mono uppercase tracking-[0.2em]"
          style={{
            color: `hsl(${world.hue},90%,80%)`,
            background: `hsla(${world.hue},80%,30%,0.5)`,
            border: `1px solid hsla(${world.hue},90%,60%,0.4)`,
          }}
        >
          {arch.label}
        </span>
      </div>

      {/* Body */}
      <div className="p-4">
        <h3
          className="text-base leading-tight truncate"
          style={{
            fontFamily: "var(--font-display), sans-serif",
            color: "#E8F4FF",
            textShadow: "0 1px 6px rgba(0,0,0,0.6)",
          }}
        >
          {world.name}
        </h3>
        <p className="mt-1 text-[11px] text-[#E0F7FA]/55 line-clamp-2 leading-snug min-h-[28px]">
          {world.blurb}
        </p>

        <div className="mt-3 flex items-center gap-3 text-[10px] font-mono uppercase tracking-wider text-[#E0F7FA]/45">
          <span className="flex items-center gap-1">
            <Eye className="w-3 h-3" /> {world.visits}
          </span>
          <span className="flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> {world.seed}
          </span>
          {world.rating > 0 && (
            <span className="flex items-center gap-1 text-yellow-300/80">
              <Star className="w-3 h-3" style={{ fill: "currentColor" }} /> {world.rating}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="mt-3 flex items-center gap-2">
          <button
            data-nodrag
            onClick={enter}
            onMouseEnter={sfxHover}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-[11px] font-mono uppercase tracking-[0.2em] transition-all hover:scale-[1.03]"
            style={{
              color: `hsl(${world.hue},90%,82%)`,
              background: `radial-gradient(ellipse at center, hsla(${world.hue},80%,40%,0.4), rgba(11,16,26,0.6))`,
              border: `1px solid hsla(${world.hue},90%,60%,0.5)`,
            }}
          >
            <Compass className="w-3.5 h-3.5" /> Enter
          </button>
          <button
            data-nodrag
            onClick={open}
            title="Details"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-[#E0F7FA]/60 hover:text-[#00F2FF] transition"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(140,180,255,0.12)",
            }}
          >
            <span className="text-base leading-none">⌥</span>
          </button>
          <button
            data-nodrag
            onClick={del}
            title="Delete"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-[#E0F7FA]/40 hover:text-red-400 transition"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(140,180,255,0.12)",
            }}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
