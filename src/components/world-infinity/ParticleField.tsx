/**
 * ParticleField — the ambient "weather" of a world (pollen, embers, snow,
 * spores, dust, bubbles, rain, data, stardust, leaves). A single Points cloud
 * whose motion + colour are driven by the ParticleKind.
 */

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import type { ArchetypeDef, ParticleKind } from "@/lib/worldInfinity/types";

const COUNT = 700;
const SPREAD = 130;

interface ParticleConfig {
  color: string;
  size: number;
  gravity: number; // + falls, - rises
  drift: number; // sideways wander
  speed: number; // vertical speed
  opacity: number;
  additive: boolean;
}

export function particleConfig(kind: ParticleKind, archetype: ArchetypeDef): ParticleConfig {
  switch (kind) {
    case "pollen":
      return { color: "#fff6c0", size: 0.18, gravity: 0, drift: 0.4, speed: 0.3, opacity: 0.8, additive: true };
    case "embers":
      return { color: archetype.palette.emissive, size: 0.16, gravity: -0.6, drift: 0.3, speed: 1.4, opacity: 0.95, additive: true };
    case "snow":
      return { color: "#ffffff", size: 0.28, gravity: 0.6, drift: 0.5, speed: 1.0, opacity: 0.9, additive: false };
    case "spores":
      return { color: archetype.palette.emissive, size: 0.2, gravity: 0, drift: 0.5, speed: 0.4, opacity: 0.7, additive: true };
    case "dust":
      return { color: "#e8d0a0", size: 0.14, gravity: 0, drift: 0.8, speed: 0.6, opacity: 0.5, additive: true };
    case "bubbles":
      return { color: archetype.palette.emissive, size: 0.3, gravity: -0.5, drift: 0.4, speed: 0.8, opacity: 0.6, additive: true };
    case "rain":
      return { color: "#9fd8ff", size: 0.08, gravity: 4, drift: 0.1, speed: 6, opacity: 0.5, additive: false };
    case "data":
      return { color: archetype.palette.emissive, size: 0.12, gravity: 0.7, drift: 0.2, speed: 1.2, opacity: 0.9, additive: true };
    case "stardust":
      return { color: "#ffffff", size: 0.16, gravity: 0, drift: 0.3, speed: 0.2, opacity: 0.9, additive: true };
    case "leaves":
      return { color: archetype.palette.foliage, size: 0.34, gravity: 0.2, drift: 1.2, speed: 0.7, opacity: 0.85, additive: false };
    default:
      return { color: "#ffffff", size: 0.2, gravity: 0, drift: 0.3, speed: 0.4, opacity: 0.7, additive: true };
  }
}

export function ParticleField({
  archetype,
  seed,
}: {
  archetype: ArchetypeDef;
  seed: string;
}) {
  const pointsRef = useRef<THREE.Points>(null!);
  const cfg = particleConfig(archetype.particles, archetype);

  const { positions, velocities, phases } = useMemo(() => {
    const positions = new Float32Array(COUNT * 3);
    const velocities = new Float32Array(COUNT * 3);
    const phases = new Float32Array(COUNT);
    // Simple seeded init.
    let s = 0;
    for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) >>> 0;
    const rand = () => {
      s = (Math.imul(s ^ (s >>> 15), 0x85ebca6b) ^ (s >>> 7)) >>> 0;
      return (s & 0xffffff) / 0x1000000;
    };
    for (let i = 0; i < COUNT; i++) {
      positions[i * 3] = (rand() - 0.5) * SPREAD * 2;
      positions[i * 3 + 1] = rand() * 60;
      positions[i * 3 + 2] = (rand() - 0.5) * SPREAD * 2;
      velocities[i * 3] = (rand() - 0.5) * cfg.drift;
      velocities[i * 3 + 1] = (rand() - 0.5) * cfg.speed + cfg.gravity * 0.5;
      velocities[i * 3 + 2] = (rand() - 0.5) * cfg.drift;
      phases[i] = rand() * Math.PI * 2;
    }
    return { positions, velocities, phases };
  }, [seed, cfg.drift, cfg.speed, cfg.gravity]);

  useFrame((_s, dt) => {
    const pts = pointsRef.current;
    if (!pts) return;
    const attr = pts.geometry.attributes.position as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    const t = performance.now() * 0.001;
    for (let i = 0; i < COUNT; i++) {
      const ix = i * 3;
      // Apply gravity + drift; wrap around the playfield.
      arr[ix] += (velocities[ix] + Math.sin(t + phases[i]) * cfg.drift * 0.5) * dt;
      arr[ix + 1] -= cfg.gravity * dt + Math.sin(t * 0.7 + phases[i]) * 0.05;
      arr[ix + 2] += (velocities[ix + 2] + Math.cos(t + phases[i]) * cfg.drift * 0.5) * dt;
      // Wrap.
      if (arr[ix + 1] < -2) arr[ix + 1] = 60;
      if (arr[ix + 1] > 62) arr[ix + 1] = 0;
      if (arr[ix] > SPREAD) arr[ix] = -SPREAD;
      if (arr[ix] < -SPREAD) arr[ix] = SPREAD;
      if (arr[ix + 2] > SPREAD) arr[ix + 2] = -SPREAD;
      if (arr[ix + 2] < -SPREAD) arr[ix + 2] = SPREAD;
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color={cfg.color}
        size={cfg.size}
        transparent
        opacity={cfg.opacity}
        sizeAttenuation
        depthWrite={false}
        blending={cfg.additive ? THREE.AdditiveBlending : THREE.NormalBlending}
      />
    </points>
  );
}
