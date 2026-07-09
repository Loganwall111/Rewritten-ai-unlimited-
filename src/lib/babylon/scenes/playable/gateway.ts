/** Gateway — marble plaza of glowing portal arches. Walkable hub world. */
import { Color3, Vector3, MeshBuilder } from "@babylonjs/core";
import type { WalkableSceneApi } from "../../WalkableHost";
import {
  sky,
  pbr,
  glow,
  hsl,
  marbleFloor,
  bindWalk,
  placeRingCollectibles,
  castShadow,
  createBirdFlock,
  onTick,
} from "./_kit";

export function buildGateway(api: WalkableSceneApi) {
  const { scene } = api;
  sky(scene, 0.04, 0.06, 0.12);
  marbleFloor(scene, 120, hsl(220, 0.2, 0.1));
  bindWalk(api, () => 0);

  // Central beacon
  const pillar = MeshBuilder.CreateCylinder(
    "beacon",
    { diameter: 2, height: 14, tessellation: 24 },
    scene,
  );
  pillar.position.y = 7;
  pillar.material = glow(scene, hsl(195, 1, 0.6), 1.6);
  castShadow(scene, pillar);
  const orb = MeshBuilder.CreateIcoSphere("orb", { radius: 1.6, subdivisions: 2 }, scene);
  orb.position.y = 15;
  orb.material = glow(scene, hsl(195, 1, 0.7), 2.2);

  // 8 portal arches
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const hue = 180 + i * 25;
    const arch = MeshBuilder.CreateTorus(
      "arch",
      { diameter: 6, thickness: 0.35, tessellation: 32 },
      scene,
    );
    arch.position.set(Math.cos(a) * 22, 3.2, Math.sin(a) * 22);
    arch.rotation.x = Math.PI / 2;
    arch.rotation.y = -a;
    arch.material = glow(scene, hsl(hue, 0.9, 0.55), 1.3);
    const pad = MeshBuilder.CreateCylinder(
      "pad",
      { diameter: 5, height: 0.3, tessellation: 24 },
      scene,
    );
    pad.position.set(Math.cos(a) * 22, 0.15, Math.sin(a) * 22);
    pad.material = pbr(scene, {
      baseColor: hsl(hue, 0.5, 0.3),
      metallic: 0.9,
      roughness: 0.2,
      emissive: hsl(hue, 0.9, 0.25),
    });
  }

  // Columns
  const colMat = pbr(scene, { baseColor: hsl(220, 0.1, 0.75), metallic: 0.1, roughness: 0.4 });
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const col = MeshBuilder.CreateCylinder(
      `c${i}`,
      { diameter: 1, height: 10, tessellation: 12 },
      scene,
    );
    col.position.set(Math.cos(a) * 40, 5, Math.sin(a) * 40);
    col.material = colMat;
    castShadow(scene, col);
  }

  const birds = createBirdFlock(scene, { count: 14, radius: 50, y: 22 });
  api.onDispose(() => birds.dispose());
  placeRingCollectibles(api, { radius: 12, y: 1.2, hue: 195 });

  onTick(api, (dt) => {
    orb.rotation.y += dt * 0.5;
    birds.update(dt);
  });
  void Color3;
  void Vector3;
}
