/**
 * PortalDive — a brief warp-tunnel overlay played:
 *   • automatically on every route change (from anywhere in the tree)
 *   • programmatically via `dispatchPortalDive(x, y, hue?)` — dive into a
 *     specific point (e.g. clicked orb) with a custom tint
 *
 * ~720ms burst rendered on a full-viewport canvas 2D.
 */
import { useEffect, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import type { PortalDiveDetail } from "@/lib/portalDive";

type Origin = { x: number; y: number; hue: number };

export default function PortalDive() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [origin, setOrigin] = useState<Origin | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prev = useRef<string | null>(null);

  // Route-change auto-fire (centered)
  useEffect(() => {
    if (prev.current !== null && prev.current !== pathname) {
      setOrigin({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
        hue: 210,
      });
      const t = setTimeout(() => setOrigin(null), 780);
      return () => clearTimeout(t);
    }
    prev.current = pathname;
  }, [pathname]);

  // Programmatic fire
  useEffect(() => {
    const onDive = (e: Event) => {
      const detail = (e as CustomEvent<PortalDiveDetail>).detail;
      setOrigin({
        x: detail.x,
        y: detail.y,
        hue: detail.hue ?? 210,
      });
      setTimeout(() => setOrigin(null), 780);
    };
    window.addEventListener("portal-dive", onDive);
    return () => window.removeEventListener("portal-dive", onDive);
  }, []);

  useEffect(() => {
    if (!origin) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = window.innerWidth;
    const h = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const streaks = Array.from({ length: 180 }, () => ({
      a: Math.random() * Math.PI * 2,
      r: Math.random() * 40,
      sp: 8 + Math.random() * 22,
      len: 60 + Math.random() * 140,
      hue: origin.hue - 25 + Math.random() * 90,
    }));

    const start = performance.now();
    const dur = 720;
    let raf = 0;
    const loop = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const ease = 1 - Math.pow(1 - t, 3);

      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = `rgba(2,4,15,${0.32 + ease * 0.15})`;
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";

      streaks.forEach((s) => {
        s.r += s.sp * (1 + ease * 2);
        const x1 = origin.x + Math.cos(s.a) * s.r;
        const y1 = origin.y + Math.sin(s.a) * s.r;
        const x2 = origin.x + Math.cos(s.a) * (s.r - s.len);
        const y2 = origin.y + Math.sin(s.a) * (s.r - s.len);
        const grad = ctx.createLinearGradient(x1, y1, x2, y2);
        grad.addColorStop(0, `hsla(${s.hue}, 100%, 78%, ${0.9 * (1 - t)})`);
        grad.addColorStop(1, `hsla(${s.hue}, 100%, 60%, 0)`);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      });

      const flash = ctx.createRadialGradient(
        origin.x,
        origin.y,
        0,
        origin.x,
        origin.y,
        260 * (1 + ease),
      );
      flash.addColorStop(0, `rgba(255,255,255,${0.65 * (1 - t)})`);
      flash.addColorStop(0.4, `hsla(${origin.hue}, 100%, 75%, ${0.4 * (1 - t)})`);
      flash.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = flash;
      ctx.beginPath();
      ctx.arc(origin.x, origin.y, 260 * (1 + ease), 0, Math.PI * 2);
      ctx.fill();

      if (t < 1) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [origin]);

  if (!origin) return null;
  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0"
      style={{ zIndex: 175, animation: "portalDiveFade 0.78s ease-out forwards" }}
      aria-hidden
    />
  );
}
