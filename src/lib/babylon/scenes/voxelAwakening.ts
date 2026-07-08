/**
 * Voxel Awakening scene — a procedurally-generated block world.
 *
 * A 31-dimension voxel terrain built from thin-instanced boxes: rolling hills,
 * a winding river, scattered trees, and a glowing beacon. Thousands of cubes,
 * a handful of draw calls.
 */

import { Color3, Color4, Vector3, Matrix, Quaternion, MeshBuilder } from "@babylonjs/core";
import type { BabylonSceneApi } from "../BabylonSceneHost";
import { glow, pbr, hsl } from "../graphics";
import { ValueNoise } from "@/lib/worldInfinity/noise";

const GRID = 64;
const CELL = 1.2;

export function buildVoxelAwakening({ scene }: BabylonSceneApi) {
  scene.clearColor = new Color4(0.4, 0.65, 0.95, 1);

  const noise = new ValueNoise("voxel-awakening");
  // Collect voxel instances by colour band.
  const bands: Record<string, number[][]> = {
    water: [],
    sand: [],
    grass: [],
    stone: [],
    snow: [],
  };
  const heights: number[][] = [];
  for (let x = 0; x < GRID; x++) {
    heights[x] = [];
    for (let z = 0; z < GRID; z++) {
      const wx = x - GRID / 2;
      const wz = z - GRID / 2;
      const n = noise.fbm(wx * 0.08, wz * 0.08, { octaves: 4 });
      const h = Math.max(1, Math.round(((n * 0.5 + 0.5) * 8) + 2));
      heights[x][z] = h;
      let band = "grass";
      if (h <= 2) band = "water";
      else if (h <= 3) band = "sand";
      else if (h >= 7) band = "snow";
      else if (h >= 6) band = "stone";
      const m = Matrix.Compose(
        new Vector3(1, h, 1),
        new Quaternion(),
        new Vector3(wx * CELL, h / 2, wz * CELL),
      );
      bands[band].push(Array.from(m.m));
    }
  }

  const bandColors: Record<string, Color3> = {
    water: hsl(200, 0.8, 0.4),
    sand: hsl(45, 0.6, 0.7),
    grass: hsl(120, 0.6, 0.4),
    stone: hsl(220, 0.1, 0.5),
    snow: hsl(0, 0, 0.95),
  };

  for (const [band, mats] of Object.entries(bands)) {
    if (mats.length === 0) continue;
    const flat = new Float32Array(mats.length * 16);
    mats.forEach((m, i) => flat.set(m, i * 16));
    const box = MeshBuilder.CreateBox(`vox-${band}`, { size: CELL }, scene);
    box.material = pbr(scene, {
      baseColor: bandColors[band],
      metallic: band === "water" ? 0.6 : 0.05,
      roughness: band === "water" ? 0.1 : 0.9,
    });
    box.thinInstanceSetBuffer("matrix", flat, 16, true);
  }

  // Trees on grass tiles.
  const treeMat = glow(scene, hsl(140, 0.8, 0.4), 0.5);
  let trees = 0;
  const treeMats: number[][] = [];
  for (let x = 2; x < GRID - 2; x += 3) {
    for (let z = 2; z < GRID - 2; z += 3) {
      if (heights[x][z] !== 4 && heights[x][z] !== 5) continue;
      if (Math.random() > 0.5) continue;
      trees++;
      const m = Matrix.Compose(
        new Vector3(0.8, 3, 0.8),
        new Quaternion(),
        new Vector3((x - GRID / 2) * CELL, heights[x][z] + 1.5, (z - GRID / 2) * CELL),
      );
      treeMats.push(Array.from(m.m));
    }
  }
  if (trees > 0) {
    const flat = new Float32Array(treeMats.length * 16);
    treeMats.forEach((m, i) => flat.set(m, i * 16));
    const trunk = MeshBuilder.CreateBox("treeTrunk", { size: 1 }, scene);
    trunk.material = pbr(scene, { baseColor: hsl(25, 0.6, 0.3), metallic: 0, roughness: 1 });
    trunk.thinInstanceSetBuffer("matrix", flat, 16, true);
    const canopy = MeshBuilder.CreateBox("treeCanopy", { size: 2.4 }, scene);
    const canopyMats = treeMats.map((m) => {
      const mat = Matrix.FromArray(m);
      const translated = mat.multiply(Matrix.Translation(0, 2.5, 0));
      return translated.m;
    });
    const cf = new Float32Array(canopyMats.length * 16);
    canopyMats.forEach((m, i) => cf.set(m, i * 16));
    canopy.material = treeMat;
    canopy.thinInstanceSetBuffer("matrix", cf, 16, true);
  }

  // Central beacon.
  const beacon = MeshBuilder.CreateCylinder("beacon", { diameter: 1.2, height: 30, tessellation: 6 }, scene);
  beacon.position.y = 15;
  beacon.material = glow(scene, hsl(50, 1, 0.7), 1.5);

}

void Color4;
