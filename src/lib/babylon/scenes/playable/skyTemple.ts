/** Sky Temple — marble ruins above the clouds. */
import { MeshBuilder } from "@babylonjs/core";
import type { WalkableSceneApi } from "../../WalkableHost";
import {
  sky,
  hsl,
  pbr,
  glow,
  bindWalk,
  placeRingCollectibles,
  createBirdFlock,
  castShadow,
  onTick,
  nebulaParticles,
} from "./_kit";
import { Color4, Vector3 } from "@babylonjs/core";

export function buildSkyTemple(api: WalkableSceneApi) {
  const { scene } = api;
  sky(scene, 0.5, 0.7, 0.95);

  // Temple platform
  const floor = MeshBuilder.CreateCylinder(
    "plat",
    { diameter: 50, height: 1.5, tessellation: 48 },
    scene,
  );
  floor.position.y = -0.75;
  floor.material = pbr(scene, {
    baseColor: hsl(45, 0.15, 0.75),
    metallic: 0.2,
    roughness: 0.4,
  });
  floor.receiveShadows = true;
  bindWalk(api, () => 0);

  // Columns
  const colMat = pbr(scene, {
    baseColor: hsl(45, 0.1, 0.85),
    metallic: 0.15,
    roughness: 0.35,
  });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const col = MeshBuilder.CreateCylinder(
      `col${i}`,
      {
        diameter: 1.4,
        height: 12,
        tessellation: 16,
      },
      scene,
    );
    col.position.set(Math.cos(a) * 18, 6, Math.sin(a) * 18);
    col.material = colMat;
    castShadow(scene, col);
    const cap = MeshBuilder.CreateBox(`cap${i}`, { size: 2.2 }, scene);
    cap.position.set(Math.cos(a) * 18, 12.5, Math.sin(a) * 18);
    cap.material = colMat;
  }

  // Roof ring
  const roof = MeshBuilder.CreateTorus(
    "roof",
    { diameter: 38, thickness: 2, tessellation: 48 },
    scene,
  );
  roof.position.y = 13;
  roof.material = pbr(scene, {
    baseColor: hsl(45, 0.2, 0.7),
    metallic: 0.3,
    roughness: 0.4,
  });

  // Altar
  const altar = MeshBuilder.CreateBox("altar", { width: 5, height: 1.5, depth: 5 }, scene);
  altar.position.y = 0.75;
  altar.material = pbr(scene, {
    baseColor: hsl(45, 0.3, 0.5),
    metallic: 0.5,
    roughness: 0.3,
    emissive: hsl(45, 0.8, 0.25),
  });
  const flame = MeshBuilder.CreateIcoSphere("flame", { radius: 0.8, subdivisions: 1 }, scene);
  flame.position.y = 2.5;
  flame.material = glow(scene, hsl(40, 1, 0.55), 2.5);

  // Clouds below
  nebulaParticles(scene, {
    count: 800,
    color1: new Color4(1, 1, 1, 0.5),
    color2: new Color4(0.9, 0.95, 1, 0.3),
    minSize: 4,
    maxSize: 12,
    minEmitBox: new Vector3(-80, -30, -80),
    maxEmitBox: new Vector3(80, -10, 80),
    minEmitPower: 0.01,
    maxEmitPower: 0.1,
    texture: "glow",
  });

  const birds = createBirdFlock(scene, { count: 12, radius: 40, y: 20 });
  api.onDispose(() => birds.dispose());
  placeRingCollectibles(api, { radius: 10, y: 1.2, hue: 45 });
  onTick(api, (dt, t) => {
    birds.update(dt);
    flame.scaling.setAll(1 + Math.sin(t * 4) * 0.12);
  });
}
