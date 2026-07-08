/**
 * Studio scene — a creative workshop.
 *
 * A turntable with a sculpted form being shaped, floating tool orbs (brush,
 * colour, light), and a backdrop cyclorama. The "creation in progress" feel.
 */

import { Color3, Color4, Vector3, MeshBuilder, Mesh } from "@babylonjs/core";
import type { BabylonSceneApi } from "../BabylonSceneHost";
import { glow, pbr, hsl, marbleFloor } from "../graphics";

export function buildStudio({ scene }: BabylonSceneApi) {
  scene.clearColor = new Color4(0.08, 0.08, 0.1, 1);
  marbleFloor(scene, 80, hsl(220, 0.1, 0.15));

  // Turntable.
  const turn = MeshBuilder.CreateCylinder(
    "turn",
    { diameter: 8, height: 0.5, tessellation: 32 },
    scene,
  );
  turn.material = pbr(scene, { baseColor: hsl(0, 0, 0.2), metallic: 0.9, roughness: 0.1 });

  // Sculpted form on the turntable.
  const form = MeshBuilder.CreatePolyhedron("form", { type: 0, size: 2.5 }, scene);
  form.position.y = 3;
  form.material = glow(scene, hsl(280, 1, 0.6), 1.0);

  // Cyclorama backdrop (curved).
  const cyc = MeshBuilder.CreateSphere(
    "cyc",
    { diameter: 80, segments: 24, sideOrientation: 1 },
    scene,
  );
  cyc.material = pbr(scene, { baseColor: hsl(220, 0.05, 0.5), metallic: 0, roughness: 1 });

  // Floating tool orbs.
  const tools: Mesh[] = [];
  const toolHues = [0, 120, 50, 280, 190];
  for (let i = 0; i < toolHues.length; i++) {
    const a = (i / toolHues.length) * Math.PI * 2;
    const tool = MeshBuilder.CreateIcoSphere(`tool${i}`, { radius: 0.6, subdivisions: 1 }, scene);
    tool.position.set(Math.cos(a) * 6, 5, Math.sin(a) * 6);
    tool.material = glow(scene, hsl(toolHues[i], 1, 0.65), 1.8);
    tools.push(tool);
  }

  let t = 0;
  scene.onBeforeRenderObservable.add(() => {
    const dt = scene.getEngine().getDeltaTime() / 1000;
    t += dt;
    turn.rotation.y += dt * 0.4;
    form.rotation.y -= dt * 0.6;
    form.rotation.x = Math.sin(t * 0.5) * 0.2;
    form.scaling.y = 1 + Math.sin(t * 1.2) * 0.1;
    tools.forEach((tool, i) => {
      tool.position.y = 5 + Math.sin(t * 1.5 + i) * 0.4;
    });
  });
}

void Vector3;
void Color3;
