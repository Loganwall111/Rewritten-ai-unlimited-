/**
 * LiquidOrb — a glass sphere with an ACTUAL animated plasma/ripple interior.
 *
 * Layers (back → front):
 *   1. Slow conic-gradient aura (rotates, blurred — Siri-orb feel)
 *   2. Canvas-2D plasma: multi-source metaball blobs orbiting inside a
 *      masked circle, additively blended → looks like glowing fluid.
 *   3. Expanding ripple rings (spawn randomly, fade out)
 *   4. Bright core pulse (breathes with time)
 *   5. Refractive top-left specular highlight arc
 *   6. Equator rim-light (glass edge)
 *   7. Outer chromatic glow ring (intensifies on hover)
 *   8. Icon / label overlay
 *
 * Reused across: sidebar tabs, landing feature orbs, home tiles,
 * billing plan orbs, landing sign-in/sign-up orb-buttons, auth "enter"
 * button. Same knobs (`hue`, `size`, `intensity`) everywhere.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { readDragOrbit } from "@/lib/useDragOrbit";

export type LiquidOrbProps = {
  size?: number;
  hue?: number;
  hue2?: number;
  /** 0..1 — how vigorous the plasma churns */
  intensity?: number;
  /** amplifies the outer glow */
  glow?: number;
  /** turn the plasma interior on/off (keeps the shell) */
  liquid?: boolean;
  /** overlay content (icon, label) */
  children?: ReactNode;
  /** if true, orb visually reacts to the shared drag state (bob + tilt) */
  reactive?: boolean;
  /** used by reactive parallax to phase-shift bobbing per orb */
  index?: number;
  /** stronger emissive when active/current */
  active?: boolean;
  /** wireframe center orb (matches featured billing plan) */
  wireframe?: boolean;
  className?: string;
};

export default function LiquidOrb({
  size = 130,
  hue = 210,
  hue2,
  intensity = 1,
  glow = 1,
  liquid = true,
  children,
  reactive = true,
  index = 0,
  active = false,
  wireframe = false,
  className = "",
}: LiquidOrbProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hover, setHover] = useState(false);
  const h2 = hue2 ?? (hue + 55) % 360;

  /* ── Reactive bob + drag-parallax tilt ── */
  useEffect(() => {
    if (!reactive) return;
    let raf = 0;
    const seed = index * 0.7;
    const tick = (t: number) => {
      const el = wrapRef.current;
      if (el) {
        const d = readDragOrbit();
        const bob = Math.sin(t / 1100 + seed) * 3;
        const rotY = d.x * 12;
        const rotX = -d.y * 9;
        el.style.transform = `translateY(${bob}px) rotateX(${rotX}deg) rotateY(${rotY}deg)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reactive, index]);

  /* ── Plasma interior (canvas) ──
   * Six orbiting metaballs blended additively inside a circular mask, then a
   * layer of expanding ripples on top. Runs at internal resolution `res` for
   * performance (upscaled by the fixed CSS size). */
  useEffect(() => {
    if (!liquid || wireframe) return;
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const res = 160;
    c.width = res;
    c.height = res;

    type Blob = { a: number; r: number; sp: number; rad: number; hueOff: number };
    const blobs: Blob[] = Array.from({ length: 6 }, (_, i) => ({
      a: (i / 6) * Math.PI * 2 + Math.random(),
      r: 30 + Math.random() * 30,
      sp: 0.3 + Math.random() * 0.6,
      rad: 42 + Math.random() * 22,
      hueOff: (Math.random() - 0.5) * 45,
    }));

    type Ripple = { r: number; life: number; hueOff: number };
    let ripples: Ripple[] = [];
    let lastRipple = 0;

    let raf = 0;
    let last = performance.now();
    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ctx.globalCompositeOperation = "source-over";
      ctx.clearRect(0, 0, res, res);

      // Clip everything to the orb circle
      ctx.save();
      ctx.beginPath();
      ctx.arc(res / 2, res / 2, res / 2 - 2, 0, Math.PI * 2);
      ctx.clip();

      // Dark interior fill so blobs read as luminous fluid
      const bgGrad = ctx.createRadialGradient(res / 2, res / 2, 0, res / 2, res / 2, res / 2);
      bgGrad.addColorStop(0, `hsl(${hue}, 60%, 8%)`);
      bgGrad.addColorStop(1, "rgba(2,4,10,1)");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, res, res);

      // Plasma metaballs (additive)
      ctx.globalCompositeOperation = "lighter";
      blobs.forEach((b) => {
        b.a += dt * b.sp * intensity;
        const bx = res / 2 + Math.cos(b.a) * b.r;
        const by = res / 2 + Math.sin(b.a * 1.3) * b.r * 0.85;
        const g = ctx.createRadialGradient(bx, by, 0, bx, by, b.rad);
        const localHue = hue + b.hueOff;
        g.addColorStop(0, `hsla(${localHue}, 100%, 78%, 0.95)`);
        g.addColorStop(0.4, `hsla(${(localHue + 20) % 360}, 100%, 60%, 0.55)`);
        g.addColorStop(1, "hsla(0, 0%, 0%, 0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(bx, by, b.rad, 0, Math.PI * 2);
        ctx.fill();
      });

      // Ripples — spawn every ~700ms, expand + fade
      if (now - lastRipple > 500 + Math.random() * 400) {
        ripples.push({ r: 4, life: 1, hueOff: (Math.random() - 0.5) * 40 });
        lastRipple = now;
      }
      ripples.forEach((r) => {
        r.r += dt * 55 * intensity;
        r.life -= dt * 0.9;
        if (r.life > 0) {
          ctx.strokeStyle = `hsla(${hue + r.hueOff}, 100%, 75%, ${r.life * 0.55})`;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.arc(res / 2, res / 2, r.r, 0, Math.PI * 2);
          ctx.stroke();
        }
      });
      ripples = ripples.filter((r) => r.life > 0);

      // Bright breathing core
      const pulse = 0.6 + 0.4 * Math.sin(now / 800);
      const coreG = ctx.createRadialGradient(res / 2, res / 2, 0, res / 2, res / 2, 18 + pulse * 6);
      coreG.addColorStop(0, `hsla(${hue}, 100%, 92%, ${0.55 * pulse})`);
      coreG.addColorStop(1, "hsla(0, 0%, 0%, 0)");
      ctx.fillStyle = coreG;
      ctx.fillRect(0, 0, res, res);

      ctx.restore();
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [liquid, wireframe, hue, intensity]);

  const shellShadow = active
    ? `inset -${size * 0.11}px -${size * 0.15}px ${size * 0.3}px rgba(0,0,0,0.55),
       0 0 ${40 * glow}px hsla(${hue},95%,65%,0.85),
       0 0 ${18 * glow}px hsla(${hue},95%,65%,0.6)`
    : `inset -${size * 0.11}px -${size * 0.15}px ${size * 0.3}px rgba(0,0,0,0.55),
       0 ${size * 0.12}px ${size * 0.35}px hsla(${hue},80%,55%,${0.4 * glow})`;

  return (
    <div
      className={`relative ${className}`}
      style={{ width: size, height: size, perspective: 1000 }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div
        ref={wrapRef}
        className="relative rounded-full will-change-transform"
        style={{
          width: size,
          height: size,
          transformStyle: "preserve-3d",
          transition: "transform 0.06s linear, filter 0.4s ease",
          filter: hover
            ? `drop-shadow(0 ${size * 0.15}px ${size * 0.4}px hsla(${hue},90%,60%,${0.55 * glow}))`
            : `drop-shadow(0 ${size * 0.1}px ${size * 0.3}px hsla(${hue},80%,50%,${0.35 * glow}))`,
        }}
      >
        {/* 1 · rotating conic aura (Siri-style) */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: `conic-gradient(from 0deg, hsl(${hue},100%,70%), hsl(${h2},100%,65%), hsl(${hue},100%,70%))`,
            filter: `blur(${size * 0.08}px)`,
            opacity: 0.55,
            animation: `siriConic ${wireframe ? 20 : 12}s linear infinite`,
          }}
        />

        {/* 2 · glass shell + plasma interior */}
        <div
          className="absolute rounded-full overflow-hidden"
          style={{
            inset: 3,
            background: wireframe
              ? "radial-gradient(circle at 50% 50%, rgba(20,30,55,0.55) 0%, rgba(5,8,20,0.9) 80%)"
              : `radial-gradient(circle at 35% 30%, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.1) 12%, hsla(${hue},85%,55%,0.35) 40%, hsla(${h2},90%,25%,0.4) 78%, rgba(3,5,15,0.98) 100%)`,
            boxShadow: shellShadow,
          }}
        >
          {/* the animated plasma canvas fills the shell */}
          {liquid && !wireframe && (
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full"
              style={{
                mixBlendMode: "screen",
                opacity: 0.95,
              }}
            />
          )}

          {/* Wireframe globe (for center/featured variants) */}
          {wireframe && (
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 200 200"
            >
              <defs>
                <radialGradient id={`wf-${hue}-${size}`} cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.9)" />
                  <stop offset="70%" stopColor="rgba(255,255,255,0.35)" />
                  <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                </radialGradient>
                <mask id={`wm-${hue}-${size}`}>
                  <circle cx="100" cy="100" r="95" fill={`url(#wf-${hue}-${size})`} />
                </mask>
              </defs>
              <g
                mask={`url(#wm-${hue}-${size})`}
                stroke="rgba(220,240,255,0.55)"
                strokeWidth="0.35"
                fill="none"
              >
                {Array.from({ length: 12 }, (_, i) => {
                  const rx = Math.abs(Math.cos((i / 12) * Math.PI)) * 95 + 2;
                  return <ellipse key={`m${i}`} cx="100" cy="100" rx={rx} ry="95" />;
                })}
                {Array.from({ length: 11 }, (_, i) => {
                  const y = 10 + i * 18;
                  const dy = y - 100;
                  const rx = Math.sqrt(Math.max(0, 95 * 95 - dy * dy));
                  return <ellipse key={`p${i}`} cx="100" cy={y} rx={rx} ry={rx * 0.15} />;
                })}
              </g>
            </svg>
          )}
        </div>

        {/* 3 · Specular top-left highlight arc */}
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            top: "6%",
            left: "12%",
            width: "58%",
            height: "38%",
            background:
              "radial-gradient(ellipse at 30% 30%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.4) 25%, transparent 60%)",
            filter: "blur(3px)",
            transform: "rotate(-25deg)",
          }}
        />

        {/* Small secondary highlight (adds HD wet look) */}
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            bottom: "18%",
            right: "22%",
            width: "20%",
            height: "12%",
            background:
              "radial-gradient(ellipse at center, rgba(255,255,255,0.55) 0%, transparent 65%)",
            filter: "blur(2px)",
          }}
        />

        {/* 4 · Rim-light */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: `radial-gradient(circle at 50% 50%, transparent 62%, rgba(180,220,255,0.28) 72%, rgba(200,225,255,0.6) 82%, transparent 88%)`,
          }}
        />

        {/* 5 · Chromatic outer glow */}
        <div
          className="absolute rounded-full pointer-events-none transition-opacity duration-500"
          style={{
            inset: -Math.max(6, size * 0.06),
            opacity: hover ? 1 : 0.35 + (active ? 0.5 : 0),
            background: `radial-gradient(circle at 50% 50%, transparent 55%, hsla(${hue},95%,70%,${0.5 * glow}) 68%, hsla(${h2},95%,60%,${0.25 * glow}) 78%, transparent 88%)`,
            filter: `blur(${size * 0.06}px)`,
          }}
        />

        {/* 6 · Content overlay */}
        {children && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
