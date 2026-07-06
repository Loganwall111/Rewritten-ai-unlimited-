/**
 * Command Palette (Cmd/Ctrl+K) + global keyboard shortcuts.
 *
 * Shortcuts:
 *   • Cmd/Ctrl+K   → open palette
 *   • G then H     → /home
 *   • G then C     → /chat
 *   • G then M     → /mic
 *   • G then B     → /billing
 *   • G then S     → /settings
 *   • ?            → open palette with the shortcut cheatsheet visible
 *
 * The palette itself is a glassy centered dialog with fuzzy filter over
 * routes. Enter to navigate. Esc to close.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Search,
  X,
  Home,
  MessageSquare,
  Mic,
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
  Aperture,
  Brain,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { playClick } from "@/lib/sound";

type Action = {
  id: string;
  label: string;
  hint?: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  keywords?: string[];
  run: () => void;
};

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const navigate = useNavigate();

  const actions: Action[] = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const go = (to: any) => () => {
      playClick();
      navigate({ to });
      setOpen(false);
    };
    return [
      { id: "home", label: "Portal · Home", hint: "G H", icon: Home, run: go("/home") },
      {
        id: "multi",
        label: "Multiverse · Black hole",
        hint: "G U",
        icon: Aperture,
        keywords: ["singularity", "models"],
        run: go("/multiverse"),
      },
      {
        id: "singularity",
        label: "Singularity · One brain, all models",
        hint: "G O",
        icon: Brain,
        keywords: ["fused", "master", "ai"],
        run: go("/singularity"),
      },
      { id: "chat", label: "Chat & Research", hint: "G C", icon: MessageSquare, run: go("/chat") },
      {
        id: "mic",
        label: "Voice · Portal Mic",
        hint: "G M",
        icon: Mic,
        keywords: ["voice", "speak"],
        run: go("/mic"),
      },
      { id: "code", label: "Code Generation", icon: Code2, run: go("/code") },
      { id: "image", label: "Image Studio", icon: ImageIcon, run: go("/image") },
      { id: "video", label: "Video Forge", icon: Video, run: go("/video") },
      { id: "docs", label: "Documents", icon: FileText, run: go("/documents") },
      { id: "web", label: "Web Research", icon: Globe, run: go("/web-research") },
      { id: "games", label: "Game Builder", icon: Gamepad2, run: go("/game-builder") },
      { id: "prompts", label: "Prompt Vault", icon: Sparkles, run: go("/prompts") },
      { id: "history", label: "History", icon: History, run: go("/history") },
      {
        id: "billing",
        label: "Billing & Tiers",
        hint: "G B",
        icon: CreditCard,
        run: go("/billing"),
      },
      { id: "settings", label: "Settings", hint: "G S", icon: Settings, run: go("/settings") },
      {
        id: "signout",
        label: "Sign out",
        icon: LogOut,
        keywords: ["log out", "logout"],
        run: async () => {
          playClick();
          await supabase.auth.signOut();
          navigate({ to: "/auth", replace: true });
          setOpen(false);
        },
      },
    ];
  }, [navigate]);

  const filtered = useMemo(() => {
    if (!q.trim()) return actions;
    const s = q.toLowerCase();
    return actions.filter((a) =>
      (a.label + " " + (a.keywords ?? []).join(" ")).toLowerCase().includes(s),
    );
  }, [q, actions]);

  useEffect(() => {
    if (sel >= filtered.length) setSel(0);
  }, [filtered, sel]);

  useEffect(() => {
    // Global shortcut wiring
    let gLast = 0;
    const onKey = (e: KeyboardEvent) => {
      const inField =
        e.target instanceof HTMLElement &&
        (e.target.tagName === "INPUT" ||
          e.target.tagName === "TEXTAREA" ||
          e.target.getAttribute("contenteditable") === "true");

      // Cmd/Ctrl+K → toggle palette
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
        setQ("");
        setSel(0);
        return;
      }
      // ? → open with hint
      if (!inField && e.key === "?") {
        e.preventDefault();
        setOpen(true);
        setQ("");
        return;
      }
      if (inField) return;
      // "G <letter>" combos
      const now = performance.now();
      if (e.key.toLowerCase() === "g") {
        gLast = now;
        return;
      }
      if (now - gLast < 900) {
        const map: Record<string, string> = {
          h: "/home",
          c: "/chat",
          m: "/mic",
          b: "/billing",
          s: "/settings",
          v: "/mic",
          u: "/multiverse",
          o: "/singularity",
        };
        const dest = map[e.key.toLowerCase()];
        if (dest) {
          e.preventDefault();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          navigate({ to: dest as any });
          playClick();
          gLast = 0;
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSel((s) => Math.min(filtered.length - 1, s + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSel((s) => Math.max(0, s - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        filtered[sel]?.run();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, filtered, sel]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[190] flex items-start justify-center pt-32 backdrop-blur-md bg-black/40"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-lg glass-panel-strong rounded-3xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{
          boxShadow:
            "0 30px 80px -20px rgba(0,242,255,0.35), 0 20px 60px -20px rgba(124,58,237,0.35), inset 0 1px 0 rgba(255,255,255,0.08)",
        }}
      >
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
          <Search className="w-4 h-4 text-[#00F2FF]" />
          <input
            autoFocus
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setSel(0);
            }}
            placeholder="Type a page or action…"
            className="flex-1 bg-transparent outline-none text-sm text-[#E0F7FA] placeholder:text-[#E0F7FA]/40"
          />
          <button
            onClick={() => setOpen(false)}
            className="text-[#E0F7FA]/50 hover:text-[#00F2FF]"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="max-h-[52vh] overflow-y-auto py-2">
          {filtered.length === 0 && (
            <p className="px-4 py-6 text-xs text-[#E0F7FA]/40 text-center">No matches.</p>
          )}
          {filtered.map((a, i) => {
            const Icon = a.icon;
            const active = i === sel;
            return (
              <button
                key={a.id}
                onMouseEnter={() => setSel(i)}
                onClick={() => a.run()}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                  active
                    ? "bg-[#00F2FF]/10 text-[#00F2FF]"
                    : "text-[#E0F7FA]/85 hover:text-[#00F2FF]"
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1">{a.label}</span>
                {a.hint && (
                  <kbd className="text-[10px] font-mono uppercase tracking-widest text-[#E0F7FA]/40">
                    {a.hint}
                  </kbd>
                )}
              </button>
            );
          })}
        </div>
        <div className="border-t border-white/10 px-4 py-2 text-[10px] font-mono uppercase tracking-widest text-[#E0F7FA]/40 flex justify-between">
          <span>↑↓ navigate · ↵ open · esc close</span>
          <span>⌘K</span>
        </div>
      </div>
    </div>
  );
}
