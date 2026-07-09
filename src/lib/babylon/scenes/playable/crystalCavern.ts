/** Crystal Cavern — underground glowing crystal forest. */
import { MeshBuilder } from "@babylonjs/core";
import type { WalkableSceneApi } from "../../WalkableHost";
import {
  sky,
  hsl,
  buildTerrain,
  bindWalk,
  scatter,
  makeCrystal,
  makeRock,
  placeRingCollectibles,
  createFireflies,
  onTick,
  glow,
} from "./_kit";

export function buildCrystalCavern(api: WalkableSceneApi) {
  const { scene } = api;
  sky(scene, 0.02, 0.01, 0.04);
  scene.fogMode = 2;
  scene.fogDensity = 0.02;
  scene.fogColor = hsl(280, 0.4, 0.08);

  const { sample } = buildTerrain(scene, {
    size: 140,
    amp: 4,
    freq: 0.06,
    color: hsl(260, 0.2, 0.12),
    roughness: 0.95,
  });
  bindWalk(api, sample);

  // Ceiling
  const ceil = MeshBuilder.CreateGround(
    "ceil",
    { width: 140, height: 140, subdivisions: 8 },
    scene,
  );
  ceil.position.y = 22;
  ceil.rotation.x = Math.PI;
  ceil.material = glow(scene, hsl(280, 0.3, 0.08), 0.2);

  scatter(scene, {
    count: 80,
    template: makeCrystal(scene, 280),
    sample,
    radius: 60,
    minScale: 0.8,
    maxScale: 3.5,
    yOffset: 0.5,
  });
  scatter(scene, {
    count: 40,
    template: makeCrystal(scene, 190),
    sample,
    radius: 55,
    minScale: 0.5,
    maxScale: 2,
    yOffset: 0.3,
  });
  scatter(scene, {
    count: 30,
    template: makeRock(scene, 250),
    sample,
    radius: 50,
    minScale: 1,
    maxScale: 3,
  });

  const flies = createFireflies(scene, { count: 50, radius: 40, y: 3, hue: 280 });
  api.onDispose(() => flies.dispose());
  placeRingCollectibles(api, { radius: 14, y: 2, hue: 280 });
  onTick(api, (dt) => flies.update(dt));
}
