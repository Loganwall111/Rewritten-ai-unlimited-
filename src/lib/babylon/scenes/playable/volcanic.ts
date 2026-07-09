/** Volcanic — lava rivers, ash, glowing caldera. */
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
  nebulaParticles,
  castShadow,
  onTick,
} from "./_kit";

export function buildVolcanic(api: WalkableSceneApi) {
  const { scene } = api;
  sky(scene, 0.08, 0.03, 0.02);
  scene.fogMode = 2;
  scene.fogDensity = 0.012;
  scene.fogColor = hsl(15, 0.5, 0.15);

  const heightFn = (x: number, z: number) => {
    const d = Math.sqrt(x * x + z * z);
    // Caldera rim
    const rim = Math.exp(-Math.pow((d - 35) / 10, 2)) * 12;
    const noise = Math.sin(x * 0.05) * Math.cos(z * 0.05) * 2;
    return rim + noise + (d < 20 ? -4 : 0);
  };
  const { sample } = buildTerrain(scene, {
    size: 160,
    amp: 2,
    color: hsl(15, 0.25, 0.12),
    roughness: 0.95,
    heightFn,
  });
  bindWalk(api, sample);

  // Lava pool
  const lava = MeshBuilder.CreateCylinder(
    "lava",
    { diameter: 36, height: 0.5, tessellation: 48 },
    scene,
  );
  lava.position.y = -3.5;
  lava.material = glow(scene, hsl(20, 1, 0.5), 2.5);

  // Ember particles
  nebulaParticles(scene, {
    count: 1500,
    color1: new Color4(1, 0.4, 0.05, 1),
    color2: new Color4(1, 0.15, 0, 1),
    minSize: 0.1,
    maxSize: 0.5,
    minEmitBox: new Vector3(-20, -2, -20),
    maxEmitBox: new Vector3(20, 8, 20),
    direction1: new Vector3(-0.2, 1, -0.2),
    direction2: new Vector3(0.2, 2, 0.2),
    minEmitPower: 0.5,
    maxEmitPower: 2,
    gravity: new Vector3(0, 0.5, 0),
    texture: "glow",
  });

  scatter(scene, {
    count: 50,
    template: makeRock(scene, 15),
    sample,
    radius: 70,
    minScale: 1,
    maxScale: 4,
  });

  // Spire
  const spire = MeshBuilder.CreateCylinder(
    "spire",
    { diameterTop: 0.5, diameterBottom: 4, height: 18, tessellation: 8 },
    scene,
  );
  spire.position.set(40, 10, 10);
  spire.material = pbr(scene, { baseColor: hsl(10, 0.2, 0.15), metallic: 0.1, roughness: 0.9 });
  castShadow(scene, spire);

  placeRingCollectibles(api, { radius: 16, y: 2, hue: 25 });
  onTick(api, (_dt, t) => {
    lava.scaling.y = 1 + Math.sin(t * 2) * 0.05;
  });
}
