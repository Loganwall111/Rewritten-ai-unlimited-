import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  MessageSquare,
  Code2,
  Image as ImageIcon,
  Video,
  FileText,
  Globe,
  Gamepad2,
  Sparkles,
  CreditCard,
  Aperture,
  Clapperboard,
  Infinity as InfinityIcon,
  Rocket,
} from "lucide-react";
import PageHero from "@/components/PageHero";
import LiquidOrb from "@/components/LiquidOrb";
import FlowerBloom from "@/components/FlowerBloom";
import { MODELS } from "@/lib/models";
import { playClick, sfxHover } from "@/lib/sound";
import { dispatchPortalDive } from "@/lib/portalDive";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({
    meta: [
      { title: "Portal · Rewritten AI" },
      {
        name: "description",
        content: "Your Rewritten AI Unlimited dashboard.",
      },
    ],
  }),
  component: Home,
});

const TILES = [
  { to: "/chat", icon: MessageSquare, name: "Chat & Research", hue: 220 },
  { to: "/code", icon: Code2, name: "Code Generation", hue: 145 },
  { to: "/image", icon: ImageIcon, name: "Image Studio", hue: 320 },
  { to: "/video", icon: Video, name: "Video Forge", hue: 285 },
  { to: "/documents", icon: FileText, name: "Documents", hue: 40 },
  { to: "/web-research", icon: Globe, name: "Web Research", hue: 180 },
  { to: "/game-builder", icon: Gamepad2, name: "Game Builder", hue: 15 },
  { to: "/prompts", icon: Sparkles, name: "Prompt Vault", hue: 55 },
  { to: "/scenes", icon: Clapperboard, name: "Cinematic Scenes", hue: 280 },
  { to: "/infinity", icon: InfinityIcon, name: "World Infinity", hue: 175 },
  { to: "/world", icon: Rocket, name: "Rewritten World", hue: 145 },
  { to: "/billing", icon: CreditCard, name: "Billing", hue: 300 },
] as const;

function Home() {
  const center = (
    <LiquidOrb size={180} hue={210} hue2={280} wireframe active intensity={1.3} glow={1.35}>
      <div className="flex flex-col items-center pointer-events-none text-white">
        <Aperture
          className="w-7 h-7"
          strokeWidth={1.4}
          style={{ filter: "drop-shadow(0 0 12px rgba(180,220,255,0.95))" }}
        />
        <span
          className="mt-1.5 text-[10px] font-mono tracking-[0.3em] uppercase"
          style={{ textShadow: "0 2px 6px rgba(0,0,0,0.85)" }}
        >
          Portal
        </span>
      </div>
    </LiquidOrb>
  );

  const petals = TILES.map((t, i) => {
    const Icon = t.icon;
    return (
      <Link
        key={t.to}
        to={t.to}
        onMouseEnter={sfxHover}
        onClick={(e) => {
          playClick();
          dispatchPortalDive(e.clientX, e.clientY, t.hue);
        }}
        className="group block text-center"
      >
        <LiquidOrb size={120} hue={t.hue} index={i}>
          <div className="flex flex-col items-center text-white pointer-events-none">
            <Icon
              className="w-5 h-5"
              strokeWidth={1.6}
              style={{
                filter: `drop-shadow(0 0 8px hsla(${t.hue},95%,70%,0.9))`,
              }}
            />
            <span
              className="mt-1 text-[9px] font-mono uppercase tracking-widest text-white/90"
              style={{ textShadow: "0 2px 5px rgba(0,0,0,0.85)" }}
            >
              {t.name.split(" ")[0]}
            </span>
          </div>
        </LiquidOrb>
      </Link>
    );
  });

  return (
    <div className="relative -mx-24 -my-10 min-h-screen overflow-hidden flex flex-col">
      <div className="px-24 pt-28 pb-4">
        <PageHero eyebrow="Rewritten AI · Unlimited" title="Bloom into every model.">
          Every voice, every model, every creation — arranged as one flower of light, breathing in
          the dark sparkling sea.
        </PageHero>
      </div>

      {/* Rotating halo behind flower */}
      <div className="relative flex-1 flex items-center justify-center">
        <div
          className="pointer-events-none absolute rounded-full"
          style={{
            width: 680,
            height: 680,
            background:
              "conic-gradient(from 0deg, rgba(0,242,255,0.10), rgba(124,58,237,0.07), rgba(236,72,153,0.07), rgba(245,158,11,0.05), rgba(0,242,255,0.10))",
            filter: "blur(36px)",
            animation: "slowSpin 55s linear infinite",
          }}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.9, rotate: -6 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <FlowerBloom
            radius={230}
            petalSize={140}
            centerSize={180}
            center={center}
            petals={petals}
          />
        </motion.div>
      </div>

      <section className="px-24 pb-10">
        <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.4em] text-[#00F2FF]/60 text-center">
          Active Model Catalog · {MODELS.length}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {MODELS.map((m) => (
            <span
              key={m.id}
              className="glass-panel-strong rounded-full px-3 py-1 text-[10px] font-mono text-[#E0F7FA]/70"
            >
              {m.name}
              <span className="ml-2 text-[#00F2FF]/50">
                {m.tier === "hosted" ? `${m.credits}cr` : "free"}
              </span>
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
