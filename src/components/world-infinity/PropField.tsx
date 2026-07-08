/**
 * PropField — scatters deterministic, archetype-appropriate props across the
 * terrain. Each prop KIND (pine, crystal, tower, coral, …) gets its own
 * InstancedMesh, so thousands of objects cost only a handful of draw calls.
 *
 * Placement is fully a function of the world seed: same seed → same forest,
 * same crystal field, same city grid.
 */

import { useMemo } from "react";
import * as THREE from "three";
import type { ArchetypeDef, PropKind } from "@/lib/worldInfinity/types";
import { heightAt } from "@/lib/worldInfinity/generator";
import { ScatterGrid } from "@/lib/worldInfinity/noise";
import { Rng } from "@/lib/worldInfinity/rng";

const FIELD_RADIUS = 115;
const MAX_PER_KIND = 240;

/** Build a geometry for a given prop kind. */
function propGeometry(kind: PropKind, rng: Rng): THREE.BufferGeometry {
  switch (kind) {
    case "pine": {
      // Trunk + cone foliage merged.
      const trunk = new THREE.CylinderGeometry(0.18, 0.28, 2.2, 6);
      trunk.translate(0, 1.1, 0);
      const cone = new THREE.ConeGeometry(1.4, 4.5, 7);
      cone.translate(0, 4.4, 0);
      const cone2 = new THREE.ConeGeometry(1.0, 3, 7);
      cone2.translate(0, 6.2, 0);
      return mergeGeos([trunk, cone, cone2]);
    }
    case "broadleaf": {
      const trunk = new THREE.CylinderGeometry(0.25, 0.4, 3, 6);
      trunk.translate(0, 1.5, 0);
      const ball = new THREE.IcosahedronGeometry(2.4 + rng.float() * 0.6, 1);
      ball.translate(0, 4.4, 0);
      return mergeGeos([trunk, ball]);
    }
    case "crystal": {
      const g = new THREE.OctahedronGeometry(1.2, 0);
      g.scale(0.6, 1.8 + rng.float(), 0.6);
      return g;
    }
    case "rock": {
      const g = new THREE.DodecahedronGeometry(1.4 + rng.float() * 0.8, 0);
      g.scale(rng.range(0.8, 1.2), rng.range(0.5, 0.8), rng.range(0.8, 1.2));
      return g;
    }
    case "mushroom": {
      const stem = new THREE.CylinderGeometry(0.3, 0.5, rng.range(3, 6), 8);
      stem.translate(0, rng.range(1.5, 3), 0);
      const cap = new THREE.SphereGeometry(
        rng.range(1.6, 2.6),
        10,
        8,
        0,
        Math.PI * 2,
        0,
        Math.PI / 2,
      );
      cap.translate(0, rng.range(3, 6), 0);
      cap.scale(1, 0.6, 1);
      return mergeGeos([stem, cap]);
    }
    case "pillar": {
      const g = new THREE.CylinderGeometry(0.6, 0.8, rng.range(6, 12), 8);
      g.translate(0, rng.range(3, 6), 0);
      return g;
    }
    case "tower": {
      const w = rng.range(2.5, 4.5);
      const h = rng.range(8, 22);
      const g = new THREE.BoxGeometry(w, h, w);
      g.translate(0, h / 2, 0);
      return g;
    }
    case "cactus": {
      const body = new THREE.CylinderGeometry(0.5, 0.6, rng.range(3, 5), 8);
      body.translate(0, rng.range(1.5, 2.5), 0);
      const arm = new THREE.CylinderGeometry(0.35, 0.4, 1.6, 6);
      arm.rotateZ(Math.PI / 2);
      arm.translate(0.8, rng.range(1.5, 3), 0);
      return mergeGeos([body, arm]);
    }
    case "coral": {
      const trunk = new THREE.CylinderGeometry(0.2, 0.5, rng.range(3, 7), 6);
      trunk.translate(0, rng.range(1.5, 3.5), 0);
      const branches = Array.from({ length: 5 }, () => {
        const b = new THREE.CylinderGeometry(0.12, 0.2, rng.range(1, 2.5), 5);
        b.translate(0, rng.range(2, 5), 0);
        b.rotateZ(rng.range(-0.8, 0.8));
        b.rotateY(rng.range(0, Math.PI * 2));
        return b;
      });
      return mergeGeos([trunk, ...branches]);
    }
    case "iceberg": {
      const g = new THREE.IcosahedronGeometry(rng.range(1.6, 3), 0);
      g.scale(rng.range(0.8, 1.4), rng.range(0.6, 1.2), rng.range(0.8, 1.4));
      return g;
    }
    case "lava": {
      const g = new THREE.SphereGeometry(rng.range(0.4, 1), 6, 5);
      g.scale(1.5, 0.3, 1.5);
      return g;
    }
    case "arch": {
      const g = new THREE.TorusGeometry(2.2, 0.5, 8, 16, Math.PI);
      g.rotateX(Math.PI);
      g.translate(0, 2.2, 0);
      return g;
    }
    case "monolith": {
      const g = new THREE.BoxGeometry(rng.range(0.8, 1.6), rng.range(7, 14), rng.range(0.8, 1.6));
      g.translate(0, rng.range(3.5, 7), 0);
      return g;
    }
    case "geyser": {
      const g = new THREE.CylinderGeometry(0.4, 0.9, 1.5, 8);
      return g;
    }
    case "neonTree": {
      const trunk = new THREE.CylinderGeometry(0.1, 0.15, rng.range(3, 6), 5);
      trunk.translate(0, rng.range(1.5, 3), 0);
      const top = new THREE.ConeGeometry(0.8, rng.range(1.5, 3), 5);
      top.translate(0, rng.range(3.5, 6.5), 0);
      return mergeGeos([trunk, top]);
    }
    default:
      return new THREE.BoxGeometry(1, 1, 1);
  }
}

function mergeGeos(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  // Lightweight manual merge (avoid drei mergeBufferGeometries dep quirks).
  const out = new THREE.BufferGeometry();
  let posCount = 0;
  let normCount = 0;
  for (const g of geos) {
    posCount += (g.getAttribute("position") as THREE.BufferAttribute)?.count ?? 0;
    normCount += (g.getAttribute("normal") as THREE.BufferAttribute)?.count ?? 0;
  }
  const positions = new Float32Array(posCount * 3);
  const normals = new Float32Array(normCount * 3);
  let pi = 0;
  let ni = 0;
  for (const g of geos) {
    const p = g.getAttribute("position") as THREE.BufferAttribute;
    const n = g.getAttribute("normal") as THREE.BufferAttribute;
    if (p) {
      positions.set(p.array as Float32Array, pi);
      pi += p.count * 3;
    }
    if (n) {
      normals.set(n.array as Float32Array, ni);
      ni += n.count * 3;
    }
  }
  out.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  out.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  return out;
}

interface Instance {
  kind: PropKind;
  matrices: THREE.Matrix4[];
}

export function PropField({ archetype, seed }: { archetype: ArchetypeDef; seed: string }) {
  const instances = useMemo<Instance[]>(() => {
    const grid = new ScatterGrid(seed, 7);
    const rng = new Rng(`${seed}::propmeta`);
    const buckets = new Map<PropKind, THREE.Matrix4[]>();
    // Pre-seed buckets.
    for (const [k] of archetype.props) buckets.set(k, []);

    grid.forEach(FIELD_RADIUS, (x, z, density) => {
      const kind = rng.weighted(archetype.props as ReadonlyArray<readonly [PropKind, number]>);
      const bucket = buckets.get(kind);
      if (!bucket) return;
      if (bucket.length >= MAX_PER_KIND) return;
      // Avoid placing on very steep spots or underwater beds (unless aquatic).
      const y = heightAt(archetype, seed, x, z);
      const wl = archetype.terrain.waterLevel;
      if (wl != null && kind !== "coral" && y < wl + 0.2) return;
      const scale = rng.range(0.7, 1.4);
      const m = new THREE.Matrix4().compose(
        new THREE.Vector3(x, y, z),
        new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(0, 1, 0),
          rng.float() * Math.PI * 2,
        ),
        new THREE.Vector3(scale, scale, scale),
      );
      bucket.push(m);
      void density;
    });

    return Array.from(buckets.entries()).map(([kind, matrices]) => ({ kind, matrices }));
  }, [archetype, seed]);

  return (
    <group>
      {instances.map(({ kind, matrices }) => (
        <PropKindMesh
          key={kind}
          kind={kind}
          archetype={archetype}
          seed={seed}
          matrices={matrices}
        />
      ))}
    </group>
  );
}

function PropKindMesh({
  kind,
  archetype,
  seed,
  matrices,
}: {
  kind: PropKind;
  archetype: ArchetypeDef;
  seed: string;
  matrices: THREE.Matrix4[];
}) {
  const { geometry, material, emissive } = useMemo(() => {
    const rng = new Rng(`${seed}::${kind}::geo`);
    const geo = propGeometry(kind, rng);
    const p = archetype.palette;
    let mat: THREE.Material;
    let isEmissive = false;
    switch (kind) {
      case "pine":
        mat = new THREE.MeshStandardMaterial({ color: p.foliage, roughness: 0.85 });
        break;
      case "broadleaf":
        mat = new THREE.MeshStandardMaterial({ color: p.foliage, roughness: 0.8 });
        break;
      case "crystal":
        mat = new THREE.MeshStandardMaterial({
          color: p.foliage,
          emissive: p.emissive,
          emissiveIntensity: 1.6,
          metalness: 0.4,
          roughness: 0.15,
        });
        isEmissive = true;
        break;
      case "rock":
        mat = new THREE.MeshStandardMaterial({
          color: p.groundAccent,
          roughness: 1,
          metalness: 0.05,
        });
        break;
      case "mushroom":
        mat = new THREE.MeshStandardMaterial({
          color: p.foliage,
          emissive: p.emissive,
          emissiveIntensity: 0.8,
          roughness: 0.6,
        });
        isEmissive = true;
        break;
      case "pillar":
      case "monolith":
        mat = new THREE.MeshStandardMaterial({
          color: p.groundAccent,
          emissive: p.emissive,
          emissiveIntensity: 0.25,
          roughness: 0.7,
          metalness: 0.2,
        });
        isEmissive = true;
        break;
      case "tower":
        mat = new THREE.MeshStandardMaterial({
          color: "#0a0a14",
          emissive: p.emissive,
          emissiveIntensity: 0.9,
          roughness: 0.3,
          metalness: 0.6,
        });
        isEmissive = true;
        break;
      case "cactus":
        mat = new THREE.MeshStandardMaterial({ color: p.foliage, roughness: 0.9 });
        break;
      case "coral":
        mat = new THREE.MeshStandardMaterial({
          color: p.foliage,
          emissive: p.emissive,
          emissiveIntensity: 1.0,
          roughness: 0.5,
        });
        isEmissive = true;
        break;
      case "iceberg":
        mat = new THREE.MeshStandardMaterial({
          color: "#dffaff",
          emissive: p.emissive,
          emissiveIntensity: 0.3,
          roughness: 0.2,
          metalness: 0.1,
          transparent: true,
          opacity: 0.85,
        });
        isEmissive = true;
        break;
      case "lava":
        mat = new THREE.MeshStandardMaterial({
          color: p.water,
          emissive: p.emissive,
          emissiveIntensity: 2.2,
          roughness: 0.5,
        });
        isEmissive = true;
        break;
      case "arch":
        mat = new THREE.MeshStandardMaterial({
          color: p.groundAccent,
          emissive: p.emissive,
          emissiveIntensity: 0.4,
          roughness: 0.6,
        });
        isEmissive = true;
        break;
      case "geyser":
        mat = new THREE.MeshStandardMaterial({
          color: p.groundAccent,
          emissive: p.emissive,
          emissiveIntensity: 0.6,
          roughness: 0.7,
        });
        isEmissive = true;
        break;
      case "neonTree":
        mat = new THREE.MeshStandardMaterial({
          color: p.foliage,
          emissive: p.emissive,
          emissiveIntensity: 1.4,
          roughness: 0.4,
        });
        isEmissive = true;
        break;
      default:
        mat = new THREE.MeshStandardMaterial({ color: p.ground });
    }
    return { geometry: geo, material: mat, emissive: isEmissive };
  }, [kind, archetype, seed]);

  if (matrices.length === 0) return null;

  return (
    <instancedMesh
      ref={(m) => {
        if (!m) return;
        for (let i = 0; i < matrices.length; i++) m.setMatrixAt(i, matrices[i]);
        m.instanceMatrix.needsUpdate = true;
        m.computeBoundingSphere();
      }}
      args={[geometry, material, matrices.length]}
      castShadow
      receiveShadow
    />
  );
}
