import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const LINES = [
  "> initializing rewritten.ai core…",
  "> loading model catalog · 9 hosted · 3 local",
  "> calibrating gravitational lens matrix",
  "> spawning cetacean drift agents",
  "> handshake with lovable.cloud · OK",
  "> mounting portal tabs · left · right",
  "> welcome, unlimited operator",
];

/**
 * Boot screen — post-wormhole terminal readout.
 * Now with a rotating wireframe globe backdrop (matches billing aesthetic)
 * and animated concentric-ring "signal" behind the text.
 */
export default function BootScreen({ onComplete }: { onComplete: () => void }) {
  const [line, setLine] = useState(0);
  useEffect(() => {
    if (line >= LINES.length) {
      const t = setTimeout(onComplete, 600);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setLine((l) => l + 1), 320);
    return () => clearTimeout(t);
  }, [line, onComplete]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-[#040818]"
      >
        {/* backdrop grid */}
        <div className="absolute inset-0 animated-grid opacity-20" />

        {/* rotating wireframe globe */}
        <svg
          className="absolute inset-0 m-auto pointer-events-none"
          width="640"
          height="640"
          viewBox="0 0 200 200"
          style={{ animation: "bootGlobeSpin 24s linear infinite" }}
        >
          <defs>
            <radialGradient id="bg-fade" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.7)" />
              <stop offset="70%" stopColor="rgba(255,255,255,0.25)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </radialGradient>
            <mask id="bg-mask">
              <circle cx="100" cy="100" r="95" fill="url(#bg-fade)" />
            </mask>
          </defs>
          <g mask="url(#bg-mask)" stroke="rgba(0,242,255,0.35)" strokeWidth="0.25" fill="none">
            {Array.from({ length: 14 }, (_, i) => {
              const rx = Math.abs(Math.cos((i / 14) * Math.PI)) * 95 + 2;
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

        {/* pulsing rings */}
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="absolute rounded-full border border-[#00F2FF]/40 pointer-events-none"
            style={{
              width: 400 + i * 140,
              height: 400 + i * 140,
              animation: `bootRingPulse 3.2s ease-out ${i * 0.4}s infinite`,
            }}
          />
        ))}

        {/* text */}
        <div className="relative z-10 w-full max-w-lg px-6">
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 text-center font-mono text-2xl tracking-[0.4em] text-[#00F2FF] drop-shadow-[0_0_16px_rgba(0,242,255,0.6)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            REWRITTEN·AI
          </motion.h1>
          <p className="mb-8 text-center text-[10px] font-mono uppercase tracking-[0.35em] text-[#E0F7FA]/50">
            Unlimited · Booting Portal
          </p>
          <div className="space-y-2 font-mono text-[11px] text-[#E0F7FA]/70">
            {LINES.slice(0, line).map((l, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className={i === line - 1 ? "text-[#00F2FF]" : ""}
              >
                {l}
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
