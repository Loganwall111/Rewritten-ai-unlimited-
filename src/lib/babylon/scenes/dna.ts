/**
 * DNA Helix scene — a spiraling double helix of living code.
 *
 * Two sine-offset strands of spheres connected by rungs, slowly rotating, with
 * floating nucleotide motes drifting through the helix.
 */

import { Color3, Color4, Vector3, MeshBuilder, Mesh } from "@babylonjs/core";
import type { BabylonSceneApi } from "../BabylonSceneHost";
import { glow, hsl, nebulaParticles, starField } from "../graphics";

const TURNS = 4;
const PER_TURN = 16;
const HEIGHT = 40;

export function buildDNA({ scene }: BabylonSceneApi) {
  scene.clearColor = new Color4(0.02, 0.04, 0.08, 1);
  starField(scene, 1200, 400);

  const helix = new Mesh("helix", scene);
  const total = TURNS * PER_TURN;
  const strandA: Mesh[] = [];
  const strandB: Mesh[] = [];
  for (let i = 0; i < total; i++) {
    const t = i / (total - 1);
    const ang = t * TURNS * Math.PI * 2;
    const y = (t - 0.5) * HEIGHT;
    const r = 4;
    const a = MeshBuilder.CreateSphere(`a${i}`, { diameter: 0.8, segments: 10 }, scene);
    a.position.set(Math.cos(ang) * r, y, Math.sin(ang) * r);
    a.parent = helix;
    a.material = glow(scene, hsl(150, 1, 0.55), 1.4);
    strandA.push(a);
    const b = MeshBuilder.CreateSphere(`b${i}`, { diameter: 0.8, segments: 10 }, scene);
    b.position.set(Math.cos(ang + Math.PI) * r, y, Math.sin(ang + Math.PI) * r);
    b.parent = helix;
    b.material = glow(scene, hsl(320, 1, 0.55), 1.4);
    strandB.push(b);
    // Rung every few nodes.
    if (i % 2 === 0) {
      const rung = MeshBuilder.CreateCylinder(
        `rung${i}`,
        { diameter: 0.12, height: r * 2, tessellation: 5 },
        scene,
      );
      rung.position.set(0, y, 0);
      rung.rotation.z = Math.PI / 2;
      rung.rotation.y = -ang;
      rung.parent = helix;
      rung.material = glow(scene, hsl(50, 1, 0.7), 0.8);
    }
  }

  nebulaParticles(scene, {
    count: 2000,
    color1: new Color4(0.3, 0.9, 0.5, 1),
    color2: new Color4(0.9, 0.3, 0.7, 1),
    minEmitBox: new Vector3(-6, -22, -6),
    maxEmitBox: new Vector3(6, 22, 6),
    minSize: 0.1,
    maxSize: 0.3,
    texture: "glow",
  });

  scene.onBeforeRenderObservable.add(() => {
    helix.rotation.y += (scene.getEngine().getDeltaTime() / 1000) * 0.4;
  });
}

void Color3;
