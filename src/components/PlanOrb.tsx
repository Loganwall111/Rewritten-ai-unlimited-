/**
 * Billing plan orb — wraps LiquidOrb with a click handler, floating label
 * card, and a hover-reveal feature list. Real animated interior (metaball
 * plasma + ripples) provided by LiquidOrb.
 */
import { useState } from "react";
import { Loader2, Check } from "lucide-react";
import LiquidOrb from "./LiquidOrb";

export type PlanOrbProps = {
  id: string;
  name: string;
  price: string;
  period?: string;
  features: string[];
  featured?: boolean;
  isCurrent?: boolean;
  busy?: boolean;
  hue: number;
  onCheckout: () => void;
  parallaxIntensity?: number;
};

export default function PlanOrb({
  name,
  price,
  period,
  features,
  featured = false,
  isCurrent = false,
  busy = false,
  hue,
  onCheckout,
}: PlanOrbProps) {
  const [hover, setHover] = useState(false);
  const size = featured ? 340 : 220;

  return (
    <div
      className="relative flex flex-col items-center select-none"
      style={{ width: size, perspective: 1200 }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <button
        onClick={onCheckout}
        disabled={busy || isCurrent}
        className="orb-btn group relative rounded-full focus:outline-none focus:ring-2 focus:ring-[#00F2FF]/60"
        style={{
          width: size,
          height: size,
          cursor: isCurrent ? "default" : busy ? "wait" : "pointer",
        }}
        aria-label={`Choose ${name} plan`}
      >
        <LiquidOrb
          size={size}
          hue={hue}
          hue2={(hue + 45) % 360}
          intensity={featured ? 1.3 : 1}
          glow={featured ? 1.35 : 1}
          wireframe={featured}
          active={isCurrent}
          index={featured ? 0 : hue % 5}
        >
          {featured ? (
            <div className="flex flex-col items-center text-center pointer-events-none">
              <div
                className="text-[#F0FBFF] text-xl md:text-2xl font-light tracking-wide"
                style={{
                  fontFamily: "var(--font-display)",
                  textShadow: "0 2px 8px rgba(0,0,0,0.8)",
                }}
              >
                {name}
              </div>
              <div className="mt-1 flex items-baseline gap-1 text-[#F0FBFF]">
                <span
                  className="text-3xl font-medium"
                  style={{ textShadow: "0 2px 8px rgba(0,0,0,0.8)" }}
                >
                  {price}
                </span>
                {period && <span className="text-xs opacity-70">{period}</span>}
              </div>
              <div className="mt-3 w-8 h-8 rounded-full border border-white/60 flex items-center justify-center text-white/90 text-lg group-hover:bg-white/10 transition-colors">
                →
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center pointer-events-none">
              <div
                className="text-[#F0FBFF]/95 text-sm md:text-base font-light tracking-wider"
                style={{
                  fontFamily: "var(--font-display)",
                  textShadow: "0 2px 6px rgba(0,0,0,0.85)",
                }}
              >
                {name}
              </div>
              <div
                className="mt-0.5 flex items-baseline gap-0.5 text-[#F0FBFF]"
                style={{ textShadow: "0 2px 6px rgba(0,0,0,0.85)" }}
              >
                <span className="text-xl font-medium">{price}</span>
                {period && <span className="text-[10px] opacity-80">{period}</span>}
              </div>
              {isCurrent && (
                <div
                  className="mt-1 text-[9px] tracking-[0.25em] uppercase text-white/95"
                  style={{ textShadow: "0 2px 6px rgba(0,0,0,0.85)" }}
                >
                  Current
                </div>
              )}
              {busy && <Loader2 className="mt-1 w-4 h-4 text-white/90 animate-spin" />}
            </div>
          )}
        </LiquidOrb>
      </button>

      {/* Reflection */}
      <div
        className="pointer-events-none -mt-2"
        style={{
          width: size * 0.75,
          height: 40,
          background: `radial-gradient(ellipse at center, hsla(${hue},90%,65%,0.5) 0%, hsla(${hue},80%,55%,0.15) 40%, transparent 70%)`,
          filter: "blur(8px)",
          opacity: hover ? 0.9 : 0.55,
          transition: "opacity 0.3s ease",
        }}
      />

      {/* Feature list on hover */}
      <div
        className="absolute left-1/2 -translate-x-1/2 z-20 glass-panel-strong rounded-2xl px-4 py-3 min-w-[240px] transition-all duration-300 pointer-events-none"
        style={{
          top: size + 30,
          opacity: hover ? 1 : 0,
          transform: `translateX(-50%) translateY(${hover ? 0 : 8}px)`,
        }}
      >
        <ul className="space-y-1.5">
          {features.map((f) => (
            <li key={f} className="flex gap-2 text-[11px] text-[#E0F7FA]/80 leading-tight">
              <Check className="w-3 h-3 text-[#00F2FF] flex-shrink-0 mt-0.5" />
              {f}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
