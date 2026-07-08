/**
 * Nebula Cathedral scene — a towering cosmic cathedral.
 *
 * Six concentric rotating rings around a pulsing singularity core, floating
 * shard buttresses, god-ray light beams, and 5,000 volumetric particles
 * drifting through the nave. Pure spectacle.
 */

import {
  Color3,
  Color4,
  Vector3,
  MeshBuilder,
  Mesh,
  StandardMaterial,
} from "@babylonjs/core";
import type { BabylonSceneApi } from "../BabylonSceneHost";
import { glow, hsl, nebulaParticles } from "../graphics";

const RING_COUNT = 6;

export function buildNebulaCathedral({ scene }: BabylonSceneApi) {
  scene.clearColor = new Color4(0.01, 0.005, 0.03, 1);

  // Singularity core — layered emissive spheres.
  const core = MeshBuilder.CreateIcoSphere("core", { radius: 2.2, subdivisions: 4 }, scene);
  core.material = glow(scene, hsl(280, 1, 0.7), 2.5);
  const coreHalo = MeshBuilder.CreateSphere("coreHalo", { diameter: 7, segments: 24 }, scene);
  const haloMat = new StandardMaterial("haloMat", scene);
  haloMat.emissiveColor = hsl(280, 1, 0.5);
  haloMat.alpha = 0.18;
  coreHalo.material = haloMat;

  // Six concentric rings, each its own hue + tilt + spin speed.
  const rings: Mesh[] = [];
  for (let i = 0; i < RING_COUNT; i++) {
    const ring = MeshBuilder.CreateTorus(
      `ring${i}`,
      { diameter: 12 + i * 9, thickness: 0.35 + (i % 2) * 0.25, tessellation: 128 },
      scene,
    );
    const hue = 260 + i * 22;
    ring.material = glow(scene, hsl(hue, 0.95, 0.6), 1.3);
    ring.rotation.x = Math.PI / 2 + (i - RING_COUNT / 2) * 0.18;
    ring.rotation.z = i * 0.2;
    rings.push(ring);
  }

  // Floating shard buttresses arching up.
  const shardMat = glow(scene, hsl(300, 0.8, 0.6), 0.9);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const r = 22 + (i % 3) * 4;
    const shard = MeshBuilder.CreatePolyhedron(
      `shard${i}`,
      { type: 2, size: 1.6 },
      scene,
    );
    shard.position.set(Math.cos(a) * r, 8 + (i % 5) * 3, Math.sin(a) * r);
    shard.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
    shard.material = shardMat;
  }

  // God-ray beams — thin tall emissive cones from above.
  const beamMat = glow(scene, hsl(45, 0.7, 0.7), 0.5);
  beamMat.alpha = 0.18;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const beam = MeshBuilder.CreateCylinder(
      `beam${i}`,
      { diameterTop: 0.4, diameterBottom: 6, height: 60, tessellation: 16 },
      scene,
    );
    beam.position.set(Math.cos(a) * 14, 28, Math.sin(a) * 14);
    beam.material = beamMat;
  }

  // 5,000-particle nebula drift.
  nebulaParticles(scene, {
    count: 5000,
    color1: new Color4(0.55, 0.3, 0.95, 1),
    color2: new Color4(0.3, 0.6, 1.0, 1),
    colorDead: new Color4(0.05, 0.0, 0.1, 0),
    minSize: 0.25,
    maxSize: 1.6,
    minEmitBox: new Vector3(-40, -10, -40),
    maxEmitBox: new Vector3(40, 50, 40),
    minLife: 5,
    maxLife: 12,
    direction1: new Vector3(-0.2, 0.6, -0.2),
    direction2: new Vector3(0.2, 1.2, 0.2),
    minEmitPower: 0.1,
    maxEmitPower: 0.5,
    texture: "star",
  });

  // Per-frame: counter-rotate rings, pulse the core, breathe the halo.
  let t = 0;
  scene.onBeforeRenderObservable.add(() => {
    const dt = scene.getEngine().getDeltaTime() / 1000;
    t += dt;
    rings.forEach((ring, i) => {
      ring.rotation.y += dt * (0.1 + i * 0.04) * (i % 2 === 0 ? 1 : -1);
    });
    core.rotation.y += dt * 0.3;
    const pulse = 1 + Math.sin(t * 1.5) * 0.08;
    core.scaling.setAll(pulse);
    coreHalo.scaling.setAll(1 + Math.sin(t * 0.8) * 0.12);
    (core.material as ReturnType<typeof glow>).emissiveColor = hsl(
      270 + Math.sin(t * 0.4) * 40,
      1,
      0.65,
    ).scale(2.4);
  });
}

void Vector3;
void Color3;
