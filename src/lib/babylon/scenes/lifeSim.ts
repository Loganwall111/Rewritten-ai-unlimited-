/**
 * Life Sim scene — a miniature living city.
 *
 * A grid of PBR buildings of varying heights glowing with window light, a road
 * network, tiny moving "citizen" motes (thin instances), and a slow day/night
 * cycle that shifts the sky + window emissive.
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
} from "@babylonjs/core";
import type { BabylonSceneApi } from "../BabylonSceneHost";
import { glow, pbr, hsl, marbleFloor, nebulaParticles } from "../graphics";

const GRID = 10;

export function buildLifeSim({ scene }: BabylonSceneApi) {
  scene.clearColor = new Color4(0.03, 0.05, 0.1, 1);
  marbleFloor(scene, 120, hsl(220, 0.2, 0.1));

  const windowMat = glow(scene, hsl(45, 1, 0.7), 1.5);
  const buildings: Mesh[] = [];

  for (let x = 0; x < GRID; x++) {
    for (let z = 0; z < GRID; z++) {
      if ((x + z) % 4 === 0) continue; // leave room for roads
      const h = 3 + Math.abs(Math.sin(x * 1.3) * Math.cos(z * 0.7)) * 18;
      const b = MeshBuilder.CreateBox("b", { width: 4, height: h, depth: 4 }, scene);
      b.position.set((x - GRID / 2) * 7, h / 2, (z - GRID / 2) * 7);
      b.material = pbr(scene, { baseColor: hsl(220, 0.2, 0.2), metallic: 0.8, roughness: 0.3 });
      buildings.push(b);
      // Window emissive strip.
      const win = MeshBuilder.CreateBox("win", { width: 3.6, height: h * 0.7, depth: 0.2 }, scene);
      win.position.set(b.position.x, h / 2, b.position.z + 2.1);
      win.material = windowMat;
      win.parent = b;
      win.position = new Vector3(0, 0, 2.1);
    }
  }

  // Citizens — thin-instanced tiny spheres moving along roads.
  const citizenTpl = MeshBuilder.CreateSphere("cit", { diameter: 0.5, segments: 6 }, scene);
  citizenTpl.material = glow(scene, hsl(190, 1, 0.7), 1.5);
  const COUNT = 200;
  const matrices = new Float32Array(COUNT * 16);
  for (let i = 0; i < COUNT; i++) {
    const onX = Math.random() > 0.5;
    const lane = Math.floor(Math.random() * GRID) - GRID / 2;
    const pos = (Math.random() - 0.5) * GRID * 7;
    const m = Matrix.Compose(
      new Vector3(1, 1, 1),
      new Quaternion(),
      new Vector3(onX ? pos : lane * 7, 0.4, onX ? lane * 7 : pos),
    );
    matrices.set(Array.from(m.m), i * 16);
  }
  citizenTpl.thinInstanceSetBuffer("matrix", matrices, 16, true);

  nebulaParticles(scene, {
    count: 1500,
    color1: new Color4(1, 0.85, 0.4, 1),
    color2: new Color4(0.4, 0.7, 1, 1),
    minEmitBox: new Vector3(-40, 5, -40),
    maxEmitBox: new Vector3(40, 40, 40),
    minSize: 0.1,
    maxSize: 0.3,
    texture: "glow",
  });

  let t = 0;
  scene.onBeforeRenderObservable.add(() => {
    const dt = scene.getEngine().getDeltaTime() / 1000;
    t += dt;
    // Day/night window flicker.
    (windowMat as StandardMaterial).emissiveColor = hsl(45, 1, 0.6 + Math.sin(t * 0.5) * 0.2).scale(
      1.5,
    );
  });
}

void Color3;
