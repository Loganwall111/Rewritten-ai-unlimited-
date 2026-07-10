import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

/**
 * Protected layout gate. All routes under /_authenticated/ require a session.
 * ssr:false because Supabase stores the session in localStorage.
 *
 * When the user arrives with auth tokens still in the URL (email confirm /
 * OAuth redirect that landed on a gated path like /home), bounce them to
 * /auth/callback so the public callback page can establish the session
 * instead of immediately kicking them back to /auth.
 */
export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (!error && data.user) {
      return { user: data.user };
    }

    // Session not ready yet — check if this looks like an auth redirect.
    if (typeof window !== "undefined") {
      const hash = window.location.hash ?? "";
      const search = location.searchStr ?? "";
      const hasAuthPayload =
        /access_token=|refresh_token=|type=signup|type=magiclink|type=recovery|type=invite|type=email|#access_token/.test(
          `${hash}${search}`,
        ) || /[?&]code=/.test(search) || /[?&]code=/.test(window.location.search);

      if (hasAuthPayload) {
        const next = location.pathname || "/home";
        throw redirect({
          to: "/auth/callback",
          search: { next },
        });
      }
    }

    throw redirect({ to: "/auth" });
  },
  component: () => <Outlet />,
});
