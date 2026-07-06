import { useEffect, useState } from "react";
import { VOICES } from "@/lib/voices";
import { getSelectedVoiceId, setSelectedVoiceId, useVoice } from "@/lib/useVoice";
import { playClick } from "@/lib/sound";

export default function VoiceSelector() {
  const [voiceId, setVoiceId] = useState<string>(getSelectedVoiceId());
  const { speak, speaking, provider } = useVoice();

  useEffect(() => {
    const h = () => setVoiceId(getSelectedVoiceId());
    window.addEventListener("voice-change", h);
    return () => window.removeEventListener("voice-change", h);
  }, []);

  const pick = (id: string) => {
    playClick();
    setSelectedVoiceId(id);
    setVoiceId(id);
  };

  const preview = (id: string) => {
    setSelectedVoiceId(id);
    setVoiceId(id);
    speak(`Hello, I am ${VOICES.find((v) => v.id === id)?.name}. Welcome to Rewritten AI Unlimited.`, id);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
        {VOICES.map((v) => {
          const active = voiceId === v.id;
          return (
            <div key={v.id} className="flex flex-col">
              <button
                onClick={() => pick(v.id)}
                className={`px-2 py-1.5 rounded-lg text-[10px] font-medium transition-all border ${
                  active ? "border-[#00F2FF]/50 text-[#E0F7FA]" : "border-white/5 text-[#E0F7FA]/40 hover:text-[#E0F7FA]/70 hover:border-white/15"
                }`}
                style={active ? { background: "rgba(0,242,255,0.1)", boxShadow: "0 0 10px rgba(0,242,255,0.15)" } : {}}
              >
                <div>{v.name}</div>
                <div className="text-[8px] opacity-60 mt-0.5">{v.desc}</div>
              </button>
              <button
                onClick={() => preview(v.id)}
                disabled={speaking}
                className="mt-1 text-[9px] font-mono text-[#00F2FF]/70 hover:text-[#00F2FF] disabled:opacity-40"
              >
                {speaking && active ? "…" : "▶ preview"}
              </button>
            </div>
          );
        })}
      </div>
      {provider && (
        <p className="text-[9px] font-mono text-[#E0F7FA]/40">
          Last played via <span className="text-[#00F2FF]">{provider}</span>
        </p>
      )}
    </div>
  );
}
