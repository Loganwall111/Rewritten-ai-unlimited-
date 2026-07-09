/** Crystal Cathedral — soaring crystalline architecture. */
import { MeshBuilder } from "@babylonjs/core";
import type { WalkableSceneApi } from "../../WalkableHost";
import {
  sky,
  hsl,
  pbr,
  glow,
  marbleFloor,
  bindWalk,
  placeRingCollectibles,
  castShadow,
  onTick,
  createFireflies,
} from "./_kit";

export function buildCrystalCathedral(api: WalkableSceneApi) {
  const { scene } = api;
  sky(scene, 0.04, 0.03, 0.1);
  marbleFloor(scene, 100, hsl(260, 0.2, 0.12));
  bindWalk(api, () => 0);

  // Nave pillars of crystal
  for (let i = 0; i < 10; i++) {
    const z = -30 + i * 7;
    for (const sx of [-1, 1] as const) {
      const h = 14 + (i % 3) * 3;
      const col = MeshBuilder.CreatePolyhedron(`cc${i}_${sx}`, { type: 1, size: 1.2 }, scene);
      col.scaling.set(1, h / 2, 1);
      col.position.set(sx * 10, h / 2, z);
      col.material = glow(scene, hsl(260 + i * 8, 1, 0.55), 1.3);
      castShadow(scene, col);
    }
  }

  // Vaulted roof beams
  for (let i = 0; i < 8; i++) {
    const z = -28 + i * 8;
    const beam = MeshBuilder.CreateBox(`beam${i}`, { width: 22, height: 0.5, depth: 0.5 }, scene);
    beam.position.set(0, 16, z);
    beam.material = pbr(scene, {
      baseColor: hsl(280, 0.4, 0.5),
      metallic: 0.8,
      roughness: 0.2,
      emissive: hsl(280, 0.9, 0.3),
    });
  }

  // Altar crystal
  const altar = MeshBuilder.CreatePolyhedron("altar", { type: 2, size: 3 }, scene);
  altar.position.set(0, 3, 30);
  altar.material = glow(scene, hsl(300, 1, 0.6), 2.5);

  // Stained "glass" panels
  for (let i = 0; i < 6; i++) {
    const panel = MeshBuilder.CreatePlane(`glass${i}`, { width: 4, height: 8 }, scene);
    panel.position.set(-18, 6, -20 + i * 8);
    panel.rotation.y = Math.PI / 2;
    panel.material = glow(scene, hsl(200 + i * 30, 1, 0.5), 1.2);
    (panel.material as { alpha?: number }).alpha = 0.5;
  }

  // Aisle runners
  const runner = MeshBuilder.CreateBox("runner", { width: 4, height: 0.05, depth: 70 }, scene);
  runner.position.set(0, 0.03, 0);
  runner.material = glow(scene, hsl(280, 0.8, 0.4), 0.5);

  const flies = createFireflies(scene, { count: 40, radius: 30, y: 4, hue: 280 });
  api.onDispose(() => flies.dispose());
  placeRingCollectibles(api, { radius: 8, y: 1.2, hue: 290 });
  onTick(api, (dt, t) => {
    flies.update(dt);
    altar.rotation.y += dt * 0.3;
    altar.position.y = 3 + Math.sin(t * 1.5) * 0.2;
  });
}
