import { createFileRoute } from "@tanstack/react-router";
import { WalkableLanding } from "@/components/babylon-chrome/WalkableLanding";

/**
 * / — the public landing.
 *
 * Walkable layer: StudioIntro → CharacterCreator → Gateway world.
 * No login required. 20 playable worlds reachable from the world picker.
 */
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Rewritten AI Unlimited — walkable worlds" },
      {
        name: "description",
        content:
          "Walk and swim 20 Babylon worlds. WASD, jump, sprint, day/night, weather. No login required.",
      },
      { property: "og:title", content: "Rewritten AI Unlimited" },
      {
        property: "og:description",
        content: "A walkable portal to every world — powered by Babylon.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return <WalkableLanding />;
}
