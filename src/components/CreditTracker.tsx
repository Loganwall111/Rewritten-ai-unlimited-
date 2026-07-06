import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { getCreditBalance } from "@/lib/credits.functions";
import { supabase } from "@/integrations/supabase/client";

/**
 * Top-right pill showing the signed-in user's current credit balance.
 * Refreshes every 15s and on window focus.
 */
export default function CreditTracker() {
  const fetchBal = useServerFn(getCreditBalance);
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setBalance(null);
        return;
      }
      const res = await fetchBal();
      setBalance(res.balance);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const t = window.setInterval(load, 15000);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    // Refresh right after auth state changes
    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    return () => {
      window.clearInterval(t);
      window.removeEventListener("focus", onFocus);
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (balance === null && !loading) return null;

  return (
    <Link
      to="/billing"
      className="fixed top-4 right-4 z-40 glass-panel-strong rounded-full px-4 py-2 flex items-center gap-2 border border-[#00F2FF]/25 hover:border-[#00F2FF]/60 transition-colors"
      title="Credits · click to buy more"
    >
      <Sparkles className="w-4 h-4 text-[#00F2FF]" />
      <span className="text-sm font-mono text-[#E0F7FA]">
        {balance === null ? "…" : balance.toLocaleString()}
      </span>
      <span className="text-[10px] font-mono uppercase tracking-widest text-[#00F2FF]/70">cr</span>
    </Link>
  );
}
