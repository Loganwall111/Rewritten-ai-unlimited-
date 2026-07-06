import { createFileRoute } from "@tanstack/react-router";
import PageHero from "@/components/PageHero";
import { LensWrap } from "@/components/effects/GravitationalLens";

export const Route = createFileRoute("/_authenticated/web-research")({ component: WebResearch });

function WebResearch() {
  return (
    <div>
      <PageHero eyebrow="Web Research" title="Grounded search + summarize.">
        Query the open web, cite sources, distill into briefs.
      </PageHero>
      <LensWrap>
        <div className="glass-panel-strong rounded-2xl p-6">
          <input placeholder="Search the web…" className="w-full rounded-full glass-panel bg-transparent px-5 py-3 text-sm text-[#E0F7FA] outline-none focus:border-[#00F2FF]/40" />
        </div>
      </LensWrap>
    </div>
  );
}
