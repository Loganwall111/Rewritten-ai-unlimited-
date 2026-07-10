import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { LensWrap } from "@/components/effects/GravitationalLens";
import { playClick, playError, playSuccess } from "@/lib/sound";
import { getAppOrigin, getAuthCallbackUrl } from "@/lib/appUrl";

const searchSchema = z.object({
  mode: z.enum(["login", "register", "forgot"]).optional(),
  next: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in · Rewritten AI Unlimited" },
      {
        name: "description",
        content: "Enter the lens. Sign in or create a Rewritten AI account.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const search = useSearch({ from: "/auth" });
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register" | "forgot">(search.mode ?? "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: (search.next ?? "/home") as string });
    });
  }, [navigate, search.next]);

  const goNext = () => {
    // Replay the intro when they enter — feels ceremonial
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("rewritten_intro_played");
    }
    navigate({ to: (search.next ?? "/home") as string });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    playClick();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      playError();
      return;
    }
    playSuccess();
    goNext();
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    playClick();
    // Land on /auth/callback (public) so the session can be established
    // before the authenticated /home gate runs. Never hardcode localhost —
    // getAuthCallbackUrl prefers VITE_SITE_URL in production.
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: getAuthCallbackUrl(search.next ?? "/home"),
        data: { display_name: displayName || email.split("@")[0] },
      },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      playError();
      return;
    }
    playSuccess();
    setInfo("Check your inbox to confirm your email, then sign in.");
    setMode("login");
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    playClick();
    // Recovery links also go through /auth/callback, which detects
    // PASSWORD_RECOVERY and forwards to /reset-password.
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: getAuthCallbackUrl("/reset-password"),
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      playError();
      return;
    }
    playSuccess();
    setInfo("If that email exists, a reset link is on its way.");
  };

  /**
   * Google sign-in.
   *
   * Lovable's OAuth broker (`/~oauth/initiate`) ONLY exists on Lovable-hosted
   * previews. On Vercel / custom domains that path 404s ("AIR 404" / page not
   * found) — and the broker does a hard `window.location` redirect before we
   * can catch the failure. So we only use the broker on known Lovable hosts;
   * everywhere else we go straight to native Supabase Google OAuth, which
   * returns to /auth/callback on this domain.
   */
  const handleGoogle = async () => {
    setError(null);
    setLoading(true);
    playClick();

    const callbackUrl = getAuthCallbackUrl(search.next ?? "/home");
    const origin = getAppOrigin() || (typeof window !== "undefined" ? window.location.origin : "");
    const host = typeof window !== "undefined" ? window.location.hostname : "";
    // Only real Lovable preview hosts serve /~oauth/initiate. Plain
    // localhost (vite dev) and Vercel do not — using the broker there
    // navigates to a hard 404 ("AIR 404" / page not found).
    const isLovableHost =
      host.endsWith(".lovable.app") ||
      host.endsWith(".lovable.dev") ||
      host.endsWith(".lovableproject.com");

    // 1) Lovable broker — only when the host actually serves /~oauth/initiate.
    //    Skip on Vercel/production so we never navigate into a dead 404 route.
    if (isLovableHost) {
      try {
        const res = await lovable.auth.signInWithOAuth("google", {
          redirect_uri: callbackUrl,
        });
        if (res.redirected) {
          // Full-page redirect to the broker — leave loading on.
          return;
        }
        if (!res.error && res.tokens) {
          setLoading(false);
          playSuccess();
          goNext();
          return;
        }
        if (res.error) {
          console.warn(
            "[auth] Lovable OAuth broker failed, falling back to Supabase:",
            res.error.message,
          );
        }
      } catch (e) {
        console.warn("[auth] Lovable OAuth broker threw, falling back to Supabase:", e);
      }
    }

    // 2) Native Supabase Google OAuth — works on any host once Google is
    //    enabled in Supabase → Authentication → Providers and Redirect URLs
    //    include this origin + /auth/callback.
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callbackUrl,
          skipBrowserRedirect: false,
          queryParams: {
            prompt: "select_account",
          },
        },
      });
      if (error) {
        setLoading(false);
        setError(
          error.message ||
            `Google sign-in failed. Enable the Google provider in Supabase Auth and add ${origin}/auth/callback to Redirect URLs.`,
        );
        playError();
        return;
      }
      if (data?.url && typeof window !== "undefined") {
        window.location.assign(data.url);
        return;
      }
      setLoading(false);
    } catch (e) {
      setLoading(false);
      setError(e instanceof Error ? e.message : "Google sign-in failed");
      playError();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 relative z-10">
      {/* Backdrop wireframe globe */}
      <svg
        aria-hidden
        className="absolute pointer-events-none opacity-40"
        width="640"
        height="640"
        viewBox="0 0 200 200"
        style={{ animation: "bootGlobeSpin 40s linear infinite" }}
      >
        <defs>
          <radialGradient id="auth-fade" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.7)" />
            <stop offset="70%" stopColor="rgba(255,255,255,0.25)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
          <mask id="auth-mask">
            <circle cx="100" cy="100" r="95" fill="url(#auth-fade)" />
          </mask>
        </defs>
        <g mask="url(#auth-mask)" stroke="rgba(120,200,255,0.5)" strokeWidth="0.22" fill="none">
          {Array.from({ length: 14 }, (_, i) => {
            const rx = Math.abs(Math.cos((i / 14) * Math.PI)) * 95 + 2;
            return <ellipse key={`m${i}`} cx="100" cy="100" rx={rx} ry="95" />;
          })}
          {Array.from({ length: 11 }, (_, i) => {
            const y = 10 + i * 18;
            const dy = y - 100;
            const rx = Math.sqrt(Math.max(0, 95 * 95 - dy * dy));
            return <ellipse key={`p${i}`} cx="100" cy={y} rx={rx} ry={rx * 0.15} />;
          })}
        </g>
      </svg>

      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md relative"
      >
        {/* Chromatic aura */}
        <div
          className="absolute -inset-6 rounded-[36px] pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 50% 50%, rgba(0,242,255,0.25) 0%, rgba(124,58,237,0.18) 45%, transparent 70%)",
            filter: "blur(30px)",
          }}
        />
        <LensWrap strong>
          <div className="glass-panel-strong tilt-3d rounded-3xl p-8 relative">
            <div className="mb-6 text-center">
              <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 glass-panel mb-3">
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full bg-[#00F2FF]"
                  style={{
                    boxShadow: "0 0 10px 2px rgba(0,242,255,0.7)",
                  }}
                />
                <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#00F2FF]/80">
                  Rewritten · AI
                </p>
              </div>
              <h1
                className="text-3xl md:text-4xl text-[#E0F7FA]"
                style={{
                  fontFamily: "var(--font-display)",
                  textShadow:
                    "-1px 0 rgba(0,242,255,0.35), 1px 0 rgba(236,72,153,0.25), 0 0 24px rgba(120,180,255,0.35)",
                }}
              >
                {mode === "login" && "Enter the lens"}
                {mode === "register" && "Bend a new lens"}
                {mode === "forgot" && "Reset the horizon"}
              </h1>
            </div>

            <form
              onSubmit={
                mode === "login" ? handleLogin : mode === "register" ? handleRegister : handleForgot
              }
              className="space-y-3"
            >
              {mode === "register" && (
                <input
                  type="text"
                  placeholder="Display name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-[#E0F7FA] focus:border-[#00F2FF]/50 focus:ring-1 focus:ring-[#00F2FF]/30 outline-none transition"
                />
              )}
              <input
                type="email"
                required
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-[#E0F7FA] focus:border-[#00F2FF]/50 focus:ring-1 focus:ring-[#00F2FF]/30 outline-none transition"
              />
              {mode !== "forgot" && (
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-[#E0F7FA] focus:border-[#00F2FF]/50 focus:ring-1 focus:ring-[#00F2FF]/30 outline-none transition"
                />
              )}

              {error && <p className="text-[11px] text-red-400 font-mono">{error}</p>}
              {info && <p className="text-[11px] text-[#00F2FF] font-mono">{info}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full portal-tab active py-3 text-sm tracking-widest uppercase text-[#00F2FF] disabled:opacity-50 hover:scale-[1.02] transition-transform"
                style={{
                  boxShadow:
                    "inset 0 0 40px rgba(0,242,255,0.4), 0 0 40px rgba(0,242,255,0.5), 0 0 80px rgba(124,58,237,0.3)",
                }}
              >
                {loading
                  ? "…"
                  : mode === "login"
                    ? "▸  Sign in  ▸"
                    : mode === "register"
                      ? "▸  Create account  ▸"
                      : "▸  Send reset link  ▸"}
              </button>
            </form>

            <div className="my-4 flex items-center gap-3 text-[10px] font-mono uppercase tracking-widest text-[#E0F7FA]/40">
              <div className="flex-1 h-px bg-white/10" /> or
              <div className="flex-1 h-px bg-white/10" />
            </div>

            <button
              onClick={handleGoogle}
              className="w-full rounded-full glass-panel py-3 text-sm text-[#E0F7FA] hover:border-[#00F2FF]/40 flex items-center justify-center gap-3"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
                />
              </svg>
              Continue with Google
            </button>

            <div className="mt-6 space-y-2 text-center text-[11px] font-mono text-[#E0F7FA]/50">
              {mode === "login" && (
                <>
                  <p>
                    New here?{" "}
                    <button
                      className="text-[#00F2FF]"
                      onClick={() => {
                        setMode("register");
                        setError(null);
                      }}
                    >
                      Create an account
                    </button>
                  </p>
                  <p>
                    <button
                      className="text-[#00F2FF]"
                      onClick={() => {
                        setMode("forgot");
                        setError(null);
                      }}
                    >
                      Forgot password?
                    </button>
                  </p>
                </>
              )}
              {mode === "register" && (
                <p>
                  Already have one?{" "}
                  <button
                    className="text-[#00F2FF]"
                    onClick={() => {
                      setMode("login");
                      setError(null);
                    }}
                  >
                    Sign in
                  </button>
                </p>
              )}
              {mode === "forgot" && (
                <p>
                  <button
                    className="text-[#00F2FF]"
                    onClick={() => {
                      setMode("login");
                      setError(null);
                    }}
                  >
                    Back to sign in
                  </button>
                </p>
              )}
              <p className="pt-3">
                <Link to="/" className="text-[#E0F7FA]/40 hover:text-[#00F2FF]">
                  ← Back to portal
                </Link>
              </p>
            </div>
          </div>
        </LensWrap>
      </motion.div>
    </div>
  );
}
