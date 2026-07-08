/**
 * Ecosystem scene — forest, water, weather, and drifting life.
 *
 * A water plane reflecting the sky, thin-instanced trees carpeting rolling
 * terrain, drifting fireflies, and a gentle rain particle field.
 */

import { Color3, Color4, Vector3, Matrix, Quaternion, MeshBuilder, Mesh } from "@babylonjs/core";
import type { BabylonSceneApi } from "../BabylonSceneHost";
import { glow, pbr, glass, hsl, nebulaParticles } from "../graphics";
import { ValueNoise } from "@/lib/worldInfinity/noise";

export function buildEcosystem({ scene }: BabylonSceneApi) {
  scene.clearColor = new Color4(0.15, 0.25, 0.4, 1);

  // Terrain (instanced low boxes by height).
  const noise = new ValueNoise("eco");
  const trees: number[][] = [];
  const N = 40;
  const terraMats: number[][] = [];
  for (let x = 0; x < N; x++) {
    for (let z = 0; z < N; z++) {
      const wx = x - N / 2;
      const wz = z - N / 2;
      const n = noise.fbm(wx * 0.07, wz * 0.07, { octaves: 4 });
      const h = Math.max(0.5, (n * 0.5 + 0.5) * 6);
      const m = Matrix.Compose(
        new Vector3(1, h, 1),
        new Quaternion(),
        new Vector3(wx * 1.6, h / 2, wz * 1.6),
      );
      terraMats.push(Array.from(m.m));
      if (h > 2 && Math.random() < 0.3) {
        const tm = Matrix.Compose(
          new Vector3(0.8, 4, 0.8),
          new Quaternion(),
          new Vector3(wx * 1.6, h + 2, wz * 1.6),
        );
        trees.push(Array.from(tm.m));
      }
    }
  }
  const terra = MeshBuilder.CreateBox("terra", { size: 1.6 }, scene);
  terra.material = pbr(scene, { baseColor: hsl(120, 0.4, 0.3), metallic: 0, roughness: 1 });
  const tf = new Float32Array(terraMats.length * 16);
  terraMats.forEach((m, i) => tf.set(m, i * 16));
  terra.thinInstanceSetBuffer("matrix", tf, 16, true);

  // Trees.
  if (trees.length) {
    const trunk = MeshBuilder.CreateCylinder(
      "trunk",
      { diameter: 0.6, height: 4, tessellation: 6 },
      scene,
    );
    trunk.material = pbr(scene, { baseColor: hsl(25, 0.6, 0.25), metallic: 0, roughness: 1 });
    const trf = new Float32Array(trees.length * 16);
    trees.forEach((m, i) => trf.set(m, i * 16));
    trunk.thinInstanceSetBuffer("matrix", trf, 16, true);
    const canopy = MeshBuilder.CreateSphere("canopy", { diameter: 3.5, segments: 10 }, scene);
    canopy.material = glow(scene, hsl(130, 0.7, 0.4), 0.4);
    const cMats = trees.map((m) => {
      const mat = Matrix.FromArray(m).multiply(Matrix.Translation(0, 3.2, 0));
      return mat.m;
    });
    const cf = new Float32Array(cMats.length * 16);
    cMats.forEach((m, i) => cf.set(m, i * 16));
    canopy.thinInstanceSetBuffer("matrix", cf, 16, true);
  }

  // Water.
  const water = MeshBuilder.CreateGround("water", { width: 200, height: 200 }, scene);
  water.position.y = 0.4;
  water.material = glass(scene, hsl(200, 0.8, 0.4), 0.55);

  // Fireflies + rain.
  nebulaParticles(scene, {
    count: 1800,
    color1: new Color4(1, 0.9, 0.4, 1),
    color2: new Color4(0.5, 1, 0.6, 1),
    minEmitBox: new Vector3(-30, 2, -30),
    maxEmitBox: new Vector3(30, 14, 30),
    minSize: 0.1,
    maxSize: 0.35,
    texture: "glow",
  });
  nebulaParticles(scene, {
    count: 2500,
    color1: new Color4(0.7, 0.85, 1, 0.5),
    color2: new Color4(0.7, 0.85, 1, 0.5),
    minEmitBox: new Vector3(-40, 30, -40),
    maxEmitBox: new Vector3(40, 35, 40),
    direction1: new Vector3(0, -8, 0),
    direction2: new Vector3(0, -12, 0),
    minLife: 1.5,
    maxLife: 3,
    minSize: 0.05,
    maxSize: 0.15,
    texture: "glow",
  });

  let t = 0;
  scene.onBeforeRenderObservable.add(() => {
    const dt = scene.getEngine().getDeltaTime() / 1000;
    t += dt;
    water.position.y = 0.4 + Math.sin(t * 0.6) * 0.1;
  });
}

void Color3;
