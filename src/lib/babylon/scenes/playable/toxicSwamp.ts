/** Toxic Swamp — poisonous wetlands with bubbling pools. */
import { Color4, Vector3, MeshBuilder } from "@babylonjs/core";
import type { WalkableSceneApi } from "../../WalkableHost";
import {
  sky,
  hsl,
  pbr,
  glow,
  buildTerrain,
  buildWater,
  bindWalk,
  scatter,
  makeTree,
  makeMushroom,
  placeRingCollectibles,
  createFireflies,
  nebulaParticles,
  onTick,
  castShadow,
} from "./_kit";

export function buildToxicSwamp(api: WalkableSceneApi) {
  const { scene } = api;
  sky(scene, 0.12, 0.15, 0.06);
  scene.fogMode = 2;
  scene.fogDensity = 0.02;
  scene.fogColor = hsl(80, 0.4, 0.2);

  const { sample } = buildTerrain(scene, {
    size: 150,
    amp: 1.5,
    freq: 0.06,
    color: hsl(90, 0.3, 0.18),
    roughness: 0.95,
  });
  const waterY = 0.3;
  buildWater(scene, { y: waterY, size: 160, tint: hsl(90, 0.8, 0.3), opacity: 0.55 });
  bindWalk(api, sample, waterY);

  // Dead trees
  scatter(scene, {
    count: 40,
    template: makeTree(scene, 40, 70),
    sample,
    radius: 65,
    minScale: 0.7,
    maxScale: 1.8,
  });
  scatter(scene, {
    count: 25,
    template: makeMushroom(scene, 90),
    sample,
    radius: 50,
    minScale: 0.8,
    maxScale: 2.5,
  });

  // Bubbling pools
  for (let i = 0; i < 10; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 10 + Math.random() * 40;
    const pool = MeshBuilder.CreateCylinder(
      `pool${i}`,
      {
        diameter: 3 + Math.random() * 3,
        height: 0.2,
        tessellation: 16,
      },
      scene,
    );
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    pool.position.set(x, waterY + 0.05, z);
    pool.material = glow(scene, hsl(80 + Math.random() * 40, 1, 0.4), 1.2);
  }

  // Toxic barrels
  for (let i = 0; i < 8; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 8 + Math.random() * 30;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const barrel = MeshBuilder.CreateCylinder(
      `bar${i}`,
      {
        diameter: 1,
        height: 1.4,
        tessellation: 12,
      },
      scene,
    );
    barrel.position.set(x, sample(x, z) + 0.7, z);
    barrel.material = pbr(scene, {
      baseColor: hsl(70, 0.6, 0.35),
      metallic: 0.7,
      roughness: 0.4,
      emissive: hsl(80, 1, 0.2),
    });
    castShadow(scene, barrel);
  }

  nebulaParticles(scene, {
    count: 1000,
    color1: new Color4(0.5, 1, 0.2, 0.8),
    color2: new Color4(0.8, 1, 0.1, 0.5),
    minSize: 0.15,
    maxSize: 0.6,
    minEmitBox: new Vector3(-40, 0, -40),
    maxEmitBox: new Vector3(40, 6, 40),
    direction1: new Vector3(-0.1, 0.5, -0.1),
    direction2: new Vector3(0.1, 1, 0.1),
    texture: "glow",
  });

  const flies = createFireflies(scene, { count: 30, radius: 30, y: 2, hue: 90 });
  api.onDispose(() => flies.dispose());
  placeRingCollectibles(api, { radius: 12, y: 1.5, hue: 90 });
  onTick(api, (dt) => flies.update(dt));
}
