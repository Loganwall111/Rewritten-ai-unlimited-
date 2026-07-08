/**
 * 2D value-noise + fractal Brownian motion, seeded.
 *
 * Used by the World Infinity engine to generate terrain height fields and
 * prop scatter maps that are 100% reproducible from a world's seed.
 *
 * We hash integer lattice points with the seed and bilinearly interpolate
 * with a smoothstep fade — cheap, branchless, and free of the directional
 * artifacts you get from naively summing sines.
 */

import { Rng } from "./rng";

const FADE = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

/** Build a hash-based gradient lookup seeded by `seed`. */
function makeHasher(seed: number): (x: number, y: number) => number {
  // Two xorshift-style state words derived from the seed.
  const s1 = seed >>> 0 || 0x9e3779b9;
  const s2 = Math.imul(seed ^ 0x85ebca6b, 0xc2b2ae35) >>> 0;
  const rotL = (v: number, n: number) => (v << n) | (v >>> (32 - n));
  return (x: number, y: number): number => {
    let h = Math.imul(x | 0, 0x27d4eb2d);
    h = Math.imul(h ^ (y | 0), 0x85ebca77);
    h ^= h >>> 13;
    let a = (s1 + Math.imul(h, 0x9e3779b1)) >>> 0;
    let b = (s2 ^ rotL(a, 7)) >>> 0;
    a = (a ^ rotL(b, 9)) >>> 0;
    b = (b + a) >>> 0;
    // map to [-1, 1)
    return (b >>> 8) / 8388607 - 1;
  };
}

export class ValueNoise {
  private hash: (x: number, y: number) => number;
  constructor(seed: number | string) {
    const s = typeof seed === "string" ? hashStr(seed) : seed >>> 0;
    this.hash = makeHasher(s);
  }

  /** Single-octave value noise in [-1, 1]. */
  noise2D(x: number, y: number): number {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const fx = FADE(x - x0);
    const fy = FADE(y - y0);
    const v00 = this.hash(x0, y0);
    const v10 = this.hash(x0 + 1, y0);
    const v01 = this.hash(x0, y0 + 1);
    const v11 = this.hash(x0 + 1, y0 + 1);
    const a = v00 + (v10 - v00) * fx;
    const b = v01 + (v11 - v01) * fx;
    return a + (b - a) * fy;
  }

  /** Fractal Brownian motion — sum of octaves. Returns roughly [-1, 1]. */
  fbm(
    x: number,
    y: number,
    opts: { octaves?: number; lacunarity?: number; gain?: number; frequency?: number } = {},
  ): number {
    const octaves = opts.octaves ?? 4;
    const lacunarity = opts.lacunarity ?? 2.0;
    const gain = opts.gain ?? 0.5;
    let freq = opts.frequency ?? 1.0;
    let amp = 1.0;
    let sum = 0;
    let norm = 0;
    for (let o = 0; o < octaves; o++) {
      sum += amp * this.noise2D(x * freq, y * freq);
      norm += amp;
      amp *= gain;
      freq *= lacunarity;
    }
    return sum / norm;
  }

  /** Ridged multifractal — sharp ridgelines, great for mountains/canyons. */
  ridged(x: number, y: number, octaves = 4): number {
    let freq = 1.0;
    let amp = 0.5;
    let sum = 0;
    let prev = 1;
    for (let o = 0; o < octaves; o++) {
      const n = 1 - Math.abs(this.noise2D(x * freq, y * freq));
      const v = n * n * prev;
      sum += v * amp;
      prev = v;
      freq *= 2;
      amp *= 0.5;
    }
    return Math.min(1, sum);
  }
}

function hashStr(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** A 2D scatter grid for deterministic prop placement using a hashed stride. */
export class ScatterGrid {
  private rng: Rng;
  private stride: number;
  constructor(seed: number | string, stride: number) {
    this.rng = new Rng(typeof seed === "string" ? seed : `grid-${seed}`);
    this.stride = stride;
  }

  /**
   * Visit every cell within the radius. `stride` controls grid density.
   * The callback gets (x, z, jitterX, jitterZ, density01) and returns false to
   * skip placing a prop at that cell.
   */
  forEach(radius: number, visit: (x: number, z: number, density: number) => boolean | void): void {
    const s = this.stride;
    const cells = Math.ceil(radius / s) + 1;
    for (let iz = -cells; iz <= cells; iz++) {
      for (let ix = -cells; ix <= cells; ix++) {
        const cx = ix * s + this.rng.range(-s * 0.45, s * 0.45);
        const cz = iz * s + this.rng.range(-s * 0.45, s * 0.45);
        if (Math.hypot(cx, cz) > radius) continue;
        const d = this.rng.float();
        if (!visit(cx, cz, d)) {
          /* skip */
        }
      }
    }
  }
}
