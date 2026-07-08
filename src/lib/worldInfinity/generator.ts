/**
 * World generator — turns a seed + archetype into a fully-realised WorldSpec.
 *
 * Everything procedural (terrain heights, prop placement, palette) flows from
 * here and is 100% reproducible from the world's seed string.
 */

import { ARCHETYPES } from "./biomes";
import type { ArchetypeDef, CreateWorldInput, InfinityWorld, WorldSpec } from "./types";
import { ValueNoise } from "./noise";
import { Rng, randomSeedString, stringToSeed } from "./rng";
import { generateBlurb, generateWorldName } from "./names";

/** Cache noise instances per seed so terrain queries stay cheap across frames. */
const noiseCache = new Map<string, ValueNoise>();

/** Get the shared ValueNoise for a world's terrain field. */
export function worldNoise(seed: string): ValueNoise {
  let n = noiseCache.get(seed);
  if (!n) {
    n = new ValueNoise(`terrain::${seed}`);
    noiseCache.set(seed, n);
  }
  return n;
}

/** Terrain height at a world-space (x, z). Pure & deterministic. */
export function heightAt(archetype: ArchetypeDef, seed: string, x: number, z: number): number {
  const t = archetype.terrain;
  const noise = worldNoise(seed);
  // A gentle radial falloff so the world feels like an island, not an infinite plane.
  const dist = Math.hypot(x, z) / 120;
  const falloff = Math.max(0, 1 - dist * dist * 0.6);
  const base = t.ridged
    ? noise.ridged(x * t.frequency, z * t.frequency, t.octaves)
    : noise.fbm(x * t.frequency, z * t.frequency, {
        octaves: t.octaves,
        frequency: 1,
      });
  // base is roughly [-1,1]; map to [0, heightScale] then apply falloff.
  const h = (base * 0.5 + 0.5) * t.heightScale * falloff;
  // If there's a water level, don't let terrain dip below it by more than a little.
  if (t.waterLevel != null) {
    return Math.max(h, t.waterLevel - 1.5);
  }
  return Math.max(h, 0);
}

/** Assemble a full WorldSpec (palette + archetype) from a saved world. */
export function buildSpec(world: InfinityWorld): WorldSpec {
  return {
    world,
    archetype: ARCHETYPES[world.archetype],
    propSeed: `${world.seed}::props`,
  };
}

/** Create a brand-new saved world from wizard input. */
export function createWorld(input: CreateWorldInput): InfinityWorld {
  const archetype = ARCHETYPES[input.archetype];
  const seed = input.seed?.trim() || randomSeedString();
  const name = input.name?.trim() || generateWorldName(archetype, seed);
  const blurb = generateBlurb(archetype, seed);
  const now = Date.now();
  return {
    id: makeId(seed, now),
    name,
    blurb,
    archetype: input.archetype,
    seed,
    hue: archetype.hue,
    timeOfDay: input.timeOfDay,
    createdAt: now,
    lastVisited: null,
    visits: 0,
    rating: 0,
    notes: "",
    favorite: false,
    discovered: [],
  };
}

/** Re-derive a world's name/blurb from its seed (used by "reroll" / seed-share). */
export function refreshFlavor(world: InfinityWorld): InfinityWorld {
  const archetype = ARCHETYPES[world.archetype];
  return {
    ...world,
    name: generateWorldName(archetype, world.seed),
    blurb: generateBlurb(archetype, world.seed),
  };
}

/** Deterministic-ish id from seed + time + a few random bytes. */
function makeId(seed: string, now: number): string {
  const rng = new Rng(stringToSeed(seed) ^ now);
  const rand = rng.int(0, 0xffffffff).toString(36);
  return `w_${now.toString(36)}_${rand}`;
}

/** Generate N fully-random "featured" worlds for a first-run library seed. */
export function generateFeaturedSet(n: number): InfinityWorld[] {
  const ids = Object.keys(ARCHETYPES) as InfinityWorld["archetype"][];
  const out: InfinityWorld[] = [];
  const tod: InfinityWorld["timeOfDay"][] = ["dawn", "noon", "dusk", "night"];
  for (let i = 0; i < n; i++) {
    const a = ids[i % ids.length];
    const w = createWorld({
      archetype: a,
      timeOfDay: tod[i % tod.length],
      seed: randomSeedString(new Rng(i * 9973 + 7)),
    });
    w.favorite = i < 3;
    out.push(w);
  }
  return out;
}
