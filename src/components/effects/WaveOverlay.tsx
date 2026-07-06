/**
 * Animated wavy overlay — an "ocean surface viewed from below" caustic layer
 * on top of the whole scene. Two SVG wave bands (top + bottom) plus a soft
 * caustic-noise layer that slowly drifts.  Blended with `screen`/`overlay`
 * so it liquifies whatever is behind without dimming it.
 */
export default function WaveOverlay() {
  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 4, mixBlendMode: "screen", opacity: 0.55 }}
      aria-hidden
    >
      {/* Caustic drifting SVG noise */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='600'><filter id='c'><feTurbulence type='fractalNoise' baseFrequency='0.012' numOctaves='2' seed='4'/><feColorMatrix values='0 0 0 0 0.4  0 0 0 0 0.85  0 0 0 0 1  0 0 0 1 0'/></filter><rect width='100%' height='100%' filter='url(%23c)' opacity='0.6'/></svg>\")",
          backgroundSize: "1000px 1000px",
          animation: "causticDrift 30s linear infinite",
          opacity: 0.45,
          mixBlendMode: "screen",
        }}
      />

      {/* Top wave band */}
      <svg
        className="absolute top-0 left-0 w-full"
        viewBox="0 0 1600 240"
        preserveAspectRatio="none"
        style={{ height: "22vh" }}
      >
        <defs>
          <linearGradient id="wave-top" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(180,220,255,0.9)" />
            <stop offset="60%" stopColor="rgba(80,140,220,0.35)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </linearGradient>
        </defs>
        <path
          d="M0,120 C200,180 400,60 800,120 C1200,180 1400,60 1600,120 L1600,0 L0,0 Z"
          fill="url(#wave-top)"
          opacity="0.55"
        >
          <animate
            attributeName="d"
            dur="14s"
            repeatCount="indefinite"
            values="
              M0,120 C200,180 400,60 800,120 C1200,180 1400,60 1600,120 L1600,0 L0,0 Z;
              M0,140 C200,80 400,180 800,110 C1200,60 1400,190 1600,120 L1600,0 L0,0 Z;
              M0,120 C200,180 400,60 800,120 C1200,180 1400,60 1600,120 L1600,0 L0,0 Z"
          />
        </path>
        <path
          d="M0,150 C300,200 500,110 800,160 C1100,210 1300,110 1600,150 L1600,0 L0,0 Z"
          fill="url(#wave-top)"
          opacity="0.28"
        >
          <animate
            attributeName="d"
            dur="18s"
            repeatCount="indefinite"
            values="
              M0,150 C300,200 500,110 800,160 C1100,210 1300,110 1600,150 L1600,0 L0,0 Z;
              M0,170 C300,110 500,200 800,140 C1100,100 1300,200 1600,160 L1600,0 L0,0 Z;
              M0,150 C300,200 500,110 800,160 C1100,210 1300,110 1600,150 L1600,0 L0,0 Z"
          />
        </path>
      </svg>

      {/* Bottom wave band (mirrored) */}
      <svg
        className="absolute bottom-0 left-0 w-full"
        viewBox="0 0 1600 240"
        preserveAspectRatio="none"
        style={{ height: "22vh" }}
      >
        <defs>
          <linearGradient id="wave-bot" x1="0" x2="0" y1="1" y2="0">
            <stop offset="0%" stopColor="rgba(140,190,255,0.7)" />
            <stop offset="60%" stopColor="rgba(70,110,200,0.3)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </linearGradient>
        </defs>
        <path
          d="M0,120 C200,60 400,180 800,120 C1200,60 1400,180 1600,120 L1600,240 L0,240 Z"
          fill="url(#wave-bot)"
          opacity="0.55"
        >
          <animate
            attributeName="d"
            dur="16s"
            repeatCount="indefinite"
            values="
              M0,120 C200,60 400,180 800,120 C1200,60 1400,180 1600,120 L1600,240 L0,240 Z;
              M0,140 C200,190 400,80 800,140 C1200,190 1400,80 1600,140 L1600,240 L0,240 Z;
              M0,120 C200,60 400,180 800,120 C1200,60 1400,180 1600,120 L1600,240 L0,240 Z"
          />
        </path>
      </svg>
    </div>
  );
}
