import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LensWrap } from "@/components/effects/GravitationalLens";
import { playError, playSuccess } from "@/lib/sound";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Reset password · Rewritten AI" }, { name: "robots", content: "noindex" }] }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase sets a temporary session from the reset link hash. Wait for it.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => { if (data.session) setReady(true); });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { setError(error.message); playError(); return; }
    playSuccess();
    navigate({ to: "/home" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative z-10">
      <div className="w-full max-w-md">
        <LensWrap strong>
          <div className="glass-panel-strong rounded-3xl p-8">
            <h1 className="text-2xl text-[#E0F7FA] mb-4" style={{ fontFamily: "var(--font-display)" }}>
              Set a new password
            </h1>
            {!ready && <p className="text-xs text-[#E0F7FA]/50">Waiting for reset link session…</p>}
            {ready && (
              <form onSubmit={submit} className="space-y-3">
                <input
                  type="password" required minLength={6}
                  placeholder="New password"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-[#E0F7FA] focus:border-[#00F2FF]/50 outline-none"
                />
                {error && <p className="text-[11px] text-red-400 font-mono">{error}</p>}
                <button
                  type="submit" disabled={loading}
                  className="w-full rounded-full portal-tab active py-3 text-sm tracking-widest uppercase text-[#00F2FF] disabled:opacity-50"
                >
                  {loading ? "…" : "Update password"}
                </button>
              </form>
            )}
          </div>
        </LensWrap>
      </div>
    </div>
  );
}
