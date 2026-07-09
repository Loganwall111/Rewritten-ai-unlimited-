/**
 * 3rd-person character body — head, torso, swinging arms & legs — parented
 * under a root that follows the FreeCamera as a chase / body-cam avatar.
 *
 * Recolourable via setColors(). Used by WalkableHost and CharacterCreator.
 */

import {
  Scene,
  Color3,
  Vector3,
  MeshBuilder,
  Mesh,
  StandardMaterial,
  TransformNode,
  PBRMetallicRoughnessMaterial,
} from "@babylonjs/core";
import { pbr, glow, hsl } from "./graphics";

export interface AvatarColors {
  body: Color3;
  accent: Color3;
}

export interface AvatarArchetype {
  id: string;
  label: string;
  /** Relative scale of limbs / torso. */
  build: "slim" | "balanced" | "stocky";
  /** Emissive eye hue. */
  eyeHue: number;
}

export const ARCHETYPES: AvatarArchetype[] = [
  { id: "explorer", label: "Explorer", build: "balanced", eyeHue: 190 },
  { id: "scholar", label: "Scholar", build: "slim", eyeHue: 280 },
  { id: "forge", label: "Forgehand", build: "stocky", eyeHue: 30 },
  { id: "diver", label: "Diver", build: "balanced", eyeHue: 170 },
  { id: "voidwalker", label: "Voidwalker", build: "slim", eyeHue: 300 },
];

export const DEFAULT_AVATAR_COLORS: AvatarColors = {
  body: hsl(195, 0.65, 0.5),
  accent: hsl(280, 0.9, 0.55),
};

export const AVATAR_STORAGE_KEY = "rewritten.avatar.v1";

export interface SavedAvatar {
  bodyHex: string;
  accentHex: string;
  archetypeId: string;
  name?: string;
}

export function loadSavedAvatar(): SavedAvatar | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(AVATAR_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SavedAvatar;
  } catch {
    return null;
  }
}

export function saveAvatar(data: SavedAvatar): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(AVATAR_STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* quota / private mode */
  }
}

export function color3ToHex(c: Color3): string {
  const to = (v: number) =>
    Math.round(Math.max(0, Math.min(1, v)) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${to(c.r)}${to(c.g)}${to(c.b)}`;
}

export function hexToColor3(hex: string): Color3 {
  try {
    return Color3.FromHexString(hex.startsWith("#") ? hex : `#${hex}`);
  } catch {
    return DEFAULT_AVATAR_COLORS.body.clone();
  }
}

export interface AvatarInstance {
  root: TransformNode;
  /** Apply body + accent colours. */
  setColors: (colors: AvatarColors) => void;
  setArchetype: (a: AvatarArchetype) => void;
  /** Drive walk / swim animation. speed 0–1, swimming toggles buoyant motion. */
  update: (dt: number, speed: number, swimming?: boolean) => void;
  dispose: () => void;
}

const BUILD: Record<AvatarArchetype["build"], { torso: number; limb: number; head: number }> = {
  slim: { torso: 0.85, limb: 0.85, head: 0.95 },
  balanced: { torso: 1, limb: 1, head: 1 },
  stocky: { torso: 1.2, limb: 1.15, head: 1.05 },
};

/**
 * Build a stylised humanoid parented to `parent` (or free-standing if omitted).
 * Local origin is at the feet; head is ~1.8 units up.
 */
export function createAvatar(
  scene: Scene,
  opts: {
    /** Parent node — TransformNode, Mesh, or Camera (FreeCamera is a Node). */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    parent?: TransformNode | Mesh | { position: Vector3; [key: string]: any };
    colors?: AvatarColors;
    archetype?: AvatarArchetype;
    /** Offset so the body sits below a FreeCamera eye height. */
    cameraOffset?: Vector3;
  } = {},
): AvatarInstance {
  const colors = opts.colors ?? { ...DEFAULT_AVATAR_COLORS };
  const archetype = opts.archetype ?? ARCHETYPES[0];
  const build = BUILD[archetype.build];

  const root = new TransformNode("avatarRoot", scene);
  if (opts.parent) {
    // Cameras are Nodes and accept children via the parent setter.
    root.parent = opts.parent as TransformNode;
  }
  if (opts.cameraOffset) root.position.copyFrom(opts.cameraOffset);

  // Body material (PBR, recolourable).
  const bodyMat = pbr(scene, {
    baseColor: colors.body,
    metallic: 0.45,
    roughness: 0.4,
    emissive: colors.body.scale(0.15),
  });
  const accentMat = pbr(scene, {
    baseColor: colors.accent,
    metallic: 0.8,
    roughness: 0.25,
    emissive: colors.accent.scale(0.5),
  });
  const eyeMat = glow(scene, hsl(archetype.eyeHue, 1, 0.75), 2.5);

  // --- Parts (Y-up, feet at 0) ---
  // Torso
  const torso = MeshBuilder.CreateCapsule(
    "torso",
    { height: 0.7 * build.torso, radius: 0.22 * build.torso, tessellation: 10 },
    scene,
  );
  torso.position.y = 1.15;
  torso.material = bodyMat;
  torso.parent = root;

  // Head
  const head = MeshBuilder.CreateSphere(
    "head",
    { diameter: 0.36 * build.head, segments: 14 },
    scene,
  );
  head.position.y = 1.62;
  head.material = bodyMat;
  head.parent = root;

  // Eyes
  for (const sx of [-1, 1] as const) {
    const eye = MeshBuilder.CreateSphere(`eye${sx}`, { diameter: 0.07, segments: 6 }, scene);
    eye.position.set(sx * 0.08, 1.65, 0.15);
    eye.material = eyeMat;
    eye.parent = root;
  }

  // Accent chest gem
  const gem = MeshBuilder.CreateIcoSphere("gem", { radius: 0.07, subdivisions: 1 }, scene);
  gem.position.set(0, 1.25, 0.2);
  gem.material = accentMat;
  gem.parent = root;

  // Arms — pivot at shoulder
  const armL = new TransformNode("armL", scene);
  armL.parent = root;
  armL.position.set(-0.32 * build.torso, 1.35, 0);
  const armLMesh = MeshBuilder.CreateCapsule(
    "armLMesh",
    { height: 0.55 * build.limb, radius: 0.07 * build.limb, tessellation: 8 },
    scene,
  );
  armLMesh.position.y = -0.28 * build.limb;
  armLMesh.material = bodyMat;
  armLMesh.parent = armL;

  const armR = new TransformNode("armR", scene);
  armR.parent = root;
  armR.position.set(0.32 * build.torso, 1.35, 0);
  const armRMesh = MeshBuilder.CreateCapsule(
    "armRMesh",
    { height: 0.55 * build.limb, radius: 0.07 * build.limb, tessellation: 8 },
    scene,
  );
  armRMesh.position.y = -0.28 * build.limb;
  armRMesh.material = bodyMat;
  armRMesh.parent = armR;

  // Legs — pivot at hip
  const legL = new TransformNode("legL", scene);
  legL.parent = root;
  legL.position.set(-0.12, 0.85, 0);
  const legLMesh = MeshBuilder.CreateCapsule(
    "legLMesh",
    { height: 0.7 * build.limb, radius: 0.09 * build.limb, tessellation: 8 },
    scene,
  );
  legLMesh.position.y = -0.35 * build.limb;
  legLMesh.material = bodyMat;
  legLMesh.parent = legL;

  const legR = new TransformNode("legR", scene);
  legR.parent = root;
  legR.position.set(0.12, 0.85, 0);
  const legRMesh = MeshBuilder.CreateCapsule(
    "legRMesh",
    { height: 0.7 * build.limb, radius: 0.09 * build.limb, tessellation: 8 },
    scene,
  );
  legRMesh.position.y = -0.35 * build.limb;
  legRMesh.material = bodyMat;
  legRMesh.parent = legR;

  // Accent wrist bands
  for (const arm of [armL, armR]) {
    const band = MeshBuilder.CreateTorus(
      "band",
      { diameter: 0.16 * build.limb, thickness: 0.025, tessellation: 12 },
      scene,
    );
    band.rotation.x = Math.PI / 2;
    band.position.y = -0.5 * build.limb;
    band.material = accentMat;
    band.parent = arm;
  }

  let animT = 0;
  let currentArch = archetype;

  const setColors = (c: AvatarColors) => {
    colors.body = c.body;
    colors.accent = c.accent;
    bodyMat.baseColor = c.body;
    bodyMat.emissiveColor = c.body.scale(0.15);
    accentMat.baseColor = c.accent;
    accentMat.emissiveColor = c.accent.scale(0.5);
  };

  const setArchetype = (a: AvatarArchetype) => {
    currentArch = a;
    const b = BUILD[a.build];
    torso.scaling.setAll(b.torso);
    head.scaling.setAll(b.head);
    armL.scaling.setAll(b.limb);
    armR.scaling.setAll(b.limb);
    legL.scaling.setAll(b.limb);
    legR.scaling.setAll(b.limb);
    (eyeMat as StandardMaterial).emissiveColor = hsl(a.eyeHue, 1, 0.75).scale(2.5);
  };

  const update = (dt: number, speed: number, swimming = false) => {
    animT += dt * (swimming ? 4 : 8) * Math.max(0.15, speed);
    const swing = Math.sin(animT) * (swimming ? 0.55 : 0.7) * Math.min(1, speed * 1.4);
    const swingOpp = -swing;

    if (swimming) {
      // Breaststroke-ish: arms sweep, legs kick gently.
      armL.rotation.x = swing * 0.8 - 0.6;
      armR.rotation.x = swingOpp * 0.8 - 0.6;
      armL.rotation.z = 0.4 + Math.sin(animT) * 0.2;
      armR.rotation.z = -0.4 - Math.sin(animT) * 0.2;
      legL.rotation.x = Math.sin(animT * 0.8) * 0.35;
      legR.rotation.x = -Math.sin(animT * 0.8) * 0.35;
      root.rotation.x = -0.25; // lean forward in water
    } else {
      armL.rotation.x = swing;
      armR.rotation.x = swingOpp;
      armL.rotation.z = 0.08;
      armR.rotation.z = -0.08;
      legL.rotation.x = swingOpp * 0.9;
      legR.rotation.x = swing * 0.9;
      root.rotation.x = 0;
      // Idle breath.
      if (speed < 0.05) {
        torso.position.y = 1.15 + Math.sin(animT * 0.4) * 0.015;
      } else {
        torso.position.y = 1.15;
      }
    }
    void currentArch;
  };

  // Apply initial archetype scaling.
  setArchetype(archetype);

  return {
    root,
    setColors,
    setArchetype,
    update,
    dispose: () => root.dispose(),
  };
}

/**
 * Standalone preview avatar (no camera parent) for the CharacterCreator turntable.
 */
export function createPreviewAvatar(
  scene: Scene,
  colors?: AvatarColors,
  archetype?: AvatarArchetype,
): AvatarInstance {
  return createAvatar(scene, { colors, archetype });
}

void PBRMetallicRoughnessMaterial;
void Vector3;
