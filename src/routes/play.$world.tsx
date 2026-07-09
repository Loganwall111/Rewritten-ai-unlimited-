/**
 * /play/$world — public walkable world route. No login required.
 *
 * Serves any slug from the playable registry inside a WalkableHost with
 * cinematic / dayNight / weather options from the entry.
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Map, User } from "lucide-react";
import { WalkableHost } from "@/lib/babylon/WalkableHost";
import { getPlayable, PLAYABLE_WORLDS } from "@/lib/babylon/playableRegistry";
import InventoryBar from "@/components/InventoryBar";
import { sfxHover, playClick } from "@/lib/sound";

export const Route = createFileRoute("/play/$world")({
  head: ({ params }) => {
    const entry = getPlayable(params.world);
    return {
      meta: [
        { title: `${entry?.title ?? "World"} · Play · Rewritten AI` },
        {
          name: "description",
          content: entry?.blurb ?? "A walkable Babylon world. No login required.",
        },
      ],
    };
  },
  component: PlayWorldRoute,
});

function PlayWorldRoute() {
  const { world } = Route.useParams();
  const entry = getPlayable(world);
  const [showList, setShowList] = useState(false);

  if (!entry) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-6 bg-black">
        <h1 className="text-2xl text-[#00F2FF]" style={{ fontFamily: "var(--font-display)" }}>
          World not found
        </h1>
        <p className="text-sm text-[#E0F7FA]/60">
          &quot;{world}&quot; isn&apos;t in the playable registry.
        </p>
        <Link
          to="/"
          className="rounded-full px-5 py-2.5 text-xs font-mono uppercase tracking-widest text-[#00F2FF]"
          style={{ border: "1px solid rgba(0,242,255,0.5)" }}
        >
          ← Back to Gateway
        </Link>
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2 max-w-lg">
          {PLAYABLE_WORLDS.slice(0, 8).map((w) => (
            <Link
              key={w.slug}
              to="/play/$world"
              params={{ world: w.slug }}
              className="rounded-xl px-3 py-2 text-[11px] text-[#E0F7FA]/70 hover:text-white"
              style={{ border: "1px solid rgba(140,180,255,0.15)" }}
            >
              {w.icon} {w.title}
            </Link>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[500] bg-black">
      <WalkableHost
        key={entry.slug}
        setup={entry.builder}
        cinematic={entry.options.cinematic ?? "soft"}
        dayNight={entry.options.dayNight}
        weather={entry.options.weather}
        spawn={entry.options.spawn ?? [0, 2, 0]}
        waterLevel={entry.options.waterLevel}
        eyeHeight={entry.options.eyeHeight}
        showAvatar={entry.options.showAvatar !== false}
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
        <InventoryBar />

        {/* Top bar */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="absolute top-0 left-0 right-0 p-5 flex items-start justify-between pointer-events-none"
        >
          <Link
            to="/"
            onMouseEnter={sfxHover}
            className="pointer-events-auto inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[10px] font-mono uppercase tracking-[0.25em] text-[#E0F7FA]/80 hover:text-white transition hover:scale-105"
            style={{
              background: "rgba(11,16,26,0.55)",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(140,180,255,0.18)",
            }}
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Gateway
          </Link>

          <div
            className="pointer-events-auto rounded-2xl px-5 py-3 max-w-sm"
            style={{
              background: "rgba(11,16,26,0.55)",
              backdropFilter: "blur(16px)",
              border: `1px solid hsla(${entry.hue}, 80%, 55%, 0.35)`,
            }}
          >
            <div className="flex items-center gap-2.5">
              <span className="text-xl">{entry.icon}</span>
              <div>
                <h1
                  className="text-base leading-tight text-[#E8F4FF]"
                  style={{ fontFamily: "var(--font-display), sans-serif" }}
                >
                  {entry.title}
                </h1>
                <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#E0F7FA]/45">
                  {entry.mode} · {entry.category} · free play
                </p>
              </div>
            </div>
            <p className="mt-2 text-[11.5px] text-[#E0F7FA]/65 leading-snug">{entry.blurb}</p>
          </div>

          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              type="button"
              onMouseEnter={sfxHover}
              onClick={() => {
                playClick();
                setShowList((v) => !v);
              }}
              className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[10px] font-mono uppercase tracking-[0.25em] text-[#E0F7FA]/80 hover:text-white transition hover:scale-105"
              style={{
                background: "rgba(11,16,26,0.55)",
                backdropFilter: "blur(16px)",
                border: "1px solid rgba(140,180,255,0.18)",
              }}
            >
              <Map className="w-3.5 h-3.5" /> Worlds
            </button>
            <Link
              to="/"
              onMouseEnter={sfxHover}
              className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[10px] font-mono uppercase tracking-[0.25em] text-[#E0F7FA]/80 hover:text-white transition hover:scale-105"
              style={{
                background: "rgba(11,16,26,0.55)",
                backdropFilter: "blur(16px)",
                border: "1px solid rgba(140,180,255,0.18)",
              }}
            >
              <User className="w-3.5 h-3.5" /> Home
            </Link>
          </div>
        </motion.div>

        {/* Quick world list */}
        {showList && (
          <div
            className="absolute top-20 right-5 w-64 max-h-[60vh] overflow-y-auto rounded-2xl p-3 pointer-events-auto"
            style={{
              background: "rgba(11,16,26,0.9)",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(140,180,255,0.2)",
            }}
          >
            {PLAYABLE_WORLDS.map((w) => (
              <Link
                key={w.slug}
                to="/play/$world"
                params={{ world: w.slug }}
                onMouseEnter={sfxHover}
                onClick={() => setShowList(false)}
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-[12px] text-[#E0F7FA]/75 hover:text-white hover:bg-white/5 transition"
                style={
                  w.slug === entry.slug
                    ? { background: `hsla(${w.hue}, 80%, 50%, 0.15)` }
                    : undefined
                }
              >
                <span>{w.icon}</span>
                <span>{w.title}</span>
                <span className="ml-auto text-[9px] font-mono uppercase opacity-40">{w.mode}</span>
              </Link>
            ))}
          </div>
        )}
      </WalkableHost>
    </div>
  );
}
