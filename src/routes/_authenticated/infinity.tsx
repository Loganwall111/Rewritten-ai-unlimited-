/**
 * /infinity — Rewritten World Infinity.
 *
 * A self-contained "infinite worlds" studio bolted onto the Rewritten World
 * hub: a searchable gallery of procedurally-generated, seed-reproducible 3D
 * worlds, a Genesis engine to forge new ones, a first-person explorer to walk
 * each world in real time, and a details drawer to rate / rename / re-roll /
 * share. Worlds persist in localStorage and sync across tabs.
 *
 * Designed to push the limits: 12 archetypes, deterministic terrain + props +
 * weather + sky, time-of-day, head-bob FPS controller, full post-processing.
 */

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  Sparkles,
  Globe2,
  Download,
  Upload,
  ArrowLeft,
  Wand2,
  SortDesc,
  Star,
  Infinity as InfinityIcon,
} from "lucide-react";
import { useInfinityWorlds } from "@/lib/worldInfinity/useInfinityWorlds";
import { ARCHETYPES, ARCHETYPE_LIST } from "@/lib/worldInfinity/biomes";
import type { ArchetypeId, CreateWorldInput, InfinityWorld } from "@/lib/worldInfinity/types";
import { replaceAll } from "@/lib/worldInfinity/store";
import { WorldCard } from "@/components/world-infinity/WorldCard";
import { GenesisPanel } from "@/components/world-infinity/GenesisPanel";
import { WorldDrawer } from "@/components/world-infinity/WorldDrawer";
import { InfinityExplorer } from "@/components/world-infinity/InfinityExplorer";
import { playClick, sfxHover, sfxSparkleBurst } from "@/lib/sound";
import { dispatchPortalDive } from "@/lib/portalDive";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/infinity")({
  head: () => ({
    meta: [
      { title: "World Infinity · Rewritten AI" },
      {
        name: "description",
        content:
          "Forge, explore, and curate an infinite library of procedurally-generated worlds.",
      },
    ],
  }),
  component: WorldInfinityPage,
});

type SortKey = "recent" | "created" | "name" | "rating" | "visits";

function WorldInfinityPage() {
  const navigate = useNavigate();
  const lib = useInfinityWorlds();

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ArchetypeId | "all">("all");
  const [sort, setSort] = useState<SortKey>("recent");
  const [genesisOpen, setGenesisOpen] = useState(false);
  const [drawerWorld, setDrawerWorld] = useState<InfinityWorld | null>(null);
  const [exploring, setExploring] = useState<InfinityWorld | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    let list = lib.worlds;
    if (filter !== "all") list = list.filter((w) => w.archetype === filter);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (w) =>
          w.name.toLowerCase().includes(q) ||
          w.blurb.toLowerCase().includes(q) ||
          w.seed.toLowerCase().includes(q),
      );
    }
    const sorted = [...list].sort((a, b) => {
      switch (sort) {
        case "name":
          return a.name.localeCompare(b.name);
        case "created":
          return b.createdAt - a.createdAt;
        case "rating":
          return b.rating - a.rating;
        case "visits":
          return b.visits - a.visits;
        default:
          return (b.lastVisited ?? b.createdAt) - (a.lastVisited ?? a.createdAt);
      }
    });
    // Favourites always float to the top regardless of sort.
    return sorted.sort((a, b) => (a.favorite === b.favorite ? 0 : a.favorite ? -1 : 1));
  }, [lib.worlds, filter, query, sort]);

  const enter = (w: InfinityWorld) => {
    lib.visit(w.id);
    dispatchPortalDive(window.innerWidth / 2, window.innerHeight / 2, w.hue);
    // small delay so the portal-dive flash reads
    setTimeout(() => setExploring(lib.get(w.id) ?? w), 280);
  };

  const onCreated = (input: CreateWorldInput) => {
    const w = lib.create(input);
    setGenesisOpen(false);
    toast.success(`${w.name} forged.`);
    // Enter the freshly-minted world.
    setTimeout(() => enter(w), 150);
  };

  const onDelete = (w: InfinityWorld) => {
    lib.remove(w.id);
    setDrawerWorld(null);
    toast(`${w.name} deleted.`);
  };

  const onExport = () => {
    const data = lib.exportLibrary();
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rewritten-worlds-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Library exported.");
  };

  const onImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (!Array.isArray(parsed)) throw new Error("bad");
        replaceAll(parsed as InfinityWorld[]);
        toast.success(`Imported ${parsed.length} worlds.`);
      } catch {
        toast.error("That file isn't a valid world library.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // Explorer takes over the whole screen.
  if (exploring) {
    return (
      <InfinityExplorer
        world={exploring}
        onExit={() => setExploring(null)}
        onDiscoverLandmark={lib.discover}
      />
    );
  }

  return (
    <div className="relative min-h-screen z-10 pb-24">
      {/* Header */}
      <header className="px-6 sm:px-10 pt-8 pb-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Link
              to="/home"
              onMouseEnter={sfxHover}
              className="w-9 h-9 rounded-full flex items-center justify-center text-[#E0F7FA]/60 hover:text-[#00F2FF] transition"
              style={{
                background: "rgba(15,25,45,0.5)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(140,180,255,0.15)",
              }}
              title="Back to portal"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.5em] text-[#00F2FF]/70">
                Rewritten · World
              </p>
              <h1
                className="text-3xl sm:text-4xl leading-none flex items-center gap-2"
                style={{
                  fontFamily: "var(--font-display), sans-serif",
                  color: "#E0F7FA",
                  textShadow:
                    "-2px 0 rgba(0,242,255,0.4), 2px 0 rgba(236,72,153,0.3), 0 0 40px rgba(120,180,255,0.4)",
                }}
              >
                Infinity
                <InfinityIcon className="w-7 h-7 text-[#00F2FF]" style={{ filter: "drop-shadow(0 0 10px rgba(0,242,255,0.7))" }} />
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              data-nodrag
              onClick={onExport}
              onMouseEnter={sfxHover}
              title="Export library"
              className="w-9 h-9 rounded-full flex items-center justify-center text-[#E0F7FA]/60 hover:text-[#00F2FF] transition"
              style={{ background: "rgba(15,25,45,0.5)", border: "1px solid rgba(140,180,255,0.15)" }}
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              data-nodrag
              onClick={() => fileInputRef.current?.click()}
              onMouseEnter={sfxHover}
              title="Import library"
              className="w-9 h-9 rounded-full flex items-center justify-center text-[#E0F7FA]/60 hover:text-[#00F2FF] transition"
              style={{ background: "rgba(15,25,45,0.5)", border: "1px solid rgba(140,180,255,0.15)" }}
            >
              <Upload className="w-4 h-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              onChange={onImport}
              className="hidden"
            />
            <button
              data-nodrag
              onClick={() => {
                playClick();
                setGenesisOpen(true);
              }}
              onMouseEnter={sfxHover}
              className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[11px] font-mono uppercase tracking-[0.25em] text-[#001417] transition hover:scale-105"
              style={{
                background: "linear-gradient(135deg, #7fffe0, #00F2FF)",
                boxShadow: "0 10px 40px -10px rgba(0,242,255,0.7)",
              }}
            >
              <Wand2 className="w-4 h-4" /> Forge world
            </button>
          </div>
        </div>

        {/* Subtitle + count */}
        <div className="mt-5 flex items-center gap-4 flex-wrap">
          <p className="text-sm text-[#E0F7FA]/60 max-w-xl">
            An infinite library of procedurally-generated worlds. Every world is born from a seed —
            same seed, same world, forever. Forge new ones, walk them in first person, and curate
            your constellation.
          </p>
          <div className="flex items-center gap-2 ml-auto">
            <Chip icon={<Globe2 className="w-3.5 h-3.5" />} label={`${lib.count} worlds`} />
            <Chip icon={<Sparkles className="w-3.5 h-3.5" />} label={`${ARCHETYPE_LIST.length} archetypes`} />
          </div>
        </div>
      </header>

      {/* Toolbar */}
      <div className="px-6 sm:px-10 max-w-7xl mx-auto">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div
            className="relative flex items-center rounded-full px-4 py-2.5 flex-1 min-w-[220px] max-w-md"
            style={{ background: "rgba(11,16,26,0.6)", border: "1px solid rgba(140,180,255,0.15)" }}
          >
            <Search className="w-4 h-4 text-[#E0F7FA]/40 mr-2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search worlds, seeds…"
              className="flex-1 bg-transparent outline-none text-sm text-[#E0F7FA] placeholder:text-[#E0F7FA]/35"
            />
          </div>

          {/* Sort */}
          <div
            className="relative flex items-center rounded-full px-3 py-2.5"
            style={{ background: "rgba(11,16,26,0.6)", border: "1px solid rgba(140,180,255,0.15)" }}
          >
            <SortDesc className="w-4 h-4 text-[#E0F7FA]/40 mr-2" />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="bg-transparent outline-none text-xs font-mono uppercase tracking-wider text-[#E0F7FA]/80 cursor-pointer"
              style={{ appearance: "none" }}
            >
              <option value="recent" className="bg-[#0b101a]">Recent</option>
              <option value="created" className="bg-[#0b101a]">Newest</option>
              <option value="name" className="bg-[#0b101a]">A–Z</option>
              <option value="rating" className="bg-[#0b101a]">Top rated</option>
              <option value="visits" className="bg-[#0b101a]">Most visited</option>
            </select>
          </div>
        </div>

        {/* Archetype filter chips */}
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <FilterChip active={filter === "all"} onClick={() => setFilter("all")} label="All" />
          {ARCHETYPE_LIST.map((a) => (
            <FilterChip
              key={a.id}
              active={filter === a.id}
              onClick={() => setFilter(a.id)}
              label={a.label}
              hue={a.hue}
            />
          ))}
        </div>
      </div>

      {/* Grid */}
      <main className="px-6 sm:px-10 max-w-7xl mx-auto mt-7">
        {filtered.length === 0 ? (
          <EmptyState onCreate={() => setGenesisOpen(true)} hasWorlds={lib.count > 0} />
        ) : (
          <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <AnimatePresence mode="popLayout">
              {filtered.map((w, i) => (
                <WorldCard
                  key={w.id}
                  world={w}
                  index={i}
                  onEnter={enter}
                  onOpen={(world) => setDrawerWorld(world)}
                  onFavorite={(world) => lib.favorite(world.id)}
                  onDelete={onDelete}
                />
              ))}
            </AnimatePresence>

            {/* "Forge" tile at the end */}
            <motion.button
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={() => {
                playClick();
                setGenesisOpen(true);
              }}
              onMouseEnter={sfxHover}
              className="rounded-2xl min-h-[300px] flex flex-col items-center justify-center gap-3 text-center transition hover:scale-[1.02]"
              style={{
                background:
                  "radial-gradient(ellipse at center, rgba(0,242,255,0.1), rgba(11,16,26,0.5))",
                border: "1px dashed rgba(0,242,255,0.4)",
              }}
            >
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{
                  background: "radial-gradient(circle at 30% 30%, rgba(127,255,224,0.9), rgba(0,242,255,0.3))",
                  boxShadow: "0 0 30px rgba(0,242,255,0.5)",
                }}
              >
                <Plus className="w-7 h-7 text-[#001417]" />
              </div>
              <p className="text-sm font-medium text-[#E0F7FA]">Forge a new world</p>
              <p className="text-[11px] text-[#E0F7FA]/45 max-w-[180px]">
                Pick an archetype, spin a seed, enter infinity.
              </p>
            </motion.button>
          </motion.div>
        )}
      </main>

      {/* Genesis modal */}
      <AnimatePresence>
        {genesisOpen && <GenesisPanel onCreate={onCreated} onClose={() => setGenesisOpen(false)} />}
      </AnimatePresence>

      {/* Details drawer */}
      <WorldDrawer
        world={drawerWorld ? lib.get(drawerWorld.id) ?? drawerWorld : null}
        onClose={() => setDrawerWorld(null)}
        onEnter={enter}
        onRate={lib.rate}
        onNotes={lib.notes}
        onRename={lib.rename}
        onReroll={lib.reroll}
        onDelete={onDelete}
      />

      {/* Footer hint */}
      <div className="mt-16 text-center">
        <p className="text-[10px] font-mono uppercase tracking-[0.4em] text-[#E0F7FA]/30">
          Every world · reproducible · shareable · infinite
        </p>
        <button
          data-nodrag
          onClick={() => navigate({ to: "/world" })}
          onMouseEnter={sfxHover}
          className="mt-3 text-[11px] font-mono uppercase tracking-[0.2em] text-[#00F2FF]/60 hover:text-[#00F2FF] transition"
        >
          ← Back to Rewritten World hub
        </button>
      </div>
    </div>
  );
}

function Chip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-mono uppercase tracking-[0.2em] text-[#E0F7FA]/70"
      style={{ background: "rgba(11,16,26,0.6)", border: "1px solid rgba(140,180,255,0.15)" }}
    >
      {icon}
      {label}
    </span>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  hue,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  hue?: number;
}) {
  return (
    <button
      data-nodrag
      onMouseEnter={sfxHover}
      onClick={() => {
        playClick();
        onClick();
      }}
      className="rounded-full px-3.5 py-1.5 text-[10px] font-mono uppercase tracking-[0.2em] transition hover:scale-105"
      style={{
        color: active ? "#001417" : hue ? `hsl(${hue},80%,75%)` : "#9fd8ff",
        background: active
          ? hue
            ? `linear-gradient(135deg, hsl(${hue},90%,80%), hsl(${hue},80%,60%))`
            : "linear-gradient(135deg, #7fffe0, #00F2FF)"
          : "rgba(11,16,26,0.5)",
        border: active ? "none" : hue ? `1px solid hsla(${hue},70%,50%,0.3)` : "1px solid rgba(140,180,255,0.15)",
      }}
    >
      {label}
    </button>
  );
}

function EmptyState({ onCreate, hasWorlds }: { onCreate: () => void; hasWorlds: boolean }) {
  return (
    <div className="text-center py-24">
      <div
        className="mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-6"
        style={{
          background: "radial-gradient(circle at 30% 30%, rgba(127,255,224,0.8), rgba(0,242,255,0.2))",
          boxShadow: "0 0 50px rgba(0,242,255,0.4)",
        }}
      >
        <Star className="w-8 h-8 text-[#001417]" />
      </div>
      <h2 className="text-xl" style={{ fontFamily: "var(--font-display), sans-serif", color: "#E0F7FA" }}>
        {hasWorlds ? "No worlds match your search" : "Your library is empty"}
      </h2>
      <p className="mt-2 text-sm text-[#E0F7FA]/50 max-w-sm mx-auto">
        {hasWorlds
          ? "Try clearing the filters or searching a different seed."
          : "Forge your first world to begin. Pick an archetype, and the Genesis engine handles the rest."}
      </p>
      {!hasWorlds && (
        <button
          data-nodrag
          onClick={onCreate}
          onMouseEnter={sfxHover}
          className="mt-6 inline-flex items-center gap-2 rounded-full px-6 py-3 text-[11px] font-mono uppercase tracking-[0.25em] text-[#001417] transition hover:scale-105"
          style={{ background: "linear-gradient(135deg, #7fffe0, #00F2FF)", boxShadow: "0 10px 40px -10px rgba(0,242,255,0.7)" }}
        >
          <Wand2 className="w-4 h-4" /> Forge your first world
        </button>
      )}
    </div>
  );
}
