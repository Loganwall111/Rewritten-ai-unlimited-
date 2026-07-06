/**
 * God-rays / volumetric light shafts streaming down from the top of the scene.
 * Pure SVG (cheap, no shaders) — 12 tapered gradient beams with slight radial
 * spread and gentle sway. Blended with `screen` so they lift the dark
 * background without washing it out.
 */
import { useMemo } from "react";

export default function GodRays({
  intensity = 1,
  origin = 0.5, // horizontal origin 0..1
}: {
  intensity?: number;
  origin?: number;
}) {
  const rays = useMemo(() => {
    const N = 14;
    return Array.from({ length: N }, (_, i) => {
      const spread = 620; // px total angular spread
      const x = (i / (N - 1) - 0.5) * spread;
      const width = 60 + Math.random() * 90;
      const delay = -Math.random() * 8;
      const dur = 10 + Math.random() * 8;
      return { x, width, delay, dur, seed: Math.random() };
    });
  }, []);

  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden"
      style={{
        zIndex: -6,
        mixBlendMode: "screen",
        opacity: intensity * 0.55,
      }}
      aria-hidden
    >
      <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" className="w-full h-full">
        <defs>
          <linearGradient id="ray-fade" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(180,220,255,0.85)" />
            <stop offset="40%" stopColor="rgba(120,180,255,0.35)" />
            <stop offset="80%" stopColor="rgba(60,110,200,0.08)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </linearGradient>
          <linearGradient id="ray-fade-warm" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(255,215,150,0.6)" />
            <stop offset="45%" stopColor="rgba(210,150,255,0.25)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </linearGradient>
          <filter id="ray-blur">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>

        <g filter="url(#ray-blur)">
          {rays.map((r, i) => {
            const cx = origin * 1600 + r.x;
            // Trapezoidal ray: narrow at top, wide at bottom
            const topW = r.width * 0.15;
            const botW = r.width * 1.6;
            const isWarm = i % 5 === 2;
            return (
              <g key={i}>
                <polygon
                  points={`${cx - topW / 2},-40 ${cx + topW / 2},-40 ${
                    cx + botW / 2
                  },940 ${cx - botW / 2},940`}
                  fill={isWarm ? "url(#ray-fade-warm)" : "url(#ray-fade)"}
                  style={{
                    transformOrigin: `${cx}px 0px`,
                    animation: `raySway ${r.dur}s ease-in-out ${r.delay}s infinite alternate, rayFlicker ${
                      r.dur * 0.6
                    }s ease-in-out ${r.delay}s infinite`,
                  }}
                />
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
