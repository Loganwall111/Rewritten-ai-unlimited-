/**
 * Gravitational lensing SVG filter primitives.
 * Mount once at app root; apply to any element via `filter: url(#gravitational-lens)`
 * or the `.lens-warp` / `.lens-warp-strong` utility classes.
 *
 * Uses feTurbulence + feDisplacementMap to create a subtle spacetime-warp
 * distortion, animated slowly to feel alive.
 */
export function GravitationalLensDefs() {
  return (
    <svg
      aria-hidden
      className="pointer-events-none fixed inset-0 w-0 h-0"
      style={{ position: "fixed", width: 0, height: 0 }}
    >
      <defs>
        <filter id="gravitational-lens" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.008 0.012" numOctaves="2" seed="7">
            <animate
              attributeName="baseFrequency"
              dur="24s"
              values="0.008 0.012;0.014 0.018;0.008 0.012"
              repeatCount="indefinite"
            />
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" scale="6" />
        </filter>

        <filter id="gravitational-lens-strong" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" seed="3">
            <animate
              attributeName="baseFrequency"
              dur="12s"
              values="0.02;0.035;0.02"
              repeatCount="indefinite"
            />
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" scale="18" />
          <feGaussianBlur stdDeviation="0.3" />
        </filter>

        <radialGradient id="lens-halo" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(0,242,255,0)" />
          <stop offset="70%" stopColor="rgba(0,242,255,0.15)" />
          <stop offset="90%" stopColor="rgba(124,58,237,0.25)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.6)" />
        </radialGradient>
      </defs>
    </svg>
  );
}

/**
 * Wrap children in a positioned container that gets the lens filter.
 * Used around the giant microphone and dashboard content.
 */
export function LensWrap({
  children,
  strong = false,
  className = "",
}: {
  children: React.ReactNode;
  strong?: boolean;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <div
        className="pointer-events-none absolute inset-0 rounded-full opacity-70"
        style={{ background: "url(#lens-halo)" }}
      />
      <div className={strong ? "lens-warp-strong" : "lens-warp"}>{children}</div>
    </div>
  );
}
