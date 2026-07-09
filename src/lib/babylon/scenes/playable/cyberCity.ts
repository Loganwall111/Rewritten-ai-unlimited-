/** Cyber City — neon grid streets and towers. */
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
} from "./_kit";

export function buildCyberCity(api: WalkableSceneApi) {
  const { scene } = api;
  sky(scene, 0.02, 0.02, 0.06);
  scene.fogMode = 2;
  scene.fogDensity = 0.01;
  scene.fogColor = hsl(280, 0.4, 0.08);

  marbleFloor(scene, 160, hsl(240, 0.3, 0.06));
  // Grid lines
  for (let i = -6; i <= 6; i++) {
    const hx = MeshBuilder.CreateBox(`gx${i}`, { width: 160, height: 0.05, depth: 0.15 }, scene);
    hx.position.set(0, 0.03, i * 12);
    hx.material = glow(scene, hsl(190, 1, 0.5), 0.8);
    const hz = MeshBuilder.CreateBox(`gz${i}`, { width: 0.15, height: 0.05, depth: 160 }, scene);
    hz.position.set(i * 12, 0.03, 0);
    hz.material = glow(scene, hsl(320, 1, 0.5), 0.8);
  }
  bindWalk(api, () => 0);

  // Towers
  for (let i = 0; i < 40; i++) {
    const gx = (Math.floor(Math.random() * 11) - 5) * 12 + (Math.random() - 0.5) * 4;
    const gz = (Math.floor(Math.random() * 11) - 5) * 12 + (Math.random() - 0.5) * 4;
    if (Math.abs(gx) < 8 && Math.abs(gz) < 8) continue;
    const h = 8 + Math.random() * 28;
    const tower = MeshBuilder.CreateBox(
      `t${i}`,
      {
        width: 3 + Math.random() * 4,
        height: h,
        depth: 3 + Math.random() * 4,
      },
      scene,
    );
    tower.position.set(gx, h / 2, gz);
    const hue = Math.random() > 0.5 ? 190 : 320;
    tower.material = pbr(scene, {
      baseColor: hsl(240, 0.2, 0.12),
      metallic: 0.85,
      roughness: 0.25,
      emissive: hsl(hue, 1, 0.25),
    });
    castShadow(scene, tower);
    // Roof beacon
    const tip = MeshBuilder.CreateBox(`tip${i}`, { width: 0.4, height: 1.2, depth: 0.4 }, scene);
    tip.position.set(gx, h + 0.6, gz);
    tip.material = glow(scene, hsl(hue, 1, 0.6), 2);
  }

  // Holo billboard
  const bill = MeshBuilder.CreatePlane("bill", { width: 10, height: 6 }, scene);
  bill.position.set(0, 8, -20);
  bill.material = glow(scene, hsl(190, 1, 0.55), 1.5);

  placeRingCollectibles(api, { radius: 10, y: 1.2, hue: 320 });
  onTick(api, (_dt, t) => {
    bill.rotation.y = Math.sin(t * 0.5) * 0.1;
  });
}
