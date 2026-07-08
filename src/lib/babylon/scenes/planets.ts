/**
 * Planets scene — a miniature PBR planetary system.
 *
 * A central star, several PBR planets with distinct base colors / roughness,
 * atmospheric halos, and a gas giant with a procedural ring. Each planet orbits
 * and rotates; moons orbit their primaries.
 */

import { Color3, Color4, Vector3, MeshBuilder, Mesh } from "@babylonjs/core";
import type { BabylonSceneApi } from "../BabylonSceneHost";
import { glow, pbr, hsl, starField } from "../graphics";

interface PlanetDef {
  dist: number;
  size: number;
  hue: number;
  metallic: number;
  roughness: number;
  ring?: boolean;
  moon?: boolean;
  speed: number;
}

const PLANETS: PlanetDef[] = [
  { dist: 8, size: 0.8, hue: 30, metallic: 0.2, roughness: 0.7, speed: 0.8 },
  { dist: 13, size: 1.2, hue: 200, metallic: 0.1, roughness: 0.5, moon: true, speed: 0.55 },
  { dist: 19, size: 1.6, hue: 15, metallic: 0.3, roughness: 0.4, speed: 0.4 },
  { dist: 27, size: 2.4, hue: 40, metallic: 0.4, roughness: 0.3, ring: true, speed: 0.28 },
  { dist: 36, size: 1.4, hue: 280, metallic: 0.6, roughness: 0.5, speed: 0.2 },
];

export function buildPlanets({ scene }: BabylonSceneApi) {
  scene.clearColor = new Color4(0.005, 0.005, 0.015, 1);
  starField(scene, 2500, 600);

  // Star.
  const star = MeshBuilder.CreateSphere("star", { diameter: 4, segments: 24 }, scene);
  star.material = glow(scene, hsl(45, 1, 0.7), 3.0);

  const orbits: Array<{ pivot: Mesh; planet: Mesh; speed: number; moon?: Mesh }> = [];
  for (const def of PLANETS) {
    const pivot = new Mesh("pivot", scene);
    const planet = MeshBuilder.CreateSphere("planet", { diameter: def.size * 2, segments: 24 }, scene);
    planet.material = pbr(scene, {
      baseColor: hsl(def.hue, 0.6, 0.5),
      metallic: def.metallic,
      roughness: def.roughness,
      emissive: hsl(def.hue, 0.7, 0.15),
      emissiveIntensity: 0.5,
    });
    planet.position.x = def.dist;
    planet.parent = pivot;
    pivot.rotation.y = Math.random() * Math.PI * 2;

    // Atmospheric halo.
    const halo = MeshBuilder.CreateSphere("halo", { diameter: def.size * 2.5, segments: 16 }, scene);
    halo.position.x = def.dist;
    halo.parent = pivot;
    const haloMat = glow(scene, hsl(def.hue, 1, 0.6), 0.3);
    haloMat.alpha = 0.15;
    halo.material = haloMat;

    if (def.ring) {
      const ring = MeshBuilder.CreateTorus("pring", { diameter: def.size * 6, thickness: 0.25, tessellation: 96 }, scene);
      ring.position.x = def.dist;
      ring.parent = pivot;
      ring.rotation.x = Math.PI / 2.3;
      ring.material = pbr(scene, {
        baseColor: hsl(def.hue, 0.5, 0.6),
        metallic: 0.9,
        roughness: 0.3,
        emissive: hsl(def.hue, 0.6, 0.3),
      });
    }
    let moon: Mesh | undefined;
    if (def.moon) {
      moon = MeshBuilder.CreateSphere("moon", { diameter: 0.4, segments: 12 }, scene);
      moon.material = pbr(scene, { baseColor: new Color3(0.7, 0.7, 0.72), metallic: 0.1, roughness: 0.9 });
      moon.parent = planet;
      moon.position.x = def.size * 2.5;
    }
    orbits.push({ pivot, planet, speed: def.speed, moon });
  }

  let t = 0;
  scene.onBeforeRenderObservable.add(() => {
    const dt = scene.getEngine().getDeltaTime() / 1000;
    t += dt;
    star.scaling.setAll(1 + Math.sin(t * 1.2) * 0.03);
    orbits.forEach((o) => {
      o.pivot.rotation.y += dt * o.speed;
      o.planet.rotation.y += dt * 0.5;
      if (o.moon && o.moon.parent) (o.moon.parent as Mesh).rotation.y += dt * 1.5;
    });
  });
}

void Vector3;
