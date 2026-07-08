/**
 * Quantum Ocean scene — a deep bioluminescent sea.
 *
 * A procedural whale built from tapered capsule segments swims an endless
 * figure-eight loop, its body rippling sinusoidally. Pulsing jellyfish drift
 * upward with trailing tentacle ribbons, an instanced coral reef carpets the
 * seabed, and 4,000 plankton motes drift through volumetric god-rays.
 */

import {
  Color3,
  Color4,
  Vector3,
  Matrix,
  Quaternion,
  MeshBuilder,
  Mesh,
  StandardMaterial,
  Scalar,
} from "@babylonjs/core";
import type { BabylonSceneApi } from "../BabylonSceneHost";
import { glow, pbr, hsl, nebulaParticles } from "../graphics";
import { castShadow } from "../BabylonSceneHost";

const WHALE_SEGMENTS = 14;

export function buildQuantumOcean({ scene }: BabylonSceneApi) {
  scene.clearColor = new Color4(0.0, 0.04, 0.1, 1);

  // --- Seabed ---
  const seabed = MeshBuilder.CreateGround("seabed", { width: 220, height: 220, subdivisions: 40 }, scene);
  seabed.position.y = -22;
  seabed.material = pbr(scene, {
    baseColor: hsl(190, 0.4, 0.08),
    metallic: 0.2,
    roughness: 0.95,
  });
  seabed.receiveShadows = true;

  // --- Coral reef (instanced thin instances) ---
  const coralTemplate = MeshBuilder.CreateCylinder(
    "coralTpl",
    { diameterTop: 0.1, diameterBottom: 0.8, height: 3, tessellation: 6 },
    scene,
  );
  const coralMat = glow(scene, hsl(330, 0.9, 0.5), 0.7);
  coralTemplate.material = coralMat;
  const coralCount = 120;
  const matrices = new Float32Array(coralCount * 16);
  for (let i = 0; i < coralCount; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * 90;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const s = 0.6 + Math.random() * 1.6;
    const mat = Matrix.Compose(
      new Vector3(s, s * (0.8 + Math.random()), s),
      new Quaternion(),
      new Vector3(x, -20, z),
    );
    matrices.set(mat.m, i * 16);
  }
  coralTemplate.thinInstanceSetBuffer("matrix", matrices, 16, true);
  castShadow(scene, coralTemplate);

  // --- Whale (segmented body) ---
  const whale = new Mesh("whale", scene);
  const whaleSegs: Mesh[] = [];
  const whaleMat = pbr(scene, {
    baseColor: hsl(195, 0.6, 0.4),
    metallic: 0.7,
    roughness: 0.2,
    emissive: hsl(180, 0.9, 0.4),
    emissiveIntensity: 0.6,
  });
  for (let i = 0; i < WHALE_SEGMENTS; i++) {
    const t = i / (WHALE_SEGMENTS - 1);
    // Body taper: thick in middle, thin at tail.
    const radius = Math.sin(t * Math.PI) * 1.6 + 0.3;
    const seg = MeshBuilder.CreateSphere(`wseg${i}`, { diameter: radius * 2, segments: 12 }, scene);
    seg.material = whaleMat;
    seg.parent = whale;
    whaleSegs.push(seg);
  }
  // Tail fluke.
  const fluke = MeshBuilder.CreateBox("fluke", { width: 5, height: 0.3, depth: 2 }, scene);
  fluke.material = whaleMat;
  fluke.parent = whale;
  fluke.position.z = -WHALE_SEGMENTS * 0.8;
  // Eyes (bioluminescent).
  const eyeMat = glow(scene, hsl(180, 1, 0.8), 3);
  for (const sx of [-1, 1]) {
    const eye = MeshBuilder.CreateSphere(`eye${sx}`, { diameter: 0.4, segments: 8 }, scene);
    eye.material = eyeMat;
    eye.parent = whale;
    eye.position.set(sx * 0.8, 0.5, WHALE_SEGMENTS * 0.55);
  }
  castShadow(scene, whale);

  // --- Jellyfish (pulsing dome + tentacle ribbons) ---
  const jellyfish: Array<{ root: Mesh; dome: Mesh; phase: number }> = [];
  for (let i = 0; i < 8; i++) {
    const root = new Mesh(`jelly${i}`, scene);
    const dome = MeshBuilder.CreateSphere(`jdome${i}`, { diameter: 2.4, segments: 16, slice: 0.55 }, scene);
    dome.material = glow(scene, hsl(280 + i * 12, 1, 0.6), 1.6);
    dome.parent = root;
    // Tentacles (thin dangling cylinders).
    for (let j = 0; j < 7; j++) {
      const t = MeshBuilder.CreateCylinder(
        `jtent${i}_${j}`,
        { diameterTop: 0.05, diameterBottom: 0.02, height: 3, tessellation: 5 },
        scene,
      );
      t.material = glow(scene, hsl(280 + i * 12, 1, 0.5), 0.8);
      t.parent = root;
      const a = (j / 7) * Math.PI * 2;
      t.position.set(Math.cos(a) * 0.7, -1.6, Math.sin(a) * 0.7);
    }
    root.position.set(
      Scalar.RandomRange(-30, 30),
      Scalar.RandomRange(0, 18),
      Scalar.RandomRange(-30, 30),
    );
    jellyfish.push({ root, dome, phase: Math.random() * Math.PI * 2 });
  }

  // --- Caustic god-ray beams ---
  const beamMat = new StandardMaterial("beamMat", scene);
  beamMat.emissiveColor = hsl(180, 0.8, 0.7);
  beamMat.alpha = 0.1;
  for (let i = 0; i < 6; i++) {
    const beam = MeshBuilder.CreateCylinder(
      `ubeam${i}`,
      { diameterTop: 0.5, diameterBottom: 8, height: 80, tessellation: 12 },
      scene,
    );
    beam.position.set(Scalar.RandomRange(-50, 50), 18, Scalar.RandomRange(-50, 50));
    beam.material = beamMat;
  }

  // --- Plankton particles ---
  nebulaParticles(scene, {
    count: 4000,
    color1: new Color4(0.3, 0.9, 1.0, 1),
    color2: new Color4(0.5, 0.4, 1.0, 1),
    colorDead: new Color4(0, 0.05, 0.1, 0),
    minSize: 0.12,
    maxSize: 0.5,
    minEmitBox: new Vector3(-80, -20, -80),
    maxEmitBox: new Vector3(80, 30, 80),
    minLife: 6,
    maxLife: 14,
    direction1: new Vector3(-0.2, 0.3, -0.2),
    direction2: new Vector3(0.2, 0.6, 0.2),
    minEmitPower: 0.05,
    maxEmitPower: 0.3,
    texture: "glow",
  });

  // --- Animation loop ---
  let t = 0;
  scene.onBeforeRenderObservable.add(() => {
    const dt = scene.getEngine().getDeltaTime() / 1000;
    t += dt;
    const T = t * 0.25;

    // Whale figure-8 path.
    const cx = Math.sin(T) * 40;
    const cz = Math.sin(T * 2) * 20;
    const cy = 4 + Math.sin(T * 0.7) * 4;
    whale.position.set(cx, cy, cz);
    // Heading toward velocity.
    const dx = Math.cos(T) * 40 * 0.25;
    const dz = Math.cos(T * 2) * 40 * 0.5;
    whale.rotation.y = Math.atan2(dx, dz);
    // Body ripple: sway each segment.
    whaleSegs.forEach((seg, i) => {
      const st = i / (WHALE_SEGMENTS - 1);
      seg.position.z = -i * 0.8;
      seg.position.y = Math.sin(t * 3 - st * 6) * 0.4;
      seg.scaling.x = seg.scaling.z = 1 + Math.sin(t * 3 - st * 6) * 0.08;
    });
    fluke.rotation.x = Math.sin(t * 3) * 0.5;

    // Jellyfish pulse + drift.
    jellyfish.forEach(({ root, dome, phase }, i) => {
      const p = t * 1.2 + phase;
      const pulse = 1 + Math.sin(p) * 0.18;
      dome.scaling.x = dome.scaling.z = pulse;
      dome.scaling.y = 1 + Math.cos(p) * 0.12;
      root.position.y += Math.sin(t * 0.5 + i) * dt * 0.4;
      root.rotation.y += dt * 0.2;
    });
  });
}

void Color3;
