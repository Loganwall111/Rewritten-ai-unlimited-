/**
 * Black Hole scene — a warping accretion disk around an event horizon.
 *
 * A black sphere occludes a bright, swirling PBR disk whose particles orbit
 * faster the closer they get. A gravitational "lens" ring (a bright photon
 * sphere) glows around the horizon, and a starfield bends subtly behind.
 */

import { Color3, Color4, Vector3, MeshBuilder, Mesh } from "@babylonjs/core";
import type { BabylonSceneApi } from "../BabylonSceneHost";
import { glow, hsl, nebulaParticles, starField } from "../graphics";

export function buildBlackHole({ scene }: BabylonSceneApi) {
  scene.clearColor = new Color4(0, 0, 0, 1);

  // Event horizon.
  const horizon = MeshBuilder.CreateSphere("horizon", { diameter: 8, segments: 32 }, scene);
  const hm = glow(scene, new Color3(0, 0, 0), 0);
  hm.emissiveColor = new Color3(0.005, 0.005, 0.01);
  horizon.material = hm;

  // Photon sphere ring.
  const photon = MeshBuilder.CreateTorus(
    "photon",
    { diameter: 11, thickness: 0.25, tessellation: 128 },
    scene,
  );
  photon.material = glow(scene, hsl(45, 1, 0.75), 3.0);
  photon.rotation.x = Math.PI / 2;

  // Accretion disk — many emissive tori of decreasing radius + increasing heat.
  const disk: Mesh[] = [];
  for (let i = 0; i < 40; i++) {
    const t = i / 39;
    const ring = MeshBuilder.CreateTorus(
      `disk${i}`,
      { diameter: 12 + t * 36, thickness: 0.18, tessellation: 96 },
      scene,
    );
    const heat = 1 - t; // hotter (white/blue) inside, cooler (red) outside
    const col = new Color3(1, 0.4 + heat * 0.6, 0.2 + heat * 0.8);
    ring.material = glow(scene, col, 1.2 + heat);
    ring.rotation.x = Math.PI / 2 + 0.12;
    disk.push(ring);
  }

  // Swirling particle inflow.
  nebulaParticles(scene, {
    count: 4000,
    color1: new Color4(1, 0.8, 0.4, 1),
    color2: new Color4(1, 0.3, 0.6, 1),
    colorDead: new Color4(0, 0, 0, 0),
    minSize: 0.15,
    maxSize: 0.6,
    minEmitBox: new Vector3(-30, -1, -30),
    maxEmitBox: new Vector3(30, 1, 30),
    minLife: 2,
    maxLife: 6,
    direction1: new Vector3(-3, 0.1, -3),
    direction2: new Vector3(3, 0.4, 3),
    minEmitPower: 1,
    maxEmitPower: 4,
    texture: "glow",
  });

  starField(scene, 2500, 500);

  let t = 0;
  scene.onBeforeRenderObservable.add(() => {
    const dt = scene.getEngine().getDeltaTime() / 1000;
    t += dt;
    disk.forEach((ring, i) => {
      ring.rotation.z += dt * (0.6 - i * 0.012);
    });
    photon.rotation.z += dt * 0.3;
  });
}
