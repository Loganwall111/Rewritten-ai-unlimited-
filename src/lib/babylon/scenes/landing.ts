/**
 * Enhanced Landing scene — the cosmic gateway.
 *
 * A signature glowing icosphere at the centre, three orbital rings of light
 * tilted at different angles, a swarm of 3,000 nebula particles, and orbiting
 * accent orbs. Slow cinematic camera auto-rotation. Designed to be the first
 * thing visitors see — maximal "wow" per byte.
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

export function buildLanding({ scene }: BabylonSceneApi) {
  scene.clearColor = new Color4(0.005, 0.008, 0.02, 1);

  // Central glowing icosphere.
  const ico = MeshBuilder.CreateIcoSphere("ico", { radius: 4, subdivisions: 6 }, scene);
  ico.material = glow(scene, hsl(190, 1, 0.6), 2.2);
  // Wireframe overlay for the "lens" aesthetic.
  const wire = MeshBuilder.CreateIcoSphere("wire", { radius: 4.2, subdivisions: 2 }, scene);
  const wireMat = new StandardMaterial("wireMat", scene);
  wireMat.wireframe = true;
  wireMat.emissiveColor = hsl(190, 1, 0.8);
  wireMat.alpha = 0.4;
  wire.material = wireMat;

  // Inner plasma core.
  const core = MeshBuilder.CreateSphere("core", { diameter: 3, segments: 24 }, scene);
  core.material = glow(scene, hsl(280, 1, 0.7), 2.8);

  // Three orbital rings.
  const rings: Mesh[] = [];
  const ringHues = [190, 280, 330];
  for (let i = 0; i < 3; i++) {
    const ring = MeshBuilder.CreateTorus(
      `oring${i}`,
      { diameter: 14 + i * 7, thickness: 0.2, tessellation: 128 },
      scene,
    );
    ring.material = glow(scene, hsl(ringHues[i], 1, 0.65), 1.4);
    ring.rotation.x = Math.PI / 2 + (i - 1) * 0.5;
    ring.rotation.z = i * 0.7;
    rings.push(ring);
  }

  // Orbiting accent orbs.
  const orbs: Mesh[] = [];
  const orbCount = 6;
  for (let i = 0; i < orbCount; i++) {
    const orb = MeshBuilder.CreateSphere(`oacc${i}`, { diameter: 0.7 + (i % 3) * 0.3, segments: 12 }, scene);
    orb.material = glow(scene, hsl(190 + i * 30, 1, 0.7), 2.0);
    orbs.push(orb);
  }

  // 3,000-particle nebula.
  nebulaParticles(scene, {
    count: 3000,
    color1: new Color4(0.2, 0.7, 1.0, 1),
    color2: new Color4(0.7, 0.3, 1.0, 1),
    colorDead: new Color4(0.02, 0.0, 0.06, 0),
    minSize: 0.3,
    maxSize: 1.8,
    minEmitBox: new Vector3(-45, -25, -45),
    maxEmitBox: new Vector3(45, 35, 45),
    minLife: 5,
    maxLife: 11,
    direction1: new Vector3(-0.3, 0.4, -0.3),
    direction2: new Vector3(0.3, 1.0, 0.3),
    minEmitPower: 0.1,
    maxEmitPower: 0.5,
    texture: "star",
  });

  // Per-frame choreography.
  let t = 0;
  scene.onBeforeRenderObservable.add(() => {
    const dt = scene.getEngine().getDeltaTime() / 1000;
    t += dt;
    ico.rotation.y += dt * 0.25;
    ico.rotation.x += dt * 0.08;
    wire.rotation.y -= dt * 0.15;
    core.scaling.setAll(1 + Math.sin(t * 1.6) * 0.06);
    (ico.material as StandardMaterial).emissiveColor = hsl(
      190 + Math.sin(t * 0.2) * 40,
      1,
      0.6,
    ).scale(2.2);
    rings.forEach((ring, i) => {
      ring.rotation.y += dt * (0.3 - i * 0.08) * (i % 2 === 0 ? 1 : -1);
    });
    orbs.forEach((orb, i) => {
      const speed = 0.4 + i * 0.12;
      const r = 8 + i * 2.5;
      const a = t * speed + (i / orbCount) * Math.PI * 2;
      orb.position.set(Math.cos(a) * r, Math.sin(a * 0.7) * 3, Math.sin(a) * r);
    });
  });
}

void Color3;
void Vector3;
