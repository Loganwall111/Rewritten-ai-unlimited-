/**
 * Curved-viewport chrome — soft rounded frame, edge vignette, corner light
 * nodes and top/bottom light-trail edges. Purely decorative (pointer-events
 * disabled). Makes the viewport feel like a spherical porthole.
 */
export default function CurvedViewport() {
  return (
    <>
      {/* 1 · deep inner shadow — sells the "spherical" feel */}
      <div
        className="pointer-events-none fixed inset-0"
        aria-hidden
        style={{
          zIndex: 90,
          borderRadius: "clamp(24px, 3vw, 48px)",
          boxShadow: `
            inset 0 0 120px 60px rgba(0,0,0,0.55),
            inset 0 0 260px 120px rgba(4,8,30,0.7),
            inset 0 0 30px rgba(120,180,255,0.18)
          `,
        }}
      />

      {/* 2 · thin bright frame */}
      <div
        className="pointer-events-none fixed inset-3"
        aria-hidden
        style={{
          zIndex: 91,
          borderRadius: "clamp(20px, 2.6vw, 42px)",
          border: "1px solid rgba(140,190,255,0.14)",
          boxShadow: "inset 0 0 1px rgba(220,240,255,0.35)",
        }}
      />

      {/* 3 · Top light-trail edge (SVG in a fixed-position wrapper) */}
      <div
        className="pointer-events-none fixed left-0 right-0 flex justify-center"
        style={{ top: 8, zIndex: 92 }}
        aria-hidden
      >
        <svg width="90%" height="20" viewBox="0 0 1000 20" preserveAspectRatio="none">
          <defs>
            <linearGradient id="frame-edge-top" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="rgba(180,220,255,0)" />
              <stop offset="12%" stopColor="rgba(180,220,255,0.7)" />
              <stop offset="50%" stopColor="rgba(230,245,255,0.95)" />
              <stop offset="88%" stopColor="rgba(180,220,255,0.7)" />
              <stop offset="100%" stopColor="rgba(180,220,255,0)" />
            </linearGradient>
          </defs>
          <path
            d="M 20 12 Q 500 -4 980 12"
            stroke="url(#frame-edge-top)"
            strokeWidth="1.6"
            fill="none"
            style={{ filter: "blur(0.6px)" }}
          />
          <path
            d="M 20 12 Q 500 -4 980 12"
            stroke="rgba(255,255,255,0.9)"
            strokeWidth="0.6"
            fill="none"
            opacity="0.85"
          />
        </svg>
      </div>

      {/* 4 · Bottom light-trail edge */}
      <div
        className="pointer-events-none fixed left-0 right-0 flex justify-center"
        style={{ bottom: 8, zIndex: 92 }}
        aria-hidden
      >
        <svg width="90%" height="20" viewBox="0 0 1000 20" preserveAspectRatio="none">
          <defs>
            <linearGradient id="frame-edge-bot" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="rgba(180,220,255,0)" />
              <stop offset="12%" stopColor="rgba(180,220,255,0.55)" />
              <stop offset="50%" stopColor="rgba(220,240,255,0.85)" />
              <stop offset="88%" stopColor="rgba(180,220,255,0.55)" />
              <stop offset="100%" stopColor="rgba(180,220,255,0)" />
            </linearGradient>
          </defs>
          <path
            d="M 20 8 Q 500 24 980 8"
            stroke="url(#frame-edge-bot)"
            strokeWidth="1.4"
            fill="none"
            style={{ filter: "blur(0.6px)" }}
          />
        </svg>
      </div>

      {/* 5 · Four corner light nodes */}
      {[
        { top: 14, left: 14 },
        { top: 14, right: 14 },
        { bottom: 14, left: 14 },
        { bottom: 14, right: 14 },
      ].map((pos, i) => (
        <div
          key={i}
          className="pointer-events-none fixed"
          style={{
            ...pos,
            zIndex: 93,
            width: 22,
            height: 22,
            borderRadius: "9999px",
            background:
              "radial-gradient(circle at 50% 50%, rgba(230,245,255,0.95) 0%, rgba(140,190,255,0.35) 55%, transparent 100%)",
            filter: "blur(0.5px)",
          }}
          aria-hidden
        />
      ))}
    </>
  );
}
