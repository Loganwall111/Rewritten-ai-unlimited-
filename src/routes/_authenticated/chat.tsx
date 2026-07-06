import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import PageHero from "@/components/PageHero";
import { LensWrap } from "@/components/effects/GravitationalLens";
import { getAllModels, MODELS } from "@/lib/models";

export const Route = createFileRoute("/_authenticated/chat")({ component: ChatPage });

type Msg = { role: "user" | "assistant"; text: string; model?: string };

function ChatPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [model, setModel] = useState("google/gemini-3-flash-preview");
  const [loading, setLoading] = useState(false);
  const options = getAllModels("text");

  const send = async () => {
    if (!input.trim() || loading) return;
    const next = [...messages, { role: "user" as const, text: input }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          model,
          messages: next.map((m) => ({ role: m.role, content: m.text })),
        }),
      });
      const data = await res.json();
      setMessages([...next, { role: "assistant", text: data.text ?? "(no response)", model }]);
    } catch (e) {
      setMessages([...next, { role: "assistant", text: `⚠ ${(e as Error).message}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHero eyebrow="Chat & Research" title="Speak with every model.">
        Multimodal reasoning via Lovable AI Gateway. Switch models freely — all Base44 IDs
        preserved.
      </PageHero>

      <div className="mb-4 flex flex-wrap gap-2">
        {options.map((m) => (
          <button
            key={m.id}
            onClick={() => setModel(m.id)}
            className={`rounded-full px-3 py-1 text-[10px] font-mono ${
              model === m.id
                ? "portal-tab active text-[#00F2FF]"
                : "glass-panel text-[#E0F7FA]/60 hover:text-[#00F2FF]"
            }`}
          >
            {m.name}
          </button>
        ))}
      </div>

      <LensWrap>
        <div className="glass-panel-strong rounded-2xl p-6 min-h-[420px] flex flex-col gap-3">
          {messages.length === 0 && (
            <p className="text-sm text-[#E0F7FA]/40 text-center py-16">
              Say something to {MODELS.find((m) => m.id === model)?.name ?? model}…
            </p>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={`rounded-xl px-4 py-3 text-sm max-w-[85%] ${
                m.role === "user"
                  ? "self-end bg-[#00F2FF]/10 text-[#E0F7FA] border border-[#00F2FF]/20"
                  : "self-start bg-white/5 text-[#E0F7FA]/90 border border-white/10"
              }`}
            >
              {m.text}
              {m.model && (
                <div className="mt-1 text-[9px] font-mono text-[#00F2FF]/50">{m.model}</div>
              )}
            </div>
          ))}
          {loading && <div className="text-xs text-[#00F2FF]/60 font-mono">▸ generating…</div>}
        </div>
      </LensWrap>

      <div className="mt-4 flex gap-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask anything…"
          className="flex-1 rounded-full glass-panel-strong px-5 py-3 text-sm text-[#E0F7FA] placeholder:text-[#E0F7FA]/30 outline-none focus:border-[#00F2FF]/50"
        />
        <button
          onClick={send}
          disabled={loading}
          className="portal-tab px-6 py-3 rounded-full text-sm text-[#00F2FF] disabled:opacity-40"
        >
          Send
        </button>
      </div>
    </div>
  );
}
