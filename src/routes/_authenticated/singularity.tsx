import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Send, Loader2, Brain, Sparkles } from "lucide-react";
import LiquidOrb from "@/components/LiquidOrb";
import { singularityAsk } from "@/lib/singularity.functions";
import { playClick, playSuccess } from "@/lib/sound";

export const Route = createFileRoute("/_authenticated/singularity")({
  head: () => ({
    meta: [
      { title: "Singularity · Rewritten AI" },
      {
        name: "description",
        content:
          "One chat. All models. The Singularity routes your query to the best fit models and fuses their answers into one voice.",
      },
    ],
  }),
  component: SingularityPage,
});

type Turn = {
  id: string;
  role: "user" | "singularity";
  text: string;
  contributors?: { id: string; name: string; provider: string; credits: number }[];
  classification?: { modality: string; kind: string };
};

function SingularityPage() {
  const navigate = useNavigate();
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [turns, busy]);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    playClick();
    setError(null);
    const userTurn: Turn = {
      id: crypto.randomUUID(),
      role: "user",
      text,
    };
    setTurns((t) => [...t, userTurn]);
    setInput("");
    setBusy(true);
    try {
      const res = await singularityAsk({ data: { text, blend: 3 } });
      if (!res.ok) {
        setError(res.error);
      } else {
        setTurns((t) => [
          ...t,
          {
            id: crypto.randomUUID(),
            role: "singularity",
            text: res.answer,
            contributors: res.contributors,
            classification: res.classification,
          },
        ]);
        playSuccess();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="relative -mx-24 -my-10 min-h-screen overflow-hidden flex flex-col"
      style={{ background: "#02040a" }}
    >
      {/* Return */}
      <button
        onClick={() => {
          playClick();
          navigate({ to: "/multiverse" });
        }}
        className="absolute top-24 left-8 z-30 rounded-full glass-panel px-4 py-2 text-xs uppercase tracking-widest text-[#E0F7FA]/80 hover:text-[#00F2FF] hover:border-[#00F2FF]/50 flex items-center gap-2 transition"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Multiverse
      </button>

      {/* Slow rotating conic aura behind the whole page */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "conic-gradient(from 0deg, rgba(0,242,255,0.08), rgba(124,58,237,0.06), rgba(236,72,153,0.06), rgba(0,242,255,0.08))",
          filter: "blur(80px)",
          animation: "slowSpin 80s linear infinite",
        }}
        aria-hidden
      />

      {/* Central Singularity orb — small, top of page */}
      <div className="relative z-10 flex flex-col items-center pt-24 pb-6">
        <LiquidOrb
          size={120}
          hue={265}
          hue2={210}
          intensity={busy ? 1.8 : 1.1}
          glow={busy ? 1.6 : 1.2}
          active={busy}
        >
          <div className="flex flex-col items-center text-white pointer-events-none">
            <Brain
              className="w-6 h-6"
              strokeWidth={1.4}
              style={{
                filter: "drop-shadow(0 0 10px rgba(255,255,255,0.95))",
              }}
            />
          </div>
        </LiquidOrb>
        <div className="mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1 glass-panel">
          <span
            className="inline-block w-1.5 h-1.5 rounded-full bg-[#00F2FF]"
            style={{
              boxShadow: "0 0 10px 2px rgba(0,242,255,0.7)",
              animation: busy ? "ambientPulse 1.2s ease-in-out infinite" : undefined,
            }}
          />
          <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#00F2FF]/80">
            Singularity · {busy ? "Routing…" : "Ready"}
          </p>
        </div>
        <h1
          className="mt-2 text-2xl md:text-3xl text-[#E0F7FA]"
          style={{
            fontFamily: "var(--font-display)",
            textShadow:
              "-1px 0 rgba(0,242,255,0.35), 1px 0 rgba(236,72,153,0.25), 0 0 24px rgba(120,180,255,0.35)",
          }}
        >
          One brain. All models.
        </h1>
      </div>

      {/* Conversation stream */}
      <div
        ref={scrollRef}
        className="relative z-10 flex-1 overflow-y-auto px-6 md:px-32 py-4 space-y-4"
        data-scroll
        style={{ minHeight: 0 }}
      >
        {turns.length === 0 && !busy && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="max-w-lg mx-auto text-center py-8"
          >
            <p className="text-[#E0F7FA]/60 text-sm mb-4">
              Ask anything. The Singularity picks the best 3 models for your query and fuses their
              answers into one voice.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {[
                "Explain gravitational lensing simply",
                "Write a Rust hello world",
                "Draft a poem about black holes",
                "Compare GPT-5 and Gemini 3",
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => setInput(q)}
                  className="rounded-full glass-panel px-3 py-1.5 text-[11px] text-[#E0F7FA]/75 hover:text-[#00F2FF] hover:border-[#00F2FF]/40 transition"
                >
                  {q}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        <AnimatePresence initial={false}>
          {turns.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className={`flex ${t.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-2xl rounded-3xl px-5 py-3 ${
                  t.role === "user"
                    ? "glass-panel text-[#E0F7FA]"
                    : "glass-panel-strong text-[#E0F7FA]"
                }`}
                style={
                  t.role === "singularity"
                    ? {
                        boxShadow:
                          "0 10px 40px -10px rgba(0,242,255,0.25), 0 6px 20px -6px rgba(124,58,237,0.25)",
                        borderColor: "rgba(0,242,255,0.25)",
                      }
                    : undefined
                }
              >
                {t.role === "singularity" && (
                  <div className="mb-2 flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-[#00F2FF]" strokeWidth={1.5} />
                    <span className="font-mono text-[9px] tracking-widest uppercase text-[#00F2FF]/70">
                      Singularity
                      {t.classification && (
                        <span className="ml-2 text-[#E0F7FA]/40">
                          · {t.classification.modality} · {t.classification.kind}
                        </span>
                      )}
                    </span>
                  </div>
                )}
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{t.text}</p>
                {t.contributors && t.contributors.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-white/5 flex flex-wrap gap-1.5">
                    <span className="text-[9px] font-mono uppercase tracking-widest text-[#E0F7FA]/40 mr-1 self-center">
                      Fused from:
                    </span>
                    {t.contributors.map((c) => (
                      <span
                        key={c.id}
                        className="rounded-full glass-panel px-2 py-0.5 text-[10px] font-mono text-[#E0F7FA]/75"
                        title={`${c.provider} · ${c.credits} cr`}
                      >
                        {c.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {busy && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="glass-panel-strong rounded-3xl px-5 py-3 flex items-center gap-3">
              <Loader2 className="w-4 h-4 text-[#00F2FF] animate-spin" />
              <span className="text-xs font-mono uppercase tracking-widest text-[#E0F7FA]/70">
                Routing to 3 models · fusing…
              </span>
            </div>
          </motion.div>
        )}

        {error && (
          <div className="max-w-2xl mx-auto rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-mono text-red-300">
            ⚠ {error}
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="relative z-20 px-6 md:px-32 pb-8 pt-4">
        <div
          className="glass-panel-strong rounded-full flex items-center gap-2 px-2 py-2"
          style={{
            boxShadow:
              "0 10px 40px -10px rgba(0,242,255,0.35), inset 0 1px 0 rgba(255,255,255,0.08)",
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Ask the Singularity anything…"
            disabled={busy}
            className="flex-1 bg-transparent outline-none px-4 py-2 text-sm text-[#E0F7FA] placeholder:text-[#E0F7FA]/40"
            data-nozoom
          />
          <button
            onClick={send}
            disabled={busy || !input.trim()}
            className="rounded-full portal-tab active px-5 py-2 text-xs uppercase tracking-widest text-[#00F2FF] disabled:opacity-40 flex items-center gap-2"
            style={{
              boxShadow: "inset 0 0 30px rgba(0,242,255,0.25), 0 0 20px rgba(0,242,255,0.35)",
            }}
          >
            {busy ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            {busy ? "Fusing" : "Send"}
          </button>
        </div>
        <p className="mt-2 text-center text-[9px] font-mono uppercase tracking-widest text-[#E0F7FA]/40">
          ⌘K palette · ↵ send · shift+↵ newline
        </p>
      </div>
    </div>
  );
}
