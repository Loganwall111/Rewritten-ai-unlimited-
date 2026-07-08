/**
 * Physics Playground scene — Havok physics in action.
 *
 * A floor plus a rain of dynamic crates and spheres that fall, bounce, and
 * stack with real gravity + collisions. Demonstrates the engine's Havok
 * integration. If Havok is unavailable, objects simply hang in a gentle float
 * loop (graceful fallback) so the scene is never broken.
 */

import {
  Color3,
  Color4,
  Vector3,
  MeshBuilder,
  Mesh,
  PhysicsAggregate,
  PhysicsShapeType,
} from "@babylonjs/core";
import type { BabylonSceneApi } from "../BabylonSceneHost";
import { enablePhysics } from "../physics";
import { glow, pbr, hsl, marbleFloor, starField } from "../graphics";

const HUES = [0, 45, 120, 190, 260, 320];

export async function buildPhysics({ scene }: BabylonSceneApi) {
  scene.clearColor = new Color4(0.04, 0.05, 0.09, 1);
  starField(scene, 800, 400);

  const hasPhysics = await enablePhysics(scene, [0, -14, 0]);

  // Floor.
  const floor = marbleFloor(scene, 80, hsl(220, 0.15, 0.12));
  if (hasPhysics) {
    // Static floor aggregate.
    new PhysicsAggregate(floor, PhysicsShapeType.BOX, { mass: 0, restitution: 0.6 }, scene);
  }

  // Spawn rain of dynamic objects over time.
  const dynamics: Mesh[] = [];
  let spawnTimer = 0;
  let spawnIndex = 0;

  const spawn = () => {
    if (dynamics.length > 60) return; // cap
    const isBox = spawnIndex % 3 !== 0;
    const hue = HUES[spawnIndex % HUES.length];
    const obj = isBox
      ? MeshBuilder.CreateBox(`dyn${spawnIndex}`, { size: 1.2 }, scene)
      : MeshBuilder.CreateSphere(`dyn${spawnIndex}`, { diameter: 1.1, segments: 10 }, scene);
    obj.position.set(
      (Math.random() - 0.5) * 14,
      14 + Math.random() * 4,
      (Math.random() - 0.5) * 14,
    );
    obj.rotation.set(Math.random(), Math.random(), Math.random());
    obj.material = isBox
      ? pbr(scene, { baseColor: hsl(hue, 0.7, 0.5), metallic: 0.7, roughness: 0.3, emissive: hsl(hue, 0.8, 0.15) })
      : glow(scene, hsl(hue, 1, 0.6), 1.2);
    if (hasPhysics) {
      const shape = isBox ? PhysicsShapeType.BOX : PhysicsShapeType.SPHERE;
      const agg = new PhysicsAggregate(obj, shape, { mass: 1, restitution: 0.7, friction: 0.4 }, scene);
      void agg;
    }
    dynamics.push(obj);
    spawnIndex++;
  };

  // Initial burst.
  for (let i = 0; i < 15; i++) spawn();

  let t = 0;
  scene.onBeforeRenderObservable.add(() => {
    const dt = scene.getEngine().getDeltaTime() / 1000;
    t += dt;
    spawnTimer += dt;
    if (spawnTimer > 0.5) {
      spawnTimer = 0;
      spawn();
    }
    // Fallback float animation when no physics.
    if (!hasPhysics) {
      dynamics.forEach((m, i) => {
        m.position.y = 8 + Math.sin(t + i) * 3;
        m.rotation.y += dt * 0.5;
        m.rotation.x += dt * 0.3;
      });
    } else {
      // Despawn objects that fall away.
      for (let i = dynamics.length - 1; i >= 0; i--) {
        if (dynamics[i].position.y < -20) {
          dynamics[i].dispose();
          dynamics.splice(i, 1);
        }
      }
    }
  });

  void Color3;
  void Mesh;
  void Vector3;
}
