import { motion } from "framer-motion";

type Props = { size?: number; listening?: boolean; speaking?: boolean; loading?: boolean };

export default function SiriOrb({ size = 80, listening, speaking, loading }: Props) {
  const state = listening ? "listening" : speaking ? "speaking" : loading ? "loading" : "idle";
  const colors = {
    idle: ["#00F2FF", "#7C3AED"],
    listening: ["#00F2FF", "#3B82F6"],
    speaking: ["#EC4899", "#7C3AED"],
    loading: ["#F59E0B", "#00F2FF"],
  }[state];

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: `conic-gradient(from 0deg, ${colors[0]}, ${colors[1]}, ${colors[0]})`,
          filter: "blur(6px)",
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: state === "idle" ? 8 : 3, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="absolute inset-[3px] rounded-full"
        style={{
          background: `radial-gradient(circle at 30% 30%, ${colors[0]}66, ${colors[1]}44 60%, #0a1340 100%)`,
          boxShadow: `0 0 24px ${colors[0]}88, inset 0 0 20px ${colors[1]}55`,
        }}
        animate={{ scale: state === "idle" ? [1, 1.02, 1] : [1, 1.08, 1] }}
        transition={{ duration: state === "idle" ? 3 : 1.2, repeat: Infinity }}
      />
      <div className="absolute inset-[30%] rounded-full bg-white/40 blur-sm" />
    </div>
  );
}
