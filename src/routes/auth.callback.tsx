import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { LensWrap } from "@/components/effects/GravitationalLens";
import { playError, playSuccess } from "@/lib/sound";

/**
 * /auth/callback
 *
 * Public landing for every auth redirect:
 *   • Email confirmation links (signup / magic link)
 *   • Password recovery links
 *   • Google (or other) OAuth via Supabase or Lovable broker
 *
 * Why this exists:
 *   Redirecting straight to /home races the auth gate — the _authenticated
 *   layout's beforeLoad can run before Supabase finishes parsing the hash /
 *   exchanging the PKCE code, and the user gets bounced back to /auth (or
 *   sees a 404 if the Site URL pointed at a dead host). This page waits for
 *   the session, then navigates.
 */
const searchSchema = z.object({
  next: z.string().optional(),
  code: z.string().optional(),
  error: z.string().optional(),
  error_description: z.string().optional(),
  error_code: z.string().optional(),
});

export const Route = createFileRoute("/auth/callback")({
  validateSearch: searchSchema,
  ssr: false,
  head: () => ({
    meta: [
      { title: "Signing in · Rewritten AI" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthCallback,
});

function safeNext(raw: string | undefined): string {
  if (!raw) return "/home";
  // Only allow same-origin relative paths — never open-redirect off-site.
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/home";
  return raw;
}

function AuthCallback() {
  const search = useSearch({ from: "/auth/callback" });
  const navigate = useNavigate();
  const [status, setStatus] = useState<"working" | "error">("working");
  const [message, setMessage] = useState("Opening the portal…");

  useEffect(() => {
    let cancelled = false;
    let settled = false;

    const finish = (path: string) => {
      if (cancelled || settled) return;
      settled = true;
      playSuccess();
      // Hard navigation so the authenticated layout re-reads the session
      // from storage after tokens were written. Soft client navigations can
      // race getUser() and bounce back to /auth.
      if (typeof window !== "undefined") {
        window.location.replace(path);
        return;
      }
      navigate({ to: path as "/home" });
    };

    const fail = (msg: string) => {
      if (cancelled || settled) return;
      settled = true;
      setStatus("error");
      setMessage(msg);
      playError();
    };

    const run = async () => {
      // Explicit error from the provider (e.g. user denied Google consent).
      if (search.error || search.error_description) {
        fail(
          search.error_description?.replace(/\+/g, " ") ||
            search.error ||
            "Sign-in was cancelled.",
        );
        return;
      }

      try {
        // PKCE: ?code=... in the query string
        if (search.code) {
          const { error } = await supabase.auth.exchangeCodeForSession(search.code);
          if (error) {
            fail(error.message);
            return;
          }
          finish(safeNext(search.next));
          return;
        }

        // Implicit / email-link: tokens land in the URL hash. Supabase's
        // client auto-detects them on init when detectSessionInUrl is true.
        // Wait for that (or an existing session) with a short poll.
        const { data: existing } = await supabase.auth.getSession();
        if (existing.session) {
          finish(safeNext(search.next));
          return;
        }

        // Listen for the hash-parser to fire SIGNED_IN / PASSWORD_RECOVERY.
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((event, session) => {
          if (session && (event === "SIGNED_IN" || event === "PASSWORD_RECOVERY" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED")) {
            subscription.unsubscribe();
            if (event === "PASSWORD_RECOVERY") {
              finish("/reset-password");
              return;
            }
            finish(safeNext(search.next));
          }
        });

        // Final poll — covers slow hash parsing / storage writes.
        const deadline = Date.now() + 8000;
        while (!cancelled && !settled && Date.now() < deadline) {
          await new Promise((r) => setTimeout(r, 200));
          const { data } = await supabase.auth.getSession();
          if (data.session) {
            subscription.unsubscribe();
            finish(safeNext(search.next));
            return;
          }
        }

        if (!settled) {
          subscription.unsubscribe();
          fail(
            "Could not complete sign-in from this link. It may have expired — request a new one from the sign-in page.",
          );
        }
      } catch (e) {
        fail(e instanceof Error ? e.message : "Sign-in failed");
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [navigate, search.code, search.error, search.error_description, search.next]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative z-10">
      <div className="w-full max-w-md">
        <LensWrap strong>
          <div className="glass-panel-strong rounded-3xl p-8 text-center">
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 glass-panel mb-4">
              <span
                className="inline-block w-1.5 h-1.5 rounded-full bg-[#00F2FF]"
                style={{
                  boxShadow: "0 0 10px 2px rgba(0,242,255,0.7)",
                  animation: status === "working" ? "pulse 1.2s ease-in-out infinite" : undefined,
                }}
              />
              <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#00F2FF]/80">
                Auth · Callback
              </p>
            </div>
            <h1
              className="text-2xl text-[#E0F7FA] mb-3"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {status === "working" ? "Entering the lens" : "Signal lost"}
            </h1>
            <p className="text-sm text-[#E0F7FA]/70 font-mono">{message}</p>
            {status === "error" && (
              <a
                href="/auth"
                className="mt-6 inline-block rounded-full portal-tab active px-6 py-2.5 text-sm tracking-widest uppercase text-[#00F2FF]"
              >
                Back to sign in
              </a>
            )}
          </div>
        </LensWrap>
      </div>
    </div>
  );
}
