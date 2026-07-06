import { createFileRoute } from "@tanstack/react-router";
import {
  Home,
  Search,
  Play,
  Folder,
  MessageSquare,
  ImageIcon,
  LayoutGrid,
  ArrowLeft,
  SlidersHorizontal,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import PlanOrb from "@/components/PlanOrb";
import FlowerBloom from "@/components/FlowerBloom";
import { CurvedChromeBar } from "@/components/effects/CurvedChromeBar";
import { openCheckout, getPriceIdForTier, getPaddle } from "@/lib/paddle-checkout";
import { getMySubscription, createPortalSession } from "@/lib/paddle.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/billing")({
  component: BillingPage,
});

type Tier = {
  id: "unlimited" | "unlimited_plus" | "infinity";
  name: string;
  price: string;
  period?: string;
  hue: number;
  featured?: boolean;
  features: string[];
};

const CENTER: Tier = {
  id: "infinity",
  name: "Infinity",
  price: "$29",
  period: "/mo",
  hue: 265,
  featured: true,
  features: [
    "~15,000 video experiences of credit",
    "Video stitched up to 3 hours",
    "Sphere: voice + ask-anything mode",
    "Priority queue on every model",
    "All models. All features. Everything.",
  ],
};

/**
 * Petals arranged clockwise from top. We repeat the two side tiers around the
 * ring so the mandala reads as an even 6-petal flower — the "real" pricing
 * is still Unlimited / Unlimited+ / Infinity.
 */
const PETALS: Tier[] = [
  {
    id: "unlimited_plus",
    name: "Unlimited+",
    price: "$9",
    period: "/mo",
    hue: 310,
    features: [
      "Everything in Unlimited",
      "Video stitched up to 2 hours",
      "Live coding + world-builder scaffolds",
      "10× monthly credits",
      "Extra frontier models",
    ],
  },
  {
    id: "unlimited",
    name: "Unlimited",
    price: "Free",
    hue: 200,
    features: [
      "Unlimited chat with the standard model",
      "Video generation, stitched up to 1 hour total",
      "Seedance 2.0 at minimum clip length",
      "1,000 base credits monthly",
    ],
  },
  {
    id: "unlimited_plus",
    name: "Unlimited+",
    price: "$9",
    period: "/mo",
    hue: 55,
    features: [
      "Everything in Unlimited",
      "Video stitched up to 2 hours",
      "Live coding + world-builder scaffolds",
      "10× monthly credits",
      "Extra frontier models",
    ],
  },
  {
    id: "unlimited",
    name: "Unlimited",
    price: "Free",
    hue: 145,
    features: [
      "Unlimited chat with the standard model",
      "Video generation, stitched up to 1 hour total",
      "Seedance 2.0 at minimum clip length",
      "1,000 base credits monthly",
    ],
  },
  {
    id: "unlimited_plus",
    name: "Unlimited+",
    price: "$9",
    period: "/mo",
    hue: 180,
    features: [
      "Everything in Unlimited",
      "Video stitched up to 2 hours",
      "Live coding + world-builder scaffolds",
      "10× monthly credits",
      "Extra frontier models",
    ],
  },
  {
    id: "unlimited",
    name: "Unlimited",
    price: "Free",
    hue: 320,
    features: [
      "Unlimited chat with the standard model",
      "Video generation, stitched up to 1 hour total",
      "Seedance 2.0 at minimum clip length",
      "1,000 base credits monthly",
    ],
  },
];

function BillingPage() {
  const [busy, setBusy] = useState<string | null>(null);
  const [currentTier, setCurrentTier] = useState<string>("unlimited");
  const [status, setStatus] = useState<string>("active");
  const [paddleReady, setPaddleReady] = useState(false);
  const [email, setEmail] = useState<string | undefined>();
  const [userId, setUserId] = useState<string | undefined>();

  useEffect(() => {
    getPaddle().then((p) => setPaddleReady(Boolean(p)));
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setEmail(data.user?.email);
      setUserId(data.user?.id);
      const res = await getMySubscription();
      if (res.ok && res.subscription) {
        setCurrentTier(res.subscription.tier ?? "unlimited");
        setStatus(res.subscription.status ?? "active");
      }
    })();
  }, []);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (typeof e.data === "object" && e.data?.name === "checkout.completed") {
        toast.success("Payment received — activating your plan…");
        setTimeout(async () => {
          const res = await getMySubscription();
          if (res.ok && res.subscription) {
            setCurrentTier(res.subscription.tier ?? "unlimited");
            setStatus(res.subscription.status ?? "active");
          }
        }, 2500);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const checkout = async (tier: Tier) => {
    if (tier.id === "unlimited") {
      toast.info("Unlimited is the free tier — you already have it.");
      return;
    }
    const priceId = getPriceIdForTier(tier.id);
    if (!priceId) {
      toast.error(
        `Price ID for "${tier.name}" is not configured. Set VITE_PADDLE_PRICE_${tier.id.toUpperCase()} in your env.`,
      );
      return;
    }
    if (!paddleReady) {
      toast.error("Paddle isn't initialized. Set VITE_PADDLE_CLIENT_TOKEN and reload.");
      return;
    }
    setBusy(tier.id);
    try {
      await openCheckout({
        priceId,
        userId,
        email,
        successUrl: `${window.location.origin}/billing?success=1`,
        customData: { tier: tier.id },
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setBusy(null);
    }
  };

  const manage = async () => {
    setBusy("portal");
    try {
      const res = await createPortalSession();
      if (res.ok && res.url) {
        window.open(res.url, "_blank", "noopener");
      } else {
        toast.error(
          res.ok === false
            ? res.error === "no_paddle_customer"
              ? "No paid subscription found yet."
              : `Could not open portal: ${res.error}`
            : "Portal URL unavailable.",
        );
      }
    } finally {
      setBusy(null);
    }
  };

  const centerOrb = (
    <PlanOrb
      id={CENTER.id}
      name={CENTER.name}
      price={CENTER.price}
      period={CENTER.period}
      features={CENTER.features}
      hue={CENTER.hue}
      featured
      isCurrent={currentTier === CENTER.id}
      busy={busy === CENTER.id}
      parallaxIntensity={0.5}
      onCheckout={() => checkout(CENTER)}
    />
  );

  const petalOrbs = PETALS.map((t, i) => (
    <PlanOrb
      key={`${t.id}-${i}`}
      id={t.id}
      name={t.name}
      price={t.price}
      period={t.period}
      features={t.features}
      hue={t.hue}
      isCurrent={currentTier === t.id && i < 2}
      busy={busy === t.id}
      parallaxIntensity={1.2}
      onCheckout={() => checkout(t)}
    />
  ));

  return (
    <div
      className="relative -mx-24 -my-10 min-h-screen overflow-hidden flex flex-col"
      style={{ perspective: 1800 }}
    >
      {/* Top curved chrome nav */}
      <div className="relative z-10 pt-8 flex justify-center">
        <CurvedChromeBar variant="top">
          <NavIcon icon={<Home />} active />
          <NavIcon icon={<Search />} />
          <NavIcon icon={<Play />} />
          <NavIcon icon={<Folder />} />
          <NavIcon icon={<MessageSquare />} />
          <NavIcon icon={<ImageIcon />} />
          <NavIcon icon={<LayoutGrid />} />
        </CurvedChromeBar>
      </div>

      {/* Eyebrow + status */}
      <div className="relative z-10 mt-8 mb-2 flex flex-col items-center gap-2">
        <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 glass-panel">
          <span
            className="inline-block w-1.5 h-1.5 rounded-full bg-[#00F2FF]"
            style={{ boxShadow: "0 0 10px 2px rgba(0,242,255,0.7)" }}
          />
          <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#00F2FF]/80">
            Billing · choose your world
          </p>
        </div>
        <div className="flex gap-3 items-center text-xs">
          <span className="text-[#E0F7FA]/60">
            Currently on{" "}
            <span className="text-[#00F2FF] font-semibold uppercase tracking-wider">
              {currentTier.replace("_", " ")}
            </span>
          </span>
          {status !== "active" && (
            <span className="rounded-full bg-amber-400/10 px-2 py-0.5 text-amber-300 uppercase tracking-widest text-[10px]">
              {status}
            </span>
          )}
          {currentTier !== "unlimited" && (
            <button
              onClick={manage}
              disabled={busy === "portal"}
              className="ml-2 rounded-full px-3 py-1 glass-panel hover:border-[#00F2FF]/40 disabled:opacity-40 flex items-center gap-1"
            >
              {busy === "portal" ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <ExternalLink className="w-3 h-3" />
              )}
              Manage
            </button>
          )}
        </div>
      </div>

      {/* Flower mandala */}
      <div className="relative z-10 flex-1 flex items-center justify-center py-10">
        {/* Rotating decorative halo behind the flower */}
        <div
          className="pointer-events-none absolute rounded-full"
          style={{
            width: 720,
            height: 720,
            background:
              "conic-gradient(from 0deg, rgba(0,242,255,0.08), rgba(124,58,237,0.06), rgba(236,72,153,0.06), rgba(245,158,11,0.05), rgba(0,242,255,0.08))",
            filter: "blur(40px)",
            animation: "slowSpin 60s linear infinite",
          }}
        />
        <FlowerBloom
          radius={280}
          petalSize={170}
          centerSize={340}
          center={centerOrb}
          petals={petalOrbs}
        />
      </div>

      {/* Bottom curved chrome pager */}
      <div className="relative z-10 flex justify-center pb-8">
        <CurvedChromeBar variant="bottom">
          <button className="w-9 h-9 rounded-full border border-white/25 flex items-center justify-center text-white/80 hover:border-[#00F2FF]/70 hover:text-[#00F2FF] transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 px-6">
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className="rounded-full transition-all"
                style={{
                  width: i === 2 ? 8 : 5,
                  height: i === 2 ? 8 : 5,
                  background: i === 2 ? "#eaf3ff" : "rgba(224,247,250,0.35)",
                }}
              />
            ))}
          </div>
          <button
            onClick={manage}
            disabled={currentTier === "unlimited"}
            className="w-9 h-9 rounded-full border border-white/25 flex items-center justify-center text-white/80 hover:border-[#00F2FF]/70 hover:text-[#00F2FF] disabled:opacity-40 transition-colors"
            title="Manage subscription"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </CurvedChromeBar>
      </div>

      {!paddleReady && (
        <div className="relative z-10 pb-4 text-center font-mono text-[10px] text-amber-300/80">
          ⚠ VITE_PADDLE_CLIENT_TOKEN not set — checkout disabled. See PADDLE_SETUP.md
        </div>
      )}
      <div className="relative z-10 pb-6 text-center font-mono text-[10px] text-[#E0F7FA]/40 tracking-widest">
        POWERED BY PADDLE · MERCHANT OF RECORD · GLOBAL TAX HANDLED
      </div>
    </div>
  );
}

function NavIcon({ icon, active = false }: { icon: React.ReactNode; active?: boolean }) {
  return (
    <button
      className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all ${
        active
          ? "text-white drop-shadow-[0_0_10px_rgba(160,220,255,0.85)]"
          : "text-white/55 hover:text-white/95"
      }`}
    >
      <span className="[&_svg]:w-[18px] [&_svg]:h-[18px]">{icon}</span>
    </button>
  );
}
