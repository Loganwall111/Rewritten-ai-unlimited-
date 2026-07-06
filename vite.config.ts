// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Deploy target — controlled by DEPLOY_TARGET env var so the same repo can
// ship to Vercel, Cloudflare, Netlify, or run locally.
//   DEPLOY_TARGET=vercel      → Vercel serverless (default when VERCEL=1)
//   DEPLOY_TARGET=cloudflare  → Cloudflare Workers (default otherwise)
//   DEPLOY_TARGET=netlify     → Netlify Functions
//   DEPLOY_TARGET=node        → plain Node server (npm start)
function pickPreset(): string {
  const explicit = process.env.DEPLOY_TARGET?.toLowerCase();
  if (explicit === "vercel") return "vercel";
  if (explicit === "cloudflare") return "cloudflare-module";
  if (explicit === "netlify") return "netlify";
  if (explicit === "node") return "node-server";
  // Auto-detect common CI environments
  if (process.env.VERCEL === "1") return "vercel";
  if (process.env.NETLIFY === "true") return "netlify";
  // Default: Cloudflare (matches Lovable's default)
  return "cloudflare-module";
}

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  nitro: {
    preset: pickPreset(),
  },
});

