/**
 * Shared primitives for playable walkable worlds — terrain, water, props,
 * sky tints, and height samplers. Keeps individual world files lean.
 */

import {
  Scene,
  Color3,
  Color4,
  Vector3,
  Matrix,
  Quaternion,
  MeshBuilder,
  Mesh,
  VertexBuffer,
} from "@babylonjs/core";
import { pbr, glow, glass, hsl, nebulaParticles, starField, marbleFloor } from "../../graphics";
import { castShadow } from "../../BabylonSceneHost";
import type { WalkableSceneApi } from "../../WalkableHost";
import {
  createBirdFlock,
  createFishSchool,
  createFireflies,
  createCollectibles,
  sampleHeightRadial,
} from "../../lifeSystems";

export {
  hsl,
  pbr,
  glow,
  glass,
  nebulaParticles,
  starField,
  marbleFloor,
  castShadow,
  createBirdFlock,
  createFishSchool,
  createFireflies,
  createCollectibles,
  sampleHeightRadial,
};

/** Procedural heightmapped ground. Returns mesh + sampler. */
export function buildTerrain(
  scene: Scene,
  opts: {
    size?: number;
    subdivisions?: number;
    base?: number;
    amp?: number;
    freq?: number;
    color?: Color3;
    metallic?: number;
    roughness?: number;
    heightFn?: (x: number, z: number) => number;
  } = {},
): { mesh: Mesh; sample: (x: number, z: number) => number } {
  const size = opts.size ?? 160;
  const sub = opts.subdivisions ?? 64;
  const base = opts.base ?? 0;
  const amp = opts.amp ?? 3;
  const freq = opts.freq ?? 0.045;
  const heightFn = opts.heightFn ?? ((x, z) => sampleHeightRadial(x, z, { base, amp, freq }));

  const ground = MeshBuilder.CreateGround(
    "terrain",
    { width: size, height: size, subdivisions: sub, updatable: true },
    scene,
  );
  const positions = ground.getVerticesData(VertexBuffer.PositionKind)!;
  for (let i = 0; i < positions.length; i += 3) {
    positions[i + 1] = heightFn(positions[i], positions[i + 2]);
  }
  ground.updateVerticesData(VertexBuffer.PositionKind, positions);
  ground.createNormals(true);

  ground.material = pbr(scene, {
    baseColor: opts.color ?? hsl(130, 0.35, 0.22),
    metallic: opts.metallic ?? 0.1,
    roughness: opts.roughness ?? 0.85,
  });
  ground.receiveShadows = true;

  return { mesh: ground, sample: heightFn };
}

/** Flat translucent water plane. */
export function buildWater(
  scene: Scene,
  opts: { y?: number; size?: number; tint?: Color3; opacity?: number } = {},
): Mesh {
  const water = MeshBuilder.CreateGround(
    "water",
    { width: opts.size ?? 200, height: opts.size ?? 200, subdivisions: 4 },
    scene,
  );
  water.position.y = opts.y ?? 0;
  water.material = glass(scene, opts.tint ?? hsl(195, 0.8, 0.4), opts.opacity ?? 0.45);
  return water;
}

/** Scatter N thin-instances of a template mesh. */
export function scatter(
  scene: Scene,
  opts: {
    count: number;
    template: Mesh;
    sample: (x: number, z: number) => number;
    radius?: number;
    minScale?: number;
    maxScale?: number;
    yOffset?: number;
  },
): void {
  const radius = opts.radius ?? 70;
  const matrices = new Float32Array(opts.count * 16);
  const minS = opts.minScale ?? 0.6;
  const maxS = opts.maxScale ?? 1.8;
  for (let i = 0; i < opts.count; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * radius;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const y = opts.sample(x, z) + (opts.yOffset ?? 0);
    const s = minS + Math.random() * (maxS - minS);
    const rot = Quaternion.RotationAxis(Vector3.Up(), Math.random() * Math.PI * 2);
    const mat = Matrix.Compose(new Vector3(s, s, s), rot, new Vector3(x, y, z));
    matrices.set(Array.from(mat.m), i * 16);
  }
  opts.template.thinInstanceSetBuffer("matrix", matrices, 16, true);
  castShadow(scene, opts.template);
}

export function makeTree(scene: Scene, trunkHue = 30, leafHue = 130): Mesh {
  const root = new Mesh("tree", scene);
  const trunk = MeshBuilder.CreateCylinder(
    "trunk",
    { diameterTop: 0.3, diameterBottom: 0.55, height: 3, tessellation: 6 },
    scene,
  );
  trunk.position.y = 1.5;
  trunk.material = pbr(scene, {
    baseColor: hsl(trunkHue, 0.4, 0.25),
    metallic: 0,
    roughness: 0.9,
  });
  trunk.parent = root;
  const canopy = MeshBuilder.CreateSphere("canopy", { diameter: 2.4, segments: 8 }, scene);
  canopy.position.y = 3.6;
  canopy.material = pbr(scene, {
    baseColor: hsl(leafHue, 0.6, 0.3),
    metallic: 0,
    roughness: 0.8,
  });
  canopy.parent = root;
  return root;
}

export function makeCrystal(scene: Scene, hue = 280): Mesh {
  const c = MeshBuilder.CreatePolyhedron("crystal", { type: 1, size: 1 }, scene);
  c.material = glow(scene, hsl(hue, 1, 0.55), 1.4);
  return c;
}

export function makeRock(scene: Scene, hue = 220): Mesh {
  const r = MeshBuilder.CreateSphere(
    "rock",
    { diameterX: 1.4, diameterY: 0.9, diameterZ: 1.2, segments: 6 },
    scene,
  );
  r.material = pbr(scene, {
    baseColor: hsl(hue, 0.15, 0.3),
    metallic: 0.05,
    roughness: 0.95,
  });
  return r;
}

export function makeMushroom(scene: Scene, capHue = 330): Mesh {
  const root = new Mesh("shroom", scene);
  const stem = MeshBuilder.CreateCylinder(
    "stem",
    { diameter: 0.35, height: 1.2, tessellation: 8 },
    scene,
  );
  stem.position.y = 0.6;
  stem.material = pbr(scene, {
    baseColor: hsl(40, 0.3, 0.75),
    metallic: 0,
    roughness: 0.7,
  });
  stem.parent = root;
  const cap = MeshBuilder.CreateSphere("cap", { diameter: 1.4, segments: 10, slice: 0.55 }, scene);
  cap.position.y = 1.3;
  cap.material = glow(scene, hsl(capHue, 0.85, 0.45), 0.6);
  cap.parent = root;
  return root;
}

export function placeRingCollectibles(
  api: WalkableSceneApi,
  opts: { count?: number; radius?: number; y?: number; hue?: number } = {},
) {
  const count = opts.count ?? 8;
  const radius = opts.radius ?? 18;
  const y = opts.y ?? 1.5;
  const positions: Vector3[] = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    positions.push(new Vector3(Math.cos(a) * radius, y, Math.sin(a) * radius));
  }
  const sys = createCollectibles(api.scene, positions, { hue: opts.hue ?? 50 });
  api.onDispose(() => sys.dispose());
  api.scene.onBeforeRenderObservable.add(() => {
    const dt = api.scene.getEngine().getDeltaTime() / 1000;
    sys.update(dt, api.getPlayerPosition());
  });
  return sys;
}

export function bindWalk(
  api: WalkableSceneApi,
  sample: (x: number, z: number) => number,
  waterY?: number | null,
) {
  api.setHeightSampler(sample);
  if (waterY != null) api.setWaterLevel(waterY);
}

export function sky(scene: Scene, r: number, g: number, b: number) {
  scene.clearColor = new Color4(r, g, b, 1);
}

/** Animate a list of meshes with a per-frame callback, auto-disposed. */
export function onTick(api: WalkableSceneApi, fn: (dt: number, t: number) => void) {
  let t = 0;
  const obs = api.scene.onBeforeRenderObservable.add(() => {
    const dt = api.scene.getEngine().getDeltaTime() / 1000;
    t += dt;
    fn(dt, t);
  });
  api.onDispose(() => api.scene.onBeforeRenderObservable.remove(obs));
}
