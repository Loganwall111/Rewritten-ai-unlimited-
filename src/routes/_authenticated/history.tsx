import { createFileRoute } from "@tanstack/react-router";
import PageHero from "@/components/PageHero";
import { LensWrap } from "@/components/effects/GravitationalLens";

export const Route = createFileRoute("/_authenticated/history")({
  component: () => (
    <div>
      <PageHero eyebrow="History" title="Every session, every render.">
        Local history is preserved across visits.
      </PageHero>
      <LensWrap>
        <div className="glass-panel-strong rounded-2xl p-10 text-center text-sm text-[#E0F7FA]/50">
          No history yet — your first conversation, image, or video will show up here.
        </div>
      </LensWrap>
    </div>
  ),
});
