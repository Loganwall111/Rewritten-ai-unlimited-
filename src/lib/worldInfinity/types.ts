/**
 * Core type definitions for the Rewritten World Infinity engine.
 *
 * A "world" is a fully-reproducible procedural scene: its seed + archetype
 * determine terrain, palette, props, sky, and atmosphere. Anything derived
 * (visits, favorites, notes) is state layered on top.
 */

export type ArchetypeId =
  | "verdant"
  | "crystal"
  | "volcanic"
  | "tundra"
  | "xenoflora"
  | "dunes"
  | "islands"
  | "reef"
  | "cyber"
  | "nebula"
  | "mushroom"
  | "savannah";

export type TimeOfDay = "dawn" | "noon" | "dusk" | "night";

/** A saved, reproducible world. */
export interface InfinityWorld {
  /** Stable unique id (used as React key + storage key). */
  id: string;
  /** Display name (procedurally generated unless user-named). */
  name: string;
  /** One-line evocative description. */
  blurb: string;
  /** Generator archetype. */
  archetype: ArchetypeId;
  /** Seed string — the source of truth for all procedural output. */
  seed: string;
  /** Numeric hue (0-360) used for the portal orb color. */
  hue: number;
  /** Time of day baked into this world. */
  timeOfDay: TimeOfDay;
  /** Epoch ms when the world was first created. */
  createdAt: number;
  /** Epoch ms of last visit. */
  lastVisited: number | null;
  /** Number of times the explorer has been entered. */
  visits: number;
  /** Star rating the operator gave it (0 = unrated). */
  rating: number;
  /** Free-text notes the operator attached. */
  notes: string;
  /** Pinned to the top of the library. */
  favorite: boolean;
  /** IDs of landmarks the operator has discovered while exploring. */
  discovered: string[];
}

/** Everything needed to render + reason about a world, derived from its seed. */
export interface WorldSpec {
  world: InfinityWorld;
  archetype: ArchetypeDef;
  /** Seeded RNG for prop scattering. */
  propSeed: string;
}

export interface ArchetypeDef {
  id: ArchetypeId;
  label: string;
  tagline: string;
  /** Primary accent hue (portal color). */
  hue: number;
  palette: {
    skyTop: string;
    skyBottom: string;
    sun: string;
    fog: string;
    fogDensity: number;
    ground: string;
    groundAccent: string;
    water: string;
    foliage: string;
    emissive: string;
  };
  terrain: {
    /** Vertical amplitude of the height field. */
    heightScale: number;
    /** Noise frequency — higher = more jagged. */
    frequency: number;
    /** fBm octaves. */
    octaves: number;
    /** Use ridged (mountainous) noise. */
    ridged: boolean;
    /** Y of the water plane, or null for no water. */
    waterLevel: number | null;
  };
  /** Which prop kinds spawn, with relative weights. */
  props: ReadonlyArray<readonly [PropKind, number]>;
  /** Ambient particle field. */
  particles: ParticleKind;
  /** Procedural-name syllable banks. */
  names: { prefixes: readonly string[]; roots: readonly string[]; suffixes: readonly string[] };
}

export type PropKind =
  | "pine"
  | "broadleaf"
  | "crystal"
  | "rock"
  | "mushroom"
  | "pillar"
  | "tower"
  | "cactus"
  | "coral"
  | "iceberg"
  | "lava"
  | "arch"
  | "monolith"
  | "geyser"
  | "neonTree";

export type ParticleKind =
  | "pollen"
  | "embers"
  | "snow"
  | "spores"
  | "dust"
  | "bubbles"
  | "rain"
  | "data"
  | "stardust"
  | "leaves";

/** Payload for the create-world wizard. */
export interface CreateWorldInput {
  name?: string;
  archetype: ArchetypeId;
  timeOfDay: TimeOfDay;
  seed?: string;
}

export const ARCHETYPE_ORDER: ArchetypeId[] = [
  "verdant",
  "crystal",
  "volcanic",
  "tundra",
  "xenoflora",
  "dunes",
  "islands",
  "reef",
  "cyber",
  "nebula",
  "mushroom",
  "savannah",
];
