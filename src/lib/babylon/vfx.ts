/**
 * Cinematic post-processing helpers for walkable worlds.
 *
 * Builds DefaultRenderingPipeline presets (DOF, motion blur, glow, colour
 * grade, grain) on top of a FreeCamera-driven scene. Safe to call once per
 * scene — returns handles so callers can tweak strength at runtime.
 */

import {
  Scene,
  Camera,
  Color4,
  DefaultRenderingPipeline,
  GlowLayer,
  ImageProcessingConfiguration,
} from "@babylonjs/core";
import "@babylonjs/core/PostProcesses/RenderPipeline/postProcessRenderPipelineManager";
import "@babylonjs/core/Layers/glowLayer";

export type CinematicLevel = "off" | "soft" | "full";

export interface VfxHandles {
  pipeline: DefaultRenderingPipeline | null;
  glow: GlowLayer | null;
  setCinematic: (level: CinematicLevel) => void;
  dispose: () => void;
}

export interface VfxOptions {
  cinematic?: CinematicLevel;
  /** Depth-of-field strength (0–1). Only active when cinematic !== off. */
  dof?: number;
  /** Motion blur strength (0–1). */
  motionBlur?: number;
  bloomWeight?: number;
  bloomThreshold?: number;
  exposure?: number;
  contrast?: number;
  vignetteWeight?: number;
  grain?: boolean;
  glowIntensity?: number;
}

/**
 * Attach a cinematic post-process stack to the scene + camera.
 * Idempotent-ish: creates a uniquely named pipeline so multiple hosts can coexist.
 */
export function attachCinematicVfx(
  scene: Scene,
  camera: Camera,
  opts: VfxOptions = {},
): VfxHandles {
  const level: CinematicLevel = opts.cinematic ?? "soft";
  const name = `walk-vfx-${Math.random().toString(36).slice(2, 8)}`;

  let pipeline: DefaultRenderingPipeline | null = null;
  let glow: GlowLayer | null = null;

  try {
    pipeline = new DefaultRenderingPipeline(name, true, scene, [camera]);
    pipeline.samples = 4;
    pipeline.bloomEnabled = true;
    pipeline.bloomWeight = opts.bloomWeight ?? 0.7;
    pipeline.bloomThreshold = opts.bloomThreshold ?? 0.35;
    pipeline.bloomKernel = 64;
    pipeline.bloomScale = 0.5;

    pipeline.imageProcessingEnabled = true;
    pipeline.imageProcessing.toneMappingEnabled = true;
    pipeline.imageProcessing.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES;
    pipeline.imageProcessing.exposure = opts.exposure ?? 1.15;
    pipeline.imageProcessing.contrast = opts.contrast ?? 1.2;
    pipeline.imageProcessing.vignetteEnabled = true;
    pipeline.imageProcessing.vignetteWeight = opts.vignetteWeight ?? 1.4;
    pipeline.imageProcessing.vignetteColor = new Color4(0, 0, 0.02, 1);

    pipeline.fxaaEnabled = true;

    // Grain for filmic feel.
    if (opts.grain !== false) {
      pipeline.grainEnabled = true;
      pipeline.grain.intensity = level === "full" ? 12 : level === "soft" ? 6 : 0;
      pipeline.grain.animated = true;
    }

    // Depth of field.
    const dof = opts.dof ?? (level === "full" ? 0.4 : level === "soft" ? 0.15 : 0);
    if (dof > 0) {
      pipeline.depthOfFieldEnabled = true;
      pipeline.depthOfFieldBlurLevel = 1;
      pipeline.depthOfField.fStop = 1.4;
      pipeline.depthOfField.focalLength = 50;
      pipeline.depthOfField.focusDistance = 2000; // mm-ish; tuned for walk scale
      pipeline.depthOfField.lensSize = 50 * dof;
    }

    // Motion blur (when available in DefaultRenderingPipeline).
    const mb = opts.motionBlur ?? (level === "full" ? 0.35 : 0);
    if (mb > 0 && "motionBlurEnabled" in pipeline) {
      (pipeline as DefaultRenderingPipeline & { motionBlurEnabled: boolean }).motionBlurEnabled =
        true;
      const mbPipe = pipeline as DefaultRenderingPipeline & {
        motionBlur?: { motionStrength?: number };
      };
      if (mbPipe.motionBlur) {
        mbPipe.motionBlur.motionStrength = mb;
      }
    }
  } catch (err) {
    console.warn("[vfx] pipeline failed", err);
    pipeline = null;
  }

  try {
    glow = new GlowLayer(`glow-${name}`, scene, {
      blurKernelSize: 32,
      mainTextureFixedSize: 512,
    });
    glow.intensity = opts.glowIntensity ?? (level === "full" ? 0.85 : 0.55);
  } catch (err) {
    console.warn("[vfx] glow layer failed", err);
    glow = null;
  }

  const setCinematic = (next: CinematicLevel) => {
    if (!pipeline) return;
    if (next === "off") {
      pipeline.bloomEnabled = false;
      pipeline.depthOfFieldEnabled = false;
      pipeline.grainEnabled = false;
      if (glow) glow.intensity = 0.2;
      return;
    }
    pipeline.bloomEnabled = true;
    pipeline.bloomWeight = next === "full" ? 0.95 : 0.65;
    pipeline.grainEnabled = true;
    pipeline.grain.intensity = next === "full" ? 14 : 6;
    const dofAmt = next === "full" ? 0.45 : 0.12;
    pipeline.depthOfFieldEnabled = dofAmt > 0;
    if (pipeline.depthOfField) pipeline.depthOfField.lensSize = 50 * dofAmt;
    if (glow) glow.intensity = next === "full" ? 1.0 : 0.55;
  };

  // Apply initial level (in case caller passed "off").
  if (level === "off") setCinematic("off");

  return {
    pipeline,
    glow,
    setCinematic,
    dispose: () => {
      try {
        pipeline?.dispose();
      } catch {
        /* ignore */
      }
      try {
        glow?.dispose();
      } catch {
        /* ignore */
      }
    },
  };
}
