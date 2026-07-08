/**
 * Space Elevator scene — a tether climbing from a planet's surface to an
 * orbital station, with climbing carriages and a curved horizon.
 */

import { Color3, Color4, Vector3, MeshBuilder, Mesh } from "@babylonjs/core";
import type { BabylonSceneApi } from "../BabylonSceneHost";
import { glow, pbr, hsl, nebulaParticles, starField } from "../graphics";

export function buildSpaceElevator({ scene }: BabylonSceneApi) {
  scene.clearColor = new Color4(0.01, 0.02, 0.06, 1);
  starField(scene, 1800, 500);

  // Curved planetary surface.
  const planet = MeshBuilder.CreateSphere("planet", { diameter: 120, segments: 48 }, scene);
  planet.position.y = -110;
  planet.material = pbr(scene, { baseColor: hsl(200, 0.5, 0.3), metallic: 0.2, roughness: 0.8 });
  planet.receiveShadows = true;

  // Tether (the elevator cable).
  const tether = MeshBuilder.CreateCylinder("tether", { diameter: 0.4, height: 90, tessellation: 8 }, scene);
  tether.position.y = 35;
  tether.material = glow(scene, hsl(190, 1, 0.7), 0.8);

  // Orbital station at the top.
  const station = MeshBuilder.CreateCylinder("station", { diameter: 10, height: 3, tessellation: 24 }, scene);
  station.position.y = 78;
  station.material = pbr(scene, { baseColor: hsl(210, 0.2, 0.7), metallic: 0.9, roughness: 0.2 });
  const stationRing = MeshBuilder.CreateTorus("stRing", { diameter: 14, thickness: 0.5, tessellation: 48 }, scene);
  stationRing.position.y = 78;
  stationRing.rotation.x = Math.PI / 2;
  stationRing.material = glow(scene, hsl(190, 1, 0.7), 1.2);

  // Climbing carriages.
  const cars: Mesh[] = [];
  for (let i = 0; i < 3; i++) {
    const car = MeshBuilder.CreateBox(`car${i}`, { width: 2, height: 2.4, depth: 2 }, scene);
    car.material = glow(scene, hsl(190 + i * 30, 1, 0.6), 1.0);
    cars.push(car);
  }

  nebulaParticles(scene, {
    count: 2500,
    color1: new Color4(0.2, 0.6, 1, 1),
    color2: new Color4(0.6, 0.3, 1, 1),
    minEmitBox: new Vector3(-40, 0, -40),
    maxEmitBox: new Vector3(40, 80, 40),
    minSize: 0.2,
    maxSize: 0.8,
    texture: "glow",
  });

  let t = 0;
  scene.onBeforeRenderObservable.add(() => {
    const dt = scene.getEngine().getDeltaTime() / 1000;
    t += dt;
    stationRing.rotation.y += dt * 0.5;
    cars.forEach((car, i) => {
      const phase = (t * 0.15 + i / cars.length) % 1;
      car.position.y = phase * 70 + 5;
      car.position.x = Math.sin(t + i) * 0.4;
    });
  });
}

void Vector3;
