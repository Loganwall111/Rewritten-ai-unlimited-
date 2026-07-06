/**
 * CursorSystem — the "grabber arms" pointer.
 *
 * Replaces the native cursor entirely and renders on one full-screen canvas:
 *
 *   • Two curved tentacle ARMS that extend from the cursor position toward
 *     the nearest orb within reach. Arms are quadratic beziers with a live
 *     control point pushed perpendicular to their length — so they feel
 *     ropey / flexible. Each has a soft glow, a bright core, and a tapered
 *     tip. Segments = 22.
 *   • The cursor itself: a small liquid orb with rim + halo. Grows when
 *     dragging.
 *   • Comet particle trail behind the cursor (multi-hue, fades).
 *   • Meteor tail when the cursor moves fast (>1200 px/s) — additive streak
 *     that fades over 700ms. Plays a whoosh via `sfxSwipe`.
 *   • Double-click sparkle burst — chord + colored radial sparkles.
 *   • Sets `--near` CSS var on every orb (proximity intensity) so the DOM
 *     side can react (glow, defocus). Also fires `sfxArmTap` on click and
 *     `sfxFocus` when a new target is selected.
 *
 * All effects gated by `prefers-reduced-motion` and `(hover:none)` — on
 * touch devices we skip the cursor overlay entirely.
 */

import { useEffect, useRef } from "react";
import { readDragOrbit } from "@/lib/useDragOrbit";
import { sfxArmTap, sfxFocus, sfxSwipe, sfxSparkleBurst, sfxArmExtend } from "@/lib/sound";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  hue: number;
  size: number;
};

type MeteorTrail = {
  x: number;
  y: number;
  tx: number;
  ty: number;
  life: number;
  hue: number;
};

type Sparkle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  hue: number;
  size: number;
};

type Arm = {
  // eased-to values
  tipX: number;
  tipY: number;
  // targets (per frame)
  targetX: number;
  targetY: number;
  // side offset (perpendicular curl)
  curl: number;
  hue: number;
  reach: number; // 0..1
};

export default function CursorSystem() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia?.("(hover: none)").matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = window.innerWidth;
    let h = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const fit = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    fit();
    window.addEventListener("resize", fit);

    const mouse = {
      x: w / 2,
      y: h / 2,
      px: w / 2,
      py: h / 2,
      vx: 0,
      vy: 0,
      down: false,
      lastMoveT: 0,
    };
    const particles: Particle[] = [];
    const meteors: MeteorTrail[] = [];
    const sparkles: Sparkle[] = [];
    const arms: [Arm, Arm] = [
      { tipX: w / 2, tipY: h / 2, targetX: w / 2, targetY: h / 2, curl: 1, hue: 200, reach: 0 },
      { tipX: w / 2, tipY: h / 2, targetX: w / 2, targetY: h / 2, curl: -1, hue: 285, reach: 0 },
    ];
    let lastTarget: HTMLElement | null = null;
    let lastSwipeSFX = 0;
    let clickPulse = 0; // 0..1, decays after click — flashes arms when non-zero

    const onMove = (e: PointerEvent) => {
      const now = performance.now();
      const dt = Math.max(1, now - mouse.lastMoveT);
      mouse.lastMoveT = now;
      mouse.vx = ((e.clientX - mouse.x) / dt) * 1000; // px/s
      mouse.vy = ((e.clientY - mouse.y) / dt) * 1000;
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      const speed = Math.hypot(mouse.vx, mouse.vy);

      // Particle spawn per move
      const dx = mouse.x - mouse.px;
      const dy = mouse.y - mouse.py;
      const dSpeed = Math.hypot(dx, dy);
      if (dSpeed > 2) {
        const n = Math.min(3, Math.floor(dSpeed / 8));
        for (let i = 0; i < n; i++) {
          particles.push({
            x: mouse.x + (Math.random() - 0.5) * 4,
            y: mouse.y + (Math.random() - 0.5) * 4,
            vx: -dx * 0.05 + (Math.random() - 0.5) * 0.6,
            vy: -dy * 0.05 + (Math.random() - 0.5) * 0.6,
            life: 1,
            hue: 190 + Math.random() * 130,
            size: 1 + Math.random() * 2.4,
          });
        }
      }

      // Meteor trail when fast
      if (speed > 1200) {
        meteors.push({
          x: mouse.px,
          y: mouse.py,
          tx: mouse.x,
          ty: mouse.y,
          life: 1,
          hue: 190 + Math.random() * 120,
        });
        if (meteors.length > 12) meteors.shift();
        if (now - lastSwipeSFX > 220) {
          lastSwipeSFX = now;
          sfxSwipe((mouse.x / window.innerWidth) * 2 - 1);
        }
      }
      mouse.px = mouse.x;
      mouse.py = mouse.y;
    };

    const onDown = () => {
      mouse.down = true;
      clickPulse = 1;
      // If we currently have a target, "tap" it: fire arm-tap + fake a small
      // shake on the target element via CSS class
      if (lastTarget) {
        const r = lastTarget.getBoundingClientRect();
        const pan = ((r.left + r.width / 2) / window.innerWidth) * 2 - 1;
        sfxArmTap(pan);
        lastTarget.classList.add("orb-tapped");
        setTimeout(() => lastTarget?.classList.remove("orb-tapped"), 260);
      }
    };
    const onUp = () => {
      mouse.down = false;
    };

    // Double-click sparkle burst
    let lastClick = 0;
    const onClick = () => {
      const now = performance.now();
      if (now - lastClick < 320) {
        // burst
        for (let i = 0; i < 30; i++) {
          const a = (i / 30) * Math.PI * 2 + Math.random() * 0.2;
          const sp = 3 + Math.random() * 5;
          sparkles.push({
            x: mouse.x,
            y: mouse.y,
            vx: Math.cos(a) * sp,
            vy: Math.sin(a) * sp,
            life: 1,
            hue: 180 + Math.random() * 180,
            size: 1.5 + Math.random() * 2.5,
          });
        }
        sfxSparkleBurst((mouse.x / window.innerWidth) * 2 - 1);
      }
      lastClick = now;
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("click", onClick);

    // Orb caching for proximity + arm targeting
    const orbSel = ".liquid-orb, .orb-btn, [data-orb]";
    let cachedOrbs: HTMLElement[] = [];
    let orbCacheAt = 0;
    const collectOrbs = (now: number) => {
      if (now - orbCacheAt < 300) return;
      cachedOrbs = Array.from(document.querySelectorAll<HTMLElement>(orbSel));
      orbCacheAt = now;
    };

    let raf = 0;
    let last = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ctx.clearRect(0, 0, w, h);
      collectOrbs(now);
      clickPulse = Math.max(0, clickPulse - dt * 3);

      /* ── Meteor tails (behind arms) ── */
      for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i];
        m.life -= dt * 1.4;
        if (m.life <= 0) {
          meteors.splice(i, 1);
          continue;
        }
        const grad = ctx.createLinearGradient(m.x, m.y, m.tx, m.ty);
        grad.addColorStop(0, `hsla(${m.hue}, 100%, 78%, 0)`);
        grad.addColorStop(1, `hsla(${m.hue}, 100%, 82%, ${m.life})`);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 4 * m.life;
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(m.tx, m.ty);
        ctx.stroke();
      }

      /* ── Particles ── */
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.94;
        p.vy *= 0.94;
        p.life -= dt * 1.4;
        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }
        const alpha = p.life;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (0.5 + alpha), 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 100%, 75%, ${alpha * 0.85})`;
        ctx.fill();
      }
      if (particles.length > 220) particles.splice(0, particles.length - 220);

      /* ── Proximity + pick nearest orb target ── */
      let target: {
        el: HTMLElement;
        cx: number;
        cy: number;
        d: number;
        hue: number;
      } | null = null;
      for (const el of cachedOrbs) {
        const r = el.getBoundingClientRect();
        if (r.width < 4 || r.height < 4) continue;
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const d = Math.hypot(cx - mouse.x, cy - mouse.y);
        if (d < 260) {
          const t = 1 - d / 260;
          const dx = ((mouse.x - cx) / 260) * 8;
          const dy = ((mouse.y - cy) / 260) * 8;
          el.style.setProperty("--near", t.toFixed(3));
          el.style.setProperty("--near-x", `${dx.toFixed(2)}px`);
          el.style.setProperty("--near-y", `${dy.toFixed(2)}px`);
        } else {
          el.style.setProperty("--near", "0");
        }
        // Only "target" orbs within grab range
        if (d < 200 && (!target || d < target.d)) {
          const hueVar =
            parseFloat(el.getAttribute("data-hue") ?? "") ||
            (el.classList.contains("liquid-orb") ? 220 : 220);
          target = { el, cx, cy, d, hue: hueVar };
        }
      }

      // Focus SFX when target changes
      if (target && target.el !== lastTarget) {
        sfxFocus(target.hue);
        sfxArmExtend();
        lastTarget = target.el;
      } else if (!target && lastTarget) {
        lastTarget = null;
      }

      /* ── Arms ── */
      // Each arm eases its tip toward either the target or a resting spot
      // ~30px from the cursor along a curl offset.
      arms.forEach((arm, i) => {
        const restAngle = i === 0 ? -Math.PI / 4 : Math.PI / 4;
        const restDist = 28;
        arm.hue = target ? target.hue : i === 0 ? 200 : 285;
        if (target) {
          // Aim tip *at* the target with a small overshoot
          arm.targetX = target.cx;
          arm.targetY = target.cy;
          arm.reach += (1 - arm.reach) * dt * 6;
        } else {
          arm.targetX = mouse.x + Math.cos(restAngle) * restDist;
          arm.targetY = mouse.y + Math.sin(restAngle) * restDist;
          arm.reach += (0.15 - arm.reach) * dt * 4;
        }
        // Smooth follow
        arm.tipX += (arm.targetX - arm.tipX) * dt * 12;
        arm.tipY += (arm.targetY - arm.tipY) * dt * 12;

        // Draw arm as a quadratic bezier from cursor → control → tip
        const sx = mouse.x;
        const sy = mouse.y;
        const ex = arm.tipX;
        const ey = arm.tipY;
        const mx = (sx + ex) / 2;
        const my = (sy + ey) / 2;
        // Perpendicular offset for curl
        const nx = -(ey - sy);
        const ny = ex - sx;
        const nl = Math.hypot(nx, ny) || 1;
        const curlAmt = 34 * arm.curl * (0.5 + arm.reach * 0.7);
        const cx = mx + (nx / nl) * curlAmt;
        const cy = my + (ny / nl) * curlAmt;

        // Sample the bezier for a tapered stroke
        const segs = 24;
        // Outer glow pass
        for (let g = 0; g < 3; g++) {
          const alpha = (g === 0 ? 0.15 : g === 1 ? 0.35 : 0.85) * (0.7 + clickPulse * 0.5);
          const width = (g === 0 ? 12 : g === 1 ? 5 : 2.2) * (0.6 + arm.reach * 0.6);
          ctx.strokeStyle = `hsla(${arm.hue}, 100%, ${g === 2 ? 92 : 72}%, ${alpha})`;
          ctx.lineWidth = width;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          for (let s = 1; s <= segs; s++) {
            const t = s / segs;
            // Quadratic bezier point
            const bx = (1 - t) * (1 - t) * sx + 2 * (1 - t) * t * cx + t * t * ex;
            const by = (1 - t) * (1 - t) * sy + 2 * (1 - t) * t * cy + t * t * ey;
            ctx.lineTo(bx, by);
          }
          ctx.stroke();
        }
        // Tip head — a small glowing bulb
        const tipR = 4 + (target ? 3 : 0) + clickPulse * 4;
        const bulb = ctx.createRadialGradient(ex, ey, 0, ex, ey, tipR * 3);
        bulb.addColorStop(0, `hsla(${arm.hue}, 100%, 92%, 0.95)`);
        bulb.addColorStop(0.4, `hsla(${arm.hue}, 100%, 70%, 0.55)`);
        bulb.addColorStop(1, "hsla(0, 0%, 0%, 0)");
        ctx.fillStyle = bulb;
        ctx.beginPath();
        ctx.arc(ex, ey, tipR * 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(ex, ey, tipR, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${arm.hue}, 100%, 92%, 0.95)`;
        ctx.fill();
      });

      /* ── Sparkles from double-click ── */
      for (let i = sparkles.length - 1; i >= 0; i--) {
        const s = sparkles[i];
        s.x += s.vx;
        s.y += s.vy;
        s.vx *= 0.97;
        s.vy *= 0.97;
        s.life -= dt * 0.9;
        if (s.life <= 0) {
          sparkles.splice(i, 1);
          continue;
        }
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size * (0.4 + s.life), 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${s.hue}, 100%, 82%, ${s.life})`;
        ctx.fill();
      }

      /* ── Cursor orb (on top) ── */
      const d = readDragOrbit();
      const dragging = Math.abs(d.x) > 0.02 || Math.abs(d.y) > 0.02;
      const R = (mouse.down ? 12 : dragging ? 14 : 9) + clickPulse * 4;
      const halo = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, R * 3.4);
      halo.addColorStop(0, "rgba(0,242,255,0.55)");
      halo.addColorStop(0.6, "rgba(124,58,237,0.22)");
      halo.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, R * 3.4, 0, Math.PI * 2);
      ctx.fill();
      const body = ctx.createRadialGradient(
        mouse.x - R * 0.3,
        mouse.y - R * 0.3,
        0,
        mouse.x,
        mouse.y,
        R,
      );
      body.addColorStop(0, "rgba(255,255,255,0.95)");
      body.addColorStop(0.55, "rgba(180,220,255,0.75)");
      body.addColorStop(1, "rgba(0,80,140,0.85)");
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, R, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(mouse.x - R * 0.3, mouse.y - R * 0.3, R * 0.35, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.fill();

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    document.body.classList.add("cursor-orb-active");

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", fit);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("click", onClick);
      document.body.classList.remove("cursor-orb-active");
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 150 }}
      aria-hidden
    />
  );
}
