/**
 * Havok physics integration for the Babylon engine.
 *
 * Loads the Havok physics WASM engine and exposes it via a singleton so any
 * scene can opt into real physics (gravity, collisions, rigid bodies) by
 * calling `enablePhysics(scene)`. If Havok fails to load (blocked WASM, old
 * browser, etc.) it logs and returns false — scenes keep rendering without
 * physics rather than crashing. This is the "physics via Havok fallback" from
 * the graphics overhaul spec.
 */

import { Scene } from "@babylonjs/core";
import { HavokPlugin } from "@babylonjs/core/Physics/v2";
import HavokPhysics from "@babylonjs/havok";

let havokLoaded: boolean | null = null;
let havokInstance: Awaited<ReturnType<typeof HavokPhysics>> | null = null;

/** Lazily load the Havok WASM engine (once per session). */
async function getHavok(): Promise<Awaited<ReturnType<typeof HavokPhysics>> | null> {
  if (havokLoaded !== null) {
    return havokInstance;
  }
  try {
    havokInstance = await HavokPhysics();
    havokLoaded = true;
    return havokInstance;
  } catch (err) {
    console.warn("[physics] Havok failed to load — scenes run without physics.", err);
    havokLoaded = false;
    return null;
  }
}

export function isPhysicsAvailable(): boolean {
  return havokLoaded === true;
}

/**
 * Enable physics on a scene. Returns true if Havok is active. Idempotent —
 * calling it twice on the same scene is a no-op.
 */
export async function enablePhysics(
  scene: Scene,
  gravity: [number, number, number] = [0, -9.81, 0],
): Promise<boolean> {
  try {
    if (scene.isPhysicsEnabled()) return true;
    const havok = await getHavok();
    if (!havok) return false;
    const plugin = new HavokPlugin(true, havok);
    scene.enablePhysics(
      // Babylon Vector3 gravity.
      new (await import("@babylonjs/core")).Vector3(...gravity),
      plugin,
    );
    return true;
  } catch (err) {
    console.warn("[physics] enablePhysics failed — running without physics.", err);
    return false;
  }
}
