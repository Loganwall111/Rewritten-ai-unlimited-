/**
 * Council scene — twelve glowing seats around a judgement dais.
 *
 * A circular arrangement of thrones (backrest + seat) of light, a central
 * radiant emblem, and converging beams toward the centre.
 */

import { Color3, Color4, Vector3, MeshBuilder, Mesh, StandardMaterial } from "@babylonjs/core";
import type { BabylonSceneApi } from "../BabylonSceneHost";
import { glow, pbr, hsl, marbleFloor, starField } from "../graphics";

const SEATS = 12;

export function buildCouncil({ scene }: BabylonSceneApi) {
  scene.clearColor = new Color4(0.03, 0.04, 0.08, 1);
  starField(scene, 1500, 400);
  marbleFloor(scene, 70, hsl(220, 0.2, 0.12));

  for (let i = 0; i < SEATS; i++) {
    const a = (i / SEATS) * Math.PI * 2;
    const x = Math.cos(a) * 18;
    const z = Math.sin(a) * 18;
    const seatMat = glow(scene, hsl(210 + i * 8, 1, 0.55), 1.0);
    // Seat.
    const seat = MeshBuilder.CreateBox(`seat${i}`, { width: 2.5, height: 1, depth: 2.5 }, scene);
    seat.position.set(x, 0.5, z);
    seat.rotation.y = -a + Math.PI / 2;
    seat.material = seatMat;
    // Backrest.
    const back = MeshBuilder.CreateBox(`back${i}`, { width: 2.5, height: 4, depth: 0.4 }, scene);
    back.position.set(x + Math.cos(a + Math.PI) * 1.2, 2.5, z + Math.sin(a + Math.PI) * 1.2);
    back.rotation.y = -a + Math.PI / 2;
    back.material = seatMat;
  }

  // Central emblem.
  const emblem = MeshBuilder.CreatePolyhedron("emblem", { type: 1, size: 2 }, scene);
  emblem.position.y = 5;
  emblem.material = glow(scene, hsl(45, 1, 0.7), 2.5);

  // Converging beams.
  const beamMat = new StandardMaterial("cbeam", scene);
  beamMat.emissiveColor = hsl(210, 1, 0.6);
  beamMat.alpha = 0.12;
  for (let i = 0; i < SEATS; i++) {
    const a = (i / SEATS) * Math.PI * 2;
    const beam = MeshBuilder.CreateCylinder(
      `cbeam${i}`,
      { diameterTop: 0.2, diameterBottom: 0.6, height: 18, tessellation: 8 },
      scene,
    );
    const mid = new Vector3(Math.cos(a) * 9, 5, Math.sin(a) * 9);
    beam.position = mid;
    beam.lookAt(new Vector3(0, 5, 0));
    beam.rotate(new Vector3(1, 0, 0), Math.PI / 2);
    beam.material = beamMat;
  }

  let t = 0;
  scene.onBeforeRenderObservable.add(() => {
    const dt = scene.getEngine().getDeltaTime() / 1000;
    t += dt;
    emblem.rotation.y += dt * 0.5;
    emblem.rotation.x += dt * 0.2;
    emblem.scaling.setAll(1 + Math.sin(t * 1.2) * 0.08);
  });
}

void pbr;
void Color3;
