/**
 * Floating mic — small liquid-orb button in the bottom-left. Clicking it now
 * navigates to the dedicated /mic portal page instead of opening a modal.
 * The mic becomes the world.
 *
 * (Historical modal-mic behavior lived here; it's been replaced by the
 * full-page MicPage at src/routes/_authenticated/mic.tsx.)
 */
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Mic } from "lucide-react";
import LiquidOrb from "./LiquidOrb";
import { playClick } from "@/lib/sound";

export default function FloatingMic() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Hide when already ON the mic page
  if (pathname === "/mic") return null;

  return (
    <motion.button
      onClick={() => {
        playClick();
        navigate({ to: "/mic" });
      }}
      whileTap={{ scale: 0.92 }}
      whileHover={{ scale: 1.08 }}
      className="fixed bottom-6 left-6 z-40"
      aria-label="Open voice portal"
      title="Speak to the portal"
    >
      <LiquidOrb size={64} hue={210} hue2={280} intensity={1.1} glow={1.25}>
        <Mic
          className="w-6 h-6 text-white pointer-events-none"
          strokeWidth={1.6}
          style={{
            filter:
              "drop-shadow(0 0 10px rgba(255,255,255,0.95)) drop-shadow(0 0 6px rgba(0,242,255,0.85))",
          }}
        />
      </LiquidOrb>
    </motion.button>
  );
}
