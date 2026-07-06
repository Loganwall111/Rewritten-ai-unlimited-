/**
 * DelightLayer bundles a handful of small joy features that share plumbing:
 *
 *   • NowPlaying HUD           — tiny corner display of "what's happening"
 *                                 (ambient on, listening, speaking, etc.)
 *   • Konami easter egg         — ↑↑↓↓←→←→BA → 8s rainbow rave overlay + confetti
 *   • Welcome constellation     — on first ever load, briefly draws "Welcome"
 *                                 in glowing stars near the top
 *   • Focus DoF                 — CSS-variable-driven blur of orbs the cursor
 *                                 is FAR from (using the --near value the
 *                                 CursorSystem writes to each orb)
 *   • Time-of-day palette drift — sets a global --tod-hue that slowly shifts
 *                                 through the real clock; nebula blobs pick it up
 *   • Screen-shake              — exposes `window.__shake(ms, mag)` for other
 *                                 modules (checkout success, sign-in) to trigger
 *   • Confetti burst            — exposes `window.__confetti(x,y)`; also listens
 *                                 for `postMessage("checkout.completed")`
 *
 * One component so we don't spawn six extra tree nodes for tiny features.
 */
import { useEffect, useRef, useState } from "react";
import { subscribeEnergy } from "@/lib/audioBus";
import { isAmbientPlaying } from "@/lib/sound";

type WindowWithHooks = Window & {
  __shake?: (ms?: number, mag?: number) => void;
  __confetti?: (x?: number, y?: number, count?: number) => void;
  __rave?: (on: boolean) => void;
};

export default function DelightLayer() {
  const [energy, setEnergy] = useState(0);
  const [ambient, setAmbient] = useState(false);
  const [rave, setRave] = useState(false);
  const [welcome, setWelcome] = useState(false);
  const confettiRef = useRef<HTMLCanvasElement>(null);

  /* ── Audio energy subscription ── */
  useEffect(() => {
    const unsub = subscribeEnergy(setEnergy);
    const int = setInterval(() => setAmbient(isAmbientPlaying()), 500);
    return () => {
      unsub();
      clearInterval(int);
    };
  }, []);

  /* ── Welcome constellation on very first load ── */
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem("rewritten_welcomed") === "1") return;
    setWelcome(true);
    const t = setTimeout(() => {
      setWelcome(false);
      localStorage.setItem("rewritten_welcomed", "1");
    }, 4500);
    return () => clearTimeout(t);
  }, []);

  /* ── Konami sequence ↑↑↓↓←→←→BA → rave mode 8s ── */
  useEffect(() => {
    const seq = [
      "ArrowUp",
      "ArrowUp",
      "ArrowDown",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "ArrowLeft",
      "ArrowRight",
      "b",
      "a",
    ];
    let idx = 0;
    const onKey = (e: KeyboardEvent) => {
      const want = seq[idx];
      if (e.key === want || e.key.toLowerCase() === want.toLowerCase()) {
        idx++;
        if (idx >= seq.length) {
          idx = 0;
          startRave();
        }
      } else {
        idx = 0;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startRave = () => {
    setRave(true);
    // fire a big confetti burst
    fireConfetti(window.innerWidth / 2, window.innerHeight / 2, 120);
    setTimeout(() => setRave(false), 8000);
  };

  /* ── Global helpers on window ── */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const win = window as unknown as WindowWithHooks;
    win.__shake = (ms = 400, mag = 6) => {
      const root = document.body;
      root.style.setProperty("--shake-mag", `${mag}px`);
      root.classList.add("shake-anim");
      setTimeout(() => root.classList.remove("shake-anim"), ms);
    };
    win.__confetti = (x, y, count) =>
      fireConfetti(x ?? window.innerWidth / 2, y ?? window.innerHeight / 2, count ?? 80);
    win.__rave = (on) => (on ? startRave() : setRave(false));

    // Listen to paddle checkout completion → confetti + shake
    const onMsg = (e: MessageEvent) => {
      if (typeof e.data === "object" && e.data?.name === "checkout.completed") {
        win.__confetti?.(window.innerWidth / 2, window.innerHeight * 0.4, 160);
        win.__shake?.(500, 8);
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Time-of-day palette drift ── */
  useEffect(() => {
    const update = () => {
      const d = new Date();
      // Map 0-24h to hue: night deep blue (220), morning cyan (190), noon violet (280), evening magenta (320)
      const h = d.getHours() + d.getMinutes() / 60;
      const hue = 210 + 55 * Math.sin(((h - 6) / 24) * Math.PI * 2);
      document.documentElement.style.setProperty("--tod-hue", String(Math.round(hue)));
    };
    update();
    const int = setInterval(update, 5 * 60 * 1000);
    return () => clearInterval(int);
  }, []);

  /* ── Confetti canvas + fire helper ── */
  useEffect(() => {
    const c = confettiRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const fit = () => {
      c.width = window.innerWidth;
      c.height = window.innerHeight;
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  type Confetto = {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    size: number;
    hue: number;
    spin: number;
    rot: number;
  };
  const confettiRefState = useRef<Confetto[]>([]);
  const rafRef = useRef(0);

  const drawConfetti = () => {
    const c = confettiRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    const arr = confettiRefState.current;
    for (let i = arr.length - 1; i >= 0; i--) {
      const p = arr[i];
      p.vy += 0.13;
      p.vx *= 0.995;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.spin;
      p.life -= 0.008;
      if (p.life <= 0 || p.y > c.height + 30) {
        arr.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = `hsla(${p.hue}, 100%, 70%, ${Math.max(0, p.life)})`;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.4);
      ctx.restore();
    }
    if (arr.length > 0) {
      rafRef.current = requestAnimationFrame(drawConfetti);
    } else {
      rafRef.current = 0;
    }
  };
  const fireConfetti = (x: number, y: number, count = 80) => {
    const arr = confettiRefState.current;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
      const speed = 4 + Math.random() * 10;
      arr.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 4,
        life: 1,
        size: 6 + Math.random() * 6,
        hue: Math.floor(Math.random() * 360),
        spin: (Math.random() - 0.5) * 0.4,
        rot: Math.random() * Math.PI * 2,
      });
    }
    if (!rafRef.current) rafRef.current = requestAnimationFrame(drawConfetti);
  };

  return (
    <>
      {/* ── NowPlaying HUD (top-right, under corner node) ── */}
      <div
        className="pointer-events-none fixed top-16 right-8 z-40 flex flex-col items-end gap-2"
        aria-hidden
      >
        {ambient && (
          <div
            className="glass-panel rounded-full px-3 py-1 text-[9px] font-mono uppercase tracking-widest flex items-center gap-2"
            style={{
              color: `hsl(var(--tod-hue, 200), 90%, 78%)`,
              textShadow: "0 1px 3px rgba(0,0,0,0.7)",
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: "currentColor",
                boxShadow: `0 0 ${4 + energy * 12}px currentColor`,
                transform: `scale(${1 + energy * 1.4})`,
                transition: "transform 0.1s",
              }}
            />
            ambient · {Math.round(energy * 100)}%
          </div>
        )}
      </div>

      {/* ── Focus-DoF style, tied to --near variable (set by CursorSystem) ── */}
      <style>{`
        .liquid-orb, .orb-btn, [data-orb] {
          --near: 0;
          --near-x: 0px;
          --near-y: 0px;
          transition: filter 0.35s ease;
        }
        .liquid-orb:hover, .orb-btn:hover, [data-orb]:hover {
          filter: none !important;
        }
        /* Orbs far from cursor get slightly blurred, near ones stay sharp.
           We only defocus when SOME orb is near (var stays 0 otherwise). */
        body.cursor-orb-active .liquid-orb,
        body.cursor-orb-active .orb-btn,
        body.cursor-orb-active [data-orb] {
          filter: blur(calc((1 - var(--near)) * 0.6px));
          transform: translate(var(--near-x), var(--near-y));
        }
      `}</style>

      {/* ── Rave mode overlay ── */}
      {rave && (
        <div
          className="pointer-events-none fixed inset-0 z-[170]"
          aria-hidden
          style={{
            background:
              "conic-gradient(from 0deg, rgba(255,0,150,0.25), rgba(0,242,255,0.25), rgba(255,220,0,0.2), rgba(120,80,255,0.25), rgba(0,255,180,0.22), rgba(255,0,150,0.25))",
            filter: "blur(60px)",
            animation: "raveSpin 1.2s linear infinite",
            mixBlendMode: "screen",
          }}
        />
      )}

      {/* ── Welcome constellation ── */}
      {welcome && <WelcomeConstellation />}

      {/* ── Confetti canvas (always mounted, only draws when firing) ── */}
      <canvas
        ref={confettiRef}
        className="pointer-events-none fixed inset-0"
        style={{ zIndex: 180 }}
        aria-hidden
      />
    </>
  );
}

/**
 * Very short "Welcome" text drawn as glowing star-points that fade in and out.
 * Purely canvas-2D on a temporary layer.
 */
function WelcomeConstellation() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    c.width = w;
    c.height = h;

    // Rasterize text to sample pixel coords → star positions
    const off = document.createElement("canvas");
    off.width = w;
    off.height = 200;
    const octx = off.getContext("2d");
    if (!octx) return;
    octx.fillStyle = "#fff";
    octx.textAlign = "center";
    octx.textBaseline = "middle";
    octx.font = "bold 110px Orbitron, sans-serif";
    octx.fillText("welcome", w / 2, 100);
    const img = octx.getImageData(0, 0, w, 200).data;
    type Star = { x: number; y: number; life: number; delay: number; hue: number };
    const stars: Star[] = [];
    for (let y = 0; y < 200; y += 6) {
      for (let x = 0; x < w; x += 6) {
        const a = img[(y * w + x) * 4 + 3];
        if (a > 80 && Math.random() > 0.55) {
          stars.push({
            x: x + (Math.random() - 0.5) * 3,
            y: y + h * 0.25,
            life: 1,
            delay: Math.random() * 800,
            hue: 190 + Math.random() * 120,
          });
        }
      }
    }
    const start = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      const T = now - start;
      stars.forEach((s) => {
        const localT = Math.max(0, T - s.delay);
        // 0-800ms fade in, 800-3200 hold, 3200-4200 fade out
        let alpha = 0;
        if (localT < 800) alpha = localT / 800;
        else if (localT < 3200) alpha = 1;
        else if (localT < 4200) alpha = 1 - (localT - 3200) / 1000;
        else alpha = 0;
        if (alpha <= 0) return;
        ctx.beginPath();
        ctx.arc(s.x, s.y, 1.4, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${s.hue}, 100%, 85%, ${alpha})`;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(s.x, s.y, 4, 0, Math.PI * 2);
        const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, 4);
        g.addColorStop(0, `hsla(${s.hue}, 100%, 85%, ${alpha * 0.6})`);
        g.addColorStop(1, "hsla(0,0%,0%,0)");
        ctx.fillStyle = g;
        ctx.fill();
      });
      if (T < 4400) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <canvas
      ref={ref}
      className="pointer-events-none fixed inset-0"
      style={{ zIndex: 160 }}
      aria-hidden
    />
  );
}
