/** Dunes — rolling sand desert under a hot sun. */
import { MeshBuilder } from "@babylonjs/core";
import type { WalkableSceneApi } from "../../WalkableHost";
import {
  sky,
  hsl,
  pbr,
  glow,
  buildTerrain,
  bindWalk,
  placeRingCollectibles,
  castShadow,
  onTick,
} from "./_kit";

export function buildDunes(api: WalkableSceneApi) {
  const { scene } = api;
  sky(scene, 0.75, 0.6, 0.35);
  scene.fogMode = 2;
  scene.fogDensity = 0.006;
  scene.fogColor = hsl(40, 0.5, 0.6);

  const heightFn = (x: number, z: number) =>
    Math.sin(x * 0.04) * 5 + Math.sin(z * 0.025 + x * 0.01) * 4 + Math.cos(x * 0.02 - z * 0.03) * 2;
  const { sample } = buildTerrain(scene, {
    size: 200,
    subdivisions: 80,
    color: hsl(40, 0.55, 0.5),
    roughness: 0.95,
    metallic: 0,
    heightFn,
  });
  bindWalk(api, sample);

  // Oasis
  const water = MeshBuilder.CreateCylinder(
    "oasis",
    { diameter: 14, height: 0.3, tessellation: 32 },
    scene,
  );
  water.position.set(25, sample(25, -15) + 0.1, -15);
  water.material = pbr(scene, {
    baseColor: hsl(185, 0.7, 0.4),
    metallic: 0.6,
    roughness: 0.1,
    emissive: hsl(185, 0.5, 0.2),
  });

  // Palms (simple)
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const px = 25 + Math.cos(a) * 8;
    const pz = -15 + Math.sin(a) * 8;
    const trunk = MeshBuilder.CreateCylinder(
      `palm${i}`,
      {
        diameterTop: 0.25,
        diameterBottom: 0.45,
        height: 6,
        tessellation: 6,
      },
      scene,
    );
    trunk.position.set(px, sample(px, pz) + 3, pz);
    trunk.material = pbr(scene, { baseColor: hsl(30, 0.4, 0.3), metallic: 0, roughness: 0.9 });
    castShadow(scene, trunk);
    const frond = MeshBuilder.CreateSphere(`frond${i}`, { diameter: 3, segments: 6 }, scene);
    frond.position.set(px, sample(px, pz) + 6.2, pz);
    frond.scaling.y = 0.4;
    frond.material = pbr(scene, { baseColor: hsl(120, 0.55, 0.3), metallic: 0, roughness: 0.8 });
  }

  // Distant pyramid
  const pyr = MeshBuilder.CreateCylinder(
    "pyr",
    {
      diameterTop: 0,
      diameterBottom: 20,
      height: 14,
      tessellation: 4,
    },
    scene,
  );
  pyr.position.set(-50, sample(-50, 40) + 7, 40);
  pyr.material = pbr(scene, { baseColor: hsl(35, 0.4, 0.45), metallic: 0.1, roughness: 0.85 });
  castShadow(scene, pyr);

  placeRingCollectibles(api, { radius: 14, y: 2, hue: 45 });
  onTick(api, () => {
    /* sun-baked stillness */
  });
  void glow;
}
