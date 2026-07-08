/**
 * Seeded pseudo-random number generator utilities for the
 * Rewritten World Infinity engine.
 *
 * Determinism is the whole point: a world's `seed` string always produces the
 * exact same terrain, props, palette, and name, so worlds are shareable and
 * reproducible. We use mulberry32 — tiny, fast, and good enough for procedural
 * scenery (it passes PractRand to 256GB+ with no anomalies).
 */

/** FNV-1a / xmur3 hybrid — turn any string into a 32-bit unsigned seed. */
export function stringToSeed(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

/** Mulberry32 PRNG factory. Returns a function producing floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A small stateful RNG object with the helpers procedural code actually needs. */
export class Rng {
  private next: () => number;
  constructor(seed: number | string) {
    const s = typeof seed === "string" ? stringToSeed(seed) : seed >>> 0;
    this.next = mulberry32(s || 1);
  }

  /** Float in [0, 1). */
  float(): number {
    return this.next();
  }
  /** Float in [min, max). */
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
  /** Integer in [min, max] inclusive. */
  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }
  /** True with probability p (0..1). */
  chance(p: number): boolean {
    return this.next() < p;
  }
  /** Pick a random element. */
  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
  /** Pick a weighted element — entries are [value, weight]. */
  weighted<T>(entries: ReadonlyArray<readonly [T, number]>): T {
    let total = 0;
    for (const [, w] of entries) total += w;
    let r = this.next() * total;
    for (const [v, w] of entries) {
      r -= w;
      if (r <= 0) return v;
    }
    return entries[entries.length - 1][0];
  }
  /** Fisher–Yates shuffle (returns a new array). */
  shuffle<T>(arr: readonly T[]): T[] {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }
  /** A fresh independent sub-generator derived from a label. */
  fork(label: string): Rng {
    const mixed = (this.int(0, 0xffffffff) ^ stringToSeed(label)) >>> 0;
    return new Rng(mixed);
  }
}

/** Generate a short, human-friendly random seed string (e.g. "k7f3-q9a2"). */
export function randomSeedString(
  rng: Rng = new Rng(Math.floor(Math.random() * 0xffffffff)),
): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789"; // no ambiguous chars
  const part = () =>
    Array.from({ length: 4 }, () => alphabet[rng.int(0, alphabet.length - 1)]).join("");
  return `${part()}-${part()}`;
}
