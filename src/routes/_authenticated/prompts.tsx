import { createFileRoute } from "@tanstack/react-router";
import PageHero from "@/components/PageHero";
import { LensWrap } from "@/components/effects/GravitationalLens";

const PROMPTS = [
  "Explain gravitational lensing to a marine biologist using whale metaphors.",
  "Design a portal-shaped UI component in Tailwind.",
  "Write a shader for feDisplacementMap-based spacetime warp.",
  "Draft a 30-second Seedance 2.0 storyboard about migrating cetaceans.",
];

export const Route = createFileRoute("/_authenticated/prompts")({
  component: () => (
    <div>
      <PageHero eyebrow="Prompt Vault" title="Save · share · remix.">
        Every prompt from Base44 kept.
      </PageHero>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PROMPTS.map((p, i) => (
          <LensWrap key={i}>
            <div className="glass-panel rounded-2xl p-5 text-sm text-[#E0F7FA]/80">{p}</div>
          </LensWrap>
        ))}
      </div>
    </div>
  ),
});
