/**
 * visionOS-style curved perspective wireframe.
 * Renders four converging grid planes (floor, ceiling, left wall, right wall)
 * that meet at a vanishing point in the center — the same curved cage seen in
 * the reference image, giving the whole billing scene a "room" to live inside.
 *
 * Absolutely positioned, pointer-events: none, sits behind the plan orbs and in
 * front of the R3F canvas. Uses the shared drag-orbit state so the grid
 * subtly parallax-shifts as the user drags the world.
 */
import { useEffect, useRef } from "react";
import { readDragOrbit } from "@/lib/useDragOrbit";

export default function PerspectiveGrid() {
  const wrapRef = useRef<HTMLDivElement>(null);

  // per-frame parallax on the grid — tied to the shared drag state
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const el = wrapRef.current;
      if (el) {
        const d = readDragOrbit();
        el.style.transform = `translate3d(${d.x * -18}px, ${d.y * -14}px, 0)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const line = "rgba(120, 210, 255, 0.22)";
  const lineFaint = "rgba(120, 210, 255, 0.09)";

  return (
    <div
      ref={wrapRef}
      className="pointer-events-none absolute inset-0 overflow-hidden will-change-transform"
      aria-hidden
    >
      {/* subtle radial vignette under the whole scene */}
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.55) 100%)",
        }}
      />

      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 1600 900"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="grid-fade" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={line} stopOpacity="0" />
            <stop offset="40%" stopColor={line} stopOpacity="1" />
            <stop offset="60%" stopColor={line} stopOpacity="1" />
            <stop offset="100%" stopColor={line} stopOpacity="0" />
          </linearGradient>
          <radialGradient id="corner-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(190,220,255,0.9)" />
            <stop offset="70%" stopColor="rgba(120,180,255,0.2)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>
          <filter id="glow-soft" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.2" />
          </filter>
        </defs>

        {/* FLOOR — curved perspective grid */}
        <g opacity="0.85">
          {/* horizontal lines (curved via cubic beziers so they arc like a bowl) */}
          {Array.from({ length: 9 }, (_, i) => {
            // y from center (450) down to bottom (900)
            const y = 470 + i * 55;
            const curve = 10 + i * 6; // stronger arc further from center
            return (
              <path
                key={`h${i}`}
                d={`M -50 ${y} Q 800 ${y + curve} 1650 ${y}`}
                stroke={i === 0 ? line : lineFaint}
                strokeWidth={i === 0 ? 1.2 : 0.6}
                fill="none"
              />
            );
          })}
          {/* radial vanishing lines */}
          {Array.from({ length: 17 }, (_, i) => {
            const x = -200 + i * 125;
            return (
              <line
                key={`v${i}`}
                x1={x}
                y1="900"
                x2="800"
                y2="470"
                stroke={lineFaint}
                strokeWidth="0.6"
              />
            );
          })}
        </g>

        {/* CEILING — mirrored */}
        <g opacity="0.85">
          {Array.from({ length: 9 }, (_, i) => {
            const y = 430 - i * 55;
            const curve = 10 + i * 6;
            return (
              <path
                key={`ch${i}`}
                d={`M -50 ${y} Q 800 ${y - curve} 1650 ${y}`}
                stroke={i === 0 ? line : lineFaint}
                strokeWidth={i === 0 ? 1.2 : 0.6}
                fill="none"
              />
            );
          })}
          {Array.from({ length: 17 }, (_, i) => {
            const x = -200 + i * 125;
            return (
              <line
                key={`cv${i}`}
                x1={x}
                y1="0"
                x2="800"
                y2="430"
                stroke={lineFaint}
                strokeWidth="0.6"
              />
            );
          })}
        </g>

        {/* Side wall hints */}
        <g opacity="0.4">
          {Array.from({ length: 6 }, (_, i) => {
            const x1 = -60 + i * 40;
            return (
              <line
                key={`lw${i}`}
                x1={x1}
                y1="-40"
                x2={x1 - 60}
                y2="940"
                stroke={lineFaint}
                strokeWidth="0.5"
              />
            );
          })}
          {Array.from({ length: 6 }, (_, i) => {
            const x1 = 1660 - i * 40;
            return (
              <line
                key={`rw${i}`}
                x1={x1}
                y1="-40"
                x2={x1 + 60}
                y2="940"
                stroke={lineFaint}
                strokeWidth="0.5"
              />
            );
          })}
        </g>

        {/* Four corner light-nodes — the little bright dots in the reference */}
        {[
          [80, 120],
          [1520, 120],
          [80, 780],
          [1520, 780],
        ].map(([x, y], i) => (
          <circle
            key={`c${i}`}
            cx={x}
            cy={y}
            r="18"
            fill="url(#corner-glow)"
            filter="url(#glow-soft)"
          />
        ))}
      </svg>
    </div>
  );
}
