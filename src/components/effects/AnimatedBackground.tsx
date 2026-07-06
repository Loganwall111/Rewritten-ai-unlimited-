/**
 * Deep-space nebula backdrop.
 * Canvas-2D layer for stars + connected particles + soft accretion halos,
 * plus HTML blur-blob nebula clouds behind it.
 *
 * Upgraded (visionOS pass): richer palette, ~2× particles, drifting cloud
 * layers, four subtle "distant black hole" halos instead of three.
 */
import { useEffect, useRef } from "react";

export default function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let animationId = 0;

    type Particle = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
    };
    type Star = {
      x: number;
      y: number;
      size: number;
      baseOpacity: number;
      twinkleSpeed: number;
      twinklePhase: number;
      color: string;
    };
    const particles: Particle[] = [];
    let stars: Star[] = [];

    const blackHoles = [
      { x: 0.14, y: 0.28, radius: 90 },
      { x: 0.86, y: 0.68, radius: 110 },
      { x: 0.5, y: 0.12, radius: 62 },
      { x: 0.32, y: 0.82, radius: 74 },
    ];

    const initStars = () => {
      stars = [];
      const starCount = Math.min(260, Math.floor((canvas.width * canvas.height) / 8500));
      for (let i = 0; i < starCount; i++) {
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 1.8 + 0.25,
          baseOpacity: Math.random() * 0.65 + 0.2,
          twinkleSpeed: Math.random() * 0.018 + 0.003,
          twinklePhase: Math.random() * Math.PI * 2,
          color:
            Math.random() > 0.72
              ? "124, 58, 237" // violet
              : Math.random() > 0.5
                ? "0, 242, 255" // cyan
                : Math.random() > 0.3
                  ? "255, 255, 255" // white
                  : "236, 72, 153", // magenta
        });
      }
    };

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initStars();
    };
    resize();
    window.addEventListener("resize", resize);

    const particleCount = Math.min(110, Math.floor(window.innerWidth / 16));
    const colors = [
      "0, 242, 255",
      "124, 58, 237",
      "59, 130, 246",
      "236, 72, 153",
      "168, 230, 255",
      "255, 200, 100",
    ];
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 2.2 + 0.5,
        color: colors[i % colors.length],
      });
    }

    const drawBlackHole = (bh: { x: number; y: number; radius: number }, time: number) => {
      const x = bh.x * canvas.width;
      const y = bh.y * canvas.height;
      const r = bh.radius;
      ctx.save();
      ctx.translate(x, y);
      const rotation = time * 0.0004;
      for (let i = 0; i < 5; i++) {
        ctx.save();
        ctx.rotate(rotation + i * 1.4);
        const grad = ctx.createRadialGradient(0, 0, r * 0.3, 0, 0, r * 2.2);
        grad.addColorStop(0, "rgba(0,0,0,0)");
        grad.addColorStop(0.3, `rgba(255, 140, 40, ${0.14 - i * 0.02})`);
        grad.addColorStop(0.55, `rgba(124, 58, 237, ${0.12 - i * 0.02})`);
        grad.addColorStop(0.8, `rgba(0, 242, 255, ${0.09 - i * 0.015})`);
        grad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 2.2, r * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      const horizon = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.7);
      horizon.addColorStop(0, "rgba(0,0,0,1)");
      horizon.addColorStop(0.65, "rgba(0,0,0,0.95)");
      horizon.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = horizon;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const animate = (time: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      blackHoles.forEach((bh) => drawBlackHole(bh, time));
      stars.forEach((s) => {
        s.twinklePhase += s.twinkleSpeed;
        const opacity = s.baseOpacity * (0.5 + 0.5 * Math.sin(s.twinklePhase));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${s.color}, ${opacity})`;
        ctx.fill();
        if (s.size > 0.9) {
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.size * 3.5, 0, Math.PI * 2);
          const gradient = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.size * 3.5);
          gradient.addColorStop(0, `rgba(${s.color}, ${opacity * 0.35})`);
          gradient.addColorStop(1, `rgba(${s.color}, 0)`);
          ctx.fillStyle = gradient;
          ctx.fill();
        }
      });
      particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.color}, 0.55)`;
        ctx.fill();
        particles.slice(i + 1).forEach((p2) => {
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 150) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(${p.color}, ${0.1 * (1 - dist / 150)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      });
      animationId = requestAnimationFrame(animate);
    };
    animate(performance.now());

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-[#020410]">
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a1340] via-[#050a22] to-[#180b3a]" />
      <div className="absolute inset-0 animated-grid opacity-15" />
      <canvas ref={canvasRef} className="absolute inset-0" />
      {/* Drifting nebula clouds — more layers, richer palette */}
      <div className="absolute top-0 left-1/4 w-[700px] h-[700px] bg-[#1E3A8A]/25 rounded-full blur-[130px] animate-nebula" />
      <div
        className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-[#00F2FF]/18 rounded-full blur-[120px] animate-nebula"
        style={{ animationDelay: "4s" }}
      />
      <div
        className="absolute top-1/2 right-1/4 w-[420px] h-[420px] bg-[#7C3AED]/22 rounded-full blur-[100px] animate-nebula"
        style={{ animationDelay: "8s" }}
      />
      <div
        className="absolute bottom-1/4 left-0 w-[500px] h-[500px] bg-[#EC4899]/15 rounded-full blur-[110px] animate-nebula"
        style={{ animationDelay: "6s" }}
      />
      <div
        className="absolute top-1/3 left-1/2 w-[380px] h-[380px] bg-[#F59E0B]/10 rounded-full blur-[120px] animate-nebula"
        style={{ animationDelay: "2s" }}
      />
      <div
        className="absolute bottom-1/3 right-1/3 w-[340px] h-[340px] bg-[#22D3EE]/15 rounded-full blur-[95px] animate-nebula"
        style={{ animationDelay: "10s" }}
      />
    </div>
  );
}
