/** Glow Forest — bioluminescent woodland at night. */
import { Color4, Vector3 } from "@babylonjs/core";
import type { WalkableSceneApi } from "../../WalkableHost";
import {
  sky,
  hsl,
  buildTerrain,
  bindWalk,
  scatter,
  makeTree,
  makeMushroom,
  placeRingCollectibles,
  createFireflies,
  createBirdFlock,
  nebulaParticles,
  starField,
  onTick,
} from "./_kit";

export function buildGlowForest(api: WalkableSceneApi) {
  const { scene } = api;
  sky(scene, 0.01, 0.02, 0.05);
  starField(scene, 2000, 350);
  scene.fogMode = 2;
  scene.fogDensity = 0.016;
  scene.fogColor = hsl(150, 0.4, 0.08);

  const { sample } = buildTerrain(scene, {
    size: 160,
    amp: 2.5,
    freq: 0.05,
    color: hsl(140, 0.35, 0.1),
    roughness: 0.9,
  });
  bindWalk(api, sample);

  scatter(scene, {
    count: 70,
    template: makeTree(scene, 140, 150),
    sample,
    radius: 70,
    minScale: 1,
    maxScale: 2.5,
  });
  // Glowing canopy variant — use mushrooms as undergrowth
  scatter(scene, {
    count: 40,
    template: makeMushroom(scene, 160),
    sample,
    radius: 55,
    minScale: 0.6,
    maxScale: 2,
  });
  scatter(scene, {
    count: 25,
    template: makeMushroom(scene, 280),
    sample,
    radius: 50,
    minScale: 0.5,
    maxScale: 1.5,
  });

  nebulaParticles(scene, {
    count: 1800,
    color1: new Color4(0.2, 1, 0.6, 1),
    color2: new Color4(0.4, 0.6, 1, 1),
    minSize: 0.1,
    maxSize: 0.4,
    minEmitBox: new Vector3(-60, 0, -60),
    maxEmitBox: new Vector3(60, 10, 60),
    texture: "glow",
  });

  const flies = createFireflies(scene, { count: 60, radius: 40, y: 2, hue: 100 });
  const birds = createBirdFlock(scene, { count: 8, radius: 45, y: 16 });
  api.onDispose(() => {
    flies.dispose();
    birds.dispose();
  });
  placeRingCollectibles(api, { radius: 14, y: 1.5, hue: 140 });
  onTick(api, (dt) => {
    flies.update(dt);
    birds.update(dt);
  });
}
