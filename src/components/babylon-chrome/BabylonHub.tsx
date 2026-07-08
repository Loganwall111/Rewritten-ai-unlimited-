/**
 * BabylonHub — the interactive "room of doors" hub, rebuilt in Babylon.
 *
 * You stand at the centre of a PBR marble hall ringed by 12 glowing doors.
 * Each door is a real destination — click one and you portal-dive into that
 * world or app section. Drag to orbit, scroll to zoom. No login required to
 * SEE the hub; clicking a door that needs auth will prompt sign-in.
 *
 * This is the Babylon replacement for the old Three.js /world cinematic hub —
 * it leads with the graphics overhaul instead of hiding it behind a login.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Home as HomeIcon, MousePointerClick } from "lucide-react";
import {
  Color3,
  Color4,
  Vector3,
  MeshBuilder,
  Mesh,
  StandardMaterial,
  ActionManager,
  ExecuteCodeAction,
  Scalar,
} from "@babylonjs/core";
import { BabylonSceneHost, type BabylonSceneApi } from "@/lib/babylon/BabylonSceneHost";
import { pbr, glow, hsl } from "@/lib/babylon/graphics";
import { castShadow } from "@/lib/babylon/BabylonSceneHost";
import { sfxHover, sfxPortalBoom, sfxSparkleBurst, playClick } from "@/lib/sound";

interface DoorDef {
  id: string;
  label: string;
  hue: number;
  to: string;
  blurb: string;
}

/** The 12 destinations the hub doors lead to. */
const DOORS: DoorDef[] = [
  { id: "gateway", label: "Cosmic Gateway", hue: 190, to: "/", blurb: "The entry nebula." },
  {
    id: "cathedral",
    label: "Nebula Cathedral",
    hue: 280,
    to: "/scenes/nebula-cathedral",
    blurb: "Singularity + 5k particles.",
  },
  {
    id: "ocean",
    label: "Quantum Ocean",
    hue: 175,
    to: "/scenes/quantum-ocean",
    blurb: "Whale loop + reef.",
  },
  {
    id: "singularity",
    label: "Singularity",
    hue: 265,
    to: "/scenes/black-hole",
    blurb: "Event horizon.",
  },
  {
    id: "scenes",
    label: "All Cinematic Scenes",
    hue: 300,
    to: "/scenes",
    blurb: "22 Babylon worlds.",
  },
  {
    id: "infinity",
    label: "World Infinity",
    hue: 175,
    to: "/infinity",
    blurb: "Forge procedural worlds.",
  },
  { id: "chat", label: "Chat & Research", hue: 220, to: "/chat", blurb: "Every model." },
  { id: "image", label: "Image Studio", hue: 320, to: "/image", blurb: "Nano Banana." },
  { id: "video", label: "Video Forge", hue: 285, to: "/video", blurb: "Sora + Runway." },
  {
    id: "multiverse",
    label: "Multiverse",
    hue: 275,
    to: "/multiverse",
    blurb: "Black-hole planets.",
  },
  { id: "mic", label: "Voice Portal", hue: 195, to: "/mic", blurb: "Realistic voice." },
  { id: "home", label: "Operator Home", hue: 200, to: "/home", blurb: "Your dashboard." },
];

export function BabylonHub() {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState<DoorDef | null>(null);
  const [diving, setDiving] = useState<DoorDef | null>(null);
  const navigateRef = useRef<(to: string) => void>(() => {});

  // Keep a ref to navigate so the imperative Babylon setup can call it.
  useEffect(() => {
    navigateRef.current = (to: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      navigate({ to: to as any });
    };
  }, [navigate]);

  const onDoorHover = useCallback((d: DoorDef) => {
    setHovered(d);
    sfxHover();
  }, []);

  const onDoorClick = useCallback((d: DoorDef) => {
    setDiving(d);
    sfxPortalBoom();
    sfxSparkleBurst(d.hue);
    playClick();
    setTimeout(() => navigateRef.current(d.to), 850);
  }, []);

  // Build the hub scene imperatively.
  const setup = useCallback(
    ({ scene }: BabylonSceneApi) => {
      scene.clearColor = new Color4(0.02, 0.025, 0.05, 1);

      // Reflective marble floor.
      const floor = MeshBuilder.CreateCylinder(
        "floor",
        { diameter: 70, height: 0.6, tessellation: 96 },
        scene,
      );
      floor.position.y = -0.3;
      floor.material = pbr(scene, {
        baseColor: hsl(220, 0.2, 0.1),
        metallic: 0.9,
        roughness: 0.08,
      });
      floor.receiveShadows = true;

      // Gold inlay ring.
      const ring = MeshBuilder.CreateTorus(
        "ring",
        { diameter: 56, thickness: 0.4, tessellation: 128 },
        scene,
      );
      ring.position.y = 0.05;
      ring.material = pbr(scene, {
        baseColor: hsl(45, 0.9, 0.6),
        metallic: 1,
        roughness: 0.2,
        emissive: hsl(45, 0.9, 0.3),
        emissiveIntensity: 0.4,
      });

      // Central glowing pillar + orb (the "hub core").
      const pillar = MeshBuilder.CreateCylinder(
        "pillar",
        { diameter: 3, height: 18, tessellation: 24 },
        scene,
      );
      pillar.position.y = 9;
      pillar.material = glow(scene, hsl(195, 1, 0.6), 1.2);
      castShadow(scene, pillar);
      const orb = MeshBuilder.CreateIcoSphere("orb", { radius: 1.8, subdivisions: 3 }, scene);
      orb.position.y = 19;
      orb.material = glow(scene, hsl(195, 1, 0.7), 2.0);

      // 24 columns.
      const colMat = pbr(scene, {
        baseColor: hsl(220, 0.15, 0.78),
        metallic: 0.1,
        roughness: 0.35,
      });
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        const col = MeshBuilder.CreateCylinder(
          `col${i}`,
          { diameter: 1.2, height: 16, tessellation: 16 },
          scene,
        );
        col.position.set(Math.cos(a) * 28, 8, Math.sin(a) * 28);
        col.material = colMat;
        castShadow(scene, col);
      }

      // 12 clickable doors.
      DOORS.forEach((door, i) => {
        const a = (i / 12) * Math.PI * 2;
        const r = 22;
        const group = buildClickableDoor(
          scene,
          door,
          () => onDoorHover(door),
          () => onDoorClick(door),
        );
        group.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
        group.rotation.y = -a + Math.PI / 2;
      });

      // Animate the core.
      let t = 0;
      scene.onBeforeRenderObservable.add(() => {
        const dt = scene.getEngine().getDeltaTime() / 1000;
        t += dt;
        orb.rotation.y += dt * 0.4;
        pillar.rotation.y -= dt * 0.12;
        const m = orb.material as StandardMaterial;
        m.emissiveColor = hsl(195 + Math.sin(t * 0.3) * 30, 1, 0.6).scale(1.6);
      });
    },
    [onDoorClick, onDoorHover],
  );

  return (
    <div className="fixed inset-0 z-[500] bg-black">
      <BabylonSceneHost
        setup={setup}
        hdr
        ambient={0.55}
        camera={{
          alpha: -Math.PI / 2,
          beta: Math.PI / 2.5,
          radius: 26,
          autoRotate: true,
          lowerRadius: 10,
          upperRadius: 60,
        }}
        sun={{
          direction: [-0.5, -1, -0.7],
          intensity: 1.8,
          shadowMapSize: 2048,
          shadowFrustum: 50,
        }}
        postProcess={{
          bloom: true,
          bloomWeight: 0.85,
          bloomThreshold: 0.3,
          imageProcessing: true,
          exposure: 1.2,
          contrast: 1.25,
          vignette: true,
          vignetteWeight: 1.3,
          fxaa: true,
        }}
        className="absolute inset-0"
      >
        {/* Top bar */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="absolute top-0 left-0 right-0 p-5 flex items-start justify-between pointer-events-none"
        >
          <button
            onClick={() => navigate({ to: "/" })}
            onMouseEnter={sfxHover}
            className="pointer-events-auto inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[10px] font-mono uppercase tracking-[0.25em] text-[#E0F7FA]/80 hover:text-white transition hover:scale-105"
            style={{
              background: "rgba(11,16,26,0.55)",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(140,180,255,0.18)",
            }}
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Landing
          </button>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="pointer-events-auto rounded-2xl px-5 py-3"
            style={{
              background: "rgba(11,16,26,0.55)",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(0,242,255,0.3)",
            }}
          >
            <h1
              className="text-base"
              style={{ fontFamily: "var(--font-display), sans-serif", color: "#E8F4FF" }}
            >
              The Hub
            </h1>
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#E0F7FA]/45">
              12 doors · choose your world
            </p>
          </motion.div>

          <button
            onClick={() => navigate({ to: "/home" })}
            onMouseEnter={sfxHover}
            className="pointer-events-auto inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[10px] font-mono uppercase tracking-[0.25em] text-[#E0F7FA]/80 hover:text-white transition hover:scale-105"
            style={{
              background: "rgba(11,16,26,0.55)",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(140,180,255,0.18)",
            }}
          >
            <HomeIcon className="w-3.5 h-3.5" /> Home
          </button>
        </motion.div>

        {/* Hovered door tooltip */}
        <AnimatePresence>
          {hovered && !diving && (
            <motion.div
              key={hovered.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              className="absolute bottom-24 left-1/2 -translate-x-1/2 pointer-events-none"
            >
              <div
                className="rounded-2xl px-6 py-3 text-center"
                style={{
                  background: "rgba(11,16,26,0.7)",
                  backdropFilter: "blur(16px)",
                  border: `1px solid hsla(${hovered.hue}, 80%, 55%, 0.5)`,
                  boxShadow: `0 10px 40px -10px hsla(${hovered.hue}, 90%, 60%, 0.5)`,
                }}
              >
                <p
                  className="text-sm font-medium"
                  style={{ color: `hsl(${hovered.hue}, 90%, 85%)` }}
                >
                  {hovered.label}
                </p>
                <p className="text-[11px] text-[#E0F7FA]/55 mt-0.5">{hovered.blurb}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none"
        >
          <div
            className="rounded-full px-5 py-2 flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-[#E0F7FA]/65"
            style={{
              background: "rgba(11,16,26,0.6)",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(140,180,255,0.15)",
            }}
          >
            <MousePointerClick className="w-3 h-3" /> Click a door to enter · drag to orbit
          </div>
        </motion.div>
      </BabylonSceneHost>

      {/* Portal-dive overlay */}
      <AnimatePresence>
        {diving && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[510] flex items-center justify-center bg-black pointer-events-none"
          >
            <div className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 20 }}
                transition={{ duration: 0.85 }}
                className="w-8 h-8 rounded-full mx-auto"
                style={{
                  background: `radial-gradient(circle, hsl(${diving.hue}, 100%, 70%), transparent 70%)`,
                  boxShadow: `0 0 200px 60px hsla(${diving.hue}, 100%, 60%, 0.9)`,
                }}
              />
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#00F2FF] mt-8"
              >
                Entering {diving.label}
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Build a single clickable door (body + emissive frame) with hover/click. */
function buildClickableDoor(
  scene: import("@babylonjs/core").Scene,
  door: DoorDef,
  onHover: () => void,
  onClick: () => void,
): Mesh {
  const doorMesh = MeshBuilder.CreateBox(
    `door-${door.id}`,
    { width: 4, height: 10, depth: 0.5 },
    scene,
  );
  doorMesh.position.y = 5;
  const doorMat = new StandardMaterial(`doorMat-${door.id}`, scene);
  doorMat.diffuseColor = hsl(door.hue, 0.7, 0.3);
  doorMat.emissiveColor = hsl(door.hue, 0.9, 0.25);
  doorMat.alpha = 0.55;
  doorMesh.material = doorMat;

  // Emissive frame (4 boxes).
  const frameMat = pbr(scene, {
    baseColor: hsl(door.hue, 0.7, 0.5),
    metallic: 1,
    roughness: 0.15,
    emissive: hsl(door.hue, 0.95, 0.4),
    emissiveIntensity: 1.2,
  });
  const baseEmissive = hsl(door.hue, 0.95, 0.4);
  const top = MeshBuilder.CreateBox(`ft-${door.id}`, { width: 5, height: 0.5, depth: 0.8 }, scene);
  top.position.y = 10.3;
  const bot = MeshBuilder.CreateBox(`fb-${door.id}`, { width: 5, height: 0.5, depth: 0.8 }, scene);
  bot.position.y = -0.3;
  const left = MeshBuilder.CreateBox(
    `fl-${door.id}`,
    { width: 0.5, height: 11, depth: 0.8 },
    scene,
  );
  left.position.set(-2.3, 5, 0);
  const right = MeshBuilder.CreateBox(
    `fr-${door.id}`,
    { width: 0.5, height: 11, depth: 0.8 },
    scene,
  );
  right.position.set(2.3, 5, 0);
  [top, bot, left, right].forEach((m) => {
    m.material = frameMat;
    castShadow(scene, m);
  });

  // Merge into one group for clean positioning.
  const merged = Mesh.MergeMeshes([doorMesh, top, bot, left, right], true, true)!;

  // Clickable: attach action manager to each child via the merged mesh.
  merged.actionManager = new ActionManager(scene);
  const highlight = () => {
    doorMat.emissiveColor = hsl(door.hue, 1, 0.5);
    frameMat.emissiveColor = baseEmissive.scale(2.2);
    onHover();
  };
  const unhighlight = () => {
    doorMat.emissiveColor = hsl(door.hue, 0.9, 0.25);
    frameMat.emissiveColor = baseEmissive;
  };
  merged.actionManager.registerAction(
    new ExecuteCodeAction(ActionManager.OnPointerOverTrigger, highlight),
  );
  merged.actionManager.registerAction(
    new ExecuteCodeAction(ActionManager.OnPointerOutTrigger, unhighlight),
  );
  merged.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPickTrigger, onClick));

  // Gentle idle pulse per door.
  const phase = Scalar.RandomRange(0, Math.PI * 2);
  scene.onBeforeRenderObservable.add(() => {
    const pulse = 1 + Math.sin(performance.now() * 0.001 + phase) * 0.15;
    frameMat.emissiveColor = baseEmissive.scale(pulse);
  });

  return merged;
}

void Color3;
void Vector3;
