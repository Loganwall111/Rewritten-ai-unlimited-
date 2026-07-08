/**
 * Landmarks — discoverable points of interest seeded into every world.
 *
 * Each world hides a handful of glowing landmarks (shrines, obelisks, gates,
 * crystal hearts) at deterministic positions. Walking within range
 * "discovers" them, which is recorded on the world and surfaced as a
 * completion counter. Gives exploration a real sense of purpose.
 */

import type { ArchetypeDef } from "./types";
import { Rng } from "./rng";
import { heightAt } from "./generator";

export type LandmarkKind = "shrine" | "obelisk" | "gate" | "crystal" | "tower" | "monolith";

export interface Landmark {
  id: string;
  name: string;
  kind: LandmarkKind;
  x: number;
  z: number;
  /** Hue of the beacon glow. */
  hue: number;
  /** Discovery radius (world units). */
  radius: number;
}

const NAME_PARTS: Record<LandmarkKind, { adj: readonly string[]; noun: readonly string[] }> = {
  shrine: {
    adj: ["Whispering", "Sunken", "Forgotten", "Radiant", "Silent"],
    noun: ["Shrine", "Temple", "Sanctum", "Altar", "Chapel"],
  },
  obelisk: {
    adj: ["Leaning", "Fractured", "Humming", "Towering", "Nameless"],
    noun: ["Obelisk", "Spire", "Pillar", "Monolith", "Stele"],
  },
  gate: {
    adj: ["Shattered", "Hidden", "Iridescent", "Broken", "Veiled"],
    noun: ["Gate", "Portal", "Arch", "Threshold", "Door"],
  },
  crystal: {
    adj: ["Beating", "Frozen", "Prismatic", "Pulsing", "Living"],
    noun: ["Heart", "Crystal", "Geode", "Core", "Lens"],
  },
  tower: {
    adj: ["Tilted", "Hollow", "Luminous", "Crumbling", "Endless"],
    noun: ["Tower", "Spire", "Watch", "Beacon", "Lighthouse"],
  },
  monolith: {
    adj: ["Singing", "Ancient", "Obsidian", "Drifting", "Watcher"],
    noun: ["Monolith", "Sentinel", "Eye", "Keeper", "Mark"],
  },
};

const KINDS: LandmarkKind[] = ["shrine", "obelisk", "gate", "crystal", "tower", "monolith"];

/** Deterministic landmark set for a world — always the same for a seed. */
export function generateLandmarks(archetype: ArchetypeDef, seed: string, count = 5): Landmark[] {
  const rng = new Rng(`${seed}::landmarks`);
  const n = Math.max(3, Math.min(6, count));
  const out: Landmark[] = [];
  const usedKinds = new Set<LandmarkKind>();

  for (let i = 0; i < n; i++) {
    // Spread landmarks around the world at increasing radii + golden-angle spacing.
    const angle = i * 2.39996 + rng.range(-0.4, 0.4);
    const radius = 28 + i * 12 + rng.range(-6, 6);
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    // Make sure the landmark sits on top of its terrain spot.
    void heightAt(archetype, seed, x, z);

    let kind = rng.pick(KINDS);
    // Prefer unique kinds until we run out.
    if (usedKinds.size < KINDS.length) {
      while (usedKinds.has(kind)) kind = rng.pick(KINDS);
      usedKinds.add(kind);
    }

    const parts = NAME_PARTS[kind];
    const name = `The ${rng.pick(parts.adj)} ${rng.pick(parts.noun)}`;

    out.push({
      id: `lm_${i}`,
      name,
      kind,
      x,
      z,
      hue: (archetype.hue + rng.range(-30, 30) + 360) % 360,
      radius: 6,
    });
  }
  return out;
}
