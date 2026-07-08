/**
 * Avatar scene — a character customisation chamber.
 *
 * A glowing humanoid silhouette (stylised capsule figure) on a dais, ringed by
 * customisation orbs (body, colour, accessory), slowly rotating for inspection.
 */

import { Color3, Color4, Vector3, MeshBuilder, Mesh, StandardMaterial } from "@babylonjs/core";
import type { BabylonSceneApi } from "../BabylonSceneHost";
import { glow, pbr, hsl, marbleFloor } from "../graphics";

export function buildAvatar({ scene }: BabylonSceneApi) {
  scene.clearColor = new Color4(0.05, 0.04, 0.1, 1);
  marbleFloor(scene, 60, hsl(280, 0.15, 0.1));

  const root = new Mesh("avatar", scene);
  const bodyMat = pbr(scene, {
    baseColor: hsl(195, 0.7, 0.5),
    metallic: 0.6,
    roughness: 0.3,
    emissive: hsl(195, 1, 0.2),
  });
  // Head.
  const head = MeshBuilder.CreateSphere("head", { diameter: 1.8, segments: 24 }, scene);
  head.position.y = 6.5;
  head.material = bodyMat;
  head.parent = root;
  // Torso.
  const torso = MeshBuilder.CreateCapsule("torso", { height: 3.5, radius: 1.1 }, scene);
  torso.position.y = 4;
  torso.material = bodyMat;
  torso.parent = root;
  // Arms.
  for (const sx of [-1, 1]) {
    const arm = MeshBuilder.CreateCapsule(`arm${sx}`, { height: 3, radius: 0.4 }, scene);
    arm.position.set(sx * 1.5, 4.2, 0);
    arm.material = bodyMat;
    arm.parent = root;
  }
  // Legs.
  for (const sx of [-1, 1]) {
    const leg = MeshBuilder.CreateCapsule(`leg${sx}`, { height: 3.2, radius: 0.5 }, scene);
    leg.position.set(sx * 0.5, 1, 0);
    leg.material = bodyMat;
    leg.parent = root;
  }
  // Eyes.
  const eyeMat = glow(scene, hsl(190, 1, 0.9), 3);
  for (const sx of [-1, 1]) {
    const eye = MeshBuilder.CreateSphere(`eye${sx}`, { diameter: 0.3, segments: 8 }, scene);
    eye.position.set(sx * 0.4, 6.7, 0.85);
    eye.material = eyeMat;
    eye.parent = root;
  }

  // Customisation ring of orbs.
  const opts = ["Body", "Colour", "Suit", "Glow", "Aura", "Voice"];
  for (let i = 0; i < opts.length; i++) {
    const a = (i / opts.length) * Math.PI * 2;
    const orb = MeshBuilder.CreateIcoSphere(`opt${i}`, { radius: 0.7, subdivisions: 2 }, scene);
    orb.position.set(Math.cos(a) * 6, 3 + Math.sin(i) * 1, Math.sin(a) * 6);
    orb.material = glow(scene, hsl(280 + i * 30, 1, 0.65), 1.5);
  }

  // Dais.
  const dais = MeshBuilder.CreateCylinder(
    "dais",
    { diameter: 5, height: 0.6, tessellation: 32 },
    scene,
  );
  dais.material = glow(scene, hsl(280, 0.8, 0.4), 0.5);

  let t = 0;
  scene.onBeforeRenderObservable.add(() => {
    const dt = scene.getEngine().getDeltaTime() / 1000;
    t += dt;
    root.rotation.y += dt * 0.35;
    root.position.y = Math.sin(t * 1.2) * 0.1;
  });
}

void Color3;
void Vector3;
void StandardMaterial;
