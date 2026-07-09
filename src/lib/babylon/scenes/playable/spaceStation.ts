/** Space Station — walkable ring habitat with starfield. */
import { Vector3, MeshBuilder } from "@babylonjs/core";
import type { WalkableSceneApi } from "../../WalkableHost";
import {
  sky,
  pbr,
  glow,
  hsl,
  starField,
  bindWalk,
  placeRingCollectibles,
  castShadow,
  onTick,
} from "./_kit";

export function buildSpaceStation(api: WalkableSceneApi) {
  const { scene } = api;
  sky(scene, 0.005, 0.005, 0.015);
  starField(scene, 4000, 500);
  // Flat station floor
  const floor = MeshBuilder.CreateTorus(
    "ringFloor",
    { diameter: 60, thickness: 12, tessellation: 64 },
    scene,
  );
  floor.position.y = 0;
  floor.scaling.y = 0.08;
  floor.material = pbr(scene, { baseColor: hsl(210, 0.15, 0.25), metallic: 0.85, roughness: 0.3 });
  floor.receiveShadows = true;

  // Inner walkable disc for simpler height sampling
  const disc = MeshBuilder.CreateCylinder(
    "disc",
    { diameter: 50, height: 0.4, tessellation: 64 },
    scene,
  );
  disc.position.y = -0.2;
  disc.material = pbr(scene, { baseColor: hsl(210, 0.2, 0.18), metallic: 0.7, roughness: 0.4 });
  disc.receiveShadows = true;
  bindWalk(api, () => 0);

  // Modules
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const mod = MeshBuilder.CreateBox(`mod${i}`, { width: 4, height: 3, depth: 6 }, scene);
    mod.position.set(Math.cos(a) * 22, 1.5, Math.sin(a) * 22);
    mod.rotation.y = -a;
    mod.material = pbr(scene, {
      baseColor: hsl(200 + i * 10, 0.3, 0.35),
      metallic: 0.9,
      roughness: 0.25,
      emissive: hsl(190, 1, 0.3),
    });
    castShadow(scene, mod);
    const light = MeshBuilder.CreateSphere(`ml${i}`, { diameter: 0.5, segments: 8 }, scene);
    light.position.set(Math.cos(a) * 22, 3.4, Math.sin(a) * 22);
    light.material = glow(scene, hsl(190, 1, 0.7), 2);
  }

  // Core reactor
  const core = MeshBuilder.CreateIcoSphere("core", { radius: 2.5, subdivisions: 2 }, scene);
  core.position.y = 4;
  core.material = glow(scene, hsl(280, 1, 0.6), 2.5);

  placeRingCollectibles(api, { radius: 10, y: 1.2, hue: 190 });
  onTick(api, (dt) => {
    core.rotation.y += dt * 0.6;
    core.rotation.x += dt * 0.2;
  });
  void Vector3;
}
