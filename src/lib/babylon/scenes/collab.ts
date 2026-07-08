/**
 * Collab scene — a shared creative space.
 *
 * Multiple floating cursors (representing other users) moving around a central
 * shared canvas orb, with connection beams between them. Embodies "working
 * together in 3D".
 */

import { Color3, Color4, Vector3, MeshBuilder, Mesh, LinesMesh, StandardMaterial } from "@babylonjs/core";
import type { BabylonSceneApi } from "../BabylonSceneHost";
import { glow, hsl, starField } from "../graphics";

const USERS = 8;

export function buildCollab({ scene }: BabylonSceneApi) {
  scene.clearColor = new Color4(0.02, 0.03, 0.06, 1);
  starField(scene, 1000, 400);

  // Shared canvas orb.
  const canvas = MeshBuilder.CreateIcoSphere("canvas", { radius: 3, subdivisions: 4 }, scene);
  canvas.material = glow(scene, hsl(190, 1, 0.6), 1.2);

  const cursors: { mesh: Mesh; phase: number; radius: number; speed: number }[] = [];
  const cursorHues = [0, 40, 120, 190, 260, 300, 330, 200];
  for (let i = 0; i < USERS; i++) {
    const c = MeshBuilder.CreateIcoSphere(`cursor${i}`, { radius: 0.5, subdivisions: 1 }, scene);
    c.material = glow(scene, hsl(cursorHues[i], 1, 0.7), 2.0);
    cursors.push({ mesh: c, phase: (i / USERS) * Math.PI * 2, radius: 8 + (i % 3) * 3, speed: 0.3 + i * 0.05 });
  }

  // Connection beams (updated each frame).
  const beam = MeshBuilder.CreateLines(
    "beam",
    { points: [new Vector3(0, 0, 0), new Vector3(0, 0, 0)], updatable: true },
    scene,
  ) as LinesMesh;
  (beam.material as StandardMaterial) ??= new StandardMaterial("bm", scene);

  let t = 0;
  scene.onBeforeRenderObservable.add(() => {
    const dt = scene.getEngine().getDeltaTime() / 1000;
    t += dt;
    canvas.rotation.y += dt * 0.2;
    canvas.scaling.setAll(1 + Math.sin(t * 1.2) * 0.05);
    cursors.forEach((c) => {
      const a = t * c.speed + c.phase;
      c.mesh.position.set(Math.cos(a) * c.radius, Math.sin(a * 0.7) * 4, Math.sin(a) * c.radius);
    });
  });
}

void Color3;
