/**
 * CursorOrb — a 3D-style cursor replacement.
 *
 * A layered orb (core + inner glow + outer halo + projection shadow) that
 * follows the pointer with subtle parallax lag, scales on press, and brightens
 * over interactive elements. Pure CSS/transform for zero rendering cost — a
 * real Babylon canvas for a cursor would fight pointer events + perf.
 */

import { useEffect, useRef, useState } from "react";

export function CursorOrb({ hue = 190 }: { hue?: number }) {
  const coreRef = useRef<HTMLDivElement>(null);
  const haloRef = useRef<HTMLDivElement>(null);
  const [pressed, setPressed] = useState(false);
  const [hovering, setHovering] = useState(false);

  useEffect(() => {
    // Hide the native cursor only on devices with a fine pointer.
    if (!window.matchMedia("(pointer: fine)").matches) return;
    document.documentElement.style.cursor = "none";

    const pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const target = { ...pos };
    let raf = 0;

    const onMove = (e: MouseEvent) => {
      target.x = e.clientX;
      target.y = e.clientY;
      const el = e.target as HTMLElement | null;
      setHovering(!!el?.closest("a, button, input, textarea, select, [role='button'], [data-cursor-hover]"));
    };
    const onDown = () => setPressed(true);
    const onUp = () => setPressed(false);
    const tick = () => {
      // Ease the core quickly, the halo with more lag (parallax depth).
      pos.x += (target.x - pos.x) * 0.4;
      pos.y += (target.y - pos.y) * 0.4;
      if (coreRef.current) {
        coreRef.current.style.transform = `translate3d(${target.x}px, ${target.y}px, 0) translate(-50%, -50%) scale(${pressed ? 0.7 : hovering ? 1.3 : 1})`;
      }
      if (haloRef.current) {
        haloRef.current.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0) translate(-50%, -50%) scale(${hovering ? 1.5 : pressed ? 1.8 : 1})`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      document.documentElement.style.cursor = "";
    };
  }, [pressed, hovering]);

  const color = `hsl(${hue}, 100%, 70%)`;
  return (
    <div className="pointer-events-none fixed inset-0 z-[9999] hidden md:block" aria-hidden>
      {/* Outer halo (lags — depth) */}
      <div
        ref={haloRef}
        className="absolute left-0 top-0 rounded-full transition-[opacity] duration-200"
        style={{
          width: 44,
          height: 44,
          background: `radial-gradient(circle, ${color}66 0%, transparent 70%)`,
          opacity: hovering ? 1 : 0.6,
        }}
      />
      {/* Core orb */}
      <div
        ref={coreRef}
        className="absolute left-0 top-0 rounded-full"
        style={{
          width: 16,
          height: 16,
          background: `radial-gradient(circle at 30% 30%, #ffffff, ${color} 60%, hsl(${hue}, 90%, 35%))`,
          boxShadow: `0 0 16px ${color}, 0 4px 8px rgba(0,0,0,0.5)`,
          transition: "width 0.15s, height 0.15s",
        }}
      />
      {/* Projection shadow ring on hover */}
      {hovering && (
        <div
          className="absolute left-0 top-0 rounded-full border"
          style={{
            width: 36,
            height: 36,
            borderColor: `${color}aa`,
            transform: `translate3d(${0}px, ${0}px, 0)`,
            // position updated via coreRef sibling; simple CSS pulse instead.
            animation: "cursorPulse 1.2s ease-out infinite",
            left: "50%",
            top: "50%",
          }}
        />
      )}
      <style>{`@keyframes cursorPulse { 0% { transform: scale(0.6); opacity: 0.8; } 100% { transform: scale(1.4); opacity: 0; } }`}</style>
    </div>
  );
}
