import { useEffect, useMemo, useState } from "react";
import { Backpack } from "lucide-react";
import {
  ITEM_BY_ID,
  ITEM_CATALOG,
  consumeItem,
  equipHotbar,
  hasItem,
  useInventory,
  type InventoryItem,
} from "@/lib/inventory";
import { playClick, sfxHover } from "@/lib/sound";

function activateItem(item: InventoryItem | undefined) {
  if (!item) return;
  playClick();
  if (item.energy || item.kind === "food") consumeItem(item.id);
}

export default function InventoryBar() {
  const inventory = useInventory();
  const [open, setOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
      )
        return;
      if (event.code === "KeyI") {
        event.preventDefault();
        setOpen((value) => !value);
      }
      if (/^Digit[1-8]$/.test(event.code)) {
        const slot = Number(event.code.replace("Digit", "")) - 1;
        setSelectedSlot(slot);
        activateItem(ITEM_BY_ID[inventory.hotbar[slot] ?? ""]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [inventory.hotbar]);

  const energyPct = useMemo(
    () => Math.max(0, Math.min(100, (inventory.energy / inventory.maxEnergy) * 100)),
    [inventory.energy, inventory.maxEnergy],
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-[560] font-mono text-[#E0F7FA]">
      <div className="absolute left-1/2 top-5 w-72 -translate-x-1/2 rounded-full border border-cyan-300/20 bg-slate-950/55 px-4 py-2 shadow-[0_0_35px_rgba(0,242,255,0.14)] backdrop-blur-xl">
        <div className="mb-1 flex items-center justify-between text-[9px] uppercase tracking-[0.24em] text-cyan-100/70">
          <span>Energy</span>
          <span>{Math.round(inventory.energy)}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-fuchsia-300 to-amber-200 transition-all"
            style={{ width: `${energyPct}%` }}
          />
        </div>
      </div>

      {open && (
        <div className="pointer-events-auto absolute bottom-28 left-1/2 grid w-[min(620px,calc(100vw-24px))] -translate-x-1/2 grid-cols-2 gap-3 rounded-3xl border border-cyan-300/20 bg-slate-950/82 p-4 shadow-[0_30px_90px_rgba(0,0,0,0.55)] backdrop-blur-2xl sm:grid-cols-5">
          {ITEM_CATALOG.map((item) => {
            const count = inventory.stacks[item.id] ?? 0;
            const owned = count > 0;
            return (
              <button
                key={item.id}
                type="button"
                onMouseEnter={sfxHover}
                onClick={() => {
                  if (owned) {
                    const slot = inventory.hotbar.findIndex((id) => id === item.id);
                    if (slot >= 0) setSelectedSlot(slot);
                    else equipHotbar(selectedSlot, item.id);
                    activateItem(item);
                  }
                }}
                className={`group min-h-28 rounded-2xl border p-3 text-left transition ${
                  owned
                    ? "border-cyan-300/25 bg-white/[0.06] hover:-translate-y-1 hover:border-cyan-200/60"
                    : "border-white/10 bg-white/[0.025] opacity-45"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-2xl drop-shadow-[0_0_14px_rgba(0,242,255,0.7)]">
                    {item.icon}
                  </span>
                  <span className="rounded-full bg-black/35 px-2 py-0.5 text-[9px] uppercase tracking-widest text-cyan-100/70">
                    x{count}
                  </span>
                </div>
                <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.16em] text-white/85">
                  {item.name}
                </p>
                <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-cyan-100/48">
                  {item.description}
                </p>
                <p className="mt-2 text-[9px] uppercase tracking-[0.22em] text-fuchsia-200/55">
                  {item.kind}
                </p>
              </button>
            );
          })}
        </div>
      )}

      <div className="pointer-events-auto absolute bottom-5 left-1/2 flex -translate-x-1/2 items-end gap-2 rounded-full border border-cyan-300/20 bg-slate-950/68 px-3 py-2 shadow-[0_15px_60px_rgba(0,0,0,0.5)] backdrop-blur-xl">
        <button
          type="button"
          onMouseEnter={sfxHover}
          onClick={() => setOpen((value) => !value)}
          className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-cyan-100 transition hover:border-cyan-200/60 hover:text-white"
          title="Inventory (I)"
        >
          <Backpack className="h-5 w-5" />
        </button>
        {inventory.hotbar.map((itemId, index) => {
          const item = itemId ? ITEM_BY_ID[itemId] : undefined;
          const count = itemId ? (inventory.stacks[itemId] ?? 0) : 0;
          const usable = Boolean(item && hasItem(item.id));
          return (
            <button
              key={`${itemId ?? "empty"}-${index}`}
              type="button"
              onMouseEnter={sfxHover}
              onClick={() => {
                setSelectedSlot(index);
                if (item && usable) activateItem(item);
              }}
              className={`relative h-12 w-12 rounded-2xl border text-center transition hover:-translate-y-1 ${
                selectedSlot === index
                  ? "border-cyan-200/80 bg-cyan-300/15 shadow-[0_0_24px_rgba(0,242,255,0.22)]"
                  : "border-white/10 bg-white/5"
              } ${usable ? "" : "opacity-45"}`}
              title={item ? `${item.name} (${index + 1})` : `Empty slot ${index + 1}`}
            >
              <span className="absolute left-1 top-1 text-[8px] text-cyan-100/45">{index + 1}</span>
              <span className="text-xl leading-[3rem]">{item?.icon ?? "·"}</span>
              {count > 1 && (
                <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1 text-[9px] text-white/80">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
