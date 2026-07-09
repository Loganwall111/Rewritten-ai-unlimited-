/**
 * Model + voice catalog.
 *
 * Chat model IDs are passed to OpenRouter (vendor/model format).
 * Image generation uses Google Imagen 3 directly (GEMINI_API_KEY).
 * Video models are labels only — the actual video provider is selected
 * server-side (see src/lib/video.functions.ts).
 */

export type Modality = "text" | "image" | "video" | "code" | "audio";

export type ModelDef = {
  id: string;
  name: string;
  provider: string;
  modality: Modality[];
  tier: "local" | "hosted";
  credits: number;
  desc?: string;
  requiresKey?: string;
};

export const MODELS: ModelDef[] = [
  // === Chat / text ===
  {
    id: "google/gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    provider: "Google",
    modality: ["text", "image", "audio", "video", "code"],
    tier: "hosted",
    credits: 1,
    desc: "Fast multimodal reasoning.",
  },
  {
    id: "google/gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    provider: "Google",
    modality: ["text", "image", "audio", "video", "code"],
    tier: "hosted",
    credits: 6,
    desc: "Deepest Gemini reasoning.",
  },
  {
    id: "google/gemini-3-flash-preview",
    name: "Gemini 3 Flash",
    provider: "Google",
    modality: ["text", "image", "audio", "video", "code"],
    tier: "hosted",
    credits: 2,
    desc: "Next-gen preview — default.",
  },
  {
    id: "google/gemini-3.5-flash",
    name: "Gemini 3.5 Flash",
    provider: "Google",
    modality: ["text", "code"],
    tier: "hosted",
    credits: 3,
    desc: "Fast agentic reasoning.",
  },
  {
    id: "openai/gpt-5",
    name: "GPT-5",
    provider: "OpenAI",
    modality: ["text", "image", "code"],
    tier: "hosted",
    credits: 8,
    desc: "Premium all-rounder.",
  },
  {
    id: "openai/gpt-5-mini",
    name: "GPT-5 Mini",
    provider: "OpenAI",
    modality: ["text", "image", "code"],
    tier: "hosted",
    credits: 3,
    desc: "Balanced OpenAI.",
  },
  {
    id: "openai/gpt-5-nano",
    name: "GPT-5 Nano",
    provider: "OpenAI",
    modality: ["text", "image", "code"],
    tier: "hosted",
    credits: 1,
    desc: "Cheap + fast.",
  },
  {
    id: "openai/gpt-5.4",
    name: "GPT-5.4",
    provider: "OpenAI",
    modality: ["text", "code"],
    tier: "hosted",
    credits: 10,
    desc: "Advanced reasoning.",
  },
  {
    id: "openai/gpt-5.5",
    name: "GPT-5.5",
    provider: "OpenAI",
    modality: ["text", "code"],
    tier: "hosted",
    credits: 12,
    desc: "State-of-the-art.",
  },

  // === Image ===
  {
    id: "google/imagen-3",
    name: "Imagen 3",
    provider: "Google",
    modality: ["image"],
    tier: "hosted",
    credits: 6,
    desc: "Default image model (Imagen 3 via Gemini API).",
    requiresKey: "GEMINI_API_KEY",
  },
  {
    id: "openai/gpt-image-2",
    name: "GPT Image 2",
    provider: "OpenAI",
    modality: ["image"],
    tier: "hosted",
    credits: 6,
    desc: "OpenAI image model (requires OPENAI_API_KEY).",
    requiresKey: "OPENAI_API_KEY",
  },
  {
    id: "openai/gpt-image-1-mini",
    name: "GPT Image Mini",
    provider: "OpenAI",
    modality: ["image"],
    tier: "hosted",
    credits: 3,
    desc: "Cost-efficient.",
  },
  {
    id: "google/gemini-2.5-flash-image",
    name: "Nano Banana",
    provider: "Google",
    modality: ["image"],
    tier: "hosted",
    credits: 4,
    desc: "Text → image + edits.",
  },
  {
    id: "google/gemini-3-pro-image",
    name: "Gemini 3 Pro Image",
    provider: "Google",
    modality: ["image"],
    tier: "hosted",
    credits: 8,
    desc: "Higher-fidelity images.",
  },
  {
    id: "google/gemini-3.1-flash-image",
    name: "Nano Banana 2",
    provider: "Google",
    modality: ["image"],
    tier: "hosted",
    credits: 5,
    desc: "Fast + high quality.",
  },

  // === Video ===
  // Sora + Runway + Seedance are labels; the server picks a real provider if a
  // corresponding API key is configured (see video.functions.ts).
  {
    id: "sora-2",
    name: "Sora 2",
    provider: "OpenAI",
    modality: ["video"],
    tier: "hosted",
    credits: 40,
    desc: "OpenAI video (requires OPENAI_API_KEY).",
    requiresKey: "OPENAI_API_KEY",
  },
  {
    id: "runway-gen4",
    name: "Runway Gen-4",
    provider: "Runway",
    modality: ["video"],
    tier: "hosted",
    credits: 30,
    desc: "Runway cinematic (requires RUNWAY_API_KEY).",
    requiresKey: "RUNWAY_API_KEY",
  },
  {
    id: "seedance-2.0",
    name: "Seedance 2.0",
    provider: "ByteDance",
    modality: ["video"],
    tier: "hosted",
    credits: 20,
    desc: "Realistic motion (requires REPLICATE_API_TOKEN).",
    requiresKey: "REPLICATE_API_TOKEN",
  },
];

export function getAllModels(modality?: Modality) {
  if (!modality) return MODELS;
  return MODELS.filter((m) => m.modality.includes(modality));
}

export function getModel(id: string) {
  return MODELS.find((m) => m.id === id);
}
