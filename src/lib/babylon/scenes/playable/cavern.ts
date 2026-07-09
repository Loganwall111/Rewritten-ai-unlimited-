/** Cavern — limestone cave with stalactites / stalagmites. */
import { MeshBuilder } from "@babylonjs/core";
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
  makeRock,
  placeRingCollectibles,
  createFireflies,
  castShadow,
  onTick,
} from "./_kit";

export function buildCavern(api: WalkableSceneApi) {
  const { scene } = api;
  sky(scene, 0.03, 0.025, 0.02);
  scene.fogMode = 2;
  scene.fogDensity = 0.022;
  scene.fogColor = hsl(30, 0.15, 0.08);

  const { sample } = buildTerrain(scene, {
    size: 120,
    amp: 3,
    freq: 0.07,
    color: hsl(30, 0.2, 0.2),
    roughness: 0.95,
  });
  const waterY = -1;
  buildWater(scene, { y: waterY, size: 40, tint: hsl(190, 0.4, 0.3), opacity: 0.5 });
  bindWalk(api, sample, waterY);

  // Stalagmites
  for (let i = 0; i < 35; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * 50;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const h = 2 + Math.random() * 6;
    const s = MeshBuilder.CreateCylinder(
      `stag${i}`,
      {
        diameterTop: 0.15,
        diameterBottom: 1.2,
        height: h,
        tessellation: 6,
      },
      scene,
    );
    s.position.set(x, sample(x, z) + h / 2, z);
    s.material = pbr(scene, {
      baseColor: hsl(30, 0.15, 0.35),
      metallic: 0.05,
      roughness: 0.9,
    });
    castShadow(scene, s);
  }
  // Stalactites from ceiling
  for (let i = 0; i < 30; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * 50;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const h = 2 + Math.random() * 5;
    const s = MeshBuilder.CreateCylinder(
      `stac${i}`,
      {
        diameterTop: 0.8,
        diameterBottom: 0.1,
        height: h,
        tessellation: 6,
      },
      scene,
    );
    s.position.set(x, 18 - h / 2, z);
    s.material = pbr(scene, {
      baseColor: hsl(30, 0.15, 0.4),
      metallic: 0.05,
      roughness: 0.9,
    });
  }

  const ceil = MeshBuilder.CreateGround("ceil", { width: 120, height: 120 }, scene);
  ceil.position.y = 18;
  ceil.rotation.x = Math.PI;
  ceil.material = pbr(scene, {
    baseColor: hsl(30, 0.15, 0.15),
    metallic: 0,
    roughness: 0.95,
  });

  // Torch lights
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const torch = MeshBuilder.CreateSphere(`torch${i}`, { diameter: 0.4, segments: 6 }, scene);
    torch.position.set(
      Math.cos(a) * 20,
      sample(Math.cos(a) * 20, Math.sin(a) * 20) + 2.5,
      Math.sin(a) * 20,
    );
    torch.material = glow(scene, hsl(30, 1, 0.55), 2);
  }

  scatter(scene, {
    count: 25,
    template: makeRock(scene, 30),
    sample,
    radius: 45,
    minScale: 1,
    maxScale: 3,
  });
  const flies = createFireflies(scene, { count: 20, radius: 25, y: 2, hue: 40 });
  api.onDispose(() => flies.dispose());
  placeRingCollectibles(api, { radius: 12, y: 1.5, hue: 40 });
  onTick(api, (dt) => flies.update(dt));
}
