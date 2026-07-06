/**
 * Global click / touch ripple layer — dramatically upgraded.
 *
 * On every click:
 *   • plays a "water-drop" ripple sound (playRipple)
 *   • spawns 3 concentric expanding rings with different speeds
 *   • sprays 14 sparkle particles (chromatic, with trails)
 *   • drops a bright bloom flash that fades over 300ms
 *   • drops a caustic ring that lingers longer at the impact site
 *
 * Skipped for form inputs and reduced-motion users. Sits on the very top of
 * the visible layer stack (z:100) but pointer-events:none so it never blocks
 * clicks.
 */
import { useEffect, useRef } from "react";
import { playRipple } from "@/lib/sound";

type Sparkle = {
  angle: number;
  speed: number;
  size: number;
  hue: number;
  life: number;
  x: number;
  y: number;
};

type Ripple = {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  opacity: number;
  color: string;
  hue: number;
  sparkles: Sparkle[];
  flashOpacity: number;
  caustic: number;
};

export default function ClickRipple() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let ripples: Ripple[] = [];
    let anim = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const handleClick = (e: MouseEvent | PointerEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (target?.getAttribute("contenteditable") === "true") return;

      // Play water-drop sound (pitch varies with horizontal position)
      playRipple(e.clientX / window.innerWidth);

      const palettes = [
        { c: "0, 242, 255", h: 190 }, // cyan
        { c: "124, 58, 237", h: 265 }, // violet
        { c: "255, 0, 170", h: 320 }, // magenta
        { c: "80, 200, 255", h: 210 }, // ice blue
      ];
      const p = palettes[Math.floor(Math.random() * palettes.length)];

      const sparkles: Sparkle[] = Array.from({ length: 14 }, () => ({
        angle: Math.random() * Math.PI * 2,
        speed: 1.4 + Math.random() * 3.4,
        size: 0.8 + Math.random() * 2.4,
        hue: p.h + (Math.random() - 0.5) * 60,
        life: 1,
        x: e.clientX,
        y: e.clientY,
      }));

      ripples.push({
        x: e.clientX,
        y: e.clientY,
        radius: 0,
        maxRadius: 160 + Math.random() * 90,
        opacity: 0.7,
        color: p.c,
        hue: p.h,
        sparkles,
        flashOpacity: 0.6,
        caustic: 1,
      });
      if (ripples.length > 18) ripples = ripples.slice(-18);
    };
    document.addEventListener("pointerdown", handleClick, true);

    const loop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ripples = ripples.filter((r) => r.opacity > 0.005 || r.caustic > 0.02);

      ripples.forEach((r) => {
        // Bloom flash — bright radial that fades fast
        if (r.flashOpacity > 0.01) {
          r.flashOpacity *= 0.87;
          const flash = ctx.createRadialGradient(r.x, r.y, 0, r.x, r.y, 80);
          flash.addColorStop(0, `rgba(${r.color}, ${r.flashOpacity})`);
          flash.addColorStop(0.5, `rgba(${r.color}, ${r.flashOpacity * 0.3})`);
          flash.addColorStop(1, `rgba(${r.color}, 0)`);
          ctx.fillStyle = flash;
          ctx.beginPath();
          ctx.arc(r.x, r.y, 80, 0, Math.PI * 2);
          ctx.fill();
        }

        // Three concentric rings at different speeds
        r.radius += 4;
        r.opacity -= 0.014;
        for (let i = 0; i < 3; i++) {
          const rad = r.radius * (0.55 + i * 0.28);
          const op = Math.max(0, r.opacity * (1 - i * 0.28));
          ctx.beginPath();
          ctx.arc(r.x, r.y, rad, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${r.color}, ${op})`;
          ctx.lineWidth = i === 0 ? 1.6 : 1;
          ctx.stroke();
        }

        // Sparkles with trails
        r.sparkles.forEach((s) => {
          const dist = r.radius * (0.7 + s.speed * 0.09);
          s.x = r.x + Math.cos(s.angle) * dist;
          s.y = r.y + Math.sin(s.angle) * dist;
          s.life = Math.max(0, r.opacity * 1.4);

          // trail
          const tail = 10;
          const tx = r.x + Math.cos(s.angle) * (dist - tail);
          const ty = r.y + Math.sin(s.angle) * (dist - tail);
          const grad = ctx.createLinearGradient(tx, ty, s.x, s.y);
          grad.addColorStop(0, `hsla(${s.hue}, 100%, 75%, 0)`);
          grad.addColorStop(1, `hsla(${s.hue}, 100%, 78%, ${s.life})`);
          ctx.strokeStyle = grad;
          ctx.lineWidth = s.size * 0.7;
          ctx.beginPath();
          ctx.moveTo(tx, ty);
          ctx.lineTo(s.x, s.y);
          ctx.stroke();

          // head sparkle
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${s.hue}, 100%, 85%, ${s.life})`;
          ctx.fill();
        });

        // Lingering caustic ripple at impact
        r.caustic *= 0.98;
        if (r.caustic > 0.02) {
          const gc = ctx.createRadialGradient(r.x, r.y, 4, r.x, r.y, 22);
          gc.addColorStop(0, `hsla(${r.hue}, 100%, 85%, ${0.35 * r.caustic})`);
          gc.addColorStop(1, "hsla(0, 0%, 0%, 0)");
          ctx.fillStyle = gc;
          ctx.beginPath();
          ctx.arc(r.x, r.y, 22, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      anim = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      cancelAnimationFrame(anim);
      window.removeEventListener("resize", resize);
      document.removeEventListener("pointerdown", handleClick, true);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 z-[100] pointer-events-none" />;
}
