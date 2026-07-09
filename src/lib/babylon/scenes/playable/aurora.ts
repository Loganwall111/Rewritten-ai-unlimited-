/** Aurora — northern lights over frozen hills. */
import { Color4, Vector3, MeshBuilder } from "@babylonjs/core";
import type { WalkableSceneApi } from "../../WalkableHost";
import {
  sky,
  hsl,
  pbr,
  glow,
  buildTerrain,
  bindWalk,
  scatter,
  makeRock,
  placeRingCollectibles,
  createBirdFlock,
  nebulaParticles,
  starField,
  onTick,
  castShadow,
} from "./_kit";

export function buildAurora(api: WalkableSceneApi) {
  const { scene } = api;
  sky(scene, 0.02, 0.03, 0.08);
  starField(scene, 2500, 400);
  scene.fogMode = 2;
  scene.fogDensity = 0.006;
  scene.fogColor = hsl(200, 0.3, 0.1);

  const { sample } = buildTerrain(scene, {
    size: 180,
    amp: 4,
    freq: 0.035,
    color: hsl(210, 0.15, 0.55),
    roughness: 0.8,
  });
  bindWalk(api, sample);

  // Aurora ribbons
  const ribbons: ReturnType<typeof MeshBuilder.CreateRibbon>[] = [];
  for (let r = 0; r < 4; r++) {
    const path1: Vector3[] = [];
    const path2: Vector3[] = [];
    for (let i = 0; i <= 40; i++) {
      const x = -80 + i * 4;
      const z = -20 + r * 15;
      path1.push(new Vector3(x, 25 + Math.sin(i * 0.3 + r) * 4, z));
      path2.push(new Vector3(x, 35 + Math.sin(i * 0.3 + r + 1) * 4, z + 2));
    }
    const rib = MeshBuilder.CreateRibbon(
      `aurora${r}`,
      { pathArray: [path1, path2], sideOrientation: 2 },
      scene,
    );
    rib.material = glow(scene, hsl(120 + r * 40, 1, 0.55), 1.5);
    (rib.material as { alpha?: number }).alpha = 0.55;
    ribbons.push(rib);
  }

  // Cabin
  const cabin = MeshBuilder.CreateBox("cabin", { width: 6, height: 3.5, depth: 5 }, scene);
  cabin.position.set(10, sample(10, 5) + 1.75, 5);
  cabin.material = pbr(scene, {
    baseColor: hsl(25, 0.4, 0.25),
    metallic: 0.05,
    roughness: 0.85,
  });
  castShadow(scene, cabin);
  const roof = MeshBuilder.CreateCylinder(
    "roof",
    {
      diameterTop: 0,
      diameterBottom: 8,
      height: 2.5,
      tessellation: 4,
    },
    scene,
  );
  roof.position.set(10, sample(10, 5) + 4.5, 5);
  roof.material = pbr(scene, {
    baseColor: hsl(10, 0.3, 0.2),
    metallic: 0,
    roughness: 0.9,
  });

  scatter(scene, {
    count: 30,
    template: makeRock(scene, 210),
    sample,
    radius: 70,
    minScale: 0.8,
    maxScale: 2.5,
  });

  nebulaParticles(scene, {
    count: 600,
    color1: new Color4(0.3, 1, 0.6, 0.6),
    color2: new Color4(0.4, 0.5, 1, 0.5),
    minSize: 0.5,
    maxSize: 2,
    minEmitBox: new Vector3(-80, 20, -40),
    maxEmitBox: new Vector3(80, 40, 40),
    texture: "glow",
  });

  const birds = createBirdFlock(scene, { count: 8, radius: 50, y: 18 });
  api.onDispose(() => birds.dispose());
  placeRingCollectibles(api, { radius: 14, y: 2, hue: 140 });
  onTick(api, (dt, t) => {
    birds.update(dt);
    ribbons.forEach((rib, i) => {
      rib.position.y = Math.sin(t * 0.4 + i) * 1.5;
    });
  });
}
