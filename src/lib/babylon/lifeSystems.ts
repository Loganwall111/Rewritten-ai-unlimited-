/**
 * Life systems for walkable worlds — day/night cycle, weather, ambient fauna
 * (birds, fish, fireflies), and collectible orbs.
 *
 * Each controller is a small imperative object that owns its meshes / lights
 * and exposes update(dt) + dispose(). Worlds pick the systems they need.
 */

import {
  Scene,
  Color3,
  Color4,
  Vector3,
  MeshBuilder,
  Mesh,
  StandardMaterial,
  DirectionalLight,
  HemisphericLight,
  Scalar,
  ParticleSystem,
} from "@babylonjs/core";
import { glow, hsl, nebulaParticles, glowTexture } from "./graphics";

// ---------------------------------------------------------------------------
// Day / Night
// ---------------------------------------------------------------------------

export interface DayNightOptions {
  /** Full cycle length in seconds (default 180 = 3 min). */
  cycleSeconds?: number;
  /** Starting phase 0–1 (0 = dawn). */
  phase?: number;
  sun?: DirectionalLight | null;
  hemi?: HemisphericLight | null;
}

export interface DayNightCycle {
  /** Current phase 0–1. */
  phase: number;
  /** True roughly 0.75–0.25 (night). */
  isNight: boolean;
  update: (dt: number) => void;
  dispose: () => void;
}

export function createDayNightCycle(scene: Scene, opts: DayNightOptions = {}): DayNightCycle {
  const cycle = opts.cycleSeconds ?? 180;
  let phase = opts.phase ?? 0.25; // start mid-morning
  const sun = opts.sun ?? null;
  const hemi = opts.hemi ?? null;

  // Soft sky tint via clearColor + fog when present.
  const baseFog = scene.fogColor?.clone() ?? new Color3(0.02, 0.03, 0.08);

  const update = (dt: number) => {
    phase = (phase + dt / cycle) % 1;
    // Sun arc: rises at 0.2, zenith 0.45, sets 0.7.
    const sunAngle = (phase - 0.2) * Math.PI * 1.4;
    const elev = Math.sin(Math.max(0, Math.min(Math.PI, sunAngle)));
    const azim = phase * Math.PI * 2;

    if (sun) {
      sun.direction = new Vector3(-Math.cos(azim), -Math.max(0.05, elev), -Math.sin(azim));
      sun.intensity = 0.3 + elev * 1.8;
      // Warm dawn/dusk, cool noon, cold night.
      const warmth = elev > 0.1 ? 1 - Math.abs(elev - 0.7) * 0.4 : 0.4;
      sun.diffuse = new Color3(1, 0.85 + warmth * 0.1, 0.7 + warmth * 0.2);
    }
    if (hemi) {
      hemi.intensity = 0.15 + elev * 0.55;
      hemi.diffuse = elev > 0.15 ? new Color3(0.6, 0.75, 1) : new Color3(0.15, 0.2, 0.4);
    }

    // Sky clear colour.
    const night = elev < 0.08;
    if (night) {
      scene.clearColor = new Color4(0.01, 0.015, 0.04, 1);
      scene.fogColor = new Color3(0.01, 0.02, 0.05);
    } else {
      const r = 0.35 + elev * 0.25;
      const g = 0.5 + elev * 0.3;
      const b = 0.85 + elev * 0.1;
      // Dawn/dusk orange wash.
      const dusk = elev < 0.35 ? (0.35 - elev) / 0.35 : 0;
      scene.clearColor = new Color4(r + dusk * 0.4, g + dusk * 0.15, b - dusk * 0.3, 1);
      scene.fogColor = Color3.Lerp(baseFog, new Color3(r, g, b), 0.4);
    }
  };

  return {
    get phase() {
      return phase;
    },
    get isNight() {
      // Rough: night when phase is evening→dawn.
      return phase > 0.72 || phase < 0.18;
    },
    update,
    dispose: () => {
      /* no owned meshes */
    },
  };
}

// ---------------------------------------------------------------------------
// Weather
// ---------------------------------------------------------------------------

export type WeatherKind = "clear" | "rain" | "snow" | "fog" | "storm";

export interface WeatherController {
  kind: WeatherKind;
  setWeather: (k: WeatherKind) => void;
  update: (dt: number) => void;
  dispose: () => void;
}

export function createWeatherController(
  scene: Scene,
  initial: WeatherKind = "clear",
): WeatherController {
  let kind: WeatherKind = initial;
  let particles: ParticleSystem | null = null;
  const fogBase = scene.fogDensity || 0.004;

  const rebuild = (k: WeatherKind) => {
    particles?.dispose();
    particles = null;
    scene.fogDensity = fogBase;

    if (k === "clear") return;

    if (k === "fog") {
      scene.fogMode = Scene.FOGMODE_EXP2;
      scene.fogDensity = 0.04;
      scene.fogColor = new Color3(0.55, 0.6, 0.65);
      return;
    }

    const isSnow = k === "snow";
    const isStorm = k === "storm";
    const ps = new ParticleSystem(`wx-${k}`, isSnow ? 2500 : 4000, scene);
    ps.particleTexture = glowTexture(scene);
    ps.emitter = new Vector3(0, 40, 0);
    ps.minEmitBox = new Vector3(-60, 0, -60);
    ps.maxEmitBox = new Vector3(60, 10, 60);
    ps.color1 = isSnow
      ? new Color4(1, 1, 1, 0.9)
      : isStorm
        ? new Color4(0.5, 0.55, 0.7, 0.7)
        : new Color4(0.6, 0.7, 0.9, 0.6);
    ps.color2 = isSnow ? new Color4(0.9, 0.95, 1, 0.7) : new Color4(0.4, 0.5, 0.7, 0.4);
    ps.colorDead = new Color4(0, 0, 0, 0);
    ps.minSize = isSnow ? 0.15 : 0.04;
    ps.maxSize = isSnow ? 0.4 : 0.12;
    ps.minLifeTime = 1.5;
    ps.maxLifeTime = 4;
    ps.emitRate = isStorm ? 3500 : isSnow ? 800 : 2200;
    ps.blendMode = ParticleSystem.BLENDMODE_STANDARD;
    ps.gravity = new Vector3(isSnow ? 0.5 : 2, isSnow ? -4 : -18, 0);
    ps.direction1 = new Vector3(-0.5, -1, -0.5);
    ps.direction2 = new Vector3(0.5, -1, 0.5);
    ps.minEmitPower = isSnow ? 1 : 4;
    ps.maxEmitPower = isSnow ? 3 : 10;
    ps.updateSpeed = 0.02;
    ps.start();
    particles = ps;

    if (isStorm) {
      scene.fogMode = Scene.FOGMODE_EXP2;
      scene.fogDensity = 0.018;
      scene.fogColor = new Color3(0.15, 0.18, 0.22);
    }
  };

  rebuild(kind);

  // Occasional lightning flash for storm.
  let flashT = 0;
  const update = (dt: number) => {
    if (kind !== "storm") return;
    flashT -= dt;
    if (flashT <= 0) {
      flashT = 4 + Math.random() * 8;
      const prev = scene.clearColor.clone();
      scene.clearColor = new Color4(0.7, 0.75, 0.9, 1);
      setTimeout(() => {
        scene.clearColor = prev;
      }, 80);
    }
  };

  return {
    get kind() {
      return kind;
    },
    setWeather: (k) => {
      kind = k;
      rebuild(k);
    },
    update,
    dispose: () => {
      particles?.dispose();
      particles = null;
    },
  };
}

// ---------------------------------------------------------------------------
// Bird flocks
// ---------------------------------------------------------------------------

export interface FlockSystem {
  update: (dt: number) => void;
  dispose: () => void;
}

export function createBirdFlock(
  scene: Scene,
  opts: { count?: number; center?: Vector3; radius?: number; y?: number } = {},
): FlockSystem {
  const count = opts.count ?? 18;
  const center = opts.center ?? new Vector3(0, 0, 0);
  const radius = opts.radius ?? 40;
  const baseY = opts.y ?? 18;
  const birds: Array<{ mesh: Mesh; phase: number; speed: number; r: number; elev: number }> = [];
  const mat = glow(scene, hsl(220, 0.1, 0.15), 0.3);

  for (let i = 0; i < count; i++) {
    // Simple chevron bird (two thin boxes as wings).
    const root = new Mesh(`bird${i}`, scene);
    const wingL = MeshBuilder.CreateBox(`bl${i}`, { width: 0.8, height: 0.05, depth: 0.25 }, scene);
    const wingR = MeshBuilder.CreateBox(`br${i}`, { width: 0.8, height: 0.05, depth: 0.25 }, scene);
    wingL.position.x = -0.35;
    wingR.position.x = 0.35;
    wingL.rotation.z = 0.3;
    wingR.rotation.z = -0.3;
    wingL.material = mat;
    wingR.material = mat;
    wingL.parent = root;
    wingR.parent = root;
    birds.push({
      mesh: root,
      phase: Math.random() * Math.PI * 2,
      speed: 0.3 + Math.random() * 0.5,
      r: radius * (0.5 + Math.random() * 0.5),
      elev: baseY + (Math.random() - 0.5) * 8,
    });
  }

  let t = 0;
  return {
    update: (dt) => {
      t += dt;
      birds.forEach((b, i) => {
        const a = t * b.speed + b.phase + (i / count) * 0.4;
        b.mesh.position.set(
          center.x + Math.cos(a) * b.r,
          b.elev + Math.sin(t * 2 + b.phase) * 1.5,
          center.z + Math.sin(a) * b.r,
        );
        b.mesh.rotation.y = -a + Math.PI / 2;
        // Wing flap.
        const flap = Math.sin(t * 12 + b.phase) * 0.5;
        const kids = b.mesh.getChildMeshes();
        if (kids[0]) kids[0].rotation.z = 0.3 + flap;
        if (kids[1]) kids[1].rotation.z = -0.3 - flap;
      });
    },
    dispose: () => birds.forEach((b) => b.mesh.dispose()),
  };
}

// ---------------------------------------------------------------------------
// Fish schools
// ---------------------------------------------------------------------------

export function createFishSchool(
  scene: Scene,
  opts: { count?: number; center?: Vector3; radius?: number; y?: number; hue?: number } = {},
): FlockSystem {
  const count = opts.count ?? 30;
  const center = opts.center ?? new Vector3(0, 0, 0);
  const radius = opts.radius ?? 20;
  const baseY = opts.y ?? -4;
  const hue = opts.hue ?? 180;
  const fish: Array<{ mesh: Mesh; phase: number; speed: number; r: number; elev: number }> = [];
  const mat = glow(scene, hsl(hue, 0.9, 0.55), 1.2);

  for (let i = 0; i < count; i++) {
    const body = MeshBuilder.CreateSphere(
      `fish${i}`,
      { diameterX: 0.7, diameterY: 0.3, diameterZ: 0.25, segments: 6 },
      scene,
    );
    body.material = mat;
    fish.push({
      mesh: body,
      phase: Math.random() * Math.PI * 2,
      speed: 0.5 + Math.random() * 0.8,
      r: radius * (0.3 + Math.random() * 0.7),
      elev: baseY + (Math.random() - 0.5) * 6,
    });
  }

  let t = 0;
  return {
    update: (dt) => {
      t += dt;
      fish.forEach((f, i) => {
        const a = t * f.speed + f.phase;
        // Figure-8-ish school path.
        f.mesh.position.set(
          center.x + Math.sin(a) * f.r,
          f.elev + Math.sin(a * 2) * 0.8,
          center.z + Math.sin(a * 2) * f.r * 0.5,
        );
        f.mesh.rotation.y = Math.atan2(Math.cos(a) * f.r, Math.cos(a * 2) * f.r);
        f.mesh.scaling.x = 1 + Math.sin(t * 8 + i) * 0.05;
      });
    },
    dispose: () => fish.forEach((f) => f.mesh.dispose()),
  };
}

// ---------------------------------------------------------------------------
// Fireflies
// ---------------------------------------------------------------------------

export function createFireflies(
  scene: Scene,
  opts: { count?: number; center?: Vector3; radius?: number; y?: number; hue?: number } = {},
): FlockSystem {
  const count = opts.count ?? 40;
  const center = opts.center ?? Vector3.Zero();
  const radius = opts.radius ?? 25;
  const baseY = opts.y ?? 2;
  const hue = opts.hue ?? 60;

  const c1 = hsl(hue, 1, 0.6);
  const c2 = hsl(hue + 30, 1, 0.7);
  const ps = nebulaParticles(scene, {
    count,
    color1: new Color4(c1.r, c1.g, c1.b, 1),
    color2: new Color4(c2.r, c2.g, c2.b, 1),
    colorDead: new Color4(0, 0, 0, 0),
    minSize: 0.08,
    maxSize: 0.25,
    emitter: center.add(new Vector3(0, baseY, 0)),
    minEmitBox: new Vector3(-radius, 0, -radius),
    maxEmitBox: new Vector3(radius, 6, radius),
    minLife: 3,
    maxLife: 8,
    emitRate: count / 3,
    direction1: new Vector3(-0.3, 0.2, -0.3),
    direction2: new Vector3(0.3, 0.6, 0.3),
    minEmitPower: 0.05,
    maxEmitPower: 0.25,
    texture: "glow",
  });

  return {
    update: () => {
      /* particle system self-updates */
    },
    dispose: () => ps.dispose(),
  };
}

// ---------------------------------------------------------------------------
// Collectibles
// ---------------------------------------------------------------------------

export interface CollectibleSystem {
  collected: number;
  total: number;
  update: (dt: number, playerPos: Vector3) => void;
  dispose: () => void;
  onCollect?: (index: number) => void;
}

export function createCollectibles(
  scene: Scene,
  positions: Vector3[],
  opts: { hue?: number; pickupRadius?: number; onCollect?: (i: number) => void } = {},
): CollectibleSystem {
  const hue = opts.hue ?? 50;
  const pickup = opts.pickupRadius ?? 1.8;
  const mat = glow(scene, hsl(hue, 1, 0.6), 2);
  const orbs: Array<{ mesh: Mesh; alive: boolean; phase: number }> = positions.map((p, i) => {
    const mesh = MeshBuilder.CreateIcoSphere(`col${i}`, { radius: 0.45, subdivisions: 1 }, scene);
    mesh.position.copyFrom(p);
    mesh.material = mat;
    return { mesh, alive: true, phase: Math.random() * Math.PI * 2 };
  });

  let collected = 0;
  let t = 0;

  return {
    get collected() {
      return collected;
    },
    total: positions.length,
    onCollect: opts.onCollect,
    update: (dt, playerPos) => {
      t += dt;
      orbs.forEach((o, i) => {
        if (!o.alive) return;
        o.mesh.position.y = positions[i].y + Math.sin(t * 2.5 + o.phase) * 0.25;
        o.mesh.rotation.y += dt * 1.5;
        if (Vector3.Distance(o.mesh.position, playerPos) < pickup) {
          o.alive = false;
          o.mesh.setEnabled(false);
          collected++;
          opts.onCollect?.(i);
        }
      });
    },
    dispose: () => orbs.forEach((o) => o.mesh.dispose()),
  };
}

// ---------------------------------------------------------------------------
// Terrain height sampler helper (shared by walk + worlds)
// ---------------------------------------------------------------------------

/** Simple radial height field used when a world doesn't supply its own. */
export function sampleHeightRadial(
  x: number,
  z: number,
  opts: { base?: number; amp?: number; freq?: number } = {},
): number {
  const base = opts.base ?? 0;
  const amp = opts.amp ?? 2;
  const freq = opts.freq ?? 0.05;
  return (
    base +
    Math.sin(x * freq) * Math.cos(z * freq) * amp +
    Math.sin(x * freq * 2.3 + z * freq * 1.7) * amp * 0.35
  );
}

void Scalar;
void StandardMaterial;
