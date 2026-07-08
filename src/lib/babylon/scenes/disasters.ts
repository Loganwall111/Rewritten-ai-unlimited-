/**
 * Disasters scene — storms, a volcano, and shifting tectonics.
 *
 * A smouldering volcanic cone emitting an ember plume, jagged fault-line
 * blocks, a swirling storm cloud of dark particles, and periodic lightning
 * flashes (a quick scene.clearColor pulse).
 */

import { Color3, Color4, Vector3, MeshBuilder, Mesh } from "@babylonjs/core";
import type { BabylonSceneApi } from "../BabylonSceneHost";
import { glow, pbr, hsl, nebulaParticles, starField } from "../graphics";

export function buildDisasters({ scene }: BabylonSceneApi) {
  scene.clearColor = new Color4(0.06, 0.03, 0.02, 1);
  starField(scene, 800, 400);

  // Volcano cone.
  const cone = MeshBuilder.CreateCylinder("cone", { diameterTop: 3, diameterBottom: 20, height: 12, tessellation: 16 }, scene);
  cone.position.y = 6;
  cone.material = pbr(scene, { baseColor: hsl(15, 0.5, 0.2), metallic: 0.2, roughness: 0.95 });
  // Lava pool at the crater.
  const lava = MeshBuilder.CreateCylinder("lava", { diameter: 3, height: 0.4, tessellation: 16 }, scene);
  lava.position.y = 12;
  lava.material = glow(scene, hsl(15, 1, 0.5), 2.5);

  // Ember plume.
  nebulaParticles(scene, {
    count: 2500,
    color1: new Color4(1, 0.4, 0.1, 1),
    color2: new Color4(1, 0.8, 0.2, 1),
    colorDead: new Color4(0.1, 0.05, 0.05, 0),
    emitter: new Vector3(0, 12, 0),
    minEmitBox: new Vector3(-1.5, 0, -1.5),
    maxEmitBox: new Vector3(1.5, 0.5, 1.5),
    direction1: new Vector3(-1, 4, -1),
    direction2: new Vector3(1, 8, 1),
    minSize: 0.2,
    maxSize: 0.8,
    minLife: 2,
    maxLife: 5,
    texture: "glow",
  });

  // Storm cloud (dark).
  nebulaParticles(scene, {
    count: 2000,
    color1: new Color4(0.1, 0.1, 0.12, 0.5),
    color2: new Color4(0.15, 0.12, 0.18, 0.5),
    emitter: new Vector3(0, 30, 0),
    minEmitBox: new Vector3(-25, -3, -25),
    maxEmitBox: new Vector3(25, 3, 25),
    minLife: 6,
    maxLife: 12,
    minSize: 2,
    maxSize: 5,
    blendMode: 1,
    texture: "glow",
  });

  // Fault-line jagged blocks.
  const faultMat = pbr(scene, { baseColor: hsl(30, 0.4, 0.25), metallic: 0.1, roughness: 0.95 });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const block = MeshBuilder.CreateBox(`fault${i}`, { width: 3, height: 2, depth: 3 }, scene);
    block.position.set(Math.cos(a) * 16, Math.sin(i) * 1.5, Math.sin(a) * 16);
    block.rotation.set(Math.random(), Math.random(), Math.random());
    block.material = faultMat;
    block.metadata = { phase: i };
  }

  let t = 0;
  let flash = 0;
  scene.onBeforeRenderObservable.add(() => {
    const dt = scene.getEngine().getDeltaTime() / 1000;
    t += dt;
    lava.scaling.setAll(1 + Math.sin(t * 2) * 0.1);
    // Random lightning.
    if (Math.random() < 0.005) flash = 0.4;
    flash = Math.max(0, flash - dt);
    scene.clearColor = new Color4(0.06 + flash, 0.03 + flash * 0.7, 0.02 + flash, 1);
  });
}

void Vector3;
