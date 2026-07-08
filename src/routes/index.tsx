import { createFileRoute } from "@tanstack/react-router";
import { BabylonLandingHero } from "@/components/babylon-chrome/BabylonLandingHero";

/**
 * / — the public landing.
 *
 * Now a full-bleed Babylon "Cosmic Gateway" experience: glowing icosphere,
 * orbital rings, and a 3,000-particle nebula, with the sign-in / sign-up
 * orbs floating in 3D space. No login required and no env vars needed to
 * RENDER — visitors see the graphics overhaul the instant they arrive.
 */
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Rewritten AI Unlimited — every model, every voice, one lens" },
      {
        name: "description",
        content:
          "Chat, code, images, video, and voice — all warped through gravitational lenses, drifting whales, and spinning black holes. Powered by Babylon.",
      },
      { property: "og:title", content: "Rewritten AI Unlimited" },
      {
        property: "og:description",
        content: "A lensed portal to every model, every voice, every creation.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return <BabylonLandingHero />;
}
