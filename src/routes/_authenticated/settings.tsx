import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import PageHero from "@/components/PageHero";
import { LensWrap } from "@/components/effects/GravitationalLens";
import { MODELS } from "@/lib/models";
import VoiceSelector from "@/components/VoiceSelector";
import { isSoundEnabled, setSoundEnabled, playClick } from "@/lib/sound";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings · Rewritten AI" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const [sound, setSound] = useState(true);
  useEffect(() => setSound(isSoundEnabled()), []);

  const toggle = () => {
    const next = !sound;
    setSoundEnabled(next);
    setSound(next);
    if (next) playClick();
  };

  return (
    <div>
      <PageHero eyebrow="Settings" title="Voices · Sound · Models.">
        Every setting from the Base44 build, live in the cloud.
      </PageHero>

      <section className="mb-8">
        <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.35em] text-[#00F2FF]/60">Sound</p>
        <LensWrap>
          <div className="glass-panel rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-[#E0F7FA]">UI sound effects</p>
              <p className="text-[10px] text-[#E0F7FA]/50">Clicks, hovers, boot beeps, whale calls.</p>
            </div>
            <button
              onClick={toggle}
              className={`portal-tab px-4 py-2 rounded-full text-xs uppercase tracking-widest ${sound ? "active text-[#00F2FF]" : "text-[#E0F7FA]/50"}`}
            >
              {sound ? "On" : "Off"}
            </button>
          </div>
        </LensWrap>
      </section>

      <section className="mb-8">
        <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.35em] text-[#00F2FF]/60">Voice</p>
        <LensWrap>
          <div className="glass-panel rounded-2xl p-4">
            <p className="mb-3 text-xs text-[#E0F7FA]/60">
              Voices play through ElevenLabs when connected, with automatic Lovable AI TTS fallback. Preview each to hear.
            </p>
            <VoiceSelector />
          </div>
        </LensWrap>
      </section>

      <section>
        <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.35em] text-[#00F2FF]/60">Models</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {MODELS.map((m) => (
            <LensWrap key={m.id}>
              <div className="glass-panel rounded-2xl p-4 flex justify-between">
                <div>
                  <p className="text-sm text-[#E0F7FA]">{m.name}</p>
                  <p className="text-[10px] text-[#E0F7FA]/50">{m.provider} · {m.modality.join(" · ")}</p>
                </div>
                <span className="text-[10px] font-mono text-[#00F2FF]/70">
                  {m.tier === "hosted" ? `${m.credits}cr` : "free"}
                </span>
              </div>
            </LensWrap>
          ))}
        </div>
      </section>
    </div>
  );
}
