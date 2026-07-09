/** Quantum Ocean (swim) — bioluminescent open water. */
import { Color3, Color4, Vector3, MeshBuilder } from "@babylonjs/core";
import type { WalkableSceneApi } from "../../WalkableHost";
import {
  sky,
  pbr,
  glow,
  hsl,
  nebulaParticles,
  buildWater,
  bindWalk,
  createFishSchool,
  placeRingCollectibles,
  castShadow,
  onTick,
} from "./_kit";

export function buildQuantumOceanSwim(api: WalkableSceneApi) {
  const { scene } = api;
  sky(scene, 0.0, 0.04, 0.1);
  scene.fogMode = 2;
  scene.fogDensity = 0.018;
  scene.fogColor = new Color3(0.0, 0.08, 0.15);

  const waterY = 8;
  const seabed = MeshBuilder.CreateGround(
    "seabed",
    { width: 220, height: 220, subdivisions: 32 },
    scene,
  );
  seabed.position.y = -30;
  seabed.material = pbr(scene, {
    baseColor: hsl(200, 0.4, 0.06),
    metallic: 0.1,
    roughness: 0.95,
  });
  seabed.receiveShadows = true;

  buildWater(scene, { y: waterY, size: 240, tint: hsl(190, 0.9, 0.35), opacity: 0.35 });
  bindWalk(api, () => -30, waterY);

  for (let i = 0; i < 40; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * 80;
    const h = 2 + Math.random() * 3;
    const c = MeshBuilder.CreateCylinder(
      `cor${i}`,
      { diameterTop: 0.1, diameterBottom: 0.7, height: h, tessellation: 6 },
      scene,
    );
    c.position.set(Math.cos(a) * r, -30 + h / 2, Math.sin(a) * r);
    c.material = glow(scene, hsl(300 + Math.random() * 60, 0.9, 0.5), 0.9);
  }

  const whale = MeshBuilder.CreateSphere(
    "whale",
    { diameterX: 10, diameterY: 3, diameterZ: 3.5, segments: 12 },
    scene,
  );
  whale.material = pbr(scene, {
    baseColor: hsl(195, 0.5, 0.35),
    metallic: 0.6,
    roughness: 0.3,
    emissive: hsl(180, 0.9, 0.3),
  });
  castShadow(scene, whale);

  const fish = createFishSchool(scene, { count: 40, radius: 25, y: 0, hue: 175 });
  api.onDispose(() => fish.dispose());

  nebulaParticles(scene, {
    count: 2500,
    color1: new Color4(0.2, 0.9, 1, 1),
    color2: new Color4(0.5, 0.3, 1, 1),
    minSize: 0.1,
    maxSize: 0.4,
    minEmitBox: new Vector3(-60, -25, -60),
    maxEmitBox: new Vector3(60, 10, 60),
    minLife: 5,
    maxLife: 12,
    texture: "glow",
  });

  placeRingCollectibles(api, { radius: 10, y: waterY - 2, hue: 180 });

  onTick(api, (dt, t) => {
    whale.position.set(Math.sin(t * 0.2) * 35, -5 + Math.sin(t * 0.4) * 3, Math.cos(t * 0.2) * 20);
    whale.rotation.y = t * 0.2 + Math.PI / 2;
    fish.update(dt);
  });
}
