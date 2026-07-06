/**
 * Sparkling rising floaters — tiny cyan/violet bubbles that drift up the
 * whole viewport, like light motes in a dark sea. Pure CSS animation; a
 * handful of DOM nodes; sits behind the wave overlay but above the R3F canvas.
 */
import { useMemo } from "react";

export default function Bubbles({ count = 24 }: { count?: number }) {
  const bubbles = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        left: Math.random() * 100,
        size: 2 + Math.random() * 6,
        delay: -Math.random() * 24,
        duration: 22 + Math.random() * 22,
        hue: Math.random() > 0.5 ? 200 : 285,
        drift: (Math.random() - 0.5) * 30,
      })),
    [count],
  );

  return (
    <div className="pointer-events-none fixed inset-0" style={{ zIndex: 3 }} aria-hidden>
      {bubbles.map((b, i) => (
        <span
          key={i}
          className="absolute bottom-[-20px] rounded-full"
          style={{
            left: `${b.left}%`,
            width: b.size,
            height: b.size,
            background: `radial-gradient(circle at 35% 30%, rgba(255,255,255,0.9), hsla(${b.hue},95%,70%,0.7) 55%, transparent 90%)`,
            boxShadow: `0 0 ${b.size * 3}px hsla(${b.hue},95%,70%,0.7)`,
            animation: `bubbleRise ${b.duration}s linear ${b.delay}s infinite`,
            filter: "blur(0.4px)",
          }}
        />
      ))}
    </div>
  );
}
