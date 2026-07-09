/** Void (swim) — zero-G star abyss with floating platforms. */
import { Color4, Vector3, MeshBuilder } from "@babylonjs/core";
import type { WalkableSceneApi } from "../../WalkableHost";
import {
  sky,
  hsl,
  pbr,
  glow,
  starField,
  bindWalk,
  placeRingCollectibles,
  nebulaParticles,
  castShadow,
  onTick,
} from "./_kit";

export function buildVoidSwim(api: WalkableSceneApi) {
  const { scene } = api;
  sky(scene, 0.005, 0.0, 0.015);
  starField(scene, 5000, 600);

  // Treat entire volume as "water" so swim controls apply everywhere.
  bindWalk(api, () => -200, 100);

  // Floating platforms
  for (let i = 0; i < 18; i++) {
    const plat = MeshBuilder.CreateBox(
      `plat${i}`,
      {
        width: 4 + Math.random() * 4,
        height: 0.5,
        depth: 4 + Math.random() * 4,
      },
      scene,
    );
    plat.position.set(
      (Math.random() - 0.5) * 80,
      (Math.random() - 0.5) * 40,
      (Math.random() - 0.5) * 80,
    );
    plat.material = pbr(scene, {
      baseColor: hsl(260 + i * 5, 0.4, 0.2),
      metallic: 0.9,
      roughness: 0.2,
      emissive: hsl(280, 1, 0.25),
    });
    castShadow(scene, plat);
  }

  // Singularity core
  const core = MeshBuilder.CreateSphere("sing", { diameter: 6, segments: 24 }, scene);
  core.material = glow(scene, hsl(280, 1, 0.15), 3);
  const ring = MeshBuilder.CreateTorus(
    "acc",
    { diameter: 14, thickness: 0.6, tessellation: 64 },
    scene,
  );
  ring.rotation.x = Math.PI / 2.5;
  ring.material = glow(scene, hsl(30, 1, 0.55), 2);

  nebulaParticles(scene, {
    count: 3000,
    color1: new Color4(0.5, 0.2, 1, 1),
    color2: new Color4(0.2, 0.5, 1, 1),
    minSize: 0.2,
    maxSize: 1.2,
    minEmitBox: new Vector3(-100, -50, -100),
    maxEmitBox: new Vector3(100, 50, 100),
    texture: "star",
  });

  placeRingCollectibles(api, { radius: 12, y: 0, hue: 280 });
  onTick(api, (dt) => {
    core.rotation.y += dt * 0.3;
    ring.rotation.z += dt * 0.4;
  });
}
