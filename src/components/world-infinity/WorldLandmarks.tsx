/**
 * WorldLandmarks — the discoverable points of interest in a world.
 *
 * Each landmark renders as a glowing beacon (a light beam + floating icon +
 * ground ring) that's visible from afar so you can navigate to it. Walk within
 * range and it's "discovered" — the beacon flares, its name is revealed, and
 * the discovery is recorded on the world.
 */

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import type { ArchetypeDef } from "@/lib/worldInfinity/types";
import { generateLandmarks, type Landmark } from "@/lib/worldInfinity/landmarks";
import { heightAt } from "@/lib/worldInfinity/generator";
import type { ExplorerPlayer } from "./InfinityExplorerScene";

export function WorldLandmarks({
  archetype,
  seed,
  discovered,
  playerRef,
  onDiscover,
}: {
  archetype: ArchetypeDef;
  seed: string;
  discovered: string[];
  playerRef: React.MutableRefObject<ExplorerPlayer>;
  onDiscover: (lm: Landmark) => void;
}) {
  const landmarks = useMemo(() => generateLandmarks(archetype, seed), [archetype, seed]);
  const firedRef = useRef<Set<string>>(new Set());

  // Proximity discovery check.
  useFrame(() => {
    const p = playerRef.current;
    for (const lm of landmarks) {
      if (discovered.includes(lm.id) || firedRef.current.has(lm.id)) continue;
      const d = Math.hypot(lm.x - p.x, lm.z - p.z);
      if (d < lm.radius) {
        firedRef.current.add(lm.id);
        onDiscover(lm);
      }
    }
  });

  return (
    <group>
      {landmarks.map((lm) => (
        <LandmarkBeacon
          key={lm.id}
          lm={lm}
          archetype={archetype}
          seed={seed}
          discovered={discovered.includes(lm.id)}
        />
      ))}
    </group>
  );
}

function LandmarkBeacon({
  lm,
  archetype,
  seed,
  discovered,
}: {
  lm: Landmark;
  archetype: ArchetypeDef;
  seed: string;
  discovered: boolean;
}) {
  const beamRef = useRef<THREE.Mesh>(null!);
  const iconRef = useRef<THREE.Mesh>(null!);
  const y = heightAt(archetype, seed, lm.x, lm.z);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (iconRef.current) {
      iconRef.current.rotation.y = t * 0.6;
      iconRef.current.position.y = y + 5 + Math.sin(t * 1.4) * 0.4;
      const s = 1 + (discovered ? Math.sin(t * 2) * 0.06 : 0);
      iconRef.current.scale.setScalar(s);
    }
    if (beamRef.current) {
      const mat = beamRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = (discovered ? 0.5 : 0.22) + Math.sin(t * 2 + lm.x) * 0.06;
    }
  });

  return (
    <group position={[lm.x, 0, lm.z]}>
      {/* Light beam */}
      <mesh ref={beamRef} position={[0, y + 40, 0]}>
        <cylinderGeometry args={[0.6, 1.6, 80, 12, 1, true]} />
        <meshBasicMaterial
          color={`hsl(${lm.hue}, 90%, 65%)`}
          transparent
          opacity={0.3}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Ground ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y + 0.15, 0]}>
        <ringGeometry args={[3, 3.6, 32]} />
        <meshBasicMaterial
          color={`hsl(${lm.hue}, 90%, 65%)`}
          transparent
          opacity={discovered ? 0.8 : 0.4}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Floating icon */}
      <mesh ref={iconRef} position={[0, y + 5, 0]}>
        <octahedronGeometry args={[1.4, 0]} />
        <meshStandardMaterial
          color={`hsl(${lm.hue}, 90%, 70%)`}
          emissive={`hsl(${lm.hue}, 95%, 60%)`}
          emissiveIntensity={discovered ? 2.4 : 1.4}
          metalness={0.4}
          roughness={0.15}
        />
      </mesh>
      <pointLight
        position={[0, y + 5, 0]}
        color={`hsl(${lm.hue}, 95%, 65%)`}
        intensity={discovered ? 4 : 2}
        distance={18}
      />

      {/* Label */}
      <Html position={[0, y + 8, 0]} center distanceFactor={14} style={{ pointerEvents: "none" }}>
        <div
          style={{
            fontFamily: "var(--font-display), sans-serif",
            fontSize: 12,
            color: discovered ? `hsl(${lm.hue}, 90%, 82%)` : "rgba(220,235,255,0.7)",
            textShadow: "0 2px 8px rgba(0,0,0,0.95), 0 0 12px currentColor",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
            padding: "4px 12px",
            borderRadius: 9999,
            background: "rgba(8,12,22,0.85)",
            border: `1px solid hsla(${lm.hue}, 90%, 60%, ${discovered ? 0.7 : 0.3})`,
          }}
        >
          {discovered ? lm.name : "● Undiscovered"}
        </div>
      </Html>
    </group>
  );
}
