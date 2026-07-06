import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import AppShell from "../components/AppShell";
import { supabase } from "@/integrations/supabase/client";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="max-w-md text-center glass-panel-strong rounded-2xl p-10">
        <h1 className="text-7xl font-bold text-[#00F2FF]" style={{ fontFamily: "var(--font-display)" }}>
          404
        </h1>
        <p className="mt-4 text-sm text-[#E0F7FA]/70">Lost in the lens. That portal doesn't exist.</p>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="max-w-md text-center glass-panel-strong rounded-2xl p-10">
        <h1 className="text-xl font-semibold text-[#00F2FF]">Signal lost</h1>
        <p className="mt-2 text-sm text-[#E0F7FA]/60">The portal collapsed unexpectedly.</p>
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="mt-6 rounded-full portal-tab px-6 py-2 text-sm text-[#00F2FF]"
        >
          Reopen portal
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Rewritten AI Unlimited — every model, every voice, one lens" },
      {
        name: "description",
        content:
          "Rewritten AI Unlimited — a lensed portal to every model, every voice, every creation.",
      },
      { property: "og:title", content: "Rewritten AI Unlimited — every model, every voice, one lens" },
      {
        property: "og:description",
        content: "A lensed portal to every model, every voice, every creation.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Rewritten AI Unlimited — every model, every voice, one lens" },
      { name: "description", content: "Chat, code, images, video, and voice — all warped through gravitational lenses, drifting whales, and spinning black holes. Sign in to enter the portal." },
      { property: "og:description", content: "Chat, code, images, video, and voice — all warped through gravitational lenses, drifting whales, and spinning black holes. Sign in to enter the portal." },
      { name: "twitter:description", content: "Chat, code, images, video, and voice — all warped through gravitational lenses, drifting whales, and spinning black holes. Sign in to enter the portal." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/c24e24d0-5879-4009-bba8-b9154490398a/id-preview-044d7bee--b21d21d4-4a1d-48cc-9436-9a9f0a3ffa69.lovable.app-1783289884787.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/c24e24d0-5879-4009-bba8-b9154490398a/id-preview-044d7bee--b21d21d4-4a1d-48cc-9436-9a9f0a3ffa69.lovable.app-1783289884787.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700&family=Space+Grotesk:wght@300;400;500;600&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => sub.subscription.unsubscribe();
  }, [router, queryClient]);
  return (
    <QueryClientProvider client={queryClient}>
      <AppShell>
        <Outlet />
      </AppShell>
    </QueryClientProvider>
  );
}
