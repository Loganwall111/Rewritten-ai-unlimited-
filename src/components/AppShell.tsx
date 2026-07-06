import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import AnimatedBackground from "./effects/AnimatedBackground";
import BackgroundScene3D from "./effects/BackgroundScene3D";
import { GravitationalLensDefs } from "./effects/GravitationalLens";
import GodRays from "./effects/GodRays";
import WaveOverlay from "./effects/WaveOverlay";
import Bubbles from "./effects/Bubbles";
import CurvedViewport from "./effects/CurvedViewport";
import BezelLens from "./effects/BezelLens";
import CursorSystem from "./effects/CursorSystem";
import SkyLayer from "./effects/SkyLayer";
import PortalDive from "./PortalDive";
import CommandPalette from "./CommandPalette";
import DelightLayer from "./DelightLayer";
import PortalSidebar from "./PortalSidebar";
import PageChrome from "./PageChrome";
import FloatingMic from "./FloatingMic";
import CreditTracker from "./CreditTracker";
import BootScreen from "./BootScreen";
import WormholeIntro from "./WormholeIntro";
import WelcomeTutorial from "./WelcomeTutorial";
import ClickRipple from "./ClickRipple";
import AmbientToggle from "./AmbientToggle";
import { playBoot, sfxBootChord } from "@/lib/sound";
import { readDragOrbit } from "@/lib/useDragOrbit";
import { warmUpBrowserVoices } from "@/lib/browserVoice";

const INTRO_KEY = "rewritten_intro_played";

/**
 * Global app shell.
 *
 * ALWAYS mounted (every route, incl. landing + auth):
 *   • Gravitational-lens SVG filter defs
 *   • Nebula/particle animated background (canvas)
 *   • R3F 3D background (whales, black holes, dust, star field, drag-orbit)
 *   • Click ripple layer
 *
 * ONLY inside the authenticated app:
 *   • PortalSidebar (left + right orb navigation)
 *   • PageChrome (curved top nav bar) — hidden on /billing which brings its own
 *   • FloatingMic + CreditTracker
 *
 * FIRST VISIT of a session:
 *   • Wormhole intro (3-phase) → BootScreen (rotating globe + terminal readout)
 */
export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isAuthPage = pathname === "/auth" || pathname === "/reset-password";
  const isPublicLanding = pathname === "/";
  const isImmersive =
    pathname === "/billing" ||
    pathname === "/mic" ||
    pathname === "/multiverse" ||
    pathname === "/singularity"; // full-bleed pages
  const isOminous = pathname === "/multiverse" || pathname === "/singularity";
  const isAuthed = !isAuthPage && !isPublicLanding;

  const [phase, setPhase] = useState<"wormhole" | "boot" | "done">("done");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!sessionStorage.getItem(INTRO_KEY)) setPhase("wormhole");
    // Warm up browser voices immediately so the welcome/tutorial can use a
    // real neural voice (Samantha / Google UK Female / MS Aria Online) even
    // if ElevenLabs/OpenAI TTS aren't configured. Without this, browsers
    // load the voice list lazily and we'd get the default robot voice.
    warmUpBrowserVoices();
  }, []);

  useEffect(() => {
    if (phase === "boot") {
      playBoot();
      sfxBootChord();
    }
    if (phase === "done" && typeof window !== "undefined") {
      sessionStorage.setItem(INTRO_KEY, "1");
    }
  }, [phase]);

  // Ominous mode class on <body> for the multiverse — deeper vignette + slight
  // saturation drop. Removed as soon as we leave the page.
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (isOminous) document.body.classList.add("ominous");
    else document.body.classList.remove("ominous");
    return () => document.body.classList.remove("ominous");
  }, [isOminous]);

  /* Global DOM parallax — main content tilts with the drag-orbit state */
  const mainRef = useRef<HTMLElement>(null);
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const el = mainRef.current;
      if (el) {
        const d = readDragOrbit();
        const rotY = d.x * 6;
        const rotX = -d.y * 4;
        const tx = d.x * -14;
        const ty = d.y * -10;
        el.style.transform = `perspective(1400px) translate3d(${tx}px, ${ty}px, 0) rotateX(${rotX}deg) rotateY(${rotY}deg)`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <>
      {/* Always on — every page has the full immersive backdrop */}
      <GravitationalLensDefs />
      <AnimatedBackground />
      <BackgroundScene3D />
      <GodRays />
      <Bubbles count={22} />
      <WaveOverlay />
      <div className="hd-vignette" aria-hidden />
      <div className="scanlines" aria-hidden />
      <div className="film-grain" aria-hidden />
      <SkyLayer />
      <CurvedViewport />
      <BezelLens />
      <PortalDive />
      <ClickRipple />
      <CursorSystem />
      <DelightLayer />
      <CommandPalette />
      <AmbientToggle />

      {/* First-visit cinematic */}
      {phase === "wormhole" && <WormholeIntro onComplete={() => setPhase("boot")} />}
      {phase === "boot" && <BootScreen onComplete={() => setPhase("done")} />}

      {/* Voice welcome + tutorial fires after boot finishes, once per browser */}
      {isAuthed && <WelcomeTutorial ready={phase === "done"} />}

      {/* Chrome — signed-in app only */}
      {isAuthed && <PortalSidebar />}
      {isAuthed && !isImmersive && <PageChrome />}
      {isAuthed && <CreditTracker />}
      {isAuthed && <FloatingMic />}

      {/* Drag-hint */}
      {isAuthed && <DragHint />}

      <main
        ref={mainRef}
        className={`relative z-10 min-h-screen will-change-transform ${
          isAuthed && !isImmersive ? "px-24 pt-28 pb-10 lens-warp scene-3d" : ""
        } ${isImmersive ? "scene-3d" : ""}`}
        style={{
          transformStyle: "preserve-3d",
          // The multiverse page owns its own camera + drag; skip DOM parallax so
          // the two systems don't fight each other.
          transform: isOminous ? "none" : undefined,
        }}
      >
        {children}
      </main>
    </>
  );
}

function DragHint() {
  const [hide, setHide] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem("rewritten_drag_hint_seen")) {
      setHide(true);
      return;
    }
    const t = setTimeout(() => {
      setHide(true);
      sessionStorage.setItem("rewritten_drag_hint_seen", "1");
    }, 5500);
    return () => clearTimeout(t);
  }, []);
  if (hide) return null;
  return (
    <div
      className="pointer-events-none fixed bottom-6 left-1/2 z-20 -translate-x-1/2 rounded-full glass-panel px-5 py-2 text-[11px] text-[#E0F7FA]/70 font-mono tracking-widest flex items-center gap-4"
      style={{ animation: "hintFade 6s ease-in-out forwards" }}
    >
      <span>⌖ DRAG · ORBIT</span>
      <span className="text-[#00F2FF]/60">·</span>
      <span>WASD · STRAFE</span>
      <span className="text-[#00F2FF]/60">·</span>
      <span>SCROLL · DOLLY</span>
      <span className="text-[#00F2FF]/60">·</span>
      <span>SPACE · RECENTER</span>
    </div>
  );
}
