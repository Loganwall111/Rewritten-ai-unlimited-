/** Tundra — snow plains, ice spires, pale sky. */
import { MeshBuilder } from "@babylonjs/core";
import type { WalkableSceneApi } from "../../WalkableHost";
import {
  sky,
  hsl,
  pbr,
  glow,
  buildTerrain,
  bindWalk,
  scatter,
  makeRock,
  placeRingCollectibles,
  createBirdFlock,
  onTick,
  castShadow,
} from "./_kit";

export function buildTundra(api: WalkableSceneApi) {
  const { scene } = api;
  sky(scene, 0.55, 0.65, 0.78);
  scene.fogMode = 2;
  scene.fogDensity = 0.008;
  scene.fogColor = hsl(200, 0.15, 0.7);

  const { sample } = buildTerrain(scene, {
    size: 180,
    amp: 2.5,
    freq: 0.03,
    color: hsl(210, 0.1, 0.85),
    roughness: 0.7,
    metallic: 0.05,
  });
  bindWalk(api, sample);

  // Ice spires
  for (let i = 0; i < 25; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 15 + Math.random() * 70;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const h = 4 + Math.random() * 12;
    const spire = MeshBuilder.CreateCylinder(
      `ice${i}`,
      {
        diameterTop: 0.2,
        diameterBottom: 1.5 + Math.random(),
        height: h,
        tessellation: 5,
      },
      scene,
    );
    spire.position.set(x, sample(x, z) + h / 2, z);
    spire.material = pbr(scene, {
      baseColor: hsl(195, 0.4, 0.75),
      metallic: 0.3,
      roughness: 0.15,
      emissive: hsl(195, 0.6, 0.3),
    });
    castShadow(scene, spire);
  }

  scatter(scene, {
    count: 40,
    template: makeRock(scene, 210),
    sample,
    radius: 80,
    minScale: 0.8,
    maxScale: 3,
  });

  // Frozen lake
  const lake = MeshBuilder.CreateGround("lake", { width: 30, height: 30 }, scene);
  lake.position.set(-20, sample(-20, 10) + 0.05, 10);
  lake.material = pbr(scene, {
    baseColor: hsl(200, 0.5, 0.6),
    metallic: 0.9,
    roughness: 0.05,
    emissive: hsl(200, 0.4, 0.2),
  });

  const birds = createBirdFlock(scene, { count: 10, radius: 60, y: 20 });
  api.onDispose(() => birds.dispose());
  placeRingCollectibles(api, { radius: 15, y: 1.5, hue: 200 });
  onTick(api, (dt) => birds.update(dt));
  void glow;
}
