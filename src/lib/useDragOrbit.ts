/**
 * Global 6DOF-ish navigation tracker.
 *
 * Exposes normalized offsets consumed by:
 *   • R3F camera (DragCamera in BackgroundScene3D)  — orbits + dollies scene
 *   • DOM parallax (AppShell)                       — tilts + translates UI
 *   • LiquidOrbs                                    — bob + tilt
 *   • PerspectiveGrid                               — parallax-shifts
 *   • Sidebar orbs                                  — tilt
 *
 * Controls:
 *   • Pointer drag on empty space  → yaw / pitch orbit
 *   • Scroll wheel                 → dolly in / out (z-depth)
 *   • WASD / arrow keys            → strafe (also feeds yaw/pitch)
 *   • Shift while dragging         → boost sensitivity
 *   • Auto-damping back toward 0   → the world "recentres" when idle
 *
 * Singleton state — one RAF loop for the whole app.
 */

import { useEffect, useMemo } from "react";

type Val = { get: () => number };

const state = {
  // eased-to values consumed by camera / parallax
  x: 0,
  y: 0,
  z: 0, // -1 → close, +1 → pulled back
  // target values (what input pushes toward)
  tx: 0,
  ty: 0,
  tz: 0,
  // pointer drag state
  dragging: false,
  lastX: 0,
  lastY: 0,
  // key state
  keys: { w: false, a: false, s: false, d: false, shift: false } as Record<string, boolean>,
  initialized: false,
  // velocity for momentum
  vx: 0,
  vy: 0,
};

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function ensureListeners() {
  if (state.initialized || typeof window === "undefined") return;
  state.initialized = true;

  const isInteractive = (t: EventTarget | null): boolean => {
    const el = t as HTMLElement | null;
    return Boolean(
      el?.closest("button, a, input, textarea, select, [role='dialog'], [contenteditable='true']"),
    );
  };

  const onDown = (e: PointerEvent) => {
    if (isInteractive(e.target)) return;
    state.dragging = true;
    state.lastX = e.clientX;
    state.lastY = e.clientY;
    state.vx = 0;
    state.vy = 0;
  };
  const onMove = (e: PointerEvent) => {
    if (!state.dragging) {
      // subtle hover parallax when not dragging
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      state.tx = nx * 0.22;
      state.ty = ny * 0.22;
      return;
    }
    const boost = state.keys.shift ? 2.2 : 1;
    const dx = (e.clientX - state.lastX) * boost;
    const dy = (e.clientY - state.lastY) * boost;
    state.lastX = e.clientX;
    state.lastY = e.clientY;
    // wider range: -1.5 .. 1.5 (previously -1 .. 1)
    state.tx = clamp(state.tx + (dx / window.innerWidth) * 3, -1.5, 1.5);
    state.ty = clamp(state.ty + (dy / window.innerHeight) * 3, -1.5, 1.5);
    // momentum
    state.vx = dx * 0.0035;
    state.vy = dy * 0.0035;
  };
  const onUp = () => {
    state.dragging = false;
  };

  // Wheel → dolly (z). Ignored over scrollable elements (they set overflow).
  const onWheel = (e: WheelEvent) => {
    if (isInteractive(e.target)) return;
    const target = e.target as HTMLElement | null;
    // Let native scroll happen inside real scroll containers
    if (target?.closest("[data-scroll], .overflow-auto, .overflow-y-auto, .overflow-x-auto"))
      return;
    e.preventDefault();
    state.tz = clamp(state.tz + e.deltaY * 0.001, -1, 1);
  };

  // Keyboard navigation
  const onKey = (down: boolean) => (e: KeyboardEvent) => {
    // Don't hijack typing
    const t = e.target as HTMLElement | null;
    if (t && ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) return;
    if (t?.getAttribute("contenteditable") === "true") return;
    const k = e.key.toLowerCase();
    if (k === "w" || k === "arrowup") state.keys.w = down;
    else if (k === "s" || k === "arrowdown") state.keys.s = down;
    else if (k === "a" || k === "arrowleft") state.keys.a = down;
    else if (k === "d" || k === "arrowright") state.keys.d = down;
    else if (k === "shift") state.keys.shift = down;
    else if (k === " " && down) {
      // spacebar → recenter
      state.tx = state.ty = state.tz = 0;
    }
  };

  window.addEventListener("pointerdown", onDown);
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onUp);
  window.addEventListener("wheel", onWheel, { passive: false });
  window.addEventListener("keydown", onKey(true));
  window.addEventListener("keyup", onKey(false));

  // RAF loop: apply momentum + keys + easing
  const loop = () => {
    // Apply momentum after release
    if (!state.dragging) {
      state.tx = clamp(state.tx + state.vx, -1.5, 1.5);
      state.ty = clamp(state.ty + state.vy, -1.5, 1.5);
      state.vx *= 0.94;
      state.vy *= 0.94;
    }
    // Keys — persistent push
    const kb = 0.012;
    if (state.keys.a) state.tx = clamp(state.tx - kb, -1.5, 1.5);
    if (state.keys.d) state.tx = clamp(state.tx + kb, -1.5, 1.5);
    if (state.keys.w) state.ty = clamp(state.ty - kb, -1.5, 1.5);
    if (state.keys.s) state.ty = clamp(state.ty + kb, -1.5, 1.5);
    // Ease actual → target
    state.x += (state.tx - state.x) * 0.09;
    state.y += (state.ty - state.y) * 0.09;
    state.z += (state.tz - state.z) * 0.06;
    // When idle (no drag, no keys), slow drift back to center
    const anyKey = state.keys.w || state.keys.a || state.keys.s || state.keys.d;
    if (!state.dragging && !anyKey) {
      state.tx *= 0.9975;
      state.ty *= 0.9975;
      state.tz *= 0.995;
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

export function useDragOrbit(): { x: Val; y: Val; z: Val } {
  useEffect(() => {
    ensureListeners();
  }, []);
  return useMemo<{ x: Val; y: Val; z: Val }>(
    () => ({
      x: { get: () => state.x },
      y: { get: () => state.y },
      z: { get: () => state.z },
    }),
    [],
  );
}

export function readDragOrbit() {
  ensureListeners();
  return state;
}
