/**
 * BezelLens — gravitational-lens style distortion + chromatic refraction
 * ring around the whole viewport borders.
 *
 * Combines several tricks:
 *   1. A ring-shaped mask (transparent center, opaque edge band) applied to
 *      a `backdrop-filter` div that runs the underlying scene through
 *      `url(#bezel-warp)` — a big feTurbulence + feDisplacementMap filter.
 *      → the border of the app appears bent, like looking through the edge
 *      of a fisheye lens.
 *   2. On top of that, four chromatic edge-glow bands (top/bottom/left/right)
 *      with cyan/magenta split → refractive prism feel.
 *   3. Corner "singularities" — small dense radial gradients that read as
 *      pinch-points, adding a real gravitational-lens feel.
 *
 * Zero pointer-events; sits ABOVE the CurvedViewport bezel but below the
 * click-ripple layer.
 */
export default function BezelLens() {
  return (
    <>
      {/* SVG filter defs (mounted once) */}
      <svg
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{ width: 0, height: 0, position: "fixed" }}
      >
        <defs>
          <filter id="bezel-warp" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="0.006 0.008" numOctaves="2" seed="11">
              <animate
                attributeName="baseFrequency"
                dur="18s"
                repeatCount="indefinite"
                values="0.006 0.008;0.011 0.014;0.006 0.008"
              />
            </feTurbulence>
            <feDisplacementMap in="SourceGraphic" scale="22" />
          </filter>
          <filter id="bezel-warp-strong">
            <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" seed="5">
              <animate
                attributeName="baseFrequency"
                dur="10s"
                repeatCount="indefinite"
                values="0.02;0.033;0.02"
              />
            </feTurbulence>
            <feDisplacementMap in="SourceGraphic" scale="30" />
          </filter>
        </defs>
      </svg>

      {/* 1 · Warped border band — a wide ring that filters the DOM behind it */}
      <div
        className="pointer-events-none fixed inset-0"
        aria-hidden
        style={{
          zIndex: 94,
          // A mask that reveals only the outer ~72px, transparent inside
          WebkitMaskImage:
            "radial-gradient(ellipse 100% 100% at center, transparent 0%, transparent calc(100% - 90px), black calc(100% - 60px), black 100%)",
          maskImage:
            "radial-gradient(ellipse 100% 100% at center, transparent 0%, transparent calc(100% - 90px), black calc(100% - 60px), black 100%)",
          backdropFilter: "url(#bezel-warp) blur(1px)",
          WebkitBackdropFilter: "url(#bezel-warp) blur(1px)",
        }}
      />

      {/* 2 · Chromatic prism split — cyan on one edge-side, magenta on the other */}
      <div
        className="pointer-events-none fixed inset-0"
        aria-hidden
        style={{
          zIndex: 95,
          WebkitMaskImage:
            "radial-gradient(ellipse 100% 100% at center, transparent 0%, transparent calc(100% - 60px), black calc(100% - 30px), black 100%)",
          maskImage:
            "radial-gradient(ellipse 100% 100% at center, transparent 0%, transparent calc(100% - 60px), black calc(100% - 30px), black 100%)",
          background: `
            linear-gradient(180deg, rgba(0,242,255,0.14), transparent 25%, transparent 75%, rgba(236,72,153,0.14)),
            linear-gradient(90deg, rgba(0,242,255,0.10), transparent 25%, transparent 75%, rgba(124,58,237,0.12))
          `,
          mixBlendMode: "screen",
          animation: "bezelHueDrift 22s ease-in-out infinite alternate",
        }}
      />

      {/* 3 · Four glowing edge streaks that pulse along the seams */}
      {(["top", "bottom", "left", "right"] as const).map((edge) => (
        <div
          key={edge}
          className="pointer-events-none fixed"
          aria-hidden
          style={{
            zIndex: 96,
            ...(edge === "top" || edge === "bottom"
              ? { left: 40, right: 40, height: 2, [edge]: 20 }
              : { top: 40, bottom: 40, width: 2, [edge]: 20 }),
            background:
              edge === "top" || edge === "bottom"
                ? "linear-gradient(90deg, transparent, rgba(200,235,255,0.85) 40%, rgba(200,235,255,0.85) 60%, transparent)"
                : "linear-gradient(180deg, transparent, rgba(200,235,255,0.85) 40%, rgba(200,235,255,0.85) 60%, transparent)",
            filter: "blur(1.2px)",
            animation: `bezelEdgePulse 4.5s ease-in-out ${edge === "top" ? 0 : edge === "right" ? 1 : edge === "bottom" ? 2 : 3}s infinite`,
            opacity: 0.85,
          }}
        />
      ))}

      {/* 4 · Corner "singularities" — dense gravitational pinches */}
      {[
        { top: 6, left: 6 },
        { top: 6, right: 6 },
        { bottom: 6, left: 6 },
        { bottom: 6, right: 6 },
      ].map((pos, i) => (
        <div
          key={i}
          className="pointer-events-none fixed"
          aria-hidden
          style={{
            ...pos,
            zIndex: 97,
            width: 44,
            height: 44,
            borderRadius: "9999px",
            background:
              "radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(140,190,255,0.45) 30%, rgba(120,60,220,0.15) 70%, transparent 100%)",
            filter: "blur(2px)",
            animation: `bezelSingularity 6s ease-in-out ${i * 0.7}s infinite`,
          }}
        />
      ))}

      {/* 5 · Traveling light beads around the perimeter */}
      <BezelPerimeterBeads />
    </>
  );
}

/**
 * A handful of bright dots that ride around the perimeter of the viewport
 * on a rectangular path, animated via keyframes. Gives the frame a
 * "circuit-board / data-flowing" feel.
 */
function BezelPerimeterBeads() {
  const beads = [0, 0.25, 0.5, 0.75];
  return (
    <>
      {beads.map((offset, i) => (
        <div
          key={i}
          className="pointer-events-none fixed"
          aria-hidden
          style={{
            zIndex: 98,
            top: 20,
            left: 20,
            width: 6,
            height: 6,
            borderRadius: "9999px",
            background:
              "radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(0,242,255,0.9) 45%, transparent 90%)",
            boxShadow: "0 0 12px 3px rgba(0,242,255,0.85)",
            animation: `bezelBead 14s linear ${-offset * 14}s infinite`,
          }}
        />
      ))}
    </>
  );
}
