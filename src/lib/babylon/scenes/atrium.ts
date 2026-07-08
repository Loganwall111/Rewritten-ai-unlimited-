/**
 * Atrium scene — the grand "room of doors" hub.
 *
 * A circular marble hall: a glowing central pillar, 24 fluted columns ringing
 * the perimeter, and 12 tall portal doors arranged radially — each a coloured
 * PBR panel with an emissive frame and a glassy reflective surface. A single
 * directional sun casts real-time soft shadows across the floor.
 */

import { Color3, Color4, Vector3, MeshBuilder, Mesh, Scalar } from "@babylonjs/core";
import type { BabylonSceneApi } from "../BabylonSceneHost";
import { pbr, glow, glass, hsl } from "../graphics";
import { castShadow } from "../BabylonSceneHost";

const DOOR_HUES = [200, 280, 330, 40, 150, 180, 300, 90, 240, 15, 170, 55];

export function buildAtrium({ scene }: BabylonSceneApi) {
  scene.clearColor = new Color4(0.02, 0.025, 0.05, 1);

  // Reflective marble floor.
  const floor = MeshBuilder.CreateCylinder(
    "floor",
    { diameter: 90, height: 0.6, tessellation: 96 },
    scene,
  );
  floor.position.y = -0.3;
  floor.material = pbr(scene, {
    baseColor: hsl(220, 0.2, 0.12),
    metallic: 0.9,
    roughness: 0.08,
  });
  floor.receiveShadows = true;

  // Inlaid gold ring on the floor.
  const ring = MeshBuilder.CreateTorus(
    "floorRing",
    { diameter: 70, thickness: 0.5, tessellation: 128 },
    scene,
  );
  ring.position.y = 0.05;
  ring.material = pbr(scene, {
    baseColor: hsl(45, 0.9, 0.6),
    metallic: 1,
    roughness: 0.2,
    emissive: hsl(45, 0.9, 0.3),
    emissiveIntensity: 0.4,
  });

  // Central glowing pillar.
  const pillar = MeshBuilder.CreateCylinder(
    "pillar",
    { diameter: 4, height: 22, tessellation: 24 },
    scene,
  );
  pillar.position.y = 11;
  pillar.material = glow(scene, hsl(195, 1, 0.6), 1.4);
  castShadow(scene, pillar);

  // Capstone orb.
  const orb = MeshBuilder.CreateIcoSphere("orb", { radius: 2.4, subdivisions: 3 }, scene);
  orb.position.y = 23;
  orb.material = glow(scene, hsl(195, 1, 0.7), 2.0);
  castShadow(scene, orb);

  // 24 fluted columns around the perimeter.
  const columnMat = pbr(scene, {
    baseColor: hsl(220, 0.15, 0.78),
    metallic: 0.1,
    roughness: 0.35,
  });
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const col = MeshBuilder.CreateCylinder(
      `col${i}`,
      { diameter: 1.6, height: 18, tessellation: 16 },
      scene,
    );
    col.position.set(Math.cos(a) * 36, 9, Math.sin(a) * 36);
    col.material = columnMat;
    castShadow(scene, col);
    // Capital + base blocks.
    const cap = MeshBuilder.CreateBox(`cap${i}`, { size: 2.4 }, scene);
    cap.position.set(Math.cos(a) * 36, 18.6, Math.sin(a) * 36);
    cap.material = columnMat;
    castShadow(scene, cap);
    const base = MeshBuilder.CreateBox(`base${i}`, { size: 2.6 }, scene);
    base.position.set(Math.cos(a) * 36, 0.4, Math.sin(a) * 36);
    base.material = columnMat;
  }

  // 12 portal doors — radial.
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const hue = DOOR_HUES[i];
    const doorGroup = buildDoor(scene, hue, i);
    const r = 30;
    doorGroup.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
    // Face inward.
    doorGroup.rotation.y = -a + Math.PI / 2;
  }

  // Animated orbit of the central orb + hue drift handled per-frame.
  let t = 0;
  scene.onBeforeRenderObservable.add(() => {
    const dt = scene.getEngine().getDeltaTime() / 1000;
    t += dt;
    orb.rotation.y += dt * 0.4;
    pillar.rotation.y -= dt * 0.15;
    const m = orb.material as ReturnType<typeof glow>;
    m.emissiveColor = hsl(195 + Math.sin(t * 0.3) * 30, 1, 0.6).scale(1.6);
  });
}

function buildDoor(
  scene: import("@babylonjs/core").Scene,
  hue: number,
  idx: number,
): import("@babylonjs/core").Mesh {
  // Door body.
  const door = MeshBuilder.CreateBox(`door${idx}`, { width: 5, height: 12, depth: 0.6 }, scene);
  door.position.y = 6;
  door.material = glass(scene, hsl(hue, 0.8, 0.5), 0.55);

  // Emissive frame.
  const frame = MeshBuilder.CreateTorus(
    `frame${idx}`,
    { diameter: 13, thickness: 0.5, tessellation: 4 },
    scene,
  );
  // Torus with tessellation 4 + scaled = a rectangular frame. Approximate with a box ring instead:
  frame.dispose();
  const top = MeshBuilder.CreateBox(`frTop${idx}`, { width: 6, height: 0.6, depth: 0.9 }, scene);
  top.position.y = 12.3;
  const bot = MeshBuilder.CreateBox(`frBot${idx}`, { width: 6, height: 0.6, depth: 0.9 }, scene);
  bot.position.y = -0.3;
  const left = MeshBuilder.CreateBox(`frLeft${idx}`, { width: 0.6, height: 13, depth: 0.9 }, scene);
  left.position.x = -2.8;
  left.position.y = 6;
  const right = MeshBuilder.CreateBox(
    `frRight${idx}`,
    { width: 0.6, height: 13, depth: 0.9 },
    scene,
  );
  right.position.x = 2.8;
  right.position.y = 6;

  const frameMat = pbr(scene, {
    baseColor: hsl(hue, 0.7, 0.5),
    metallic: 1,
    roughness: 0.15,
    emissive: hsl(hue, 0.95, 0.4),
    emissiveIntensity: 1.2,
  });
  [top, bot, left, right].forEach((m) => {
    m.material = frameMat;
    castShadow(scene, m);
  });

  // Merge into one mesh for clean grouping/positioning.
  const merged = Mesh.MergeMeshes([door, top, bot, left, right], true, true)!;
  merged.name = `doorGroup${idx}`;
  return merged;
}

void Scalar;
