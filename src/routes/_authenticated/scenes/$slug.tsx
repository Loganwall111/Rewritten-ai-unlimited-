/**
 * /scenes/$slug — renders a single Babylon scene by slug.
 *
 * Reads the slug from the route params, looks it up in the registry, and hands
 * it to the SceneViewer. Invalid slugs fall back to the gallery.
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import { getScene } from "@/lib/babylon/registry";
import { SceneViewer } from "@/components/babylon-chrome/SceneViewer";

export const Route = createFileRoute("/_authenticated/scenes/$slug")({
  head: ({ params }) => {
    const entry = getScene(params.slug);
    return {
      meta: [
        { title: `${entry?.title ?? "Scene"} · Rewritten AI` },
        { name: "description", content: entry?.blurb ?? "A Babylon cinematic scene." },
      ],
    };
  },
  component: SceneRoute,
});

function SceneRoute() {
  const { slug } = Route.useParams();
  const entry = getScene(slug);

  if (!entry) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-6">
        <h1 className="text-2xl text-[#00F2FF]" style={{ fontFamily: "var(--font-display)" }}>
          Scene not found
        </h1>
        <p className="text-sm text-[#E0F7FA]/60">"{slug}" isn't in the registry.</p>
        <Link
          to="/scenes"
          className="rounded-full px-5 py-2.5 text-xs font-mono uppercase tracking-widest text-[#00F2FF]"
          style={{ border: "1px solid rgba(0,242,255,0.5)" }}
        >
          ← Back to gallery
        </Link>
      </div>
    );
  }

  return <SceneViewer entry={entry} />;
}
