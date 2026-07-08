/**
 * Microscopic scene — the inside of a living cell.
 *
 * A translucent membrane, floating organelles (nucleus, mitochondria, vesicles),
 * drifting molecular motes, and pulsing filaments. The whole scene breathes.
 */

import { Color3, Color4, Vector3, MeshBuilder, Mesh, StandardMaterial } from "@babylonjs/core";
import type { BabylonSceneApi } from "../BabylonSceneHost";
import { glow, glass, hsl, nebulaParticles } from "../graphics";

export function buildMicro({ scene }: BabylonSceneApi) {
  scene.clearColor = new Color4(0.02, 0.06, 0.08, 1);

  // Cell membrane — translucent shell.
  const membrane = MeshBuilder.CreateSphere("membrane", { diameter: 50, segments: 32 }, scene);
  membrane.material = glass(scene, hsl(160, 0.6, 0.5), 0.12);

  // Nucleus.
  const nucleus = MeshBuilder.CreateSphere("nucleus", { diameter: 12, segments: 24 }, scene);
  nucleus.material = glow(scene, hsl(320, 0.8, 0.5), 0.8);

  // Organelles.
  const organelles: Mesh[] = [];
  for (let i = 0; i < 14; i++) {
    const o = MeshBuilder.CreateSphere(`org${i}`, { diameter: 2 + Math.random() * 2.5, segments: 12 }, scene);
    o.material = glow(scene, hsl(140 + Math.random() * 80, 0.9, 0.5), 0.9);
    const a = Math.random() * Math.PI * 2;
    const r = 6 + Math.random() * 16;
    o.position.set(Math.cos(a) * r, (Math.random() - 0.5) * 20, Math.sin(a) * r);
    o.metadata = { base: o.position.clone(), phase: Math.random() * 6 };
    organelles.push(o);
  }

  // Filaments — thin tubes connecting random organelles.
  const filMat = new StandardMaterial("filMat", scene);
  filMat.emissiveColor = hsl(180, 1, 0.5);
  filMat.alpha = 0.3;
  for (let i = 0; i < 10; i++) {
    const a = organelles[i % organelles.length].position;
    const b = organelles[(i + 3) % organelles.length].position;
    const mid = a.add(b).scale(0.5);
    const len = a.subtract(b).length();
    const fil = MeshBuilder.CreateCylinder(`fil${i}`, { diameter: 0.15, height: len, tessellation: 6 }, scene);
    fil.material = filMat;
    fil.position = mid;
    fil.lookAt(b);
  }

  nebulaParticles(scene, {
    count: 3500,
    color1: new Color4(0.3, 0.9, 0.7, 1),
    color2: new Color4(0.6, 0.5, 1, 1),
    minEmitBox: new Vector3(-24, -24, -24),
    maxEmitBox: new Vector3(24, 24, 24),
    minSize: 0.1,
    maxSize: 0.4,
    texture: "glow",
  });

  let t = 0;
  scene.onBeforeRenderObservable.add(() => {
    const dt = scene.getEngine().getDeltaTime() / 1000;
    t += dt;
    membrane.scaling.setAll(1 + Math.sin(t * 0.8) * 0.02);
    nucleus.scaling.setAll(1 + Math.sin(t * 1.4) * 0.05);
    organelles.forEach((o) => {
      const md = o.metadata as { base: Vector3; phase: number };
      o.position.x = md.base.x + Math.sin(t + md.phase) * 1.2;
      o.position.y = md.base.y + Math.cos(t * 0.8 + md.phase) * 1.2;
    });
  });
}

void Color3;
