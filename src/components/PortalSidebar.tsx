/**
 * Portal sidebars — left + right stacks of LiquidOrb tabs.
 * Each orb has a fully animated interior (metaball plasma, ripples, breathing
 * core) rendered inside a masked circle — same aesthetic as billing / home,
 * scaled down to 48px.
 */
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  Home,
  MessageSquare,
  Code2,
  Image as ImageIcon,
  Video,
  FileText,
  Globe,
  Gamepad2,
  Sparkles,
  History,
  Settings,
  CreditCard,
  LogOut,
  Mic,
  Aperture,
  Brain,
  Rocket,
} from "lucide-react";
import LiquidOrb from "./LiquidOrb";
import { playClick, sfxHover, sfxPortalBoom } from "@/lib/sound";
import { supabase } from "@/integrations/supabase/client";
import { dispatchPortalDive } from "@/lib/portalDive";

type Item = {
  to: string;
  icon: typeof Home;
  label: string;
  hue: number;
};

const LEFT: Item[] = [
  { to: "/home", icon: Home, label: "Home", hue: 200 },
  { to: "/chat", icon: MessageSquare, label: "Chat", hue: 220 },
  { to: "/code", icon: Code2, label: "Code", hue: 145 },
  { to: "/image", icon: ImageIcon, label: "Image", hue: 320 },
  { to: "/video", icon: Video, label: "Video", hue: 285 },
  { to: "/documents", icon: FileText, label: "Docs", hue: 40 },
];

const RIGHT: Item[] = [
  { to: "/mic", icon: Mic, label: "Voice", hue: 195 },
  { to: "/world", icon: Rocket, label: "World", hue: 145 },
  { to: "/multiverse", icon: Aperture, label: "Multi", hue: 275 },
  { to: "/singularity", icon: Brain, label: "One", hue: 265 },
  { to: "/web-research", icon: Globe, label: "Web", hue: 180 },
  { to: "/game-builder", icon: Gamepad2, label: "Games", hue: 15 },
  { to: "/prompts", icon: Sparkles, label: "Prompts", hue: 55 },
  { to: "/history", icon: History, label: "History", hue: 260 },
  { to: "/billing", icon: CreditCard, label: "Billing", hue: 300 },
  { to: "/settings", icon: Settings, label: "Settings", hue: 210 },
];

function OrbTab({
  Icon,
  label,
  hue,
  active,
  index,
}: {
  Icon: typeof Home;
  label: string;
  hue: number;
  active: boolean;
  index: number;
}) {
  return (
    <div className="group flex flex-col items-center">
      <LiquidOrb
        size={48}
        hue={hue}
        index={index}
        active={active}
        intensity={0.85}
        glow={active ? 1.4 : 0.9}
      >
        <Icon
          className="w-4 h-4 pointer-events-none"
          strokeWidth={1.75}
          style={{
            color: active ? "#f5fbff" : "#e0f7fa",
            filter: `drop-shadow(0 0 6px hsla(${hue},95%,70%,0.95))`,
          }}
        />
      </LiquidOrb>
      <span
        className="mt-1.5 block text-[8.5px] font-mono uppercase tracking-widest text-[#E0F7FA]/50 group-hover:text-[#00F2FF] transition-colors"
        style={{ textShadow: "0 1px 3px rgba(0,0,0,0.9)" }}
      >
        {label}
      </span>
    </div>
  );
}

export default function PortalSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const signOut = async () => {
    playClick();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <>
      <nav
        className="fixed left-3 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-4"
        style={{ perspective: 800 }}
      >
        {LEFT.map((item, i) => (
          <Link
            key={item.to}
            to={item.to}
            onMouseEnter={sfxHover}
            onClick={(e) => {
              playClick();
              sfxPortalBoom();
              dispatchPortalDive(e.clientX, e.clientY, item.hue);
            }}
          >
            <OrbTab
              Icon={item.icon}
              label={item.label}
              hue={item.hue}
              active={pathname === item.to}
              index={i}
            />
          </Link>
        ))}
      </nav>

      <nav
        className="fixed right-3 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-4"
        style={{ perspective: 800 }}
      >
        {RIGHT.map((item, i) => (
          <Link
            key={item.to}
            to={item.to}
            onMouseEnter={sfxHover}
            onClick={(e) => {
              playClick();
              sfxPortalBoom();
              dispatchPortalDive(e.clientX, e.clientY, item.hue);
            }}
          >
            <OrbTab
              Icon={item.icon}
              label={item.label}
              hue={item.hue}
              active={pathname === item.to}
              index={i + LEFT.length}
            />
          </Link>
        ))}
        <button
          onMouseEnter={sfxHover}
          onClick={signOut}
          className="group block"
          aria-label="Sign out"
        >
          <OrbTab Icon={LogOut} label="Sign out" hue={0} active={false} index={99} />
        </button>
      </nav>
    </>
  );
}
