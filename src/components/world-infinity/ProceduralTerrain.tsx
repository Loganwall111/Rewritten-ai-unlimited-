/**
 * ProceduralTerrain — a deterministic height-field mesh built from the world's
 * seed. Vertices are coloured by height + slope so mountains, beaches and
 * water shores read distinctly. The geometry is generated once per world and
 * never changes, so it's cheap after the first frame.
 */

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import type { ArchetypeDef } from "@/lib/worldInfinity/types";
import { heightAt } from "@/lib/worldInfinity/generator";

const SIZE = 240;
const SEGMENTS = 160; // 160×160 = 25.6k verts — plenty of detail at 60fps.

export function ProceduralTerrain({
  archetype,
  seed,
}: {
  archetype: ArchetypeDef;
  seed: string;
}) {
  const meshRef = useRef<THREE.Mesh>(null!);

  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEGMENTS, SEGMENTS);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);

    const cGround = new THREE.Color(archetype.palette.ground);
    const cAccent = new THREE.Color(archetype.palette.groundAccent);
    const cEmissive = new THREE.Color(archetype.palette.emissive);
    const wl = archetype.terrain.waterLevel;

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const h = heightAt(archetype, seed, x, z);
      pos.setY(i, h);

      // Slope estimate via finite differences.
      const hX = heightAt(archetype, seed, x + 1, z);
      const hZ = heightAt(archetype, seed, x, z + 1);
      const slope = Math.hypot(hX - h, hZ - h);

      // Height-normalised 0..1 across this world's amplitude.
      const amp = archetype.terrain.heightScale || 1;
      const t = Math.max(0, Math.min(1, h / amp));

      const col = cGround.clone().lerp(cAccent, t);
      // Steep faces get darker / rockier.
      col.multiplyScalar(1 - Math.min(0.6, slope * 0.4));
      // Shore glow near water.
      if (wl != null && Math.abs(h - wl) < 1.2) {
        col.lerp(cEmissive, 0.5);
      }
      // Low-lying water bed gets a watery tint.
      if (wl != null && h < wl) {
        col.lerp(new THREE.Color(archetype.palette.water), 0.7);
      }

      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
    }

    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    return geo;
  }, [archetype, seed]);

  useFrame((_s, dt) => {
    // Subtle shimmer on the emissive glow for life.
    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.08 + Math.sin(performance.now() * 0.0006) * 0.03;
      void dt;
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry} receiveShadow>
      <meshStandardMaterial
        vertexColors
        roughness={0.92}
        metalness={0.05}
        emissive={archetype.palette.emissive}
        emissiveIntensity={0.08}
        flatShading={false}
      />
    </mesh>
  );
}
