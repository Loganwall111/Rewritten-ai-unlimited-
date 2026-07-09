/** Mushroom — giant fungi forest with spore motes. */
import { Color4, Vector3 } from "@babylonjs/core";
import type { WalkableSceneApi } from "../../WalkableHost";
import {
  sky,
  hsl,
  buildTerrain,
  bindWalk,
  scatter,
  makeMushroom,
  makeTree,
  placeRingCollectibles,
  createFireflies,
  nebulaParticles,
  onTick,
} from "./_kit";

export function buildMushroom(api: WalkableSceneApi) {
  const { scene } = api;
  sky(scene, 0.08, 0.05, 0.12);
  scene.fogMode = 2;
  scene.fogDensity = 0.015;
  scene.fogColor = hsl(300, 0.3, 0.12);

  const { sample } = buildTerrain(scene, {
    size: 150,
    amp: 2,
    color: hsl(100, 0.3, 0.15),
    roughness: 0.9,
  });
  bindWalk(api, sample);

  scatter(scene, {
    count: 60,
    template: makeMushroom(scene, 330),
    sample,
    radius: 65,
    minScale: 1.5,
    maxScale: 6,
    yOffset: 0,
  });
  scatter(scene, {
    count: 30,
    template: makeMushroom(scene, 50),
    sample,
    radius: 55,
    minScale: 1,
    maxScale: 3.5,
  });
  scatter(scene, {
    count: 20,
    template: makeTree(scene, 30, 140),
    sample,
    radius: 70,
    minScale: 0.8,
    maxScale: 1.6,
  });

  nebulaParticles(scene, {
    count: 2000,
    color1: new Color4(0.9, 0.4, 1, 1),
    color2: new Color4(1, 0.7, 0.3, 1),
    minSize: 0.08,
    maxSize: 0.35,
    minEmitBox: new Vector3(-50, 0, -50),
    maxEmitBox: new Vector3(50, 12, 50),
    direction1: new Vector3(-0.1, 0.4, -0.1),
    direction2: new Vector3(0.1, 0.8, 0.1),
    texture: "glow",
  });

  const flies = createFireflies(scene, { count: 35, radius: 35, y: 2, hue: 50 });
  api.onDispose(() => flies.dispose());
  placeRingCollectibles(api, { radius: 12, y: 1.5, hue: 320 });
  onTick(api, (dt) => flies.update(dt));
}
