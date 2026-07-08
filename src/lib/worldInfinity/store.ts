/**
 * Infinity world library store — localStorage-backed CRUD.
 *
 * Worlds are small JSON blobs (no terrain data is stored; everything is
 * reconstructed from the seed on demand), so the whole library persists
 * client-side without a backend. A versioned storage key makes future
 * migrations painless.
 */

import type { CreateWorldInput, InfinityWorld } from "./types";
import { createWorld, generateFeaturedSet, refreshFlavor } from "./generator";

const STORAGE_KEY = "rw.infinity.worlds.v1";
const SEEDED_FLAG = "rw.infinity.seeded.v1";

type Listener = () => void;
const listeners = new Set<Listener>();

function readRaw(): InfinityWorld[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as InfinityWorld[];
  } catch {
    return [];
  }
}

function writeRaw(worlds: InfinityWorld[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(worlds));
    listeners.forEach((l) => l());
  } catch {
    /* quota exceeded — silently ignore */
  }
}

/** Subscribe to library changes (used by React). Returns an unsubscribe fn. */
export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  // Cross-tab sync.
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) listener();
  };
  if (typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
  }
  return () => {
    listeners.delete(listener);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage);
    }
  };
}

/** All worlds, favourites + recently-visited first. */
export function listWorlds(): InfinityWorld[] {
  return readRaw().sort(sortWorlds);
}

function sortWorlds(a: InfinityWorld, b: InfinityWorld): number {
  if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
  const av = a.lastVisited ?? a.createdAt;
  const bv = b.lastVisited ?? b.createdAt;
  return bv - av;
}

export function getWorld(id: string): InfinityWorld | undefined {
  return readRaw().find((w) => w.id === id);
}

export function createAndSave(input: CreateWorldInput): InfinityWorld {
  const world = createWorld(input);
  const worlds = readRaw();
  worlds.unshift(world);
  writeRaw(worlds);
  return world;
}

export function deleteWorld(id: string): void {
  writeRaw(readRaw().filter((w) => w.id !== id));
}

export function toggleFavorite(id: string): void {
  writeRaw(readRaw().map((w) => (w.id === id ? { ...w, favorite: !w.favorite } : w)));
}

export function setRating(id: string, rating: number): void {
  writeRaw(
    readRaw().map((w) => (w.id === id ? { ...w, rating: Math.max(0, Math.min(5, rating)) } : w)),
  );
}

export function setNotes(id: string, notes: string): void {
  writeRaw(readRaw().map((w) => (w.id === id ? { ...w, notes } : w)));
}

/** Mark a landmark as discovered (idempotent). */
export function discoverLandmark(id: string, landmarkId: string): void {
  const worlds = readRaw();
  const idx = worlds.findIndex((w) => w.id === id);
  if (idx < 0) return;
  const w = worlds[idx];
  const discovered = w.discovered ?? [];
  if (discovered.includes(landmarkId)) return;
  discovered.push(landmarkId);
  worlds[idx] = { ...w, discovered };
  writeRaw(worlds);
}

export function renameWorld(id: string, name: string): void {
  writeRaw(readRaw().map((w) => (w.id === id ? { ...w, name: name.trim() || w.name } : w)));
}

export function recordVisit(id: string): void {
  writeRaw(
    readRaw().map((w) =>
      w.id === id ? { ...w, visits: w.visits + 1, lastVisited: Date.now() } : w,
    ),
  );
}

/** Re-roll a world's seed → new terrain, keep its archetype/name slot. */
export function rerollSeed(id: string, seed: string): InfinityWorld | undefined {
  let updated: InfinityWorld | undefined;
  writeRaw(
    readRaw().map((w) => {
      if (w.id !== id) return w;
      updated = refreshFlavor({ ...w, seed: seed.trim() || w.seed });
      return updated;
    }),
  );
  return updated;
}

export function countWorlds(): number {
  return readRaw().length;
}

/** On first ever load, seed the library with a few featured worlds. */
export function ensureSeeded(featuredCount = 6): void {
  if (typeof localStorage === "undefined") return;
  if (localStorage.getItem(SEEDED_FLAG)) return;
  if (readRaw().length === 0) {
    writeRaw(generateFeaturedSet(featuredCount));
  }
  localStorage.setItem(SEEDED_FLAG, "1");
}

/** Replace the entire library (used by import/export). */
export function replaceAll(worlds: InfinityWorld[]): void {
  writeRaw(worlds);
}

export function exportLibrary(): string {
  return JSON.stringify(readRaw(), null, 2);
}
