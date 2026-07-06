/**
 * FlowerBloom — arranges N children in a floral petal ring around an optional
 * center child. Each petal is positioned on a circle of `radius` px at an
 * angle derived from its index, with a per-petal delay so the whole flower
 * "blooms" in.  Also gives each petal a subtle 3D rotation so it faces
 * outward from the center.
 *
 * Layout:
 *   <FlowerBloom radius={260} center={<CenterOrb/>} petals={[<A/>, <B/>, ...]} />
 *
 * The container is a positioned box sized `radius*2 + petal` — parents should
 * flex-center it.
 */
import { motion } from "framer-motion";
import type { ReactNode } from "react";

export default function FlowerBloom({
  radius = 260,
  petalSize = 130,
  centerSize = 170,
  center,
  petals,
  startAngle = -Math.PI / 2, // -90° = top
  rotateOutward = true,
  className = "",
}: {
  radius?: number;
  petalSize?: number;
  centerSize?: number;
  center?: ReactNode;
  petals: ReactNode[];
  startAngle?: number;
  rotateOutward?: boolean;
  className?: string;
}) {
  const n = petals.length;
  const boxSize = radius * 2 + petalSize + 40;

  return (
    <div className={`relative mx-auto ${className}`} style={{ width: boxSize, height: boxSize }}>
      {/* subtle connecting ring behind the petals */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox={`0 0 ${boxSize} ${boxSize}`}
        aria-hidden
      >
        <defs>
          <radialGradient id="flower-halo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(0,242,255,0.18)" />
            <stop offset="55%" stopColor="rgba(124,58,237,0.10)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>
        </defs>
        <circle
          cx={boxSize / 2}
          cy={boxSize / 2}
          r={radius}
          fill="none"
          stroke="rgba(140,200,255,0.12)"
          strokeDasharray="2 6"
          strokeWidth="1"
        />
        <circle cx={boxSize / 2} cy={boxSize / 2} r={radius * 0.55} fill="url(#flower-halo)" />
      </svg>

      {/* Center */}
      {center && (
        <motion.div
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="absolute"
          style={{
            width: centerSize,
            height: centerSize,
            top: boxSize / 2 - centerSize / 2,
            left: boxSize / 2 - centerSize / 2,
          }}
        >
          {center}
        </motion.div>
      )}

      {/* Petals */}
      {petals.map((p, i) => {
        const angle = startAngle + (i / n) * Math.PI * 2;
        const cx = boxSize / 2 + Math.cos(angle) * radius - petalSize / 2;
        const cy = boxSize / 2 + Math.sin(angle) * radius - petalSize / 2;
        const outwardDeg = rotateOutward ? (angle * 180) / Math.PI + 90 : 0;
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.3, x: -Math.cos(angle) * 40, y: -Math.sin(angle) * 40 }}
            animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
            transition={{
              delay: 0.35 + i * 0.08,
              duration: 0.75,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="absolute"
            style={{
              width: petalSize,
              height: petalSize,
              top: cy,
              left: cx,
              transform: rotateOutward ? `rotate(${outwardDeg}deg)` : undefined,
            }}
          >
            <div
              style={{
                transform: rotateOutward ? `rotate(${-outwardDeg}deg)` : undefined,
              }}
            >
              {p}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
