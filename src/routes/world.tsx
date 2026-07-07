/**
 * /world — the Rewritten World cinematic hub.
 *
 * A single self-contained page that plays 5 phases in sequence:
 *   1. LOGO         — "Rewritten World" title + click-to-play
 *   2. CUTSCENE     — camera flies through space, past nebulae, dives to Earth
 *   3. TUTORIAL     — small room with a big robot guide (voiced)
 *   4. EARTH        — first-person walk-around with visible arms + Shrink button
 *   5. RAINDROP     — shrink to microscopic size, swim in a drop, find the
 *                     red flashing light → click → "Start the installation"
 *   6. GALLERY      — 360° drag-to-look panorama with green/red portal orbs
 *                     to the three projects (AI Unlimited, MASSG OS, MASSG Awakening)
 *
 * Everything renders on ONE React Three Fiber canvas that swaps scenes
 * between phases. Voice via the existing useVoice() pipeline (ElevenLabs →
 * Lovable AI TTS → smart browser voice). Mouse-drag look controls in every
 * scene; WASD walk in Phase 4, WASD swim in Phase 5.
 */

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Stars, Html, Line } from "@react-three/drei";
import {
  EffectComposer,
  Bloom,
  ChromaticAberration,
  Vignette,
  Noise,
} from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import * as THREE from "three";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  ArrowRight,
  Minimize2,
  Compass,
  X,
  Plus,
  Home as HomeIcon,
  Sparkles,
} from "lucide-react";
import { useVoice } from "@/lib/useVoice";
import {
  sfxPortalBoom,
  sfxHover,
  sfxTutorialNext,
  playHorizonWhoomph,
  sfxSparkleBurst,
} from "@/lib/sound";

export const Route = createFileRoute("/world")({
  head: () => ({
    meta: [
      { title: "Rewritten World — Enter the constellation" },
      {
        name: "description",
        content: "A cinematic hub for Rewritten AI, MASSG OS, and MASSG Awakening.",
      },
    ],
  }),
  component: WorldPage,
});

type Phase = "logo" | "cutscene" | "tutorial" | "earth" | "raindrop" | "gallery";

/* ═══════════════════════════════════════════════════════════
   PHASE 1 — LOGO
   Big "Rewritten World" title, floating logo mark, click-to-play
   ═══════════════════════════════════════════════════════════ */
function LogoPhase({ onStart }: { onStart: () => void }) {
  return (
    <div className="pointer-events-auto absolute inset-0 flex flex-col items-center justify-center z-30 px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.85, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        className="text-center max-w-2xl"
      >
        {/* Logo mark: rotating conic gradient sphere */}
        <div className="relative mx-auto mb-8 w-40 h-40">
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: "conic-gradient(from 0deg, #00F2FF, #7C3AED, #EC4899, #F59E0B, #00F2FF)",
              filter: "blur(16px)",
              opacity: 0.75,
              animation: "logoSpin 12s linear infinite",
            }}
          />
          <div
            className="absolute inset-3 rounded-full"
            style={{
              background:
                "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.9) 0%, rgba(180,220,255,0.6) 25%, rgba(20,30,60,1) 100%)",
              boxShadow: "inset -14px -20px 40px rgba(0,0,0,0.5), 0 0 60px rgba(0,242,255,0.6)",
            }}
          />
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              background:
                "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.8) 0%, transparent 40%)",
              filter: "blur(4px)",
            }}
          />
        </div>

        <p className="font-mono text-[10px] uppercase tracking-[0.6em] text-[#00F2FF]/70 mb-3">
          A REWRITTEN PRESENTATION
        </p>
        <h1
          className="text-6xl sm:text-8xl leading-none"
          style={{
            fontFamily: "var(--font-display), sans-serif",
            color: "#E0F7FA",
            textShadow:
              "-3px 0 rgba(0,242,255,0.5), 3px 0 rgba(236,72,153,0.4), 0 0 60px rgba(120,180,255,0.6)",
          }}
        >
          Rewritten
        </h1>
        <h1
          className="text-6xl sm:text-8xl leading-none mt-1"
          style={{
            fontFamily: "var(--font-display), sans-serif",
            color: "#00F2FF",
            textShadow:
              "-3px 0 rgba(255,255,255,0.4), 3px 0 rgba(124,58,237,0.5), 0 0 60px rgba(0,242,255,0.7)",
          }}
        >
          World
        </h1>
        <p className="mt-8 max-w-md mx-auto text-sm text-[#E0F7FA]/60 leading-relaxed">
          A constellation of three worlds. One portal to enter them all.
        </p>

        <motion.button
          onClick={onStart}
          onMouseEnter={sfxHover}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5, duration: 0.8 }}
          className="mt-12 group inline-flex items-center gap-3 rounded-full px-10 py-4 text-sm uppercase tracking-[0.3em] transition-all hover:scale-105"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(0,242,255,0.28) 0%, rgba(124,58,237,0.2) 45%, rgba(11,16,26,0.7) 100%)",
            border: "1px solid rgba(0,242,255,0.8)",
            color: "#00F2FF",
            boxShadow:
              "inset 0 0 40px rgba(0,242,255,0.35), 0 0 60px rgba(0,242,255,0.5), 0 0 120px rgba(124,58,237,0.3)",
          }}
        >
          <Play className="w-4 h-4" fill="currentColor" />
          Click to play
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </motion.button>

        <p className="mt-6 text-[10px] font-mono uppercase tracking-widest text-[#E0F7FA]/40">
          Best experienced with sound
        </p>
      </motion.div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PHASE 2 — CUTSCENE
   Camera flies through space past nebulae, warps, dives to Earth
   Duration: ~7 seconds
   ═══════════════════════════════════════════════════════════ */
function CutsceneScene({ progress }: { progress: React.RefObject<number> }) {
  const { camera } = useThree();
  const starsRef = useRef<THREE.Points>(null!);
  const earthRef = useRef<THREE.Mesh>(null!);
  const glowRef = useRef<THREE.Mesh>(null!);
  const nebulaRef = useRef<THREE.Mesh>(null!);
  const streaksRef = useRef<THREE.Points>(null!);

  // Star streaks for the warp phase
  const streakGeom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const N = 800;
    const arr = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const r = 1 + Math.random() * 30;
      const a = Math.random() * Math.PI * 2;
      arr[i * 3] = Math.cos(a) * r;
      arr[i * 3 + 1] = Math.sin(a) * r;
      arr[i * 3 + 2] = -100 + Math.random() * -300;
    }
    g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    return g;
  }, []);

  useFrame((_state, dt) => {
    const p = progress.current ?? 0;

    // Phase 0-40%: warp tunnel with star streaks
    // Phase 40-70%: nebula cloud approaches
    // Phase 70-100%: Earth zoom, camera pulls back to reveal blue marble

    // Camera choreography
    if (p < 0.4) {
      // Warp tunnel
      const t = p / 0.4;
      camera.position.set(0, 0, -t * 40);
      camera.rotation.z = Math.sin(t * 8) * 0.15;
      (camera as THREE.PerspectiveCamera).fov = 75 + t * 30;
    } else if (p < 0.7) {
      // Nebula approach
      const t = (p - 0.4) / 0.3;
      camera.position.set(Math.sin(t * 2) * 3, Math.cos(t * 1.5) * 2, -40 - t * 20);
      camera.rotation.z = 0.15 * (1 - t);
      (camera as THREE.PerspectiveCamera).fov = 105 - t * 30;
    } else {
      // Earth reveal
      const t = (p - 0.7) / 0.3;
      const targetZ = -60 - t * 15;
      camera.position.set(0, 0, targetZ);
      camera.rotation.z = 0;
      (camera as THREE.PerspectiveCamera).fov = 75 - t * 25;
    }
    (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
    camera.lookAt(0, 0, -100);

    // Star streaks push forward
    if (streaksRef.current) {
      const pos = streaksRef.current.geometry.attributes.position as THREE.BufferAttribute;
      const speed = p < 0.5 ? 60 + p * 200 : 30;
      for (let i = 0; i < pos.count; i++) {
        const z = pos.getZ(i) + dt * speed;
        if (z > 5) {
          pos.setZ(i, -300 + Math.random() * -50);
        } else {
          pos.setZ(i, z);
        }
      }
      pos.needsUpdate = true;
      const mat = streaksRef.current.material as THREE.PointsMaterial;
      mat.opacity = p < 0.6 ? 1 : Math.max(0, 1 - (p - 0.6) / 0.2);
    }

    // Nebula fade in during middle
    if (nebulaRef.current) {
      const mat = nebulaRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity =
        p > 0.3 && p < 0.75
          ? Math.min(1, (p - 0.3) / 0.2) * (1 - Math.max(0, (p - 0.65) / 0.1))
          : 0;
      nebulaRef.current.rotation.z += dt * 0.1;
    }

    // Earth appears in the last 30%
    if (earthRef.current && glowRef.current) {
      const t = Math.max(0, (p - 0.65) / 0.35);
      earthRef.current.scale.setScalar(t * 8 + 0.001);
      earthRef.current.rotation.y += dt * 0.15;
      glowRef.current.scale.setScalar(t * 10 + 0.001);
    }

    // Rotate ambient starfield slightly
    if (starsRef.current) starsRef.current.rotation.y += dt * 0.005;
  });

  return (
    <>
      <color attach="background" args={["#02040a"]} />
      <ambientLight intensity={0.6} />
      <pointLight position={[10, 5, -80]} intensity={2.5} color="#ffdd88" />
      <Stars radius={200} depth={80} count={4000} factor={5} saturation={0.4} fade speed={0.8} />
      <points ref={streaksRef} geometry={streakGeom}>
        <pointsMaterial
          size={0.8}
          color="#a8e6ff"
          sizeAttenuation
          transparent
          opacity={1}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
      {/* Big nebula plane */}
      <mesh ref={nebulaRef} position={[0, 0, -80]}>
        <planeGeometry args={[80, 80]} />
        <meshBasicMaterial
          color="#8845ff"
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          map={useMemo(() => {
            const c = document.createElement("canvas");
            c.width = c.height = 256;
            const ctx = c.getContext("2d")!;
            for (let i = 0; i < 60; i++) {
              const x = Math.random() * 256;
              const y = Math.random() * 256;
              const r = 30 + Math.random() * 80;
              const g = ctx.createRadialGradient(x, y, 0, x, y, r);
              const hue = 250 + Math.random() * 80;
              g.addColorStop(0, `hsla(${hue}, 90%, 65%, 0.5)`);
              g.addColorStop(1, "hsla(0,0%,0%,0)");
              ctx.fillStyle = g;
              ctx.fillRect(0, 0, 256, 256);
            }
            return new THREE.CanvasTexture(c);
          }, [])}
        />
      </mesh>
      {/* Earth */}
      <mesh ref={earthRef} position={[0, 0, -80]} scale={0.001}>
        <sphereGeometry args={[3, 64, 48]} />
        <meshStandardMaterial
          color="#4a8fd8"
          emissive="#1a3d6a"
          emissiveIntensity={0.3}
          roughness={0.6}
          metalness={0.15}
        />
      </mesh>
      {/* Earth atmosphere glow */}
      <mesh ref={glowRef} position={[0, 0, -80]} scale={0.001}>
        <sphereGeometry args={[3.6, 32, 24]} />
        <meshBasicMaterial
          color="#88ccff"
          transparent
          opacity={0.25}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   PHASE 3 — TUTORIAL ROOM (with robot guide)
   ═══════════════════════════════════════════════════════════ */
function TutorialScene() {
  const robotRef = useRef<THREE.Group>(null!);
  const eyeL = useRef<THREE.Mesh>(null!);
  const eyeR = useRef<THREE.Mesh>(null!);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (robotRef.current) {
      robotRef.current.position.y = -0.5 + Math.sin(t * 0.8) * 0.15;
      robotRef.current.rotation.y = Math.sin(t * 0.3) * 0.2;
    }
    // Eye glow pulse
    if (eyeL.current && eyeR.current) {
      const pulse = 0.7 + 0.3 * Math.sin(t * 2);
      (eyeL.current.material as THREE.MeshBasicMaterial).color.setHSL(0.55, 1, 0.5 + pulse * 0.3);
      (eyeR.current.material as THREE.MeshBasicMaterial).color.setHSL(0.55, 1, 0.5 + pulse * 0.3);
    }
  });

  return (
    <>
      <color attach="background" args={["#0a1128"]} />
      <ambientLight intensity={0.4} />
      <pointLight position={[0, 4, 3]} intensity={2} color="#00d4ff" distance={20} />
      <pointLight position={[-3, 2, -2]} intensity={1.2} color="#7c3aed" distance={15} />

      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#1a2340" roughness={0.4} metalness={0.5} />
      </mesh>

      {/* Grid on floor (glow lines) */}
      {Array.from({ length: 21 }).map((_, i) => (
        <group key={i}>
          <mesh position={[i - 10, -1.99, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.03, 30]} />
            <meshBasicMaterial color="#00F2FF" transparent opacity={0.25} />
          </mesh>
          <mesh position={[0, -1.99, i - 10]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[30, 0.03]} />
            <meshBasicMaterial color="#00F2FF" transparent opacity={0.25} />
          </mesh>
        </group>
      ))}

      {/* Walls (curved back) */}
      <mesh position={[0, 3, -8]}>
        <planeGeometry args={[30, 12]} />
        <meshStandardMaterial color="#0a1230" roughness={0.8} />
      </mesh>

      {/* The BIG ROBOT */}
      <group ref={robotRef} position={[0, 0, -3]}>
        {/* Head */}
        <mesh position={[0, 2.5, 0]}>
          <boxGeometry args={[1.6, 1.4, 1.6]} />
          <meshStandardMaterial color="#c0d0e5" metalness={0.85} roughness={0.2} />
        </mesh>
        {/* Eye visor strip */}
        <mesh position={[0, 2.55, 0.81]}>
          <boxGeometry args={[1.4, 0.5, 0.05]} />
          <meshBasicMaterial color="#000" />
        </mesh>
        {/* Eyes */}
        <mesh ref={eyeL} position={[-0.3, 2.55, 0.84]}>
          <sphereGeometry args={[0.14, 16, 12]} />
          <meshBasicMaterial color="#00F2FF" />
        </mesh>
        <mesh ref={eyeR} position={[0.3, 2.55, 0.84]}>
          <sphereGeometry args={[0.14, 16, 12]} />
          <meshBasicMaterial color="#00F2FF" />
        </mesh>
        {/* Antenna */}
        <mesh position={[0, 3.4, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.5, 8]} />
          <meshStandardMaterial color="#888" metalness={0.9} />
        </mesh>
        <mesh position={[0, 3.75, 0]}>
          <sphereGeometry args={[0.12, 16, 12]} />
          <meshBasicMaterial color="#ff4488" />
        </mesh>
        {/* Neck */}
        <mesh position={[0, 1.7, 0]}>
          <cylinderGeometry args={[0.3, 0.3, 0.3, 12]} />
          <meshStandardMaterial color="#666" metalness={0.9} />
        </mesh>
        {/* Torso */}
        <mesh position={[0, 0.75, 0]}>
          <boxGeometry args={[2.2, 1.8, 1.4]} />
          <meshStandardMaterial color="#a8b8d5" metalness={0.7} roughness={0.3} />
        </mesh>
        {/* Chest core */}
        <mesh position={[0, 0.75, 0.72]}>
          <cylinderGeometry args={[0.35, 0.35, 0.05, 16]} />
          <meshBasicMaterial color="#00F2FF" />
        </mesh>
        {/* Arms */}
        <mesh position={[-1.35, 0.8, 0]}>
          <cylinderGeometry args={[0.22, 0.22, 1.6, 12]} />
          <meshStandardMaterial color="#8898b8" metalness={0.7} />
        </mesh>
        <mesh position={[1.35, 0.8, 0]}>
          <cylinderGeometry args={[0.22, 0.22, 1.6, 12]} />
          <meshStandardMaterial color="#8898b8" metalness={0.7} />
        </mesh>
        {/* Hands */}
        <mesh position={[-1.35, -0.15, 0]}>
          <sphereGeometry args={[0.28, 16, 12]} />
          <meshStandardMaterial color="#c0d0e5" metalness={0.85} />
        </mesh>
        <mesh position={[1.35, -0.15, 0]}>
          <sphereGeometry args={[0.28, 16, 12]} />
          <meshStandardMaterial color="#c0d0e5" metalness={0.85} />
        </mesh>
        {/* Legs */}
        <mesh position={[-0.5, -0.85, 0]}>
          <cylinderGeometry args={[0.28, 0.28, 1.4, 12]} />
          <meshStandardMaterial color="#8898b8" metalness={0.7} />
        </mesh>
        <mesh position={[0.5, -0.85, 0]}>
          <cylinderGeometry args={[0.28, 0.28, 1.4, 12]} />
          <meshStandardMaterial color="#8898b8" metalness={0.7} />
        </mesh>
      </group>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   PHASE 4 — EARTH: first-person walking + arms + Shrink button
   ═══════════════════════════════════════════════════════════ */
function EarthScene({
  playerRef,
}: {
  playerRef: React.MutableRefObject<{
    x: number;
    y: number;
    z: number;
    yaw: number;
    pitch: number;
  }>;
}) {
  const { camera } = useThree();
  const armL = useRef<THREE.Group>(null!);
  const armR = useRef<THREE.Group>(null!);
  const bobRef = useRef(0);

  useFrame((_state, dt) => {
    const p = playerRef.current;
    camera.position.set(p.x, p.y, p.z);
    camera.rotation.order = "YXZ";
    camera.rotation.y = p.yaw;
    camera.rotation.x = p.pitch;

    // Arms swing when walking
    const walking = keys.w || keys.s || keys.a || keys.d;
    const targetBob = walking ? 1 : 0;
    bobRef.current += (targetBob - bobRef.current) * dt * 6;
    if (armL.current && armR.current) {
      const t = _state.clock.elapsedTime * 6;
      armL.current.rotation.x = -0.4 + Math.sin(t) * 0.3 * bobRef.current;
      armR.current.rotation.x = -0.4 - Math.sin(t) * 0.3 * bobRef.current;
    }
    // Head bob
    camera.position.y = p.y + Math.sin(_state.clock.elapsedTime * 6) * 0.05 * bobRef.current;
  });

  return (
    <>
      <color attach="background" args={["#7ac0e6"]} />
      <fog attach="fog" args={["#a0d0ec", 20, 120]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 20, 5]} intensity={1.5} color="#fff8ee" castShadow />
      {/* Sun */}
      <mesh position={[15, 30, -20]}>
        <sphereGeometry args={[2.5, 32, 24]} />
        <meshBasicMaterial color="#ffee88" />
      </mesh>
      {/* Ground (grassy plane) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[400, 400, 40, 40]} />
        <meshStandardMaterial color="#4a8f3d" roughness={0.9} />
      </mesh>
      {/* Distant mountains */}
      {Array.from({ length: 30 }).map((_, i) => {
        const a = (i / 30) * Math.PI * 2;
        const r = 80 + (i % 3) * 15;
        return (
          <mesh key={i} position={[Math.cos(a) * r, 8 + (i % 4) * 3, Math.sin(a) * r]}>
            <coneGeometry args={[6 + (i % 3) * 2, 14 + (i % 4) * 4, 4]} />
            <meshStandardMaterial
              color={`hsl(${100 + (i % 5) * 8}, 25%, ${25 + (i % 3) * 8}%)`}
              roughness={0.9}
            />
          </mesh>
        );
      })}
      {/* Trees scattered around */}
      {useMemo(
        () =>
          Array.from({ length: 40 }, (_, i) => {
            const a = Math.random() * Math.PI * 2;
            const r = 8 + Math.random() * 40;
            const x = Math.cos(a) * r;
            const z = Math.sin(a) * r;
            const h = 3 + Math.random() * 2;
            return { x, z, h, hue: 100 + Math.random() * 25, i };
          }),
        [],
      ).map((t) => (
        <group key={t.i} position={[t.x, 0, t.z]}>
          <mesh position={[0, t.h / 2, 0]}>
            <cylinderGeometry args={[0.2, 0.3, t.h, 6]} />
            <meshStandardMaterial color="#5a3820" roughness={0.9} />
          </mesh>
          <mesh position={[0, t.h + 0.6, 0]}>
            <sphereGeometry args={[1.2, 12, 10]} />
            <meshStandardMaterial color={`hsl(${t.hue}, 55%, 35%)`} roughness={0.9} />
          </mesh>
        </group>
      ))}
      {/* Clouds */}
      {useMemo(
        () =>
          Array.from({ length: 12 }, (_, i) => ({
            x: (Math.random() - 0.5) * 100,
            y: 25 + Math.random() * 15,
            z: (Math.random() - 0.5) * 100,
            s: 3 + Math.random() * 4,
            i,
          })),
        [],
      ).map((c) => (
        <mesh key={c.i} position={[c.x, c.y, c.z]}>
          <sphereGeometry args={[c.s, 16, 12]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.7} />
        </mesh>
      ))}
      {/* Player arms (attached to camera via a group parented to it) */}
      <group ref={armL} position={[0, 0, 0]}>
        {/* Positioned in camera space using an update in useFrame — simpler: use a fixed offset from world where the camera is */}
      </group>
      <group ref={armR} />
    </>
  );
}

// Global key state for walking + swimming
const keys: Record<string, boolean> = {};
if (typeof window !== "undefined") {
  window.addEventListener("keydown", (e) => {
    keys[e.key.toLowerCase()] = true;
  });
  window.addEventListener("keyup", (e) => {
    keys[e.key.toLowerCase()] = false;
  });
}

/* First-person camera + arms overlay (arms drawn in a separate scene attached to camera) */
function ArmsOverlay() {
  const groupRef = useRef<THREE.Group>(null!);
  const { camera } = useThree();
  useFrame((state) => {
    if (!groupRef.current) return;
    // Follow camera position/rotation exactly
    groupRef.current.position.copy(camera.position);
    groupRef.current.quaternion.copy(camera.quaternion);
    const bob = Math.sin(state.clock.elapsedTime * 6) * 0.02;
    // Sway
    const walking = keys.w || keys.s || keys.a || keys.d;
    const sway = walking ? Math.sin(state.clock.elapsedTime * 5) * 0.08 : 0;
    // Position the two arms relative to the camera
    if (groupRef.current.children.length >= 2) {
      const l = groupRef.current.children[0] as THREE.Group;
      const r = groupRef.current.children[1] as THREE.Group;
      l.position.set(-0.35, -0.5 + bob, -0.55);
      r.position.set(0.35, -0.5 + bob, -0.55);
      l.rotation.set(-0.4 + sway * 0.5, 0.2, 0.15);
      r.rotation.set(-0.4 - sway * 0.5, -0.2, -0.15);
    }
  });
  return (
    <group ref={groupRef}>
      <group>
        <mesh position={[0, 0.25, 0]}>
          <cylinderGeometry args={[0.06, 0.07, 0.5, 12]} />
          <meshStandardMaterial color="#e8c7a0" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.09, 16, 12]} />
          <meshStandardMaterial color="#e8c7a0" roughness={0.6} />
        </mesh>
      </group>
      <group>
        <mesh position={[0, 0.25, 0]}>
          <cylinderGeometry args={[0.06, 0.07, 0.5, 12]} />
          <meshStandardMaterial color="#e8c7a0" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.09, 16, 12]} />
          <meshStandardMaterial color="#e8c7a0" roughness={0.6} />
        </mesh>
      </group>
    </group>
  );
}

/* ═══════════════════════════════════════════════════════════
   PHASE 5 — RAINDROP: swim inside a water drop with microbes
   ═══════════════════════════════════════════════════════════ */
function RaindropScene({
  playerRef,
  onFindLight,
}: {
  playerRef: React.MutableRefObject<{
    x: number;
    y: number;
    z: number;
    yaw: number;
    pitch: number;
  }>;
  onFindLight: () => void;
}) {
  const { camera } = useThree();
  const dropRef = useRef<THREE.Mesh>(null!);
  const redLightRef = useRef<THREE.Group>(null!);
  const microbesRef = useRef<THREE.Group>(null!);

  // Random positions for microbes
  const microbes = useMemo(
    () =>
      Array.from({ length: 40 }, () => ({
        x: (Math.random() - 0.5) * 60,
        y: (Math.random() - 0.5) * 60,
        z: (Math.random() - 0.5) * 60,
        phase: Math.random() * Math.PI * 2,
        hue: 60 + Math.random() * 200,
        size: 0.3 + Math.random() * 0.8,
        speed: 0.3 + Math.random() * 0.5,
      })),
    [],
  );

  useFrame((state, dt) => {
    const p = playerRef.current;
    camera.position.set(p.x, p.y, p.z);
    camera.rotation.order = "YXZ";
    camera.rotation.y = p.yaw;
    camera.rotation.x = p.pitch;

    if (dropRef.current) {
      dropRef.current.rotation.y += dt * 0.05;
    }
    // Red light beckons
    if (redLightRef.current) {
      redLightRef.current.rotation.y += dt * 0.5;
      const pulse = 0.7 + 0.3 * Math.sin(state.clock.elapsedTime * 4);
      const light = redLightRef.current.children[1] as THREE.Mesh;
      (light.material as THREE.MeshBasicMaterial).color.setHSL(0, 1, 0.4 + pulse * 0.3);
      // Proximity check
      const dx = p.x - redLightRef.current.position.x;
      const dy = p.y - redLightRef.current.position.y;
      const dz = p.z - redLightRef.current.position.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist < 4) onFindLight();
    }
    // Microbe drift
    if (microbesRef.current) {
      microbesRef.current.children.forEach((child, i) => {
        const m = microbes[i];
        const t = state.clock.elapsedTime * m.speed + m.phase;
        child.position.x = m.x + Math.sin(t) * 2;
        child.position.y = m.y + Math.cos(t * 1.3) * 2;
        child.position.z = m.z + Math.sin(t * 0.7) * 2;
        child.rotation.y += dt * 0.5;
      });
    }
  });

  return (
    <>
      <color attach="background" args={["#0a2540"]} />
      <fog attach="fog" args={["#0a2540", 15, 80]} />
      <ambientLight intensity={0.5} color="#88ccff" />
      <pointLight position={[0, 0, 0]} intensity={2} color="#a8d8ff" distance={50} />

      {/* Inner drop surface (we're inside it) */}
      <mesh ref={dropRef}>
        <sphereGeometry args={[40, 64, 48]} />
        <meshBasicMaterial
          color="#4488cc"
          side={THREE.BackSide}
          transparent
          opacity={0.35}
          blending={THREE.NormalBlending}
        />
      </mesh>

      {/* Refractive shell layer for more depth */}
      <mesh>
        <sphereGeometry args={[38, 32, 24]} />
        <meshBasicMaterial
          color="#88ccff"
          side={THREE.BackSide}
          transparent
          opacity={0.1}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Microbes (various shapes) */}
      <group ref={microbesRef}>
        {microbes.map((m, i) => (
          <group key={i}>
            {i % 3 === 0 ? (
              // Amoeba blob
              <mesh>
                <sphereGeometry args={[m.size, 12, 8]} />
                <meshStandardMaterial
                  color={`hsl(${m.hue}, 90%, 65%)`}
                  emissive={`hsl(${m.hue}, 90%, 55%)`}
                  emissiveIntensity={0.6}
                  transparent
                  opacity={0.75}
                />
              </mesh>
            ) : i % 3 === 1 ? (
              // Paramecium (elongated)
              <mesh scale={[1, 0.4, 0.4]}>
                <sphereGeometry args={[m.size * 1.5, 16, 8]} />
                <meshStandardMaterial
                  color={`hsl(${m.hue}, 80%, 65%)`}
                  emissive={`hsl(${m.hue}, 80%, 45%)`}
                  emissiveIntensity={0.5}
                  transparent
                  opacity={0.7}
                />
              </mesh>
            ) : (
              // Tardigrade-ish
              <>
                <mesh>
                  <capsuleGeometry args={[m.size * 0.5, m.size, 6, 10]} />
                  <meshStandardMaterial
                    color={`hsl(${m.hue}, 60%, 55%)`}
                    emissive={`hsl(${m.hue}, 60%, 40%)`}
                    emissiveIntensity={0.4}
                    transparent
                    opacity={0.85}
                  />
                </mesh>
              </>
            )}
          </group>
        ))}
      </group>

      {/* THE RED FLASHING LIGHT — the goal */}
      <group ref={redLightRef} position={[15, 8, -12]}>
        <mesh>
          <sphereGeometry args={[0.4, 20, 16]} />
          <meshBasicMaterial color="#ff2244" />
        </mesh>
        <mesh scale={2.5}>
          <sphereGeometry args={[0.4, 20, 16]} />
          <meshBasicMaterial
            color="#ff4466"
            transparent
            opacity={0.35}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
        <pointLight color="#ff3355" intensity={4} distance={20} />
        <Html center distanceFactor={12} style={{ pointerEvents: "none" }}>
          <div
            style={{
              fontFamily: "ui-monospace, Consolas, monospace",
              fontSize: 11,
              color: "#ffbbbb",
              textShadow: "0 0 12px rgba(255,50,80,0.9), 0 2px 8px rgba(0,0,0,0.9)",
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
              padding: "6px 14px",
              borderRadius: 9999,
              background: "rgba(20,4,8,0.8)",
              border: "1px solid rgba(255,80,100,0.6)",
              animation: "pulse-red 1s ease-in-out infinite",
            }}
          >
            ● Start the installation
          </div>
        </Html>
      </group>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   PHASE 6 — GALLERY: 360° drag-look panorama with portals
   ═══════════════════════════════════════════════════════════ */
type Portal = {
  id: string;
  label: string;
  desc: string;
  hue: number;
  status: "ready" | "locked";
  route?: string; // internal route
  externalUrl?: string;
};

const PORTALS: Portal[] = [
  // The 3 REAL ones in the center — GREEN glow, clickable
  {
    id: "unlimited",
    label: "Rewritten AI Unlimited",
    desc: "The lensed AI portal",
    hue: 140,
    status: "ready",
    route: "/home",
  },
  {
    id: "os",
    label: "MASSG OS",
    desc: "The voxel desktop OS",
    hue: 145,
    status: "ready",
    route: "/os",
  },
  {
    id: "minecraft",
    label: "MASSG Awakening",
    desc: "31 dimensions, infinite voxel world",
    hue: 150,
    status: "ready",
    route: "/awakening",
  },
  // Decoy / coming-soon ones — RED, not clickable
  { id: "n1", label: "Nebula Racer", desc: "Coming soon", hue: 0, status: "locked" },
  { id: "n2", label: "Ocean Deep", desc: "Coming soon", hue: 0, status: "locked" },
  { id: "n3", label: "Chrono Fields", desc: "Coming soon", hue: 0, status: "locked" },
  { id: "n4", label: "Sky Citadel", desc: "Coming soon", hue: 0, status: "locked" },
  { id: "n5", label: "Signal Room", desc: "Coming soon", hue: 0, status: "locked" },
  { id: "n6", label: "Prism Garden", desc: "Coming soon", hue: 0, status: "locked" },
];

function GalleryScene({
  playerRef,
  onPortalClick,
}: {
  playerRef: React.MutableRefObject<{
    x: number;
    y: number;
    z: number;
    yaw: number;
    pitch: number;
  }>;
  onPortalClick: (portal: Portal) => void;
}) {
  const { camera } = useThree();
  const groupRef = useRef<THREE.Group>(null!);

  useFrame((_state, dt) => {
    const p = playerRef.current;
    camera.position.set(0, 0, 0);
    camera.rotation.order = "YXZ";
    camera.rotation.y = p.yaw;
    camera.rotation.x = p.pitch;
    if (groupRef.current) groupRef.current.rotation.y += dt * 0.02;
  });

  // Arrange portals: 3 real in a horizontal center row, 6 decoys ringing around
  const arranged = useMemo(() => {
    return PORTALS.map((portal, i) => {
      if (i < 3) {
        // Center row — 3 in a horizontal arc in front
        const angle = -0.4 + (i / 2) * 0.8;
        const r = 12;
        return {
          portal,
          x: Math.sin(angle) * r,
          y: 0,
          z: -Math.cos(angle) * r,
          size: 3.4,
        };
      } else {
        // Ring of decoys
        const idx = i - 3;
        const angle = (idx / 6) * Math.PI * 2 + Math.PI / 6;
        const r = 20;
        return {
          portal,
          x: Math.sin(angle) * r,
          y: idx % 2 === 0 ? 4 : -3,
          z: Math.cos(angle) * r,
          size: 2.4,
        };
      }
    });
  }, []);

  return (
    <>
      <color attach="background" args={["#02040f"]} />
      <ambientLight intensity={0.3} />
      <Stars radius={80} depth={40} count={2000} factor={3} saturation={0.4} fade speed={0.4} />
      {/* Central glow floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -8, 0]}>
        <ringGeometry args={[4, 25, 64]} />
        <meshBasicMaterial
          color="#00F2FF"
          transparent
          opacity={0.15}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>

      <group ref={groupRef}>
        {arranged.map((a) => (
          <PortalCube key={a.portal.id} data={a} onClick={() => onPortalClick(a.portal)} />
        ))}
      </group>

      {/* Ring lines between portals of same status (constellation) */}
      {arranged
        .filter((a) => a.portal.status === "ready")
        .map((a, i, arr) => {
          const next = arr[(i + 1) % arr.length];
          return (
            <Line
              key={`link-${i}`}
              points={[
                [a.x, a.y, a.z],
                [next.x, next.y, next.z],
              ]}
              color="#00F2FF"
              lineWidth={0.6}
              transparent
              opacity={0.3}
            />
          );
        })}
    </>
  );
}

function PortalCube({
  data,
  onClick,
}: {
  data: { portal: Portal; x: number; y: number; z: number; size: number };
  onClick: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const [hover, setHover] = useState(false);
  const isReady = data.portal.status === "ready";
  const color = isReady ? "#00ff88" : "#ff3355";

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.006;
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5 + data.x) * 0.15;
      const targetScale = hover && isReady ? 1.2 : 1;
      const s = meshRef.current.scale.x;
      meshRef.current.scale.setScalar(s + (targetScale - s) * 0.15);
    }
  });

  return (
    <group position={[data.x, data.y, data.z]}>
      <mesh
        ref={meshRef}
        onPointerOver={() => {
          setHover(true);
          if (isReady) {
            document.body.style.cursor = "pointer";
            sfxHover();
          }
        }}
        onPointerOut={() => {
          setHover(false);
          document.body.style.cursor = "none";
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (isReady) onClick();
        }}
      >
        <boxGeometry args={[data.size, data.size, data.size]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isReady ? 1.2 : 0.8}
          transparent
          opacity={0.85}
          metalness={0.6}
          roughness={0.2}
        />
      </mesh>
      {/* Wireframe overlay */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(data.size, data.size, data.size)]} />
        <lineBasicMaterial color="#ffffff" transparent opacity={0.6} />
      </lineSegments>
      <pointLight color={color} intensity={isReady ? 2 : 1} distance={12} />
      <Html center distanceFactor={12} style={{ pointerEvents: "none" }}>
        <div
          style={{
            fontFamily: "var(--font-display), sans-serif",
            fontSize: isReady ? 13 : 11,
            color: isReady ? "#c8ffe0" : "#ffb8b8",
            textShadow: "0 2px 8px rgba(0,0,0,0.95), 0 0 12px currentColor",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
            padding: "4px 10px",
            borderRadius: 9999,
            background: "rgba(11,16,26,0.85)",
            border: `1px solid ${isReady ? "rgba(0,255,136,0.5)" : "rgba(255,80,100,0.4)"}`,
            marginTop: data.size * 14 + "px",
          }}
        >
          {data.portal.label}
        </div>
      </Html>
    </group>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE COMPONENT
   ═══════════════════════════════════════════════════════════ */

function WorldPage() {
  const navigate = useNavigate();
  const { speak } = useVoice();
  const [phase, setPhase] = useState<Phase>("logo");
  const cutsceneProgress = useRef(0);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [foundLight, setFoundLight] = useState(false);
  const [galleryPanel, setGalleryPanel] = useState<null | "escape" | "worlds" | "create">(null);
  const [portalDiving, setPortalDiving] = useState<Portal | null>(null);

  // Player state (yaw/pitch look, position for FPS phases)
  const playerRef = useRef({ x: 0, y: 1.7, z: 0, yaw: 0, pitch: 0 });

  // === Mouse look (works in all phases) ===
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      // Free-look drag when mouse down (or always in FPS phases)
      if (phase === "logo" || phase === "cutscene") return;
      if (phase === "earth" || phase === "raindrop") {
        // Passive look based on mouse position for accessibility (no pointer lock)
        // But primary is drag-to-look
      }
      if (isDragging.current) {
        const dx = e.clientX - lastMouse.current.x;
        const dy = e.clientY - lastMouse.current.y;
        playerRef.current.yaw -= dx * 0.005;
        playerRef.current.pitch = Math.max(
          -Math.PI / 2 + 0.1,
          Math.min(Math.PI / 2 - 0.1, playerRef.current.pitch - dy * 0.005),
        );
        lastMouse.current = { x: e.clientX, y: e.clientY };
      }
    };
    const isDragging = { current: false };
    const lastMouse = { current: { x: 0, y: 0 } };
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest("button, a, input, [data-nodrag]")) return;
      isDragging.current = true;
      lastMouse.current = { x: e.clientX, y: e.clientY };
    };
    const onUp = () => {
      isDragging.current = false;
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("mouseleave", onUp);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("mouseleave", onUp);
    };
  }, [phase]);

  // === Walk/swim physics (earth + raindrop) ===
  useEffect(() => {
    if (phase !== "earth" && phase !== "raindrop") return;
    let raf = 0;
    const tick = () => {
      const p = playerRef.current;
      const speed = phase === "raindrop" ? 0.18 : 0.12;
      const yawSin = Math.sin(p.yaw);
      const yawCos = Math.cos(p.yaw);
      let fwd = 0,
        side = 0,
        up = 0;
      if (keys.w) fwd += 1;
      if (keys.s) fwd -= 1;
      if (keys.d) side += 1;
      if (keys.a) side -= 1;
      if (phase === "raindrop") {
        if (keys[" "]) up += 1;
        if (keys.shift) up -= 1;
      }
      p.x += (-yawSin * fwd + yawCos * side) * speed;
      p.z += (-yawCos * fwd - yawSin * side) * speed;
      if (phase === "raindrop") p.y += up * speed;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  // === Phase progression ===
  const startCutscene = () => {
    setPhase("cutscene");
    sfxPortalBoom();
    cutsceneProgress.current = 0;
    const start = performance.now();
    const DUR = 7000;
    const tick = () => {
      const t = Math.min(1, (performance.now() - start) / DUR);
      cutsceneProgress.current = t;
      if (t < 1) requestAnimationFrame(tick);
      else setTimeout(() => setPhase("tutorial"), 200);
    };
    requestAnimationFrame(tick);
  };

  // === Tutorial: 3 spoken lines from the robot ===
  const tutorialLines = useMemo(
    () => [
      "Welcome, operator. I am your guide inside Rewritten World.",
      "Drag your mouse to look around. Press W A S D to walk once you are outside.",
      "When you are ready, step forward into the light. Earth is waiting.",
    ],
    [],
  );

  useEffect(() => {
    if (phase !== "tutorial") return;
    if (tutorialStep >= tutorialLines.length) {
      // Auto-advance to earth after all lines
      const t = setTimeout(() => {
        playerRef.current = { x: 0, y: 1.7, z: 0, yaw: 0, pitch: 0 };
        setPhase("earth");
      }, 1200);
      return () => clearTimeout(t);
    }
    sfxTutorialNext();
    speak(tutorialLines[tutorialStep]).then(() => {
      setTimeout(() => setTutorialStep((s) => s + 1), 500);
    });
  }, [phase, tutorialStep, tutorialLines, speak]);

  // === Voice on entering gallery ===
  useEffect(() => {
    if (phase === "gallery") {
      speak(
        "Welcome to Rewritten World. Three portals are ready. The green ones will take you there.",
      );
    }
  }, [phase, speak]);

  return (
    <div
      className="fixed inset-0 z-[500]"
      style={{
        background: "#000",
        cursor: phase === "logo" ? "auto" : phase === "cutscene" ? "none" : "grab",
      }}
    >
      {/* Global CSS for this page's animations */}
      <style>{`
        @keyframes logoSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse-red { 0%,100% { box-shadow: 0 0 20px rgba(255,50,80,0.6); } 50% { box-shadow: 0 0 40px rgba(255,50,80,1); } }
      `}</style>

      {/* The one canvas that renders whichever scene */}
      <Canvas
        camera={{ position: [0, 0, 0], fov: 75, near: 0.05, far: 500 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        dpr={[1, 1.75]}
      >
        <Suspense fallback={null}>
          {phase === "cutscene" && <CutsceneScene progress={cutsceneProgress} />}
          {phase === "tutorial" && <TutorialScene />}
          {phase === "earth" && (
            <>
              <EarthScene playerRef={playerRef} />
              <ArmsOverlay />
            </>
          )}
          {phase === "raindrop" && (
            <RaindropScene playerRef={playerRef} onFindLight={() => setFoundLight(true)} />
          )}
          {phase === "gallery" && (
            <GalleryScene
              playerRef={playerRef}
              onPortalClick={(portal) => {
                if (!portal.route) return;
                setPortalDiving(portal);
                sfxPortalBoom();
                playHorizonWhoomph();
                sfxSparkleBurst(0);
                setTimeout(() => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  navigate({ to: portal.route as any });
                }, 900);
              }}
            />
          )}
          <EffectComposer multisampling={0}>
            <Bloom intensity={0.9} luminanceThreshold={0.2} luminanceSmoothing={0.7} mipmapBlur />
            <ChromaticAberration
              offset={[0.0008, 0.0012] as unknown as THREE.Vector2}
              blendFunction={BlendFunction.NORMAL}
              radialModulation={false}
              modulationOffset={0}
            />
            <Vignette eskil={false} offset={0.2} darkness={0.75} />
            <Noise opacity={0.04} blendFunction={BlendFunction.OVERLAY} />
          </EffectComposer>
        </Suspense>
      </Canvas>

      {/* Overlays per phase */}
      {phase === "logo" && <LogoPhase onStart={startCutscene} />}

      {phase === "cutscene" && (
        <div className="pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-end pb-16">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="font-mono text-[10px] tracking-[0.5em] uppercase text-[#00F2FF]/70"
          >
            Approaching Earth…
          </motion.p>
        </div>
      )}

      {phase === "tutorial" && tutorialStep < tutorialLines.length && (
        <div className="pointer-events-none absolute inset-0 z-30 flex items-end justify-center pb-24 px-6">
          <motion.div
            key={tutorialStep}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="max-w-xl px-8 py-5 rounded-2xl text-center"
            style={{
              background: "rgba(11,16,26,0.85)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(0,242,255,0.3)",
              boxShadow: "0 20px 60px -10px rgba(0,242,255,0.4)",
            }}
          >
            <p className="font-mono text-[9px] uppercase tracking-[0.4em] text-[#00F2FF]/70 mb-2">
              ROBOT · {tutorialStep + 1} / {tutorialLines.length}
            </p>
            <p className="text-base text-[#E0F7FA] leading-relaxed">
              {tutorialLines[tutorialStep]}
            </p>
          </motion.div>
        </div>
      )}

      {phase === "earth" && (
        <>
          {/* Crosshair */}
          <div
            className="pointer-events-none fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20"
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.5)",
              boxShadow: "0 0 8px rgba(0,242,255,0.6)",
            }}
          />
          {/* Shrink button */}
          <div className="absolute inset-x-0 bottom-8 z-30 flex flex-col items-center gap-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-white/70 bg-black/40 backdrop-blur-sm rounded-full px-4 py-1">
              WASD to walk · Drag to look
            </p>
            <button
              data-nodrag
              onClick={() => {
                sfxPortalBoom();
                playHorizonWhoomph();
                playerRef.current = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0 };
                setFoundLight(false);
                setTimeout(() => setPhase("raindrop"), 400);
              }}
              className="group inline-flex items-center gap-3 rounded-full px-8 py-3.5 text-sm uppercase tracking-[0.3em] transition-all hover:scale-105"
              style={{
                background:
                  "radial-gradient(ellipse at center, rgba(0,242,255,0.3), rgba(124,58,237,0.2), rgba(11,16,26,0.7))",
                border: "1px solid rgba(0,242,255,0.7)",
                color: "#00F2FF",
                boxShadow: "inset 0 0 40px rgba(0,242,255,0.35), 0 0 50px rgba(0,242,255,0.5)",
              }}
            >
              <Minimize2 className="w-4 h-4" />
              Shrink
            </button>
          </div>
        </>
      )}

      {phase === "raindrop" && (
        <>
          <div
            className="pointer-events-none fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20"
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.6)",
              boxShadow: "0 0 8px rgba(120,180,255,0.7)",
            }}
          />
          {!foundLight && (
            <div className="absolute inset-x-0 top-8 z-30 flex justify-center">
              <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-white/75 bg-black/50 backdrop-blur-sm rounded-full px-5 py-2 border border-white/10">
                WASD to swim · SPACE up · SHIFT down · Find the red light
              </p>
            </div>
          )}
          {foundLight && (
            <div className="absolute inset-x-0 bottom-8 z-30 flex flex-col items-center gap-3">
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="font-mono text-[10px] uppercase tracking-[0.4em] text-red-200"
              >
                Signal detected
              </motion.p>
              <motion.button
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                data-nodrag
                onClick={() => {
                  sfxPortalBoom();
                  playHorizonWhoomph();
                  playerRef.current = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0 };
                  setTimeout(() => setPhase("gallery"), 500);
                }}
                className="inline-flex items-center gap-3 rounded-full px-10 py-4 text-sm uppercase tracking-[0.3em] hover:scale-105 transition-all"
                style={{
                  background:
                    "radial-gradient(ellipse at center, rgba(255,50,80,0.4), rgba(180,20,60,0.25), rgba(30,4,10,0.8))",
                  border: "1px solid rgba(255,80,100,0.8)",
                  color: "#ffcccc",
                  boxShadow: "inset 0 0 40px rgba(255,50,80,0.4), 0 0 60px rgba(255,50,80,0.6)",
                  animation: "pulse-red 1s ease-in-out infinite",
                }}
              >
                ● Start the installation
              </motion.button>
            </div>
          )}
        </>
      )}

      {phase === "gallery" && (
        <>
          {/* Top nav — 3 buttons */}
          <div className="absolute top-8 left-1/2 -translate-x-1/2 z-30 flex gap-3">
            <button
              data-nodrag
              onClick={() => {
                sfxPortalBoom();
                navigate({ to: "/home" });
              }}
              className="px-5 py-2.5 rounded-full font-mono text-[10px] uppercase tracking-[0.3em] flex items-center gap-2 hover:scale-105 transition-all"
              style={{
                background: "rgba(15,25,45,0.75)",
                backdropFilter: "blur(16px)",
                border: "1px solid rgba(255,80,80,0.4)",
                color: "#ffbbbb",
              }}
            >
              <X className="w-3 h-3" /> Escape
            </button>
            <button
              data-nodrag
              onClick={() => setGalleryPanel("worlds")}
              className="px-5 py-2.5 rounded-full font-mono text-[10px] uppercase tracking-[0.3em] flex items-center gap-2 hover:scale-105 transition-all"
              style={{
                background: "rgba(15,25,45,0.75)",
                backdropFilter: "blur(16px)",
                border: "1px solid rgba(0,242,255,0.4)",
                color: "#a8e6ff",
              }}
            >
              <Compass className="w-3 h-3" /> Worlds
            </button>
            <button
              data-nodrag
              onClick={() => setGalleryPanel("create")}
              className="px-5 py-2.5 rounded-full font-mono text-[10px] uppercase tracking-[0.3em] flex items-center gap-2 hover:scale-105 transition-all"
              style={{
                background: "rgba(15,25,45,0.75)",
                backdropFilter: "blur(16px)",
                border: "1px solid rgba(255,220,100,0.4)",
                color: "#ffe088",
              }}
            >
              <Plus className="w-3 h-3" /> Create
            </button>
          </div>

          {/* Panorama hint */}
          <div className="pointer-events-none absolute inset-x-0 bottom-8 z-20 flex justify-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-white/50 bg-black/40 backdrop-blur-sm rounded-full px-4 py-1">
              Drag to look · Click a green portal
            </p>
          </div>

          {/* Gallery info panels */}
          <AnimatePresence>
            {galleryPanel && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-md px-4"
                onClick={() => setGalleryPanel(null)}
                data-nodrag
              >
                <motion.div
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.9, y: 20 }}
                  onClick={(e) => e.stopPropagation()}
                  className="max-w-md w-full rounded-2xl p-8 text-center"
                  style={{
                    background: "rgba(11,16,26,0.95)",
                    border: "1px solid rgba(0,242,255,0.4)",
                    boxShadow: "0 30px 80px -20px rgba(0,242,255,0.4)",
                  }}
                >
                  {galleryPanel === "worlds" && (
                    <>
                      <Compass className="w-10 h-10 mx-auto text-[#00F2FF] mb-3" />
                      <h2
                        className="text-2xl mb-2"
                        style={{ fontFamily: "var(--font-display), sans-serif" }}
                      >
                        Available Worlds
                      </h2>
                      <p className="text-sm text-[#E0F7FA]/70 mb-4">
                        Three worlds are online. Six more are in construction.
                      </p>
                      <div className="text-left space-y-2">
                        {PORTALS.map((p) => (
                          <div key={p.id} className="flex items-center justify-between text-xs">
                            <span
                              className={p.status === "ready" ? "text-emerald-300" : "text-red-300"}
                            >
                              ● {p.label}
                            </span>
                            <span className="text-[#E0F7FA]/40 font-mono uppercase tracking-widest text-[9px]">
                              {p.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                  {galleryPanel === "create" && (
                    <>
                      <Sparkles className="w-10 h-10 mx-auto text-yellow-300 mb-3" />
                      <h2
                        className="text-2xl mb-2"
                        style={{ fontFamily: "var(--font-display), sans-serif" }}
                      >
                        Create a New World
                      </h2>
                      <p className="text-sm text-[#E0F7FA]/70 mb-4">
                        This portal isn't open yet. Return with the Rewritten AI Unlimited toolset
                        to spin one up.
                      </p>
                      <button
                        onClick={() => {
                          setGalleryPanel(null);
                          navigate({ to: "/home" });
                        }}
                        className="mt-2 rounded-full px-6 py-2.5 text-xs uppercase tracking-widest text-[#00F2FF]"
                        style={{
                          background:
                            "radial-gradient(ellipse at center, rgba(0,242,255,0.2), rgba(11,16,26,0.7))",
                          border: "1px solid rgba(0,242,255,0.6)",
                        }}
                      >
                        Open AI Unlimited
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setGalleryPanel(null)}
                    className="mt-5 text-[10px] font-mono uppercase tracking-widest text-[#E0F7FA]/50 hover:text-[#00F2FF]"
                  >
                    Close
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Portal-dive warp overlay when clicking a green portal */}
          <AnimatePresence>
            {portalDiving && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black"
              >
                <div className="text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 20 }}
                    transition={{ duration: 0.9 }}
                    className="w-8 h-8 rounded-full"
                    style={{
                      background: `radial-gradient(circle, hsl(${portalDiving.hue}, 100%, 70%), transparent 70%)`,
                      boxShadow: `0 0 200px 60px hsla(${portalDiving.hue}, 100%, 60%, 0.9)`,
                    }}
                  />
                  <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#00F2FF] absolute inset-x-0 bottom-16">
                    Entering {portalDiving.label}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* Home button (always visible except during pure cutscene) */}
      {phase !== "cutscene" && phase !== "logo" && !portalDiving && (
        <button
          data-nodrag
          onClick={() => navigate({ to: "/home" })}
          className="fixed top-4 left-4 z-40 w-9 h-9 rounded-full flex items-center justify-center text-white/70 hover:text-[#00F2FF] transition"
          style={{
            background: "rgba(15,25,45,0.6)",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(140,180,255,0.2)",
          }}
          title="Exit to Portal"
        >
          <HomeIcon className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
