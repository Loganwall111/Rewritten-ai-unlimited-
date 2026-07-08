/**
 * InfinityExplorerScene — the full first-person world scene: terrain, props,
 * sky, water, particles, and a terrain-following FPS controller (WASD walk,
 * drag-to-look, sprint, jump, head-bob). Renders inside a parent <Canvas>.
 */

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import type { InfinityWorld, TimeOfDay } from "@/lib/worldInfinity/types";
import { buildSpec, heightAt } from "@/lib/worldInfinity/generator";
import { ProceduralTerrain } from "./ProceduralTerrain";
import { PropField } from "./PropField";
import { WorldSky } from "./WorldSky";
import { WorldWater } from "./WorldWater";
import { ParticleField } from "./ParticleField";
import { WorldLandmarks } from "./WorldLandmarks";
import type { Landmark } from "@/lib/worldInfinity/landmarks";

export interface ExplorerPlayer {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  vy: number;
  onGround: boolean;
}

export function makePlayer(): ExplorerPlayer {
  return { x: 0, y: 20, z: 0, yaw: 0, pitch: 0, vy: 0, onGround: false };
}

/** Keyboard state — shared singleton so the controller + HUD read the same. */
const keys: Record<string, boolean> = {};
export function getKeys() {
  return keys;
}

export function InfinityExplorerScene({
  world,
  playerRef,
  sprintRef,
  fogRef,
  discovered,
  onDiscover,
  timeOfDay,
}: {
  world: InfinityWorld;
  playerRef: React.MutableRefObject<ExplorerPlayer>;
  sprintRef: React.MutableRefObject<boolean>;
  fogRef: React.MutableRefObject<number>;
  discovered: string[];
  onDiscover: (lm: Landmark) => void;
  timeOfDay: TimeOfDay;
}) {
  const spec = buildSpec(world);
  const { camera, gl } = useThree();

  // Initialise camera + fog once per world.
  useEffect(() => {
    const p = playerRef.current;
    camera.position.set(p.x, p.y, p.z);
    camera.rotation.order = "YXZ";
    camera.rotation.set(p.pitch, p.yaw, 0);
    const scene = gl.getRenderTarget() ?? null;
    void scene;
    // scene fog
    const c = new THREE.Color(spec.archetype.palette.fog);
    camera.far = 600;
    camera.updateProjectionMatrix();
    fogRef.current = spec.archetype.palette.fogDensity;
    return () => {
      /* nothing */
    };
  }, [world, camera, gl, playerRef, fogRef, spec.archetype.palette.fog]);

  // Keyboard listeners.
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys[e.key.toLowerCase()] = true;
    };
    const up = (e: KeyboardEvent) => {
      keys[e.key.toLowerCase()] = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  // Drag-to-look.
  useEffect(() => {
    const dragging = { current: false };
    const last = { x: 0, y: 0 };
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest("button, a, input, [data-nodrag]")) return;
      dragging.current = true;
      last.x = e.clientX;
      last.y = e.clientY;
    };
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const dx = e.clientX - last.x;
      const dy = e.clientY - last.y;
      const p = playerRef.current;
      p.yaw -= dx * 0.0042;
      p.pitch = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, p.pitch - dy * 0.0042));
      last.x = e.clientX;
      last.y = e.clientY;
    };
    const onUp = () => {
      dragging.current = false;
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
  }, [playerRef]);

  // Movement + terrain follow.
  useFrame((_state, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05); // clamp to avoid tunneling on tab refocus
    const p = playerRef.current;
    const arch = spec.archetype;
    const sprint = sprintRef.current;
    const speed = (keys["shift"] || sprint ? 26 : 13) * dt;
    let fwd = 0;
    let side = 0;
    if (keys["w"] || keys["arrowup"]) fwd += 1;
    if (keys["s"] || keys["arrowdown"]) fwd -= 1;
    if (keys["d"] || keys["arrowright"]) side += 1;
    if (keys["a"] || keys["arrowleft"]) side -= 1;
    const yawSin = Math.sin(p.yaw);
    const yawCos = Math.cos(p.yaw);
    p.x += (-yawSin * fwd + yawCos * side) * speed;
    p.z += (-yawCos * fwd - yawSin * side) * speed;

    // Gravity + jump.
    const groundY = heightAt(arch, world.seed, p.x, p.z) + 1.7; // eye height
    p.vy -= 22 * dt;
    p.y += p.vy * dt;
    if (p.y <= groundY) {
      p.y = groundY;
      p.vy = 0;
      p.onGround = true;
      if (keys[" "]) p.vy = 9; // jump
    } else {
      p.onGround = false;
    }

    // Head-bob while walking on the ground.
    const moving = (fwd !== 0 || side !== 0) && p.onGround;
    const bob = moving ? Math.sin(performance.now() * 0.012 * (sprint ? 1.6 : 1)) * 0.06 : 0;

    camera.position.set(p.x, p.y + bob, p.z);
    camera.rotation.set(p.pitch, p.yaw, 0);
  });

  return (
    <>
      <fog attach="fog" args={[spec.archetype.palette.fog, 30, 230]} />
      <WorldSky archetype={spec.archetype} timeOfDay={timeOfDay} />
      <ProceduralTerrain archetype={spec.archetype} seed={world.seed} />
      <PropField archetype={spec.archetype} seed={world.seed} />
      <WorldWater archetype={spec.archetype} />
      <ParticleField archetype={spec.archetype} seed={world.seed} />
      <WorldLandmarks
        archetype={spec.archetype}
        seed={world.seed}
        discovered={discovered}
        playerRef={playerRef}
        onDiscover={onDiscover}
      />
    </>
  );
}
