/**
 * Shared Babylon graphics toolkit — the reusable primitives that give every
 * scene the "overhauled" look: PBR materials, volumetric GPU particle systems,
 * emissive glow, procedural mesh factories, and instanced (thin-instance)
 * batching for hundreds of objects.
 */

import {
  Scene,
  Color3,
  Color4,
  Vector3,
  Matrix,
  Quaternion,
  MeshBuilder,
  StandardMaterial,
  PBRMetallicRoughnessMaterial,
  ParticleSystem,
  Texture,
  Mesh,
  PointsCloudSystem,
  DynamicTexture,
} from "@babylonjs/core";
import { castShadow } from "./BabylonSceneHost";

/**
 * Build a world matrix from scale + translation (uniform/no rotation by default).
 * Returns the 16-element column-major array ready to push into a thin-instance
 * buffer. Babylon's Matrix.Compose is static, so this wraps the common case.
 */
export function composeMatrix(
  scale: Vector3,
  translation: Vector3,
  rotation: Quaternion = new Quaternion(),
): number[] {
  return Array.from(Matrix.Compose(scale, rotation, translation).m);
}

/** A soft radial sprite texture generated procedurally (no asset shipped). */
export function glowTexture(scene: Scene): Texture {
  const dt = new DynamicTexture("glow", { width: 128, height: 128 }, scene, false);
  const ctx = dt.getContext() as CanvasRenderingContext2D;
  const size = 128;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.25, "rgba(255,255,255,0.85)");
  grad.addColorStop(0.55, "rgba(255,255,255,0.25)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  dt.update();
  return dt;
}

/** Star point texture (4-point sparkle) for particle nebulae. */
export function starTexture(scene: Scene): Texture {
  const dt = new DynamicTexture("star", { width: 64, height: 64 }, scene, false);
  const ctx = dt.getContext() as CanvasRenderingContext2D;
  const size = 64;
  ctx.clearRect(0, 0, size, size);
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.5, "rgba(255,255,255,0.4)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  // sparkle cross
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(size / 2, 4);
  ctx.lineTo(size / 2, size - 4);
  ctx.moveTo(4, size / 2);
  ctx.lineTo(size - 4, size / 2);
  ctx.stroke();
  dt.update();
  return dt;
}

/** Create a PBR metal/rough material tuned for cinematic surfaces. */
export function pbr(
  scene: Scene,
  opts: {
    baseColor?: Color3;
    metallic?: number;
    roughness?: number;
    emissive?: Color3;
    emissiveIntensity?: number;
    alpha?: number;
  },
): PBRMetallicRoughnessMaterial {
  const m = new PBRMetallicRoughnessMaterial("pbr", scene);
  m.baseColor = opts.baseColor ?? new Color3(0.6, 0.6, 0.6);
  m.metallic = opts.metallic ?? 0.9;
  m.roughness = opts.roughness ?? 0.25;
  if (opts.emissive) {
    m.emissiveColor = opts.emissive;
  }
  m.alpha = opts.alpha ?? 1;
  return m;
}

/** A standard material with strong emissive glow (for energy/orbs/lights). */
export function glow(scene: Scene, color: Color3, intensity = 1.5): StandardMaterial {
  const m = new StandardMaterial("glow", scene);
  m.emissiveColor = color.scale(intensity);
  m.diffuseColor = color;
  m.specularColor = new Color3(0.4, 0.5, 0.6);
  m.disableLighting = false;
  return m;
}

/** A glassy transparent material (for portals / water surfaces). */
export function glass(scene: Scene, tint: Color3, opacity = 0.4): StandardMaterial {
  const m = new StandardMaterial("glass", scene);
  m.diffuseColor = tint;
  m.emissiveColor = tint.scale(0.25);
  m.alpha = opacity;
  m.specularPower = 256;
  m.specularColor = new Color3(1, 1, 1);
  return m;
}

/**
 * Volumetric-style GPU particle system. Babylon's ParticleSystem runs on the
 * GPU when supported (hundreds of thousands of particles). We tune it for
 * nebulae / embers / spore fields / aurorae.
 */
export function nebulaParticles(
  scene: Scene,
  opts: {
    count?: number;
    color1?: Color4;
    color2?: Color4;
    colorDead?: Color4;
    minSize?: number;
    maxSize?: number;
    emitter?: Vector3;
    minEmitBox?: Vector3;
    maxEmitBox?: Vector3;
    minLife?: number;
    maxLife?: number;
    emitRate?: number;
    direction1?: Vector3;
    direction2?: Vector3;
    minEmitPower?: number;
    maxEmitPower?: number;
    gravity?: Vector3;
    blendMode?: number;
    minAngularSpeed?: number;
    maxAngularSpeed?: number;
    texture?: "glow" | "star";
  },
): ParticleSystem {
  const ps = new ParticleSystem("particles", opts.count ?? 2000, scene);
  ps.particleTexture = opts.texture === "star" ? starTexture(scene) : glowTexture(scene);
  ps.emitter = opts.emitter ?? new Vector3(0, 0, 0);
  ps.minEmitBox = opts.minEmitBox ?? new Vector3(-50, -20, -50);
  ps.maxEmitBox = opts.maxEmitBox ?? new Vector3(50, 40, 50);
  ps.color1 = opts.color1 ?? new Color4(0.3, 0.7, 1.0, 1);
  ps.color2 = opts.color2 ?? new Color4(0.7, 0.3, 1.0, 1);
  ps.colorDead = opts.colorDead ?? new Color4(0, 0, 0, 0);
  ps.minSize = opts.minSize ?? 0.3;
  ps.maxSize = opts.maxSize ?? 1.2;
  ps.minLifeTime = opts.minLife ?? 4;
  ps.maxLifeTime = opts.maxLife ?? 9;
  ps.emitRate = opts.emitRate ?? (opts.count ?? 2000) / 6;
  ps.blendMode = opts.blendMode ?? ParticleSystem.BLENDMODE_ADD;
  ps.gravity = opts.gravity ?? new Vector3(0, 0, 0);
  ps.direction1 = opts.direction1 ?? new Vector3(-0.4, 0.5, -0.4);
  ps.direction2 = opts.direction2 ?? new Vector3(0.4, 1, 0.4);
  ps.minEmitPower = opts.minEmitPower ?? 0.2;
  ps.maxEmitPower = opts.maxEmitPower ?? 0.8;
  ps.minAngularSpeed = opts.minAngularSpeed ?? -1;
  ps.maxAngularSpeed = opts.maxAngularSpeed ?? 1;
  ps.start();
  return ps;
}

/** Build a glowing icosphere (the signature "Rewritten" orb). */
export function glowingIcosphere(scene: Scene, radius: number, color: Color3, detail = 3): Mesh {
  const mesh = MeshBuilder.CreateIcoSphere(
    "ico",
    { radius, subdivisions: detail, updatable: false },
    scene,
  );
  mesh.material = glow(scene, color, 1.2);
  castShadow(scene, mesh);
  return mesh;
}

/** A reflective marble floor plane (PBR). */
export function marbleFloor(
  scene: Scene,
  size = 200,
  color: Color3 = new Color3(0.08, 0.09, 0.13),
): Mesh {
  const floor = MeshBuilder.CreateGround(
    "floor",
    { width: size, height: size, subdivisions: 2 },
    scene,
  );
  floor.material = pbr(scene, {
    baseColor: color,
    metallic: 0.85,
    roughness: 0.12,
  });
  floor.receiveShadows = true;
  return floor;
}

/** Thin-instance batch helper — render hundreds of identical meshes cheaply. */
export function batchInstances(scene: Scene, template: Mesh, matrices: Float32Array): Mesh {
  template.thinInstanceSetBuffer("matrix", matrices, 16, true);
  castShadow(scene, template);
  return template;
}

/** A starfield using the points cloud system (cheap deep-space backdrop). */
export function starField(
  scene: Scene,
  count = 3000,
  radius = 400,
  color: Color3 = new Color3(1, 1, 1),
): PointsCloudSystem {
  const pcs = new PointsCloudSystem("stars", 1, scene);
  pcs.addPoints(count, (particle: { position: Vector3; color: Color4 }) => {
    // Distribute on a sphere shell.
    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    const r = radius * (0.7 + Math.random() * 0.3);
    particle.position = new Vector3(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta),
      r * Math.cos(phi),
    );
    particle.color = new Color4(
      color.r * (0.6 + Math.random() * 0.4),
      color.g * (0.6 + Math.random() * 0.4),
      color.b * (0.7 + Math.random() * 0.3),
      1,
    );
  });
  pcs.buildMeshAsync();
  return pcs;
}

/** Helper to convert HSL → Color3. */
export function hsl(h: number, s: number, l: number): Color3 {
  const c = Color3.FromHexString(hslToHex(h, s, l));
  return c;
}
function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(1, s));
  l = Math.max(0, Math.min(1, l));
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0,
    g = 0,
    b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const to = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}
