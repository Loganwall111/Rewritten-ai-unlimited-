import { motion } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Page hero — chromatic-shift title + orbit pill eyebrow.
 * Now with a glowing rim pill around the eyebrow and a subtle prismatic
 * text shadow on the H1 (matches visionOS refractive vibe).
 */
export default function PageHero({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      className="mb-8"
    >
      <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 glass-panel">
        <span
          className="inline-block w-1.5 h-1.5 rounded-full bg-[#00F2FF]"
          style={{ boxShadow: "0 0 10px 2px rgba(0,242,255,0.7)" }}
        />
        <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#00F2FF]/80">
          {eyebrow}
        </p>
      </div>
      <h1
        className="mt-3 text-4xl md:text-5xl font-medium"
        style={{
          fontFamily: "var(--font-display)",
          color: "#E0F7FA",
          textShadow:
            "-1px 0 rgba(0,242,255,0.35), 1px 0 rgba(236,72,153,0.25), 0 0 24px rgba(120,180,255,0.35)",
        }}
      >
        {title}
      </h1>
      {children && (
        <p className="mt-3 max-w-2xl text-sm text-[#E0F7FA]/60 leading-relaxed">{children}</p>
      )}
    </motion.header>
  );
}
