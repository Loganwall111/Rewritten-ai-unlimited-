/**
 * Scene registry — the catalog of every Babylon cinematic scene.
 *
 * Each entry pairs a route slug with metadata (title, blurb, hue, icon) and a
 * builder function that materialises the scene inside a BabylonSceneHost. The
 * Scenes gallery + individual routes both read from here, so adding a world is
 * a one-line append.
 */

import type { BabylonSceneApi, BabylonSceneOptions } from "./BabylonSceneHost";
import { buildLanding } from "./scenes/landing";
import { buildAtrium } from "./scenes/atrium";
import { buildNebulaCathedral } from "./scenes/nebulaCathedral";
import { buildQuantumOcean } from "./scenes/quantumOcean";
import { buildBlackHole } from "./scenes/blackHole";
import { buildPlanets } from "./scenes/planets";
import { buildSpaceElevator } from "./scenes/spaceElevator";
import { buildMicro } from "./scenes/micro";
import { buildTimeTravel } from "./scenes/timeTravel";
import { buildVoxelAwakening } from "./scenes/voxelAwakening";
import { buildMemoryPalace } from "./scenes/memoryPalace";
import { buildCouncil } from "./scenes/council";
import { buildDNA } from "./scenes/dna";
import { buildDream } from "./scenes/dream";
import { buildEcosystem } from "./scenes/ecosystem";
import { buildDisasters } from "./scenes/disasters";
import { buildLifeSim } from "./scenes/lifeSim";
import { buildVR } from "./scenes/vr";
import { buildCollab } from "./scenes/collab";
import { buildStudio } from "./scenes/studio";
import { buildAvatar } from "./scenes/avatar";
import { buildPhysics } from "./scenes/physics";

export interface SceneEntry {
  slug: string;
  title: string;
  blurb: string;
  hue: number;
  icon: string;
  category: "Flagship" | "Cosmos" | "Nature" | "Mind" | "Worlds" | "Concept";
  builder: (api: BabylonSceneApi) => void;
  options: BabylonSceneOptions;
}

/** Shared cinematic post-processing preset. */
const FX: BabylonSceneOptions["postProcess"] = {
  bloom: true,
  bloomWeight: 0.85,
  bloomThreshold: 0.3,
  imageProcessing: true,
  exposure: 1.2,
  contrast: 1.25,
  vignette: true,
  vignetteWeight: 1.4,
  fxaa: true,
};

const NIGHT_FOG: NonNullable<BabylonSceneOptions["fog"]> = {
  mode: 2,
  density: 0.006,
  color: { r: 0.01, g: 0.01, b: 0.03 } as never,
};

const e = (
  slug: string,
  title: string,
  blurb: string,
  hue: number,
  icon: string,
  category: SceneEntry["category"],
  builder: SceneEntry["builder"],
  extra: Partial<BabylonSceneOptions> = {},
): SceneEntry => ({
  slug,
  title,
  blurb,
  hue,
  icon,
  category,
  builder,
  options: {
    postProcess: FX,
    camera: { autoRotate: true, lowerRadius: 8, upperRadius: 160, ...extra.camera },
    sun: { direction: [-0.5, -1, -0.7], intensity: 1.8, shadowMapSize: 2048, shadowFrustum: 60 },
    ...extra,
  },
});

export const SCENES: SceneEntry[] = [
  // Flagships
  e("landing", "Cosmic Gateway", "Glowing icosphere, orbital rings, 3,000-particle nebula.", 190, "🛸", "Flagship", buildLanding, { hdr: true }),
  e("atrium", "The Atrium", "12 doors · PBR marble · 24 columns · shadow-casting sun.", 195, "🏛️", "Flagship", buildAtrium, { hdr: true }),
  e("nebula-cathedral", "Nebula Cathedral", "6 concentric rings, singularity core, 5,000 particles.", 280, "🌌", "Flagship", buildNebulaCathedral, { hdr: true }),
  e("quantum-ocean", "Quantum Ocean", "Bioluminescent whale loop, jellyfish, coral reef.", 180, "🐋", "Flagship", buildQuantumOcean, { hdr: true, fog: NIGHT_FOG }),

  // Cosmos
  e("black-hole", "Singularity", "Accretion disk warping light around an event horizon.", 265, "🕳️", "Cosmos", buildBlackHole, { hdr: true }),
  e("planets", "Planetarium", "A system of PBR planets with atmospheres and rings.", 210, "🪐", "Cosmos", buildPlanets, { hdr: true }),
  e("space-elevator", "Space Elevator", "Climb a tether from surface to orbital station.", 200, "🛗", "Cosmos", buildSpaceElevator, { hdr: true }),

  // Nature / worlds
  e("micro", "Microscopic", "Shrink to a cell — floating organelles and molecular motes.", 150, "🔬", "Nature", buildMicro, { hdr: true, fog: NIGHT_FOG }),
  e("ecosystem", "Living Ecosystem", "Forest, water, weather and drifting life.", 140, "🌳", "Nature", buildEcosystem, { hdr: true }),
  e("disasters", "Force of Nature", "Storms, volcanoes, and shifting tectonics.", 15, "🌋", "Nature", buildDisasters, { hdr: true }),
  e("voxel-awakening", "Voxel Awakening", "A 31-dimension block world, reborn.", 90, "🧱", "Worlds", buildVoxelAwakening, { hdr: false }),

  // Mind
  e("time-travel", "Time Stream", "Epochs ripple outward through a chrono vortex.", 50, "⏳", "Mind", buildTimeTravel, { hdr: true }),
  e("memory-palace", "Memory Palace", "Rooms of light holding shimmering memories.", 300, "🧠", "Mind", buildMemoryPalace, { hdr: true }),
  e("council", "The Council", "Twelve glowing seats around a judgement dais.", 220, "⚖️", "Mind", buildCouncil, { hdr: true }),
  e("dna", "Helix", "A spiraling double helix of living code.", 320, "🧬", "Mind", buildDNA, { hdr: true }),
  e("dream", "Dreamscape", "Surreal floating islands under a morphing sky.", 270, "💭", "Mind", buildDream, { hdr: true }),

  // Concept
  e("life-sim", "Life Sim", "A miniature city breathing with tiny lives.", 200, "🏙️", "Concept", buildLifeSim, { hdr: true }),
  e("vr", "VR Chamber", "A neon grid room — you are now in VR.", 320, "🥽", "Concept", buildVR, { hdr: true }),
  e("collab", "Collab Space", "Shared cursors orbiting a living canvas.", 190, "🤝", "Concept", buildCollab, { hdr: true }),
  e("studio", "Studio", "A turntable sculpting a glowing form.", 280, "🎨", "Concept", buildStudio, { hdr: true }),
  e("avatar", "Avatar Chamber", "Customise your operator on a lit dais.", 195, "🧍", "Concept", buildAvatar, { hdr: true }),
  e("physics", "Physics Lab", "Havok gravity — a rain of bouncing crates & spheres.", 100, "🧲", "Concept", buildPhysics, { hdr: true }),
];

export function getScene(slug: string): SceneEntry | undefined {
  return SCENES.find((s) => s.slug === slug);
}

export const SCENE_COUNT = SCENES.length;
