/**
 * Playable world registry — 20 walkable / swimmable worlds.
 *
 * Each entry pairs a route slug with metadata and a builder that materialises
 * the world inside a WalkableHost. The /play/$world route reads from here.
 */

import type { WalkableSceneApi } from "./WalkableHost";
import type { CinematicLevel } from "./vfx";
import type { WeatherKind } from "./lifeSystems";

import { buildGateway } from "./scenes/playable/gateway";
import { buildQuantumOceanSwim } from "./scenes/playable/quantumOceanSwim";
import { buildSpaceStation } from "./scenes/playable/spaceStation";
import { buildCrystalCavern } from "./scenes/playable/crystalCavern";
import { buildVolcanic } from "./scenes/playable/volcanic";
import { buildTundra } from "./scenes/playable/tundra";
import { buildMushroom } from "./scenes/playable/mushroom";
import { buildDunes } from "./scenes/playable/dunes";
import { buildFloatingIslands } from "./scenes/playable/floatingIslands";
import { buildCyberCity } from "./scenes/playable/cyberCity";
import { buildVoidSwim } from "./scenes/playable/voidSwim";
import { buildDeepReefSwim } from "./scenes/playable/deepReefSwim";
import { buildCavern } from "./scenes/playable/cavern";
import { buildSkyTemple } from "./scenes/playable/skyTemple";
import { buildLavaForge } from "./scenes/playable/lavaForge";
import { buildAurora } from "./scenes/playable/aurora";
import { buildToxicSwamp } from "./scenes/playable/toxicSwamp";
import { buildCrystalCathedral } from "./scenes/playable/crystalCathedral";
import { buildGlowForest } from "./scenes/playable/glowForest";
import { buildAsteroidFieldSwim } from "./scenes/playable/asteroidFieldSwim";

export type PlayableMode = "walk" | "swim" | "both";

export interface PlayableEntry {
  slug: string;
  title: string;
  blurb: string;
  hue: number;
  icon: string;
  mode: PlayableMode;
  category: "Gateway" | "Land" | "Sea" | "Sky" | "Void" | "Forge";
  builder: (api: WalkableSceneApi) => void;
  /** Host options overrides. */
  options: {
    cinematic?: CinematicLevel;
    dayNight?: boolean | { cycleSeconds?: number; phase?: number };
    weather?: WeatherKind;
    spawn?: [number, number, number];
    waterLevel?: number | null;
    eyeHeight?: number;
    showAvatar?: boolean;
  };
}

const e = (
  slug: string,
  title: string,
  blurb: string,
  hue: number,
  icon: string,
  mode: PlayableMode,
  category: PlayableEntry["category"],
  builder: PlayableEntry["builder"],
  options: PlayableEntry["options"] = {},
): PlayableEntry => ({ slug, title, blurb, hue, icon, mode, category, builder, options });

export const PLAYABLE_WORLDS: PlayableEntry[] = [
  e(
    "gateway",
    "Gateway",
    "Marble plaza of glowing portal arches — the walkable hub.",
    195,
    "🚪",
    "walk",
    "Gateway",
    buildGateway,
    { cinematic: "soft", dayNight: true, weather: "clear", spawn: [0, 2, 8] },
  ),
  e(
    "quantum-ocean",
    "Quantum Ocean",
    "Bioluminescent open water — Space up, Shift dive.",
    180,
    "🐋",
    "swim",
    "Sea",
    buildQuantumOceanSwim,
    { cinematic: "full", spawn: [0, 4, 0], waterLevel: 8 },
  ),
  e(
    "space-station",
    "Space Station",
    "Walk the ring habitat under a sea of stars.",
    210,
    "🛰️",
    "walk",
    "Void",
    buildSpaceStation,
    { cinematic: "soft", spawn: [0, 2, 10] },
  ),
  e(
    "crystal-cavern",
    "Crystal Cavern",
    "Underground forest of glowing crystal spires.",
    280,
    "💎",
    "walk",
    "Land",
    buildCrystalCavern,
    { cinematic: "soft", spawn: [0, 3, 0] },
  ),
  e(
    "volcanic",
    "Volcanic",
    "Ash plains, caldera rim, and a lake of lava.",
    15,
    "🌋",
    "walk",
    "Forge",
    buildVolcanic,
    { cinematic: "full", weather: "storm", spawn: [0, 4, 45] },
  ),
  e(
    "tundra",
    "Tundra",
    "Snow plains, ice spires, and a frozen lake.",
    200,
    "❄️",
    "walk",
    "Land",
    buildTundra,
    { cinematic: "soft", dayNight: true, weather: "snow", spawn: [0, 3, 0] },
  ),
  e(
    "mushroom",
    "Mushroom Grove",
    "Giant fungi forest drifting with spore motes.",
    320,
    "🍄",
    "walk",
    "Land",
    buildMushroom,
    { cinematic: "soft", dayNight: { cycleSeconds: 240, phase: 0.8 }, spawn: [0, 2, 0] },
  ),
  e(
    "dunes",
    "Dunes",
    "Rolling sand desert, oasis palms, distant pyramid.",
    40,
    "🏜️",
    "walk",
    "Land",
    buildDunes,
    { cinematic: "soft", dayNight: true, weather: "clear", spawn: [0, 4, 0] },
  ),
  e(
    "floating-islands",
    "Floating Islands",
    "Sky archipelago linked by bridges of light.",
    195,
    "🏝️",
    "walk",
    "Sky",
    buildFloatingIslands,
    { cinematic: "full", spawn: [0, 3, 0] },
  ),
  e(
    "cyber-city",
    "Cyber City",
    "Neon grid streets and towers that never sleep.",
    320,
    "🌃",
    "walk",
    "Forge",
    buildCyberCity,
    { cinematic: "full", spawn: [0, 2, 5] },
  ),
  e(
    "void",
    "The Void",
    "Zero-G star abyss — swim among floating platforms.",
    280,
    "🕳️",
    "swim",
    "Void",
    buildVoidSwim,
    { cinematic: "full", spawn: [0, 2, 12], waterLevel: 100 },
  ),
  e(
    "deep-reef",
    "Deep Reef",
    "Abyssal coral trench alive with fish schools.",
    160,
    "🪸",
    "swim",
    "Sea",
    buildDeepReefSwim,
    { cinematic: "full", spawn: [0, 2, 0], waterLevel: 5 },
  ),
  e(
    "cavern",
    "Cavern",
    "Limestone cave, torchlight, and a dark pool.",
    30,
    "🪨",
    "both",
    "Land",
    buildCavern,
    { cinematic: "soft", spawn: [0, 3, 0], waterLevel: -1 },
  ),
  e(
    "sky-temple",
    "Sky Temple",
    "Marble ruins floating above the clouds.",
    45,
    "🏛️",
    "walk",
    "Sky",
    buildSkyTemple,
    { cinematic: "soft", dayNight: true, spawn: [0, 2, 8] },
  ),
  e(
    "lava-forge",
    "Lava Forge",
    "Industrial foundry catwalks over a magma sea.",
    18,
    "⚒️",
    "walk",
    "Forge",
    buildLavaForge,
    { cinematic: "full", spawn: [0, 2, 10] },
  ),
  e(
    "aurora",
    "Aurora",
    "Northern lights over frozen hills and a lonely cabin.",
    140,
    "🌌",
    "walk",
    "Sky",
    buildAurora,
    {
      cinematic: "full",
      dayNight: { cycleSeconds: 300, phase: 0.85 },
      weather: "snow",
      spawn: [0, 3, 0],
    },
  ),
  e(
    "toxic-swamp",
    "Toxic Swamp",
    "Poisonous wetlands, bubbling pools, dead trees.",
    90,
    "☠️",
    "both",
    "Land",
    buildToxicSwamp,
    { cinematic: "soft", weather: "fog", spawn: [0, 2, 0], waterLevel: 0.3 },
  ),
  e(
    "crystal-cathedral",
    "Crystal Cathedral",
    "Soaring crystalline nave and a living altar.",
    290,
    "⛪",
    "walk",
    "Land",
    buildCrystalCathedral,
    { cinematic: "full", spawn: [0, 2, -20] },
  ),
  e(
    "glow-forest",
    "Glow Forest",
    "Bioluminescent woodland under a starlit canopy.",
    150,
    "🌲",
    "walk",
    "Land",
    buildGlowForest,
    { cinematic: "soft", dayNight: { cycleSeconds: 200, phase: 0.9 }, spawn: [0, 2, 0] },
  ),
  e(
    "asteroid-field",
    "Asteroid Field",
    "Zero-G rock field — swim the debris belt.",
    30,
    "☄️",
    "swim",
    "Void",
    buildAsteroidFieldSwim,
    { cinematic: "full", spawn: [0, 2, 15], waterLevel: 100 },
  ),
];

export function getPlayable(slug: string): PlayableEntry | undefined {
  return PLAYABLE_WORLDS.find((w) => w.slug === slug);
}

export const PLAYABLE_COUNT = PLAYABLE_WORLDS.length;
