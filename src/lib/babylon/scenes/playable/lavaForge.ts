/** Lava Forge — industrial foundry over magma. */
import { Color4, Vector3, MeshBuilder } from "@babylonjs/core";
import type { WalkableSceneApi } from "../../WalkableHost";
import {
  sky,
  hsl,
  pbr,
  glow,
  bindWalk,
  placeRingCollectibles,
  nebulaParticles,
  castShadow,
  onTick,
} from "./_kit";

export function buildLavaForge(api: WalkableSceneApi) {
  const { scene } = api;
  sky(scene, 0.1, 0.03, 0.02);
  scene.fogMode = 2;
  scene.fogDensity = 0.014;
  scene.fogColor = hsl(15, 0.5, 0.1);

  // Metal catwalk floor
  const floor = MeshBuilder.CreateBox("floor", { width: 60, height: 0.5, depth: 60 }, scene);
  floor.position.y = -0.25;
  floor.material = pbr(scene, {
    baseColor: hsl(20, 0.1, 0.2),
    metallic: 0.95,
    roughness: 0.35,
  });
  floor.receiveShadows = true;
  bindWalk(api, () => 0);

  // Magma below
  const magma = MeshBuilder.CreateGround("magma", { width: 100, height: 100 }, scene);
  magma.position.y = -8;
  magma.material = glow(scene, hsl(18, 1, 0.45), 2.5);

  // Anvils / forge stations
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const x = Math.cos(a) * 16;
    const z = Math.sin(a) * 16;
    const anvil = MeshBuilder.CreateBox(
      `anvil${i}`,
      { width: 2.5, height: 1.5, depth: 1.5 },
      scene,
    );
    anvil.position.set(x, 0.75, z);
    anvil.material = pbr(scene, {
      baseColor: hsl(20, 0.1, 0.25),
      metallic: 1,
      roughness: 0.3,
    });
    castShadow(scene, anvil);
    const fire = MeshBuilder.CreateSphere(`fire${i}`, { diameter: 1, segments: 8 }, scene);
    fire.position.set(x, 2.2, z);
    fire.material = glow(scene, hsl(25, 1, 0.55), 2);
  }

  // Cranes
  for (let i = 0; i < 3; i++) {
    const crane = MeshBuilder.CreateBox(`crane${i}`, { width: 0.5, height: 14, depth: 0.5 }, scene);
    crane.position.set(-20 + i * 20, 7, -22);
    crane.material = pbr(scene, {
      baseColor: hsl(15, 0.3, 0.3),
      metallic: 0.9,
      roughness: 0.4,
    });
    const arm = MeshBuilder.CreateBox(`arm${i}`, { width: 12, height: 0.4, depth: 0.4 }, scene);
    arm.position.set(-20 + i * 20 + 5, 13.5, -22);
    arm.material = crane.material;
  }

  nebulaParticles(scene, {
    count: 1000,
    color1: new Color4(1, 0.5, 0.1, 1),
    color2: new Color4(1, 0.2, 0, 1),
    minSize: 0.1,
    maxSize: 0.4,
    minEmitBox: new Vector3(-25, -6, -25),
    maxEmitBox: new Vector3(25, 2, 25),
    direction1: new Vector3(-0.2, 1, -0.2),
    direction2: new Vector3(0.2, 2, 0.2),
    gravity: new Vector3(0, 0.3, 0),
    texture: "glow",
  });

  placeRingCollectibles(api, { radius: 10, y: 1.2, hue: 20 });
  onTick(api, (_dt, t) => {
    magma.scaling.y = 1; // keep flat
    void t;
  });
}
