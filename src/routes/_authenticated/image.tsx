import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import PageHero from "@/components/PageHero";
import { LensWrap } from "@/components/effects/GravitationalLens";
import { getAllModels, getModel } from "@/lib/models";
import { streamImage } from "@/lib/streamImage";
import { playClick, playError, playSuccess } from "@/lib/sound";

export const Route = createFileRoute("/_authenticated/image")({
  head: () => ({
    meta: [
      { title: "Image Studio · Rewritten AI" },
      {
        name: "description",
        content: "Generate images with GPT Image 2, Nano Banana, Gemini 3 Pro Image, and more.",
      },
    ],
  }),
  component: ImagePage,
});

function ImagePage() {
  const models = getAllModels("image");
  const [model, setModel] = useState<string>("openai/gpt-image-2");
  const [prompt, setPrompt] = useState("");
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [isFinal, setIsFinal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = getModel(model);

  const generate = async () => {
    if (!prompt.trim() || loading) return;
    playClick();
    setError(null);
    setImgUrl(null);
    setIsFinal(false);
    setLoading(true);
    try {
      await streamImage(prompt, model, (dataUrl, final) => {
        setImgUrl(dataUrl);
        if (final) setIsFinal(true);
      });
      playSuccess();
    } catch (e) {
      setError((e as Error).message);
      playError();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHero eyebrow="Image Studio" title="Every image model, one lens.">
        Pick a model, drop a prompt. Previews stream in as the image renders.
      </PageHero>

      <div className="mb-4 flex flex-wrap gap-2">
        {models.map((m) => (
          <button
            key={m.id}
            onClick={() => setModel(m.id)}
            className={`rounded-full px-3 py-1.5 text-[11px] font-mono ${
              model === m.id
                ? "portal-tab active text-[#00F2FF]"
                : "glass-panel text-[#E0F7FA]/60 hover:text-[#00F2FF]"
            }`}
          >
            {m.name}
            <span className="ml-2 text-[#00F2FF]/60">{m.credits}cr</span>
          </button>
        ))}
      </div>

      <LensWrap>
        <div className="glass-panel-strong rounded-2xl p-6">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="A gravitational lens over a whale nebula, cinematic, 8k…"
            className="w-full h-24 rounded-xl glass-panel bg-transparent p-4 text-sm text-[#E0F7FA] placeholder:text-[#E0F7FA]/30 outline-none focus:border-[#00F2FF]/40"
          />
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={generate}
              disabled={loading || !prompt.trim()}
              className="portal-tab px-6 py-2.5 rounded-full text-sm text-[#00F2FF] disabled:opacity-40"
            >
              {loading ? "Rendering…" : `Render · ${current?.credits ?? "?"} credits`}
            </button>
            <span className="text-[10px] font-mono text-[#E0F7FA]/40">
              {current?.name} · {current?.provider}
            </span>
          </div>
          {error && <p className="mt-3 text-xs text-red-400 font-mono">{error}</p>}
        </div>
      </LensWrap>

      {imgUrl && (
        <div className="mt-6">
          <LensWrap>
            <div className="glass-panel-strong rounded-2xl p-4 flex justify-center">
              <img
                src={imgUrl}
                alt={prompt}
                className={`max-w-full max-h-[70vh] rounded-xl transition-[filter] duration-500 ${
                  isFinal ? "" : "blur-xl"
                }`}
              />
            </div>
          </LensWrap>
        </div>
      )}
    </div>
  );
}
