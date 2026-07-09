/** Deep Reef (swim) — abyssal coral trench. */
import { Color3, Color4, Vector3, MeshBuilder } from "@babylonjs/core";
import type { WalkableSceneApi } from "../../WalkableHost";
import {
  sky,
  hsl,
  pbr,
  glow,
  buildWater,
  bindWalk,
  createFishSchool,
  placeRingCollectibles,
  nebulaParticles,
  onTick,
} from "./_kit";

export function buildDeepReefSwim(api: WalkableSceneApi) {
  const { scene } = api;
  sky(scene, 0.0, 0.02, 0.06);
  scene.fogMode = 2;
  scene.fogDensity = 0.025;
  scene.fogColor = new Color3(0.0, 0.05, 0.12);

  const waterY = 5;
  const seabed = MeshBuilder.CreateGround(
    "seabed",
    { width: 180, height: 180, subdivisions: 40 },
    scene,
  );
  seabed.position.y = -35;
  seabed.material = pbr(scene, {
    baseColor: hsl(210, 0.35, 0.05),
    metallic: 0.1,
    roughness: 0.95,
  });
  buildWater(scene, { y: waterY, size: 200, tint: hsl(200, 0.8, 0.25), opacity: 0.4 });
  bindWalk(api, () => -35, waterY);

  // Trench walls
  for (const side of [-1, 1] as const) {
    const wall = MeshBuilder.CreateBox(`wall${side}`, { width: 8, height: 40, depth: 120 }, scene);
    wall.position.set(side * 30, -15, 0);
    wall.material = pbr(scene, {
      baseColor: hsl(210, 0.3, 0.1),
      metallic: 0.1,
      roughness: 0.9,
    });
  }

  // Bioluminescent coral towers
  for (let i = 0; i < 50; i++) {
    const x = (Math.random() - 0.5) * 50;
    const z = (Math.random() - 0.5) * 100;
    const h = 3 + Math.random() * 10;
    const tower = MeshBuilder.CreateCylinder(
      `reef${i}`,
      {
        diameterTop: 0.2,
        diameterBottom: 1.2,
        height: h,
        tessellation: 7,
      },
      scene,
    );
    tower.position.set(x, -35 + h / 2, z);
    tower.material = glow(scene, hsl(160 + Math.random() * 100, 1, 0.5), 1.2);
  }

  const fish = createFishSchool(scene, { count: 50, radius: 20, y: -10, hue: 160 });
  const fish2 = createFishSchool(scene, { count: 25, radius: 15, y: -18, hue: 30 });
  api.onDispose(() => {
    fish.dispose();
    fish2.dispose();
  });

  nebulaParticles(scene, {
    count: 2000,
    color1: new Color4(0.1, 1, 0.7, 1),
    color2: new Color4(0.3, 0.4, 1, 1),
    minSize: 0.08,
    maxSize: 0.3,
    minEmitBox: new Vector3(-40, -30, -60),
    maxEmitBox: new Vector3(40, 0, 60),
    texture: "glow",
  });

  placeRingCollectibles(api, { radius: 8, y: waterY - 3, hue: 160 });
  onTick(api, (dt) => {
    fish.update(dt);
    fish2.update(dt);
  });
}
