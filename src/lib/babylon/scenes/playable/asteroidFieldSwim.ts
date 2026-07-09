/** Asteroid Field (swim) — zero-G rock field among the stars. */
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

export function buildAsteroidFieldSwim(api: WalkableSceneApi) {
  const { scene } = api;
  sky(scene, 0.005, 0.005, 0.012);
  starField(scene, 4500, 550);

  // Full-volume swim
  bindWalk(api, () => -200, 100);

  const rocks: Array<{ mesh: ReturnType<typeof MeshBuilder.CreateSphere>; spin: Vector3 }> = [];
  for (let i = 0; i < 60; i++) {
    const s = 0.8 + Math.random() * 4;
    const rock = MeshBuilder.CreateSphere(
      `ast${i}`,
      {
        diameterX: s * (0.8 + Math.random() * 0.6),
        diameterY: s * (0.6 + Math.random() * 0.6),
        diameterZ: s * (0.8 + Math.random() * 0.5),
        segments: 6,
      },
      scene,
    );
    rock.position.set(
      (Math.random() - 0.5) * 120,
      (Math.random() - 0.5) * 60,
      (Math.random() - 0.5) * 120,
    );
    rock.material = pbr(scene, {
      baseColor: hsl(25 + Math.random() * 20, 0.15, 0.25 + Math.random() * 0.15),
      metallic: 0.2,
      roughness: 0.9,
    });
    castShadow(scene, rock);
    rocks.push({
      mesh: rock,
      spin: new Vector3(
        (Math.random() - 0.5) * 0.4,
        (Math.random() - 0.5) * 0.4,
        (Math.random() - 0.5) * 0.4,
      ),
    });
  }

  // Mining beacon
  const beacon = MeshBuilder.CreateCylinder(
    "beacon",
    { diameter: 1.5, height: 8, tessellation: 8 },
    scene,
  );
  beacon.material = pbr(scene, {
    baseColor: hsl(200, 0.2, 0.3),
    metallic: 0.9,
    roughness: 0.3,
  });
  const light = MeshBuilder.CreateSphere("blight", { diameter: 1.2, segments: 8 }, scene);
  light.position.y = 5;
  light.material = glow(scene, hsl(15, 1, 0.55), 3);

  // Distant planet
  const planet = MeshBuilder.CreateSphere("planet", { diameter: 40, segments: 24 }, scene);
  planet.position.set(80, 20, -120);
  planet.material = pbr(scene, {
    baseColor: hsl(210, 0.5, 0.4),
    metallic: 0.3,
    roughness: 0.6,
    emissive: hsl(200, 0.5, 0.15),
  });

  nebulaParticles(scene, {
    count: 2000,
    color1: new Color4(1, 0.8, 0.5, 0.7),
    color2: new Color4(0.6, 0.7, 1, 0.5),
    minSize: 0.15,
    maxSize: 0.8,
    minEmitBox: new Vector3(-100, -40, -100),
    maxEmitBox: new Vector3(100, 40, 100),
    texture: "star",
  });

  placeRingCollectibles(api, { radius: 10, y: 0, hue: 30 });
  onTick(api, (dt, t) => {
    rocks.forEach((r) => {
      r.mesh.rotation.x += r.spin.x * dt;
      r.mesh.rotation.y += r.spin.y * dt;
      r.mesh.rotation.z += r.spin.z * dt;
    });
    light.scaling.setAll(1 + Math.sin(t * 3) * 0.15);
    planet.rotation.y += dt * 0.05;
  });
}
