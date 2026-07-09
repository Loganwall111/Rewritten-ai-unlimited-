import { useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import {
  COSMETIC_CATALOG,
  RARITY_STYLE,
  equipCosmetic,
  purchaseCosmetic,
  useCosmetics,
  type CosmeticCategory,
} from "@/lib/cosmetics";
import { playClick, sfxHover } from "@/lib/sound";

const CATEGORIES: Array<{ id: CosmeticCategory; label: string }> = [
  { id: "skins", label: "Skins" },
  { id: "accents", label: "Accents" },
  { id: "auras", label: "Auras" },
  { id: "accessories", label: "Accessories" },
];

export default function CosmeticsStore() {
  const state = useCosmetics();
  const [category, setCategory] = useState<CosmeticCategory>("skins");
  const items = useMemo(
    () => COSMETIC_CATALOG.filter((item) => item.category === category),
    [category],
  );

  return (
    <section className="rounded-[32px] border border-cyan-300/20 bg-slate-950/70 p-5 text-[#E0F7FA] shadow-[0_30px_120px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.3em] text-cyan-200/60">
            <Sparkles className="h-3.5 w-3.5" /> Cosmetics Store
          </p>
          <h2
            className="mt-2 text-2xl text-white"
            style={{ fontFamily: "var(--font-display), sans-serif" }}
          >
            Avatar Style Market
          </h2>
        </div>
        <div className="rounded-full border border-amber-200/25 bg-amber-200/10 px-4 py-2 font-mono text-xs uppercase tracking-[0.22em] text-amber-100">
          {state.credits} credits
        </div>
      </header>

      <div className="mt-5 flex flex-wrap gap-2">
        {CATEGORIES.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onMouseEnter={sfxHover}
            onClick={() => {
              playClick();
              setCategory(entry.id);
            }}
            className={`rounded-full border px-4 py-2 text-[10px] font-mono uppercase tracking-[0.22em] transition ${
              category === entry.id
                ? "border-cyan-200/70 bg-cyan-300/15 text-white"
                : "border-white/10 bg-white/5 text-cyan-100/55 hover:text-white"
            }`}
          >
            {entry.label}
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => {
          const rarity = RARITY_STYLE[item.rarity];
          const owned = state.owned.includes(item.id);
          const equipped = state.equipped[item.category] === item.id;
          return (
            <article
              key={item.id}
              className="rounded-3xl border bg-white/[0.045] p-4 transition hover:-translate-y-1"
              style={{
                borderColor: `hsla(${rarity.hue}, 85%, 66%, ${equipped ? 0.75 : 0.25})`,
                boxShadow: equipped ? `0 0 32px -12px hsla(${item.hue}, 90%, 60%, 0.7)` : undefined,
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-3xl"
                  style={{
                    background: `radial-gradient(circle, hsla(${item.hue}, 95%, 62%, 0.35), rgba(255,255,255,0.04))`,
                    border: `1px solid hsla(${item.hue}, 95%, 70%, 0.28)`,
                  }}
                >
                  {item.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="truncate text-sm font-semibold text-white">{item.name}</h3>
                    <span
                      className="rounded-full px-2 py-0.5 text-[8px] font-mono uppercase tracking-widest"
                      style={{
                        color: `hsl(${rarity.hue}, 90%, 78%)`,
                        background: `hsla(${rarity.hue}, 80%, 45%, 0.14)`,
                      }}
                    >
                      {rarity.label}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-snug text-cyan-100/55">{item.description}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between gap-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber-100/70">
                  {owned ? "Owned" : `${item.price} credits`}
                </span>
                <button
                  type="button"
                  onMouseEnter={sfxHover}
                  onClick={() => {
                    playClick();
                    if (owned) equipCosmetic(item.id);
                    else if (purchaseCosmetic(item.id)) equipCosmetic(item.id);
                  }}
                  disabled={!owned && state.credits < item.price}
                  className="rounded-full border border-cyan-200/25 bg-cyan-300/10 px-4 py-2 text-[10px] font-mono uppercase tracking-[0.22em] text-cyan-50 transition hover:border-cyan-100/70 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {equipped ? "Equipped" : owned ? "Equip" : "Buy"}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
