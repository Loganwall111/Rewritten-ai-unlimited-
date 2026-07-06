/**
 * Shared visionOS chrome for authenticated pages.
 * Renders the curved top nav ribbon (Home/Chat/Code/Image/Video/Docs/etc.)
 * above the page content. Sits above the perspective grid nodes.
 *
 * Excluded from the /billing route because billing has its own full-bleed
 * chrome + wireframe cage; AppShell handles that with the `isImmersive` flag.
 */
import { Link, useRouterState } from "@tanstack/react-router";
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
  Mic,
  Aperture,
  Brain,
} from "lucide-react";
import { CurvedChromeBar } from "./effects/CurvedChromeBar";

const NAV = [
  { to: "/home", Icon: Home, label: "Home" },
  { to: "/multiverse", Icon: Aperture, label: "Multiverse" },
  { to: "/singularity", Icon: Brain, label: "Singularity" },
  { to: "/chat", Icon: MessageSquare, label: "Chat" },
  { to: "/mic", Icon: Mic, label: "Voice" },
  { to: "/code", Icon: Code2, label: "Code" },
  { to: "/image", Icon: ImageIcon, label: "Image" },
  { to: "/video", Icon: Video, label: "Video" },
  { to: "/documents", Icon: FileText, label: "Docs" },
  { to: "/web-research", Icon: Globe, label: "Web" },
  { to: "/game-builder", Icon: Gamepad2, label: "Games" },
  { to: "/prompts", Icon: Sparkles, label: "Prompts" },
  { to: "/history", Icon: History, label: "History" },
  { to: "/billing", Icon: CreditCard, label: "Billing" },
  { to: "/settings", Icon: Settings, label: "Settings" },
] as const;

export default function PageChrome() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
      <div className="pointer-events-auto">
        <CurvedChromeBar variant="top">
          {NAV.map(({ to, Icon, label }) => {
            const active = pathname === to;
            return (
              <Link
                key={to}
                to={to}
                aria-label={label}
                title={label}
                className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all ${
                  active
                    ? "text-white drop-shadow-[0_0_10px_rgba(160,220,255,0.9)]"
                    : "text-white/55 hover:text-white/95"
                }`}
              >
                <Icon className="w-[18px] h-[18px]" strokeWidth={1.75} />
              </Link>
            );
          })}
        </CurvedChromeBar>
      </div>
    </div>
  );
}
