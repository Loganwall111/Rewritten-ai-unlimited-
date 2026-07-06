import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import PageHero from "@/components/PageHero";
import { LensWrap } from "@/components/effects/GravitationalLens";
import { getAllModels, getModel } from "@/lib/models";
import { createVideoJob, getJobStatus } from "@/lib/video.functions";
import { playClick, playError, playSuccess } from "@/lib/sound";

export const Route = createFileRoute("/_authenticated/video")({
  head: () => ({
    meta: [
      { title: "Video Forge · Rewritten AI" },
      { name: "description", content: "Generate short videos with Sora, Runway, or Seedance." },
    ],
  }),
  component: VideoPage,
});

type Job = {
  id: string;
  status: string;
  output_url?: string | null;
  error?: string | null;
} | null;

function VideoPage() {
  const models = getAllModels("video");
  const createJob = useServerFn(createVideoJob);
  const getStatus = useServerFn(getJobStatus);

  const [model, setModel] = useState(models[0]?.id ?? "sora-2");
  const [prompt, setPrompt] = useState("");
  const [job, setJob] = useState<Job>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const current = getModel(model);

  // Poll job
  useEffect(() => {
    if (!job || job.status === "completed" || job.status === "failed") return;
    const t = window.setInterval(async () => {
      try {
        const res = await getStatus({ data: { id: job.id } });
        if (res) setJob(res as Job);
      } catch {
        /* ignore */
      }
    }, 3000);
    return () => window.clearInterval(t);
  }, [job, getStatus]);

  const generate = async () => {
    if (!prompt.trim() || loading) return;
    playClick();
    setError(null);
    setLoading(true);
    try {
      const { jobId } = await createJob({ data: { model, prompt } });
      setJob({ id: jobId, status: "queued" });
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
      <PageHero eyebrow="Video Forge" title="Sora, Runway, Seedance — one queue.">
        Long-running video jobs run in the background. Watch the status update in real time.
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
            placeholder="A slow drift through a whale nebula, cinematic lighting…"
            className="w-full h-24 rounded-xl glass-panel bg-transparent p-4 text-sm text-[#E0F7FA] placeholder:text-[#E0F7FA]/30 outline-none focus:border-[#00F2FF]/40"
          />
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={generate}
              disabled={loading || !prompt.trim()}
              className="portal-tab px-6 py-2.5 rounded-full text-sm text-[#00F2FF] disabled:opacity-40"
            >
              {loading ? "Queuing…" : `Generate · ${current?.credits ?? "?"} credits`}
            </button>
            <span className="text-[10px] font-mono text-[#E0F7FA]/40">
              {current?.name} · {current?.provider}
            </span>
          </div>
          {current?.requiresKey && (
            <p className="mt-3 text-[10px] font-mono text-[#E0F7FA]/50">
              Requires <span className="text-[#00F2FF]">{current.requiresKey}</span> secret. Ask
              Lovable to add it in Project Settings → Secrets to enable this model.
            </p>
          )}
          {error && <p className="mt-3 text-xs text-red-400 font-mono">{error}</p>}
        </div>
      </LensWrap>

      {job && (
        <div className="mt-6">
          <LensWrap>
            <div className="glass-panel-strong rounded-2xl p-6">
              <p className="text-[10px] font-mono uppercase tracking-widest text-[#00F2FF]/70">
                Job {job.id.slice(0, 8)} · {job.status}
              </p>
              {job.status !== "completed" && job.status !== "failed" && (
                <p className="mt-3 text-sm text-[#E0F7FA]/70">
                  ▸ Video generation is running. This can take a minute or two…
                </p>
              )}
              {job.status === "failed" && (
                <p className="mt-3 text-sm text-red-400 font-mono">⚠ {job.error}</p>
              )}
              {job.status === "completed" && job.output_url && (
                <video
                  src={job.output_url}
                  controls
                  className="mt-4 w-full rounded-xl"
                />
              )}
            </div>
          </LensWrap>
        </div>
      )}
    </div>
  );
}
