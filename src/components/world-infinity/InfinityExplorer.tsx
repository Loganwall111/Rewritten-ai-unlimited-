/**
 * InfinityExplorer — the immersive full-screen explorer.
 *
 * Mounts the R3F <Canvas> with the InfinityExplorerScene, layers an FPS HUD on
 * top (crosshair, compass, controls, sprint, world chip), records the visit,
 * and speaks a welcome line through the existing voice pipeline.
 */

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { EffectComposer, Bloom, Vignette, ChromaticAberration } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import * as THREE from "three";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Crosshair,
  Footprints,
  MapPin,
  Sparkles,
  Compass,
  Camera,
  Clock,
} from "lucide-react";
import type { InfinityWorld, TimeOfDay } from "@/lib/worldInfinity/types";
import { ARCHETYPES, TIME_OF_DAY } from "@/lib/worldInfinity/biomes";
import { generateLandmarks, type Landmark } from "@/lib/worldInfinity/landmarks";
import {
  InfinityExplorerScene,
  makePlayer,
  type ExplorerPlayer,
} from "./InfinityExplorerScene";
import { useVoice } from "@/lib/useVoice";
import { playClick, sfxHover, sfxPortalBoom, sfxSparkleBurst } from "@/lib/sound";
import { toast } from "sonner";

export function InfinityExplorer({
  world,
  onExit,
  onDiscoverLandmark,
}: {
  world: InfinityWorld;
  onExit: () => void;
  onDiscoverLandmark: (worldId: string, landmarkId: string) => void;
}) {
  const { speak } = useVoice();
  const playerRef = useRef<ExplorerPlayer>(makePlayer());
  const sprintRef = useRef(false);
  const fogRef = useRef(0.02);
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const firedToastRef = useRef<Set<string>>(new Set());
  const [sprinting, setSprinting] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [coords, setCoords] = useState({ x: 0, z: 0, heading: 0 });
  const [ready, setReady] = useState(false);
  const [discovered, setDiscovered] = useState<string[]>(world.discovered ?? []);
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>(world.timeOfDay);

  const arch = useMemo(() => ARCHETYPES[world.archetype], [world.archetype]);
  const totalLandmarks = useMemo(
    () => generateLandmarks(arch, world.seed).length,
    [arch, world.seed],
  );

  // Reset per-world ephemeral state.
  useEffect(() => {
    setDiscovered(world.discovered ?? []);
    setTimeOfDay(world.timeOfDay);
    firedToastRef.current.clear();
  }, [world.id, world.discovered, world.seed]);

  const handleDiscover = (lm: Landmark) => {
    setDiscovered((prev) => (prev.includes(lm.id) ? prev : [...prev, lm.id]));
    onDiscoverLandmark(world.id, lm.id);
    if (!firedToastRef.current.has(lm.id)) {
      firedToastRef.current.add(lm.id);
      sfxSparkleBurst(lm.hue);
      toast(`✦ Discovered: ${lm.name}`, {
        description: `${discovered.length + 1}/${totalLandmarks} landmarks found`,
      });
    }
  };

  const cycleTime = () => {
    const order: TimeOfDay[] = ["dawn", "noon", "dusk", "night"];
    setTimeOfDay((cur) => order[(order.indexOf(cur) + 1) % order.length]);
    playClick();
  };

  const captureScreenshot = () => {
    const canvas = canvasWrapRef.current?.querySelector("canvas");
    if (!canvas) return;
    try {
      const url = (canvas as HTMLCanvasElement).toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `${world.name.replace(/\s+/g, "-").toLowerCase()}-${world.seed}.png`;
      a.click();
      toast.success("Snapshot saved.");
      sfxSparkleBurst(world.hue);
    } catch {
      toast.error("Couldn't capture the canvas.");
    }
  };

  // Welcome voice + visit.
  useEffect(() => {
    setReady(false);
    const t = setTimeout(() => setReady(true), 700);
    sfxPortalBoom();
    sfxSparkleBurst(world.hue);
    speak(`Entering ${world.name}. ${arch.label}.`);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world.id]);

  // Telemetry HUD update.
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const p = playerRef.current;
      setCoords({
        x: Math.round(p.x),
        z: Math.round(p.z),
        heading: ((p.yaw * 180) / Math.PI) % 360,
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Hide the controls hint after a while.
  useEffect(() => {
    const t = setTimeout(() => setShowControls(false), 7000);
    return () => clearTimeout(t);
  }, []);

  const toggleSprint = () => {
    sprintRef.current = !sprintRef.current;
    setSprinting(sprintRef.current);
    playClick();
  };

  // Compass heading → cardinal.
  const cardinal = useMemo(() => {
    const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    let h = coords.heading;
    while (h < 0) h += 360;
    return dirs[Math.round(h / 45) % 8];
  }, [coords.heading]);

  return (
    <div ref={canvasWrapRef} className="fixed inset-0 z-[500] bg-black">
      <Canvas
        shadows
        camera={{ position: [0, 20, 0], fov: 72, near: 0.1, far: 600 }}
        gl={{ antialias: true, powerPreference: "high-performance", preserveDrawingBuffer: true }}
        dpr={[1, 1.75]}
      >
        <Suspense fallback={null}>
          <InfinityExplorerScene
            world={world}
            playerRef={playerRef}
            sprintRef={sprintRef}
            fogRef={fogRef}
            discovered={discovered}
            onDiscover={handleDiscover}
            timeOfDay={timeOfDay}
          />
          <EffectComposer multisampling={0}>
            <Bloom intensity={0.8} luminanceThreshold={0.25} luminanceSmoothing={0.7} mipmapBlur />
            <ChromaticAberration
              offset={[0.0006, 0.0009] as unknown as THREE.Vector2}
              blendFunction={BlendFunction.NORMAL}
              radialModulation={false}
              modulationOffset={0}
            />
            <Vignette eskil={false} offset={0.25} darkness={0.6} />
          </EffectComposer>
        </Suspense>
      </Canvas>

      {/* Crosshair */}
      <div className="pointer-events-none fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
        <Crosshair className="w-5 h-5 text-white/70" style={{ filter: "drop-shadow(0 0 6px rgba(0,0,0,0.8))" }} />
      </div>

      {/* Loading veil */}
      <AnimatePresence>
        {!ready && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="fixed inset-0 z-40 flex items-center justify-center bg-black"
          >
            <div className="text-center">
              <div
                className="mx-auto w-16 h-16 rounded-full animate-pulse"
                style={{
                  background: `radial-gradient(circle at 30% 30%, hsl(${world.hue},90%,80%), hsl(${world.hue},65%,24%))`,
                  boxShadow: `0 0 50px hsla(${world.hue},90%,60%,0.8)`,
                }}
              />
              <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.4em] text-[#E0F7FA]/60">
                Generating terrain…
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top bar */}
      <div className="fixed top-4 left-4 right-4 z-20 flex items-start justify-between pointer-events-none">
        <button
          data-nodrag
          onClick={onExit}
          onMouseEnter={sfxHover}
          className="pointer-events-auto inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[10px] font-mono uppercase tracking-[0.25em] text-[#E0F7FA]/80 hover:text-white transition hover:scale-105"
          style={{
            background: "rgba(11,16,26,0.6)",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(140,180,255,0.18)",
          }}
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Library
        </button>

        {/* World chip */}
        <div
          className="pointer-events-auto rounded-2xl px-4 py-2.5 max-w-xs"
          style={{
            background: "rgba(11,16,26,0.6)",
            backdropFilter: "blur(16px)",
            border: `1px solid hsla(${world.hue},80%,55%,0.35)`,
          }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{
                background: `hsl(${world.hue},90%,65%)`,
                boxShadow: `0 0 10px hsl(${world.hue},90%,60%)`,
              }}
            />
            <p
              className="text-[13px] truncate"
              style={{ fontFamily: "var(--font-display), sans-serif", color: "#E8F4FF" }}
            >
              {world.name}
            </p>
          </div>
          <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#E0F7FA]/45 mt-0.5">
            {arch.label} · {TIME_OF_DAY[world.timeOfDay].label} · seed {world.seed}
          </p>
        </div>

        {/* Telemetry */}
        <div
          className="pointer-events-auto hidden sm:block rounded-2xl px-3.5 py-2 text-[10px] font-mono text-[#E0F7FA]/70"
          style={{
            background: "rgba(11,16,26,0.6)",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(140,180,255,0.18)",
          }}
        >
          <div className="flex items-center gap-2">
            <MapPin className="w-3 h-3 text-[#00F2FF]" />
            X {coords.x} · Z {coords.z}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <Compass className="w-3 h-3 text-[#00F2FF]" />
            {cardinal} · {Math.round(((coords.heading % 360) + 360) % 360)}°
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <Sparkles className="w-3 h-3 text-[#00F2FF]" />
            Discoveries {discovered.length}/{totalLandmarks}
          </div>
        </div>
      </div>

      {/* Bottom controls */}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
        <button
          data-nodrag
          onClick={toggleSprint}
          onMouseEnter={sfxHover}
          className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[10px] font-mono uppercase tracking-[0.25em] transition hover:scale-105"
          style={{
            color: sprinting ? "#001417" : "#7fffe0",
            background: sprinting
              ? "linear-gradient(135deg, #7fffe0, #00F2FF)"
              : "rgba(11,16,26,0.6)",
            backdropFilter: "blur(16px)",
            border: sprinting ? "none" : "1px solid rgba(127,255,224,0.4)",
          }}
        >
          <Footprints className="w-3.5 h-3.5" /> {sprinting ? "Sprinting" : "Walk"}
          <kbd className="ml-1 opacity-60">Shift</kbd>
        </button>
        <button
          data-nodrag
          onClick={() => {
            Object.assign(playerRef.current, makePlayer());
            sfxSparkleBurst(world.hue);
          }}
          onMouseEnter={sfxHover}
          className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[10px] font-mono uppercase tracking-[0.25em] text-[#E0F7FA]/80 transition hover:scale-105"
          style={{
            background: "rgba(11,16,26,0.6)",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(140,180,255,0.18)",
          }}
          title="Recenter"
        >
          <Sparkles className="w-3.5 h-3.5" /> Recenter
        </button>
        <button
          data-nodrag
          onClick={cycleTime}
          onMouseEnter={sfxHover}
          className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[10px] font-mono uppercase tracking-[0.25em] text-[#ffe0a0] transition hover:scale-105"
          style={{
            background: "rgba(11,16,26,0.6)",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(255,210,120,0.3)",
          }}
          title="Cycle time of day"
        >
          <Clock className="w-3.5 h-3.5" /> {TIME_OF_DAY[timeOfDay].icon} {TIME_OF_DAY[timeOfDay].label}
        </button>
        <button
          data-nodrag
          onClick={captureScreenshot}
          onMouseEnter={sfxHover}
          className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[10px] font-mono uppercase tracking-[0.25em] text-[#E0F7FA]/80 transition hover:scale-105"
          style={{
            background: "rgba(11,16,26,0.6)",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(140,180,255,0.18)",
          }}
          title="Save a snapshot"
        >
          <Camera className="w-3.5 h-3.5" /> Snapshot
        </button>
      </div>

      {/* Controls hint */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-20 pointer-events-none"
          >
            <div
              className="rounded-2xl px-5 py-2.5 flex items-center gap-4 text-[10px] font-mono uppercase tracking-[0.2em] text-[#E0F7FA]/70"
              style={{
                background: "rgba(11,16,26,0.7)",
                backdropFilter: "blur(16px)",
                border: "1px solid rgba(140,180,255,0.18)",
              }}
            >
              <span><kbd className="text-[#00F2FF]">WASD</kbd> walk</span>
              <span className="opacity-40">·</span>
              <span><kbd className="text-[#00F2FF]">Drag</kbd> look</span>
              <span className="opacity-40">·</span>
              <span><kbd className="text-[#00F2FF]">Space</kbd> jump</span>
              <span className="opacity-40">·</span>
              <span><kbd className="text-[#00F2FF]">Shift</kbd> sprint</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
