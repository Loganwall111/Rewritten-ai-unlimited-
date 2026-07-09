import { useSyncExternalStore } from "react";

export type ItemKind = "food" | "tools" | "keys" | "collectibles" | "vehicles";

export interface InventoryItem {
  id: string;
  name: string;
  kind: ItemKind;
  icon: string;
  description: string;
  maxStack: number;
  energy?: number;
}

export interface InventoryState {
  stacks: Record<string, number>;
  hotbar: Array<string | null>;
  energy: number;
  maxEnergy: number;
}

const STORAGE_KEY = "rewritten_inventory_v1";
const CHANGE_EVENT = "rewritten:inventory-change";
const HOTBAR_SLOTS = 8;
const DEFAULT_MAX_ENERGY = 100;

export const ITEM_CATALOG: InventoryItem[] = [
  {
    id: "energy-crystal",
    name: "Energy Crystal",
    kind: "collectibles",
    icon: "💠",
    description: "Condensed gateway power. Restores a large burst of energy.",
    maxStack: 20,
    energy: 45,
  },
  {
    id: "starfruit",
    name: "Starfruit",
    kind: "food",
    icon: "⭐",
    description: "Sweet astral fruit. Restores energy.",
    maxStack: 12,
    energy: 25,
  },
  {
    id: "nebula-berry",
    name: "Nebula Berry",
    kind: "food",
    icon: "🫐",
    description: "A glowing berry cluster with a quick energy kick.",
    maxStack: 20,
    energy: 15,
  },
  {
    id: "ancient-relic",
    name: "Ancient Relic",
    kind: "collectibles",
    icon: "🏺",
    description: "A museum-grade artifact from a previous simulation cycle.",
    maxStack: 5,
  },
  {
    id: "void-shard",
    name: "Void Shard",
    kind: "tools",
    icon: "🔹",
    description: "A sharp fragment that resonates near sealed portals.",
    maxStack: 10,
  },
  {
    id: "platinum-key",
    name: "Platinum Key",
    kind: "keys",
    icon: "🗝️",
    description: "Unlocks elite doors and premium-looking mall kiosks.",
    maxStack: 3,
  },
  {
    id: "hoverboard",
    name: "Hoverboard",
    kind: "vehicles",
    icon: "🛹",
    description: "Personal hover deck for plaza cruising.",
    maxStack: 1,
  },
  {
    id: "speeder",
    name: "Speeder",
    kind: "vehicles",
    icon: "🏍️",
    description: "Neon land speeder with a boosted glide.",
    maxStack: 1,
  },
  {
    id: "submarine",
    name: "Submarine",
    kind: "vehicles",
    icon: "🛟",
    description: "Compact submersible for underwater routes.",
    maxStack: 1,
  },
  {
    id: "glider",
    name: "Glider",
    kind: "vehicles",
    icon: "🪽",
    description: "Foldable sky glider for terrace launches.",
    maxStack: 1,
  },
];

export const ITEM_BY_ID = Object.fromEntries(ITEM_CATALOG.map((item) => [item.id, item])) as Record<
  string,
  InventoryItem
>;

function createDefaultState(): InventoryState {
  return {
    stacks: {
      "nebula-berry": 3,
      starfruit: 1,
      hoverboard: 1,
    },
    hotbar: [
      "nebula-berry",
      "starfruit",
      "energy-crystal",
      "platinum-key",
      "hoverboard",
      null,
      null,
      null,
    ],
    energy: 72,
    maxEnergy: DEFAULT_MAX_ENERGY,
  };
}

function normalizeState(value: Partial<InventoryState> | null | undefined): InventoryState {
  const base = createDefaultState();
  const stacks: Record<string, number> = { ...(value?.stacks ?? base.stacks) };
  Object.keys(stacks).forEach((id) => {
    const item = ITEM_BY_ID[id];
    if (!item || stacks[id] <= 0) delete stacks[id];
    else stacks[id] = Math.min(Math.floor(stacks[id]), item.maxStack);
  });
  const hotbar = Array.from(
    { length: HOTBAR_SLOTS },
    (_, i) => value?.hotbar?.[i] ?? base.hotbar[i] ?? null,
  ).map((id) => (id && ITEM_BY_ID[id] ? id : null));
  const maxEnergy = Math.max(1, value?.maxEnergy ?? DEFAULT_MAX_ENERGY);
  return {
    stacks,
    hotbar,
    energy: Math.max(0, Math.min(maxEnergy, value?.energy ?? base.energy)),
    maxEnergy,
  };
}

let inventoryCache: InventoryState | null = null;

function readFromStorage(): InventoryState {
  if (typeof window === "undefined") return createDefaultState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultState();
    return normalizeState(JSON.parse(raw) as Partial<InventoryState>);
  } catch {
    return createDefaultState();
  }
}

function safeRead(): InventoryState {
  inventoryCache ??= readFromStorage();
  return inventoryCache;
}

function safeWrite(state: InventoryState) {
  inventoryCache = state;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* localStorage can fail in private mode; inventory still works in-memory per call */
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: state }));
}

function update(mutator: (state: InventoryState) => InventoryState): InventoryState {
  const next = normalizeState(mutator(safeRead()));
  safeWrite(next);
  return next;
}

export function getInventoryState(): InventoryState {
  return safeRead();
}

export function addItem(itemId: string, quantity = 1): boolean {
  const item = ITEM_BY_ID[itemId];
  if (!item || quantity <= 0) return false;
  let changed = false;
  update((state) => {
    const current = state.stacks[itemId] ?? 0;
    const nextCount = Math.min(item.maxStack, current + Math.floor(quantity));
    changed = nextCount !== current;
    state.stacks[itemId] = nextCount;
    if (!state.hotbar.includes(itemId)) {
      const empty = state.hotbar.findIndex((slot) => slot == null);
      if (empty >= 0) state.hotbar[empty] = itemId;
    }
    return state;
  });
  return changed;
}

export function consumeItem(itemId: string, quantity = 1): boolean {
  const item = ITEM_BY_ID[itemId];
  if (!item || quantity <= 0) return false;
  let consumed = false;
  update((state) => {
    const current = state.stacks[itemId] ?? 0;
    if (current < quantity) return state;
    consumed = true;
    const nextCount = current - Math.floor(quantity);
    if (nextCount <= 0) delete state.stacks[itemId];
    else state.stacks[itemId] = nextCount;
    if (item.energy) state.energy = Math.min(state.maxEnergy, state.energy + item.energy);
    return state;
  });
  return consumed;
}

export function hasItem(itemId: string, quantity = 1): boolean {
  return (safeRead().stacks[itemId] ?? 0) >= quantity;
}

export function getEnergy(): number {
  return safeRead().energy;
}

export function setEnergy(value: number): number {
  return update((state) => ({
    ...state,
    energy: Math.max(0, Math.min(state.maxEnergy, value)),
  })).energy;
}

export function changeEnergy(delta: number): number {
  return update((state) => ({
    ...state,
    energy: Math.max(0, Math.min(state.maxEnergy, state.energy + delta)),
  })).energy;
}

export function equipHotbar(slot: number, itemId: string | null): boolean {
  if (slot < 0 || slot >= HOTBAR_SLOTS) return false;
  if (itemId && !ITEM_BY_ID[itemId]) return false;
  update((state) => {
    state.hotbar[slot] = itemId;
    return state;
  });
  return true;
}

export function resetInventory(): InventoryState {
  const state = createDefaultState();
  safeWrite(state);
  return state;
}

function subscribe(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onInventoryChange = () => listener();
  const onStorage = (event: StorageEvent) => {
    if (event.key && event.key !== STORAGE_KEY) return;
    inventoryCache = readFromStorage();
    listener();
  };
  window.addEventListener(CHANGE_EVENT, onInventoryChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onInventoryChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function useInventory(): InventoryState {
  return useSyncExternalStore(subscribe, getInventoryState, createDefaultState);
}
