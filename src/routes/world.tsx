/**
 * /world — the Rewritten World hub.
 *
 * Now a fully interactive Babylon "room of doors": you stand in a PBR marble
 * hall ringed by 12 glowing doors, each a clickable portal to a world or app
 * section. This leads with the graphics overhaul instead of hiding it behind
 * a login — no env vars needed to SEE it.
 *
 * (The original 6-phase Three.js cinematic is preserved in git history.)
 */

import { createFileRoute } from "@tanstack/react-router";
import { BabylonHub } from "@/components/babylon-chrome/BabylonHub";

export const Route = createFileRoute("/world")({
  head: () => ({
    meta: [
      { title: "Rewritten World — The Hub" },
      {
        name: "description",
        content: "A Babylon hub of 12 glowing doors — choose your world.",
      },
    ],
  }),
  component: WorldPage,
});

function WorldPage() {
  return <BabylonHub />;
}
