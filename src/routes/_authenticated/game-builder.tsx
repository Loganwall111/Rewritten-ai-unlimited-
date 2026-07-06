import { createFileRoute } from "@tanstack/react-router";
import PageHero from "@/components/PageHero";
import { LensWrap } from "@/components/effects/GravitationalLens";

export const Route = createFileRoute("/_authenticated/game-builder")({
  component: () => (
    <div>
      <PageHero eyebrow="Game Builder" title="Playable scaffolds.">
        Remix-ready HTML5 games from a prompt.
      </PageHero>
      <LensWrap>
        <div className="glass-panel-strong rounded-2xl p-10 text-center">
          <p className="text-[#E0F7FA]/60 text-sm">A 2D neon runner where you dodge black holes…</p>
          <button className="portal-tab mt-4 px-6 py-2 rounded-full text-sm text-[#00F2FF]">
            Build game
          </button>
        </div>
      </LensWrap>
    </div>
  ),
});
