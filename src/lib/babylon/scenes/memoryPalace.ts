/**
 * Memory Palace scene — rooms of light holding shimmering memories.
 *
 * A central dais with floating memory orbs in alcoves, soft volumetric god-rays,
 * drifting dust motes, and a slow contemplative camera.
 */

import { Color3, Color4, Vector3, MeshBuilder, Mesh } from "@babylonjs/core";
import type { BabylonSceneApi } from "../BabylonSceneHost";
import { glow, glass, hsl, marbleFloor, nebulaParticles } from "../graphics";

const MEMORIES = 8;

export function buildMemoryPalace({ scene }: BabylonSceneApi) {
  scene.clearColor = new Color4(0.05, 0.03, 0.1, 1);
  marbleFloor(scene, 80, hsl(280, 0.2, 0.12));

  const orbs: Mesh[] = [];
  for (let i = 0; i < MEMORIES; i++) {
    const a = (i / MEMORIES) * Math.PI * 2;
    // Alcove column.
    const alcove = MeshBuilder.CreateBox(`alc${i}`, { width: 4, height: 16, depth: 4 }, scene);
    alcove.position.set(Math.cos(a) * 22, 8, Math.sin(a) * 22);
    alcove.rotation.y = -a;
    alcove.material = glass(scene, hsl(280 + i * 10, 0.7, 0.4), 0.4);
    // Memory orb.
    const orb = MeshBuilder.CreateSphere(`mem${i}`, { diameter: 2.4, segments: 16 }, scene);
    orb.position.set(Math.cos(a) * 22, 9, Math.sin(a) * 22);
    orb.material = glow(scene, hsl(280 + i * 15, 1, 0.6), 1.8);
    orb.metadata = { base: orb.position.clone(), phase: i };
    orbs.push(orb);
  }

  // Central dais.
  const dais = MeshBuilder.CreateCylinder(
    "dais",
    { diameter: 6, height: 1, tessellation: 32 },
    scene,
  );
  dais.material = glow(scene, hsl(50, 0.6, 0.5), 0.6);

  nebulaParticles(scene, {
    count: 3000,
    color1: new Color4(0.6, 0.4, 1, 1),
    color2: new Color4(1, 0.8, 0.6, 1),
    minEmitBox: new Vector3(-30, 0, -30),
    maxEmitBox: new Vector3(30, 30, 30),
    minSize: 0.15,
    maxSize: 0.5,
    texture: "glow",
  });

  let t = 0;
  scene.onBeforeRenderObservable.add(() => {
    const dt = scene.getEngine().getDeltaTime() / 1000;
    t += dt;
    orbs.forEach((o) => {
      const md = o.metadata as { base: Vector3; phase: number };
      o.position.y = md.base.y + Math.sin(t + md.phase) * 0.6;
      o.rotation.y += dt * 0.4;
    });
  });
}
