/**
 * visionOS-style curved glass chrome bar with light-trail edges + corner glow
 * nodes. Used as the top nav ribbon and bottom pager on the billing scene.
 *
 * The bar is an SVG that draws its own subtle downward/upward arc (so the ends
 * feel like they're bending back toward the viewer), with a rasterized glass
 * fill and specular top-highlight line. Content sits absolutely above it.
 */
import { type ReactNode } from "react";

export function CurvedChromeBar({
  children,
  variant = "top",
  className = "",
}: {
  children: ReactNode;
  variant?: "top" | "bottom";
  className?: string;
}) {
  // arc control point offset — top bar sags slightly, bottom bar rises
  const arcY = variant === "top" ? 22 : -22;
  const barPath = `M 40 40 Q 500 ${40 + arcY} 960 40`;

  return (
    <div
      className={`relative w-full flex items-center justify-center ${className}`}
      style={{ perspective: 1400 }}
    >
      <div
        className="relative"
        style={{
          transformStyle: "preserve-3d",
          transform:
            variant === "top" ? "rotateX(18deg) translateZ(0)" : "rotateX(-18deg) translateZ(0)",
        }}
      >
        <svg
          width="1000"
          height="80"
          viewBox="0 0 1000 80"
          className="drop-shadow-[0_0_40px_rgba(120,180,255,0.35)]"
          aria-hidden
        >
          <defs>
            <linearGradient id={`glass-${variant}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="rgba(255,255,255,0.09)" />
              <stop offset="50%" stopColor="rgba(15,25,45,0.85)" />
              <stop offset="100%" stopColor="rgba(5,10,25,0.9)" />
            </linearGradient>
            <linearGradient id={`edge-${variant}`} x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="rgba(180,220,255,0)" />
              <stop offset="15%" stopColor="rgba(180,220,255,0.85)" />
              <stop offset="50%" stopColor="rgba(200,230,255,1)" />
              <stop offset="85%" stopColor="rgba(180,220,255,0.85)" />
              <stop offset="100%" stopColor="rgba(180,220,255,0)" />
            </linearGradient>
            <radialGradient id={`node-${variant}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(230,240,255,1)" />
              <stop offset="60%" stopColor="rgba(140,180,255,0.55)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0)" />
            </radialGradient>
            <filter id={`edge-blur-${variant}`}>
              <feGaussianBlur stdDeviation="0.6" />
            </filter>
          </defs>

          {/* pill body */}
          <path
            d={`
              M 60 20
              Q 500 ${20 + arcY} 940 20
              L 940 60
              Q 500 ${60 + arcY} 60 60
              Z
            `}
            fill={`url(#glass-${variant})`}
            stroke="rgba(140,180,255,0.15)"
            strokeWidth="0.6"
          />

          {/* top specular light-trail */}
          <path
            d={barPath}
            stroke={`url(#edge-${variant})`}
            strokeWidth="1.4"
            fill="none"
            filter={`url(#edge-blur-${variant})`}
          />
          <path
            d={barPath}
            stroke="rgba(255,255,255,0.9)"
            strokeWidth="0.6"
            fill="none"
            opacity="0.9"
          />

          {/* bottom edge glow (softer) */}
          <path
            d={`M 60 ${variant === "top" ? 60 : 60} Q 500 ${
              (variant === "top" ? 60 : 60) + arcY
            } 940 ${variant === "top" ? 60 : 60}`}
            stroke="rgba(120,170,255,0.35)"
            strokeWidth="0.8"
            fill="none"
          />

          {/* corner light-nodes */}
          <circle cx="60" cy={40 + arcY / 2} r="7" fill={`url(#node-${variant})`} />
          <circle cx="940" cy={40 + arcY / 2} r="7" fill={`url(#node-${variant})`} />
          <circle cx="60" cy={40 + arcY / 2} r="2" fill="#eaf3ff" />
          <circle cx="940" cy={40 + arcY / 2} r="2" fill="#eaf3ff" />
        </svg>

        {/* content overlaid on the bar */}
        <div className="absolute inset-0 flex items-center justify-center px-14">
          <div className="flex items-center gap-8 text-[#E0F7FA]">{children}</div>
        </div>
      </div>
    </div>
  );
}
