/**
 * Dream scene — surreal floating islands under a morphing sky.
 *
 * Several drifting rock islands at varying heights, waterfalls that fall into
 * open air, slow particle drift, and a hue-shifting fog.
 */

import { Color3, Color4, Vector3, MeshBuilder, Mesh } from "@babylonjs/core";
import type { BabylonSceneApi } from "../BabylonSceneHost";
import { glow, pbr, hsl, nebulaParticles } from "../graphics";

export function buildDream({ scene }: BabylonSceneApi) {
  scene.clearColor = new Color4(0.1, 0.05, 0.15, 1);

  const islands: Mesh[] = [];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + Math.random();
    const r = 12 + Math.random() * 18;
    const y = Math.sin(i * 1.7) * 8;
    const island = MeshBuilder.CreateCylinder(
      `island${i}`,
      { diameterTop: 6 + Math.random() * 4, diameterBottom: 1, height: 4, tessellation: 12 },
      scene,
    );
    island.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
    island.material = pbr(scene, {
      baseColor: hsl(260 + i * 20, 0.4, 0.4),
      metallic: 0.2,
      roughness: 0.7,
    });
    island.metadata = { base: island.position.clone(), phase: Math.random() * 6 };
    islands.push(island);
    // Tree on top.
    const tree = MeshBuilder.CreateSphere(`tree${i}`, { diameter: 3, segments: 12 }, scene);
    tree.position = island.position.add(new Vector3(0, 4, 0));
    tree.material = glow(scene, hsl(290 + i * 15, 1, 0.6), 1.0);
    // Waterfall ribbon.
    const wf = MeshBuilder.CreateBox(`wf${i}`, { width: 0.4, height: 12, depth: 0.4 }, scene);
    wf.position = island.position.add(new Vector3(0, -6, 0));
    const wfMat = glow(scene, hsl(190, 1, 0.7), 0.8);
    wfMat.alpha = 0.4;
    wf.material = wfMat;
  }

  nebulaParticles(scene, {
    count: 3500,
    color1: new Color4(0.6, 0.4, 1, 1),
    color2: new Color4(0.4, 0.8, 1, 1),
    minEmitBox: new Vector3(-40, -10, -40),
    maxEmitBox: new Vector3(40, 30, 40),
    minSize: 0.2,
    maxSize: 0.8,
    texture: "star",
  });

  let t = 0;
  scene.onBeforeRenderObservable.add(() => {
    const dt = scene.getEngine().getDeltaTime() / 1000;
    t += dt;
    scene.fogColor = hsl((t * 10) % 360, 0.4, 0.1);
    islands.forEach((isl) => {
      const md = isl.metadata as { base: Vector3; phase: number };
      isl.position.y = md.base.y + Math.sin(t * 0.4 + md.phase) * 1.5;
      isl.rotation.y += dt * 0.05;
    });
  });
}

void Color3;
