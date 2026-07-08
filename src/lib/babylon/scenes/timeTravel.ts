/**
 * Time Travel scene — epochs ripple outward through a chrono vortex.
 *
 * Concentric timestamped rings expand from a central "now" point, particles
 * stream along the time axis, and a clock-hand constellation ticks overhead.
 */

import { Color3, Color4, Vector3, MeshBuilder, Mesh, StandardMaterial } from "@babylonjs/core";
import type { BabylonSceneApi } from "../BabylonSceneHost";
import { glow, hsl, nebulaParticles, starField } from "../graphics";

const EPOCHS = [
  "BIG BANG",
  "STONE",
  "BRONZE",
  "IRON",
  "RENAISSANCE",
  "INDUSTRIAL",
  "DIGITAL",
  "STELLAR",
];

export function buildTimeTravel({ scene }: BabylonSceneApi) {
  scene.clearColor = new Color4(0.04, 0.02, 0.08, 1);
  starField(scene, 1500, 500);

  // Central "now" orb.
  const now = MeshBuilder.CreateIcoSphere("now", { radius: 1.6, subdivisions: 3 }, scene);
  now.material = glow(scene, hsl(50, 1, 0.7), 2.5);

  // Expanding epoch rings (recycled).
  const rings: Array<{ mesh: Mesh; phase: number }> = [];
  for (let i = 0; i < EPOCHS.length; i++) {
    const ring = MeshBuilder.CreateTorus(
      `epoch${i}`,
      { diameter: 6, thickness: 0.3, tessellation: 64 },
      scene,
    );
    ring.material = glow(scene, hsl(50 + i * 30, 0.9, 0.6), 1.2);
    ring.rotation.x = Math.PI / 2;
    rings.push({ mesh: ring, phase: i / EPOCHS.length });
  }

  nebulaParticles(scene, {
    count: 3000,
    color1: new Color4(1, 0.8, 0.3, 1),
    color2: new Color4(0.9, 0.3, 0.6, 1),
    minEmitBox: new Vector3(-30, -20, -30),
    maxEmitBox: new Vector3(30, 20, 30),
    direction1: new Vector3(0, 0, 2),
    direction2: new Vector3(0, 0, 4),
    minSize: 0.15,
    maxSize: 0.6,
    texture: "star",
  });

  let t = 0;
  scene.onBeforeRenderObservable.add(() => {
    const dt = scene.getEngine().getDeltaTime() / 1000;
    t += dt;
    now.rotation.y += dt * 0.8;
    rings.forEach((r) => {
      const cycle = (t * 0.15 + r.phase) % 1;
      const scale = 1 + cycle * 9;
      r.mesh.scaling.setAll(scale);
      const m = r.mesh.material as StandardMaterial;
      m.alpha = 1 - cycle;
    });
  });
}

void Color3;
void Vector3;
