/**
 * React bindings for the Infinity world library store.
 *
 * `useInfinityWorlds()` keeps a component in sync with localStorage and
 * re-renders on any mutation (create / delete / visit / favorite …), including
 * changes made in other tabs.
 */

import { useCallback, useEffect, useSyncExternalStore } from "react";
import {
  countWorlds,
  createAndSave,
  deleteWorld,
  discoverLandmark,
  ensureSeeded,
  exportLibrary,
  getWorld,
  listWorlds,
  recordVisit,
  renameWorld,
  rerollSeed,
  setNotes,
  setRating,
  subscribe,
  toggleFavorite,
} from "./store";
import type { CreateWorldInput, InfinityWorld } from "./types";

function snapshot(): InfinityWorld[] {
  return listWorlds();
}

export function useInfinityWorlds() {
  const worlds = useSyncExternalStore(subscribe, snapshot, snapshot);

  // Make sure first-run visitors see a populated library.
  if (typeof window !== "undefined") ensureSeeded();

  const create = useCallback((input: CreateWorldInput) => createAndSave(input), []);
  const remove = useCallback((id: string) => deleteWorld(id), []);
  const favorite = useCallback((id: string) => toggleFavorite(id), []);
  const rate = useCallback((id: string, r: number) => setRating(id, r), []);
  const notes = useCallback((id: string, n: string) => setNotes(id, n), []);
  const rename = useCallback((id: string, n: string) => renameWorld(id, n), []);
  const visit = useCallback((id: string) => recordVisit(id), []);
  const reroll = useCallback((id: string, seed: string) => rerollSeed(id, seed), []);
  const discover = useCallback((id: string, lm: string) => discoverLandmark(id, lm), []);

  return {
    worlds,
    count: worlds.length,
    create,
    remove,
    favorite,
    rate,
    notes,
    rename,
    visit,
    reroll,
    discover,
    get: getWorld,
    exportLibrary,
  } as const;
}
