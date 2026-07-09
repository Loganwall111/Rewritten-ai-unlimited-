import { useState } from "react";
import { RotateCcw, Settings } from "lucide-react";
import {
  VISUAL_SETTING_DEFS,
  resetVisualSettings,
  setVisualSetting,
  useVisualSettings,
  type ParticleDensity,
  type VisualSettingKey,
} from "@/lib/visualSettings";
import { playClick, sfxHover } from "@/lib/sound";

export default function VisualSettingsPanel() {
  const settings = useVisualSettings();
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed right-4 top-1/2 z-[620] -translate-y-1/2 text-[#E0F7FA]">
      <button
        type="button"
        onMouseEnter={sfxHover}
        onClick={() => {
          playClick();
          setOpen((value) => !value);
        }}
        className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full border border-cyan-300/25 bg-slate-950/70 text-cyan-100 shadow-[0_0_35px_rgba(0,242,255,0.18)] backdrop-blur-xl transition hover:scale-105 hover:border-cyan-100/70"
        aria-label="Open visual settings"
      >
        <Settings className="h-5 w-5" />
      </button>

      <aside
        className={`absolute right-0 top-1/2 max-h-[82vh] w-[min(380px,calc(100vw-32px))] -translate-y-1/2 overflow-hidden rounded-[28px] border border-cyan-300/20 bg-slate-950/88 shadow-[0_30px_120px_rgba(0,0,0,0.65)] backdrop-blur-2xl transition duration-300 ${
          open ? "translate-x-0 opacity-100" : "translate-x-[calc(100%+24px)] opacity-0"
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <p className="text-[9px] font-mono uppercase tracking-[0.3em] text-cyan-200/55">
              Visual Systems
            </p>
            <h2
              className="mt-1 text-lg text-white"
              style={{ fontFamily: "var(--font-display), sans-serif" }}
            >
              Effects Drawer
            </h2>
          </div>
          <button
            type="button"
            onMouseEnter={sfxHover}
            onClick={() => {
              playClick();
              resetVisualSettings();
            }}
            className="rounded-full border border-white/10 bg-white/5 p-2 text-cyan-100/70 hover:text-white"
            aria-label="Reset visual settings"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[68vh] space-y-2 overflow-y-auto p-4">
          {VISUAL_SETTING_DEFS.map((def) => {
            const value = settings[def.key as VisualSettingKey];
            return (
              <div
                key={def.key}
                className="rounded-2xl border border-white/10 bg-white/[0.045] p-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold text-white">{def.label}</p>
                    <p className="mt-0.5 text-[10px] leading-snug text-cyan-100/48">
                      {def.description}
                    </p>
                  </div>
                  {def.type === "boolean" && (
                    <button
                      type="button"
                      onMouseEnter={sfxHover}
                      onClick={() => {
                        playClick();
                        setVisualSetting(def.key, !value as never);
                      }}
                      className={`h-6 w-11 rounded-full border p-0.5 transition ${
                        value ? "border-cyan-200/60 bg-cyan-300/30" : "border-white/15 bg-black/35"
                      }`}
                    >
                      <span
                        className={`block h-4.5 w-4.5 rounded-full bg-white shadow transition ${
                          value ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  )}
                </div>

                {def.type === "choice" && (
                  <div className="mt-3 grid grid-cols-3 gap-1.5">
                    {def.options.map((option: ParticleDensity) => (
                      <button
                        key={option}
                        type="button"
                        onMouseEnter={sfxHover}
                        onClick={() => {
                          playClick();
                          setVisualSetting(def.key, option);
                        }}
                        className={`rounded-full border px-2 py-1.5 text-[9px] font-mono uppercase tracking-widest ${
                          value === option
                            ? "border-cyan-200/70 bg-cyan-300/15 text-white"
                            : "border-white/10 bg-black/20 text-cyan-100/55"
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                )}

                {def.type === "range" && (
                  <div className="mt-3 flex items-center gap-3">
                    <input
                      type="range"
                      min={def.min}
                      max={def.max}
                      step={def.step}
                      value={Number(value)}
                      onChange={(event) =>
                        setVisualSetting(def.key, Number(event.currentTarget.value))
                      }
                      className="w-full accent-cyan-300"
                    />
                    <span className="w-10 text-right text-[10px] font-mono text-cyan-100/70">
                      {Number(value)}°
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </aside>
    </div>
  );
}
