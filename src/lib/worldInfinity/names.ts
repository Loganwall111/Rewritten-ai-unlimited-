/**
 * Procedural world-name generator.
 *
 * Names are seeded so a given seed always yields the same name — but the
 * syllable banks are archetype-flavoured (a crystal world won't be named
 * "Dustwood Vale"). The result reads like a fantasy atlas entry.
 */

import type { ArchetypeDef } from "./types";
import { Rng } from "./rng";

export function generateWorldName(archetype: ArchetypeDef, seed: string): string {
  const rng = new Rng(`${seed}::name`);
  const { prefixes, roots, suffixes } = archetype.names;

  // 35% chance of a compound two-root name for variety.
  const useCompound = rng.chance(0.35) && roots.length >= 2;
  const root = rng.pick(roots);
  const secondRoot = useCompound ? rng.pick(roots.filter((r) => r !== root)) : "";
  const stem = useCompound ? `${root}${secondRoot.toLowerCase()}` : root;
  const prefix = rng.chance(0.55) ? rng.pick(prefixes) : "";
  const suffix = rng.chance(0.7) ? rng.pick(suffixes) : "";

  const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
  const parts = [prefix, stem, suffix].filter(Boolean);
  return parts.map(cap).join(" ");
}

const BLURB_TEMPLATES = [
  "A {adj} {place} where {detail}.",
  "{adj} and {adj2}, this {place} hums with {detail}.",
  "Endless {place} stretch beneath a {sky} sky.",
  "Few have mapped this {place}. {detail}.",
  "{adj} {place}, seeded {seed0}.",
];

const ADJ: Record<string, readonly string[]> = {
  verdant: ["emerald", "sun-dappled", "mossy", "verdant"],
  crystal: ["prismatic", "facet-bright", "luminous", "glassine"],
  volcanic: ["smouldering", "ashen", "molten", "ember-lit"],
  tundra: ["frostbitten", "crystalline", "pale", "endless-white"],
  xenoflora: ["bioluminescent", "otherworldly", "pulsing", "alien"],
  dunes: ["golden", "wind-carved", "sun-scorched", "amber"],
  islands: ["floating", "buoyant", "skybound", "drifting"],
  reef: ["kelp-veiled", "abyssal", "tidal", "bioluminescent"],
  cyber: ["neon-soaked", "glitched", "holographic", "synthwave"],
  nebula: ["star-swaddled", "void-drifted", "celestial", "iridescent"],
  mushroom: ["spore-dusted", "canopied", "gigantic", "fungal"],
  savannah: ["sunbaked", "amber-grassed", "baobab-shadowed", "vast"],
};

const DETAIL: Record<string, readonly string[]> = {
  verdant: ["ancient oaks whisper", "mist clings to the ferns"],
  crystal: ["light fractures into rainbows", "the spires sing at dusk"],
  volcanic: ["rivers of fire trace the valleys", "the ground never truly cools"],
  tundra: ["the wind never stops", "aurora coils overhead"],
  xenoflora: ["glowing fronds track your steps", "the soil breathes"],
  dunes: ["dunes shift overnight", "mirages promise water"],
  islands: ["islands drift on unseen currents", "waterfalls fall into open sky"],
  reef: ["kelp towers scrape the surface", "lantern-fish blink in the deep"],
  cyber: ["billboards hawk impossible futures", "rain never reaches the ground"],
  nebula: ["stars are close enough to touch", "comets trace the horizon"],
  mushroom: ["spores drift like snow", "the canopy hums a low chord"],
  savannah: ["herds thunder at the horizon", "the grass moves like the sea"],
};

const PLACE: Record<string, readonly string[]> = {
  verdant: ["wood", "vale", "thicket", "grove"],
  crystal: ["halls", "spires", "cavern", "lattice"],
  volcanic: ["wastes", "caldera", "reach", "furnace"],
  tundra: ["expanse", "tundra", "ice fields", "steppe"],
  xenoflora: ["bloom", "xenogarden", "biome", "thicket"],
  dunes: ["dunes", "erg", "sand sea", "wastes"],
  islands: ["archipelago", "skies", "drift", "arches"],
  reef: ["reef", "trench", "abyss", "shelf"],
  cyber: ["grid", "district", "sprawl", "nexus"],
  nebula: ["drift", "expanse", "nursery", "void"],
  mushroom: ["canopy", "ring", "forest", "grove"],
  savannah: ["plains", "veldt", "savannah", "range"],
};

const SKY: Record<string, readonly string[]> = {
  verdant: ["soft azure", "hazy gold"],
  crystal: ["violet", "opal"],
  volcanic: ["cinder-red", "smoke-grey"],
  tundra: ["steel-blue", "polar-green"],
  xenoflora: ["indigo", "magenta"],
  dunes: ["burnished copper", "pale rose"],
  islands: ["endless blue", "cotton-candy"],
  reef: ["filtered aquamarine", "deep teal"],
  cyber: ["synthetic magenta", "rain-slick"],
  nebula: ["star-choked", "nebular"],
  mushroom: ["dusky mauve", "spore-gold"],
  savannah: ["blazing orange", "dust-hazed"],
};

export function generateBlurb(archetype: ArchetypeDef, seed: string): string {
  const rng = new Rng(`${seed}::blurb`);
  const a = archetype.id;
  const adj = rng.pick(ADJ[a] ?? ["strange"]);
  const adj2 = rng.pick((ADJ[a] ?? ["strange"]).filter((x) => x !== adj));
  const place = rng.pick(PLACE[a] ?? ["land"]);
  const sky = rng.pick(SKY[a] ?? ["alien"]);
  const detail = rng.pick(DETAIL[a] ?? ["nothing is as it seems"]);
  const tmpl = rng.pick(BLURB_TEMPLATES);
  return tmpl
    .replace("{adj}", adj)
    .replace("{adj2}", adj2)
    .replace("{place}", place)
    .replace("{sky}", sky)
    .replace("{detail}", detail)
    .replace("{seed0}", seed);
}
