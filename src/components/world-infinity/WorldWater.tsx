/**
 * WorldWater — a translucent, gently-animated water plane for archetypes with
 * a waterLevel. Uses scrolling sine normals for a cheap-but-pretty ripple.
 */

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import type { ArchetypeDef } from "@/lib/worldInfinity/types";

export function WorldWater({ archetype }: { archetype: ArchetypeDef }) {
  const matRef = useRef<THREE.MeshStandardMaterial>(null!);
  const wl = archetype.terrain.waterLevel;
  const isLava = archetype.id === "volcanic";

  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);

  useFrame((_, dt) => {
    uniforms.uTime.value += dt;
  });

  if (wl == null) return null;

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, wl, 0]} receiveShadow>
      <planeGeometry args={[300, 300, 1, 1]} />
      <meshStandardMaterial
        ref={matRef}
        color={archetype.palette.water}
        transparent
        opacity={isLava ? 0.92 : 0.74}
        roughness={0.12}
        metalness={isLava ? 0.0 : 0.4}
        emissive={isLava ? archetype.palette.emissive : "#000000"}
        emissiveIntensity={isLava ? 1.4 : 0}
      />
    </mesh>
  );
}
