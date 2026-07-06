/**
 * SkyLayer — atmospheric additions above the nebula, below the wave overlay.
 *
 *   • Aurora ribbon: a slow-morphing gradient blob near the top-third that
 *     shifts hue on a very long loop.
 *   • Shooting stars: random meteor streaks at random angles, ~1 every 3-7s.
 *   • Stardust fall: slow-drifting sparkles falling from the top (like snow
 *     but far more sparse than Bubbles which rises).
 *   • Distant lightning: rare soft radial-gradient flash at the horizon
 *     (every 20-45s), reads as bloom from a distant storm.
 *
 * One canvas + one SVG. Cheap, additive.
 */
import { useEffect, useRef } from "react";

type Shooter = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  len: number;
  hue: number;
};

type Dust = { x: number; y: number; vy: number; s: number; hue: number };

export default function SkyLayer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = window.innerWidth;
    let h = window.innerHeight;
    const fit = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w;
      canvas.height = h;
    };
    fit();
    window.addEventListener("resize", fit);

    const shooters: Shooter[] = [];
    const dust: Dust[] = Array.from({ length: 60 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vy: 0.15 + Math.random() * 0.35,
      s: 0.5 + Math.random() * 1.4,
      hue: Math.random() > 0.55 ? 200 : Math.random() > 0.5 ? 285 : 55,
    }));

    let nextShooter = performance.now() + 2000 + Math.random() * 4000;
    let flashOpacity = 0;
    let flashX = 0;
    let flashY = 0;
    let nextFlash = performance.now() + 20000 + Math.random() * 25000;

    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ctx.clearRect(0, 0, w, h);

      // Stardust
      ctx.globalCompositeOperation = "lighter";
      dust.forEach((d) => {
        d.y += d.vy;
        d.x += Math.sin(now / 3000 + d.x * 0.02) * 0.1;
        if (d.y > h) {
          d.y = -4;
          d.x = Math.random() * w;
        }
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.s, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${d.hue}, 100%, 80%, 0.55)`;
        ctx.fill();
      });

      // Spawn shooting stars
      if (now > nextShooter) {
        const startX = Math.random() * w;
        const angle = (Math.PI / 2) * 0.7 + (Math.random() - 0.5) * 0.6; // mostly downward-right
        const speed = 12 + Math.random() * 8;
        shooters.push({
          x: startX,
          y: -30,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          len: 90 + Math.random() * 130,
          hue: 180 + Math.random() * 100,
        });
        nextShooter = now + 3000 + Math.random() * 5000;
      }
      // Update + draw shooting stars
      for (let i = shooters.length - 1; i >= 0; i--) {
        const s = shooters[i];
        s.x += s.vx;
        s.y += s.vy;
        s.life -= dt * 0.5;
        if (s.life <= 0 || s.x > w + 100 || s.y > h + 100) {
          shooters.splice(i, 1);
          continue;
        }
        // trail
        const tx = s.x - Math.sign(s.vx) * s.len;
        const ty = s.y - Math.sign(s.vy) * s.len * 0.6;
        const grad = ctx.createLinearGradient(tx, ty, s.x, s.y);
        grad.addColorStop(0, `hsla(${s.hue}, 100%, 78%, 0)`);
        grad.addColorStop(1, `hsla(${s.hue}, 100%, 85%, ${s.life})`);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(s.x, s.y);
        ctx.stroke();
        // head
        ctx.beginPath();
        ctx.arc(s.x, s.y, 2.4, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${s.hue}, 100%, 90%, ${s.life})`;
        ctx.fill();
      }

      // Distant lightning flash
      if (now > nextFlash) {
        flashOpacity = 0.55 + Math.random() * 0.35;
        flashX = Math.random() * w;
        flashY = h * (0.5 + Math.random() * 0.35);
        nextFlash = now + 20000 + Math.random() * 25000;
      }
      if (flashOpacity > 0.01) {
        flashOpacity *= 0.9;
        const g = ctx.createRadialGradient(flashX, flashY, 0, flashX, flashY, 380);
        g.addColorStop(0, `rgba(220,235,255,${flashOpacity})`);
        g.addColorStop(0.4, `rgba(120,180,255,${flashOpacity * 0.4})`);
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(flashX, flashY, 380, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", fit);
    };
  }, []);

  return (
    <>
      {/* Aurora ribbon — CSS-only for perf */}
      <div
        className="pointer-events-none fixed left-0 right-0"
        style={{
          top: "8%",
          height: "18vh",
          zIndex: -5,
          background:
            "linear-gradient(180deg, transparent 0%, rgba(0,242,255,0.18) 30%, rgba(124,58,237,0.14) 55%, rgba(236,72,153,0.10) 75%, transparent 100%)",
          filter: "blur(24px)",
          maskImage: "radial-gradient(ellipse 100% 90% at 50% 50%, black 0%, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 100% 90% at 50% 50%, black 0%, transparent 75%)",
          animation: "auroraWave 24s ease-in-out infinite alternate",
          mixBlendMode: "screen",
        }}
        aria-hidden
      />
      <canvas
        ref={canvasRef}
        className="pointer-events-none fixed inset-0"
        style={{ zIndex: 2 }}
        aria-hidden
      />
    </>
  );
}
