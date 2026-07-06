/**
 * Programmatic portal-dive trigger. The `<PortalDive/>` component listens for
 * this custom event and fires a burst centered on the given coords.
 *
 *   dispatchPortalDive(x, y, hue)  →  fires the mini wormhole burst
 *
 * `hue` tints the streaks so each orb dives with its own color.
 */
export type PortalDiveDetail = { x: number; y: number; hue?: number };

export function dispatchPortalDive(x: number, y: number, hue?: number) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<PortalDiveDetail>("portal-dive", {
      detail: { x, y, hue },
    }),
  );
}
