import { useSyncExternalStore } from "react";

export type ParticleDensity = "low" | "medium" | "high";

export interface VisualSettings {
  vhsOverlay: boolean;
  scanlines: boolean;
  filmGrain: boolean;
  vignette: boolean;
  tentacleCursor: boolean;
  clickRipples: boolean;
  portalDive: boolean;
  godRays: boolean;
  bloom: boolean;
  particleDensity: ParticleDensity;
  audio: boolean;
  accentHue: number;
  vrMode: boolean;
  reducedMotion: boolean;
  bubbles: boolean;
  skyLayer: boolean;
  curvedChrome: boolean;
  gravitationalLens: boolean;
}

export type VisualSettingKey = keyof VisualSettings;

export type VisualSettingDef =
  | {
      key: Exclude<VisualSettingKey, "particleDensity" | "accentHue">;
      label: string;
      description: string;
      type: "boolean";
    }
  | {
      key: "particleDensity";
      label: string;
      description: string;
      type: "choice";
      options: ParticleDensity[];
    }
  | {
      key: "accentHue";
      label: string;
      description: string;
      type: "range";
      min: number;
      max: number;
      step: number;
    };

const STORAGE_KEY = "rewritten_visual_settings_v1";
const CHANGE_EVENT = "rewritten:visual-settings-change";

export const DEFAULT_VISUAL_SETTINGS: VisualSettings = {
  vhsOverlay: true,
  scanlines: true,
  filmGrain: true,
  vignette: true,
  tentacleCursor: true,
  clickRipples: true,
  portalDive: true,
  godRays: true,
  bloom: true,
  particleDensity: "medium",
  audio: true,
  accentHue: 195,
  vrMode: false,
  reducedMotion: false,
  bubbles: true,
  skyLayer: true,
  curvedChrome: true,
  gravitationalLens: true,
};

export const VISUAL_SETTING_DEFS: VisualSettingDef[] = [
  {
    key: "vhsOverlay",
    label: "VHS overlay",
    description: "Chromatic CRT glow, on by default.",
    type: "boolean",
  },
  {
    key: "scanlines",
    label: "Scanlines",
    description: "Fine horizontal display lines.",
    type: "boolean",
  },
  {
    key: "filmGrain",
    label: "Film grain",
    description: "Subtle animated noise texture.",
    type: "boolean",
  },
  {
    key: "vignette",
    label: "Vignette",
    description: "Dark cinematic edge falloff.",
    type: "boolean",
  },
  {
    key: "tentacleCursor",
    label: "Tentacle cursor",
    description: "Liquid cursor arms and comet trails.",
    type: "boolean",
  },
  {
    key: "clickRipples",
    label: "Click ripples",
    description: "Water ripple bursts on pointer clicks.",
    type: "boolean",
  },
  {
    key: "portalDive",
    label: "Portal dive",
    description: "Route-change warp tunnel overlay.",
    type: "boolean",
  },
  { key: "godRays", label: "God rays", description: "Volumetric skylight beams.", type: "boolean" },
  {
    key: "bloom",
    label: "Bloom",
    description: "Extra glow intensity on neon UI.",
    type: "boolean",
  },
  {
    key: "particleDensity",
    label: "Particle density",
    description: "How many global bubbles and particles render.",
    type: "choice",
    options: ["low", "medium", "high"],
  },
  {
    key: "audio",
    label: "Audio",
    description: "Ambient loops and UI sound effects.",
    type: "boolean",
  },
  {
    key: "accentHue",
    label: "Accent hue",
    description: "Global cyan/magenta color accent hue.",
    type: "range",
    min: 0,
    max: 359,
    step: 1,
  },
  {
    key: "vrMode",
    label: "VR mode",
    description: "Prefer simplified VR-friendly overlays.",
    type: "boolean",
  },
  {
    key: "reducedMotion",
    label: "Reduced motion",
    description: "Disable nonessential motion-heavy layers.",
    type: "boolean",
  },
  { key: "bubbles", label: "Bubbles", description: "Floating bubble overlay.", type: "boolean" },
  {
    key: "skyLayer",
    label: "Sky layer",
    description: "Atmospheric gradient and cloud shell.",
    type: "boolean",
  },
  {
    key: "curvedChrome",
    label: "Curved chrome",
    description: "Curved viewport + bezel lens frame.",
    type: "boolean",
  },
  {
    key: "gravitationalLens",
    label: "Grav lens",
    description: "SVG lens defs and lens-warp styling.",
    type: "boolean",
  },
];

function normalize(input: Partial<VisualSettings> | null | undefined): VisualSettings {
  const merged = { ...DEFAULT_VISUAL_SETTINGS, ...(input ?? {}) };
  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  return {
    ...merged,
    reducedMotion: Boolean(merged.reducedMotion || prefersReduced),
    accentHue: Math.max(
      0,
      Math.min(359, Math.round(Number(merged.accentHue) || DEFAULT_VISUAL_SETTINGS.accentHue)),
    ),
    particleDensity: ["low", "medium", "high"].includes(merged.particleDensity)
      ? merged.particleDensity
      : DEFAULT_VISUAL_SETTINGS.particleDensity,
  };
}

let visualSettingsCache: VisualSettings | null = null;

function readFromStorage(): VisualSettings {
  if (typeof window === "undefined") return DEFAULT_VISUAL_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return normalize(raw ? (JSON.parse(raw) as Partial<VisualSettings>) : DEFAULT_VISUAL_SETTINGS);
  } catch {
    return DEFAULT_VISUAL_SETTINGS;
  }
}

function read(): VisualSettings {
  visualSettingsCache ??= readFromStorage();
  return visualSettingsCache;
}

function write(settings: VisualSettings) {
  visualSettingsCache = settings;
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: settings }));
}

export function getVisualSettings(): VisualSettings {
  return read();
}

export function setVisualSetting<K extends VisualSettingKey>(
  key: K,
  value: VisualSettings[K],
): VisualSettings {
  const next = normalize({ ...read(), [key]: value });
  write(next);
  return next;
}

export function updateVisualSettings(values: Partial<VisualSettings>): VisualSettings {
  const next = normalize({ ...read(), ...values });
  write(next);
  return next;
}

export function resetVisualSettings(): VisualSettings {
  write(DEFAULT_VISUAL_SETTINGS);
  return DEFAULT_VISUAL_SETTINGS;
}

export function particleCount(settings: VisualSettings, medium = 22): number {
  if (settings.reducedMotion) return Math.max(0, Math.floor(medium * 0.25));
  if (settings.particleDensity === "low") return Math.max(1, Math.floor(medium * 0.45));
  if (settings.particleDensity === "high") return Math.floor(medium * 1.75);
  return medium;
}

export function applyVisualSettingsToDocument(settings: VisualSettings) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.setProperty("--accent-hue", String(settings.accentHue));
  root.dataset.vhs = String(settings.vhsOverlay);
  root.dataset.bloom = String(settings.bloom);
  root.dataset.vrMode = String(settings.vrMode);
  root.dataset.reducedMotion = String(settings.reducedMotion);
}

function subscribe(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onSettingsChange = () => listener();
  const onStorage = (event: StorageEvent) => {
    if (event.key && event.key !== STORAGE_KEY) return;
    visualSettingsCache = readFromStorage();
    listener();
  };
  window.addEventListener(CHANGE_EVENT, onSettingsChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onSettingsChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function useVisualSettings(): VisualSettings {
  return useSyncExternalStore(subscribe, read, () => DEFAULT_VISUAL_SETTINGS);
}
