import { useSyncExternalStore } from "react";

export type CosmeticCategory = "skins" | "accents" | "auras" | "accessories";
export type CosmeticRarity = "common" | "rare" | "epic" | "legendary";

export interface CosmeticItem {
  id: string;
  name: string;
  category: CosmeticCategory;
  rarity: CosmeticRarity;
  price: number;
  icon: string;
  hue: number;
  description: string;
}

export interface CosmeticsState {
  credits: number;
  owned: string[];
  equipped: Record<CosmeticCategory, string | null>;
}

const STORAGE_KEY = "rewritten_cosmetics_v1";
const CHANGE_EVENT = "rewritten:cosmetics-change";

export const RARITY_STYLE: Record<
  CosmeticRarity,
  { label: string; hue: number; multiplier: number }
> = {
  common: { label: "Common", hue: 190, multiplier: 1 },
  rare: { label: "Rare", hue: 225, multiplier: 1.4 },
  epic: { label: "Epic", hue: 285, multiplier: 2 },
  legendary: { label: "Legendary", hue: 42, multiplier: 3.2 },
};

export const COSMETIC_CATALOG: CosmeticItem[] = [
  {
    id: "skin-aurora",
    name: "Aurora Skin",
    category: "skins",
    rarity: "common",
    price: 120,
    icon: "🌌",
    hue: 160,
    description: "Soft polar gradients across your avatar shell.",
  },
  {
    id: "skin-chrome",
    name: "Chrome Skin",
    category: "skins",
    rarity: "rare",
    price: 240,
    icon: "🪩",
    hue: 210,
    description: "Mirror-polished mall-runner plating.",
  },
  {
    id: "skin-void",
    name: "Void Skin",
    category: "skins",
    rarity: "epic",
    price: 420,
    icon: "🕳️",
    hue: 280,
    description: "A starless finish that drinks the room light.",
  },
  {
    id: "skin-solar",
    name: "Solar Skin",
    category: "skins",
    rarity: "legendary",
    price: 760,
    icon: "☀️",
    hue: 38,
    description: "Gold photosphere armor with sunrise edging.",
  },
  {
    id: "accent-cyan",
    name: "Cyan Trim",
    category: "accents",
    rarity: "common",
    price: 80,
    icon: "💧",
    hue: 188,
    description: "Classic Rewritten cyan highlights.",
  },
  {
    id: "accent-magenta",
    name: "Magenta Trim",
    category: "accents",
    rarity: "common",
    price: 80,
    icon: "💗",
    hue: 318,
    description: "Vivid neon edge-light accents.",
  },
  {
    id: "accent-platinum",
    name: "Platinum Trim",
    category: "accents",
    rarity: "rare",
    price: 180,
    icon: "⚪",
    hue: 215,
    description: "Premium silver-white rim lighting.",
  },
  {
    id: "accent-prismatic",
    name: "Prismatic Trim",
    category: "accents",
    rarity: "epic",
    price: 390,
    icon: "🌈",
    hue: 260,
    description: "Hue-shifting chroma accents.",
  },
  {
    id: "aura-bubbles",
    name: "Bubble Aura",
    category: "auras",
    rarity: "common",
    price: 150,
    icon: "🫧",
    hue: 185,
    description: "Gentle underwater bubbles orbit your feet.",
  },
  {
    id: "aura-pixels",
    name: "Pixel Aura",
    category: "auras",
    rarity: "rare",
    price: 260,
    icon: "🔳",
    hue: 210,
    description: "Digital motes stream behind every step.",
  },
  {
    id: "aura-nebula",
    name: "Nebula Aura",
    category: "auras",
    rarity: "epic",
    price: 520,
    icon: "✨",
    hue: 300,
    description: "Purple-blue star gas swirls around you.",
  },
  {
    id: "aura-crownfire",
    name: "Crownfire Aura",
    category: "auras",
    rarity: "legendary",
    price: 900,
    icon: "🔥",
    hue: 24,
    description: "Royal flame tongues and ember sparks.",
  },
  {
    id: "accessory-halo",
    name: "Data Halo",
    category: "accessories",
    rarity: "common",
    price: 140,
    icon: "⭕",
    hue: 195,
    description: "A small orbiting ring of light.",
  },
  {
    id: "accessory-cat-ears",
    name: "Nebula Ears",
    category: "accessories",
    rarity: "rare",
    price: 260,
    icon: "🐱",
    hue: 300,
    description: "Reactive cosmic cat-ear antennae.",
  },
  {
    id: "accessory-wings",
    name: "Micro Wings",
    category: "accessories",
    rarity: "epic",
    price: 540,
    icon: "🪽",
    hue: 48,
    description: "Tiny glider fins that flutter on sprint.",
  },
  {
    id: "accessory-crown",
    name: "Obelisk Crown",
    category: "accessories",
    rarity: "legendary",
    price: 980,
    icon: "👑",
    hue: 42,
    description: "A crown cut from MegaHub obelisk light.",
  },
  {
    id: "aura-vhs",
    name: "VHS Ghost Aura",
    category: "auras",
    rarity: "rare",
    price: 300,
    icon: "📼",
    hue: 330,
    description: "Chromatic after-images trail behind you.",
  },
  {
    id: "accessory-keychain",
    name: "Platinum Keychain",
    category: "accessories",
    rarity: "common",
    price: 90,
    icon: "🗝️",
    hue: 205,
    description: "A dangling key charm for hub doors.",
  },
];

export const COSMETIC_BY_ID = Object.fromEntries(
  COSMETIC_CATALOG.map((item) => [item.id, item]),
) as Record<string, CosmeticItem>;

const categories: CosmeticCategory[] = ["skins", "accents", "auras", "accessories"];

function defaultState(): CosmeticsState {
  return {
    credits: 650,
    owned: ["skin-aurora", "accent-cyan", "aura-bubbles", "accessory-halo"],
    equipped: {
      skins: "skin-aurora",
      accents: "accent-cyan",
      auras: "aura-bubbles",
      accessories: "accessory-halo",
    },
  };
}

function normalize(value: Partial<CosmeticsState> | null | undefined): CosmeticsState {
  const base = defaultState();
  const owned = Array.from(new Set(value?.owned ?? base.owned)).filter((id) =>
    Boolean(COSMETIC_BY_ID[id]),
  );
  const equipped = { ...base.equipped, ...(value?.equipped ?? {}) };
  categories.forEach((category) => {
    const id = equipped[category];
    if (
      id &&
      (!COSMETIC_BY_ID[id] || COSMETIC_BY_ID[id].category !== category || !owned.includes(id))
    ) {
      equipped[category] = null;
    }
  });
  return {
    credits: Math.max(0, Math.floor(value?.credits ?? base.credits)),
    owned,
    equipped,
  };
}

let cosmeticsCache: CosmeticsState | null = null;

function readFromStorage(): CosmeticsState {
  if (typeof window === "undefined") return defaultState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? normalize(JSON.parse(raw) as Partial<CosmeticsState>) : defaultState();
  } catch {
    return defaultState();
  }
}

function read(): CosmeticsState {
  cosmeticsCache ??= readFromStorage();
  return cosmeticsCache;
}

function write(state: CosmeticsState) {
  cosmeticsCache = state;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: state }));
  }
}

function update(mutator: (state: CosmeticsState) => CosmeticsState): CosmeticsState {
  const next = normalize(mutator(read()));
  write(next);
  return next;
}

export function getCosmeticsState(): CosmeticsState {
  return read();
}

export function addCredits(amount: number): number {
  return update((state) => ({ ...state, credits: Math.max(0, state.credits + Math.floor(amount)) }))
    .credits;
}

export function purchaseCosmetic(id: string): boolean {
  const item = COSMETIC_BY_ID[id];
  if (!item) return false;
  let purchased = false;
  update((state) => {
    if (state.owned.includes(id)) return state;
    if (state.credits < item.price) return state;
    purchased = true;
    return { ...state, credits: state.credits - item.price, owned: [...state.owned, id] };
  });
  return purchased;
}

export function equipCosmetic(id: string | null, category?: CosmeticCategory): boolean {
  if (id == null && !category) return false;
  const item = id ? COSMETIC_BY_ID[id] : null;
  const targetCategory = category ?? item?.category;
  if (!targetCategory) return false;
  let equipped = false;
  update((state) => {
    if (id && (!item || !state.owned.includes(id))) return state;
    equipped = true;
    return { ...state, equipped: { ...state.equipped, [targetCategory]: id } };
  });
  return equipped;
}

export function ownsCosmetic(id: string): boolean {
  return read().owned.includes(id);
}

function subscribe(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onCosmeticsChange = () => listener();
  const onStorage = (event: StorageEvent) => {
    if (event.key && event.key !== STORAGE_KEY) return;
    cosmeticsCache = readFromStorage();
    listener();
  };
  window.addEventListener(CHANGE_EVENT, onCosmeticsChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onCosmeticsChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function useCosmetics(): CosmeticsState {
  return useSyncExternalStore(subscribe, read, defaultState);
}
