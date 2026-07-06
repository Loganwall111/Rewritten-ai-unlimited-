import { createFileRoute } from "@tanstack/react-router";
import PageHero from "@/components/PageHero";
import { LensWrap } from "@/components/effects/GravitationalLens";

export const Route = createFileRoute("/_authenticated/code")({ component: () => <StubPage title="Code Generation" desc="Full-stack scaffolds, refactors, playable snippets." /> });

function StubPage({ title, desc }: { title: string; desc: string }) {
  return (
    <div>
      <PageHero eyebrow={title} title={title}>{desc}</PageHero>
      <LensWrap>
        <div className="glass-panel-strong rounded-2xl p-10 text-center">
          <p className="text-sm text-[#E0F7FA]/60">This surface is wired to the same model catalog as chat. Ping it from the Chat tab or run a prompt below.</p>
          <textarea placeholder="Describe what to build…" className="mt-6 w-full h-40 rounded-xl glass-panel bg-transparent p-4 text-sm text-[#E0F7FA] outline-none focus:border-[#00F2FF]/40" />
          <button className="portal-tab mt-4 px-6 py-2 rounded-full text-sm text-[#00F2FF]">Generate</button>
        </div>
      </LensWrap>
    </div>
  );
}
