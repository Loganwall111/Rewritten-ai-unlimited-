/**
 * VR scene — a neon virtual-reality grid room.
 *
 * An infinite reflective grid floor, a wireframe skybox, floating UI panels,
 * and neon boundary edges. The classic "you are now in VR" liminal space.
 */

import { Color3, Color4, Vector3, MeshBuilder, Mesh, StandardMaterial } from "@babylonjs/core";
import type { BabylonSceneApi } from "../BabylonSceneHost";
import { glow, hsl, starField } from "../graphics";

export function buildVR({ scene }: BabylonSceneApi) {
  scene.clearColor = new Color4(0.02, 0, 0.05, 1);
  starField(scene, 1200, 400);

  // Reflective neon grid floor.
  const floor = MeshBuilder.CreateGround(
    "floor",
    { width: 200, height: 200, subdivisions: 40 },
    scene,
  );
  const fmat = new StandardMaterial("fmat", scene);
  fmat.wireframe = true;
  fmat.emissiveColor = hsl(320, 1, 0.5);
  floor.material = fmat;

  // Floating UI panels.
  const panels: Mesh[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const panel = MeshBuilder.CreatePlane(`panel${i}`, { width: 4, height: 2.5 }, scene);
    panel.position.set(Math.cos(a) * 12, 4 + (i % 2) * 2, Math.sin(a) * 12);
    panel.lookAt(new Vector3(0, panel.position.y, 0));
    panel.material = glow(scene, hsl(180 + i * 30, 1, 0.5), 0.8);
    panels.push(panel);
  }

  // Central pedestal.
  const ped = MeshBuilder.CreateCylinder("ped", { diameter: 3, height: 1, tessellation: 6 }, scene);
  ped.material = glow(scene, hsl(320, 1, 0.6), 1.5);
  const orb = MeshBuilder.CreateIcoSphere("orb", { radius: 1.2, subdivisions: 2 }, scene);
  orb.position.y = 2.5;
  orb.material = glow(scene, hsl(180, 1, 0.7), 2.5);

  let t = 0;
  scene.onBeforeRenderObservable.add(() => {
    const dt = scene.getEngine().getDeltaTime() / 1000;
    t += dt;
    orb.position.y = 2.5 + Math.sin(t * 1.5) * 0.3;
    orb.rotation.y += dt * 0.8;
    panels.forEach((p, i) => (p.rotation.y += dt * 0.1 * (i % 2 ? 1 : -1)));
  });
}

void Color3;
