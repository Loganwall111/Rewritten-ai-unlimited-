/**
 * /os — MASSG OS · a voxel-themed desktop shell.
 *
 * Rebuilt in-house from the boot-text of the deployed Replit project.
 * Features:
 *   - BIOS boot animation (skippable)
 *   - Desktop with draggable windows
 *   - Taskbar with clock + running-app list
 *   - Pre-installed apps: Files, Terminal, Notepad, Cube World (mini voxel scene)
 *   - Voxel wallpaper (procedural cubes drift in the background)
 *
 * Zero-dependency (uses only what's already in the project).
 */

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  ArrowLeft,
  Folder,
  Terminal as TerminalIcon,
  FileText,
  Box,
  Power,
  Wifi,
  Volume2,
  X,
  Minus,
  Square as MinBox,
} from "lucide-react";
import { sfxHover, sfxPortalBoom } from "@/lib/sound";

export const Route = createFileRoute("/os")({
  head: () => ({
    meta: [{ title: "MASSG OS — Voxel Desktop" }],
  }),
  component: OSPage,
});

/* ═══════ Boot lines ═══════ */
const BOOT = [
  "MASSG OS v9.3.0 — BIOS BOOT SEQUENCE INITIATED",
  "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
  "CPU: VOXEL CORE X9 @ 120GHz [OK]",
  "RAM: 16384 VOXEL UNITS ALLOCATED [OK]",
  "GPU: THREEJS WebGL2 RENDERER v7 [OK]",
  "STORAGE: LOCALSTORAGE PERSISTENCE LAYER [OK]",
  "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
  "LOADING DIMENSION DATABASE: 31 DIMENSIONS [OK]",
  "CHUNK MANAGER: INFINITE TERRAIN ENGINE [OK]",
  "MOB AI: ENTITY SYSTEM v4.2 LOADED [OK]",
  "MOUNTING /home/rewritten … [OK]",
  "STARTING WINDOW MANAGER … [OK]",
  "WELCOME.",
];

/* ═══════ Voxel wallpaper (background 3D) ═══════ */
function VoxelWallpaper() {
  const groupRef = useRef<THREE.Group>(null!);
  const cubes = useMemo(
    () =>
      Array.from({ length: 60 }, () => ({
        x: (Math.random() - 0.5) * 60,
        y: (Math.random() - 0.5) * 40,
        z: (Math.random() - 0.5) * 60 - 20,
        rot: Math.random() * Math.PI,
        speed: 0.1 + Math.random() * 0.4,
        hue: 180 + Math.random() * 100,
        size: 0.5 + Math.random() * 2,
      })),
    [],
  );
  useFrame((_, dt) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += dt * 0.03;
      groupRef.current.children.forEach((c, i) => {
        c.rotation.x += dt * cubes[i].speed * 0.3;
        c.rotation.y += dt * cubes[i].speed * 0.5;
        c.position.y += Math.sin(Date.now() * 0.0005 + i) * 0.005;
      });
    }
  });
  return (
    <>
      <color attach="background" args={["#0a1230"]} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 8, 3]} intensity={1.4} color="#fff" />
      <group ref={groupRef}>
        {cubes.map((c, i) => (
          <mesh key={i} position={[c.x, c.y, c.z]} rotation={[c.rot, c.rot, 0]}>
            <boxGeometry args={[c.size, c.size, c.size]} />
            <meshStandardMaterial
              color={`hsl(${c.hue}, 70%, 55%)`}
              emissive={`hsl(${c.hue}, 70%, 30%)`}
              emissiveIntensity={0.4}
              roughness={0.4}
              metalness={0.3}
            />
          </mesh>
        ))}
      </group>
    </>
  );
}

/* ═══════ Window system ═══════ */
type WinState = {
  id: string;
  title: string;
  icon: React.ReactNode;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  minimized: boolean;
  content: () => React.ReactNode;
};

function OSPage() {
  const navigate = useNavigate();
  const [booted, setBooted] = useState(false);
  const [bootLine, setBootLine] = useState(0);
  const [windows, setWindows] = useState<WinState[]>([]);
  const [zTop, setZTop] = useState(10);
  const [now, setNow] = useState(new Date());
  const [terminalHistory, setTerminalHistory] = useState<string[]>([
    "MASSG SHELL v9.3.0 — type 'help' for commands",
  ]);
  const [terminalInput, setTerminalInput] = useState("");
  const [notepadText, setNotepadText] = useState("Welcome to MASSG Notepad.\n\nStart writing…");

  // Boot animation
  useEffect(() => {
    if (booted) return;
    if (bootLine >= BOOT.length) {
      const t = setTimeout(() => setBooted(true), 800);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setBootLine((l) => l + 1), 220);
    return () => clearTimeout(t);
  }, [bootLine, booted]);

  // Clock
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const openApp = (id: string) => {
    // Focus if open
    const existing = windows.find((w) => w.id === id);
    if (existing) {
      focusWindow(id);
      if (existing.minimized) toggleMin(id);
      return;
    }
    const win = APPS[id]?.factory(
      setTerminalHistory,
      terminalHistory,
      terminalInput,
      setTerminalInput,
      notepadText,
      setNotepadText,
    );
    if (!win) return;
    setZTop((z) => z + 1);
    setWindows((ws) => [...ws, { ...win, z: zTop + 1 }]);
    sfxPortalBoom();
  };
  const closeWindow = (id: string) => setWindows((ws) => ws.filter((w) => w.id !== id));
  const focusWindow = (id: string) => {
    setZTop((z) => z + 1);
    setWindows((ws) => ws.map((w) => (w.id === id ? { ...w, z: zTop + 1 } : w)));
  };
  const toggleMin = (id: string) =>
    setWindows((ws) => ws.map((w) => (w.id === id ? { ...w, minimized: !w.minimized } : w)));

  // Terminal command handling
  const runTerminal = (cmd: string) => {
    const c = cmd.trim().toLowerCase();
    let out: string[] = [`> ${cmd}`];
    if (c === "help") {
      out.push("commands: help, ls, echo <text>, date, whoami, clear, dims, exit");
    } else if (c === "ls") {
      out.push("home/  docs/  cube_world/  system32.voxel  README.md");
    } else if (c.startsWith("echo ")) {
      out.push(cmd.slice(5));
    } else if (c === "date") {
      out.push(new Date().toString());
    } else if (c === "whoami") {
      out.push("operator@rewritten");
    } else if (c === "clear") {
      setTerminalHistory([]);
      return;
    } else if (c === "dims") {
      out.push("31 dimensions loaded: overworld, nether, end, aether, void, spectral, ...");
    } else if (c === "exit") {
      closeWindow("terminal");
      return;
    } else if (c === "") {
      out = [];
    } else {
      out.push(`bash: ${cmd}: command not found`);
    }
    setTerminalHistory((h) => [...h, ...out]);
  };

  // Define apps
  const APPS: Record<
    string,
    {
      title: string;
      icon: React.ReactNode;
      factory: (
        setH: React.Dispatch<React.SetStateAction<string[]>>,
        h: string[],
        input: string,
        setInput: React.Dispatch<React.SetStateAction<string>>,
        npText: string,
        setNpText: React.Dispatch<React.SetStateAction<string>>,
      ) => WinState;
    }
  > = {
    files: {
      title: "Files",
      icon: <Folder className="w-4 h-4" />,
      factory: () => ({
        id: "files",
        title: "Files",
        icon: <Folder className="w-4 h-4" />,
        x: 120,
        y: 100,
        w: 520,
        h: 380,
        z: zTop,
        minimized: false,
        content: () => (
          <div className="p-4 grid grid-cols-4 gap-3">
            {[
              { name: "home", icon: "📁" },
              { name: "docs", icon: "📁" },
              { name: "cube_world", icon: "📁" },
              { name: "screenshots", icon: "📁" },
              { name: "README.md", icon: "📄" },
              { name: "system32.voxel", icon: "🧊" },
              { name: "config.ini", icon: "⚙️" },
              { name: "world.dat", icon: "💾" },
            ].map((f) => (
              <div
                key={f.name}
                className="text-center cursor-pointer hover:bg-white/5 rounded p-2 transition"
              >
                <div className="text-3xl">{f.icon}</div>
                <div className="text-[11px] text-white/80 mt-1 truncate">{f.name}</div>
              </div>
            ))}
          </div>
        ),
      }),
    },
    terminal: {
      title: "Terminal",
      icon: <TerminalIcon className="w-4 h-4" />,
      factory: () => ({
        id: "terminal",
        title: "Terminal",
        icon: <TerminalIcon className="w-4 h-4" />,
        x: 200,
        y: 140,
        w: 560,
        h: 360,
        z: zTop,
        minimized: false,
        content: () => (
          <div className="h-full flex flex-col bg-black/85 font-mono text-[12px] text-green-300 p-3">
            <div className="flex-1 overflow-y-auto space-y-0.5">
              {terminalHistory.map((line, i) => (
                <div key={i} className="whitespace-pre-wrap">
                  {line}
                </div>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                runTerminal(terminalInput);
                setTerminalInput("");
              }}
              className="flex items-center gap-2 mt-2"
            >
              <span className="text-emerald-400">operator@rewritten:~$</span>
              <input
                autoFocus
                value={terminalInput}
                onChange={(e) => setTerminalInput(e.target.value)}
                className="flex-1 bg-transparent outline-none text-green-300"
              />
            </form>
          </div>
        ),
      }),
    },
    notepad: {
      title: "Notepad",
      icon: <FileText className="w-4 h-4" />,
      factory: () => ({
        id: "notepad",
        title: "Notepad",
        icon: <FileText className="w-4 h-4" />,
        x: 260,
        y: 180,
        w: 500,
        h: 400,
        z: zTop,
        minimized: false,
        content: () => (
          <textarea
            value={notepadText}
            onChange={(e) => setNotepadText(e.target.value)}
            className="w-full h-full p-4 bg-[#1c1e2e] text-white/90 font-mono text-sm resize-none outline-none"
          />
        ),
      }),
    },
    cube: {
      title: "Cube World",
      icon: <Box className="w-4 h-4" />,
      factory: () => ({
        id: "cube",
        title: "Cube World Preview",
        icon: <Box className="w-4 h-4" />,
        x: 320,
        y: 80,
        w: 640,
        h: 460,
        z: zTop,
        minimized: false,
        content: () => (
          <div className="w-full h-full bg-black">
            <Canvas camera={{ position: [8, 6, 8], fov: 55 }}>
              <ambientLight intensity={0.6} />
              <directionalLight position={[5, 10, 3]} intensity={1.5} />
              {Array.from({ length: 400 }).map((_, i) => {
                const x = (i % 20) - 10;
                const z = Math.floor(i / 20) - 10;
                const h = Math.floor(2 + Math.sin(x * 0.3) * 1 + Math.cos(z * 0.4) * 1);
                return (
                  <group key={i}>
                    {Array.from({ length: h }).map((_, y) => (
                      <mesh key={y} position={[x, y, z]}>
                        <boxGeometry args={[1, 1, 1]} />
                        <meshStandardMaterial
                          color={y === h - 1 ? "#4a8f3d" : y === 0 ? "#6b4a2d" : "#8b6a4d"}
                        />
                      </mesh>
                    ))}
                  </group>
                );
              })}
            </Canvas>
            <div className="absolute bottom-3 left-3 text-[11px] font-mono text-white/60">
              [PREVIEW] Full editor: MASSG Awakening →
            </div>
          </div>
        ),
      }),
    },
  };

  if (!booted) {
    return (
      <div className="fixed inset-0 z-[500] bg-black text-green-400 font-mono text-sm p-8 overflow-hidden">
        <div className="space-y-1">
          {BOOT.slice(0, bootLine).map((line, i) => (
            <div key={i} className={i === bootLine - 1 ? "text-emerald-200" : ""}>
              {line}
            </div>
          ))}
        </div>
        <button
          onClick={() => setBooted(true)}
          className="absolute bottom-6 right-6 text-[10px] uppercase tracking-widest text-green-500/70 hover:text-green-300 border border-green-500/40 rounded px-3 py-1"
        >
          [ SKIP BOOT ]
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[500] overflow-hidden" style={{ background: "#0a1230" }}>
      {/* Voxel wallpaper */}
      <div className="absolute inset-0 z-0">
        <Canvas camera={{ position: [0, 0, 5], fov: 75 }} gl={{ antialias: true }}>
          <VoxelWallpaper />
        </Canvas>
      </div>
      {/* Wallpaper vignette */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, transparent 30%, rgba(10,18,48,0.8))",
        }}
      />

      {/* Desktop icons (top-left) */}
      <div className="absolute top-6 left-6 z-10 grid grid-cols-1 gap-4">
        {Object.entries(APPS).map(([id, app]) => (
          <DesktopIcon key={id} label={app.title} icon={app.icon} onClick={() => openApp(id)} />
        ))}
      </div>

      {/* Windows */}
      {windows.map((w) =>
        w.minimized ? null : (
          <DesktopWindow
            key={w.id}
            win={w}
            onClose={() => closeWindow(w.id)}
            onFocus={() => focusWindow(w.id)}
            onMin={() => toggleMin(w.id)}
            onMove={(dx, dy) => {
              setWindows((ws) =>
                ws.map((x) => (x.id === w.id ? { ...x, x: x.x + dx, y: x.y + dy } : x)),
              );
            }}
          >
            {w.content()}
          </DesktopWindow>
        ),
      )}

      {/* Taskbar */}
      <div
        className="absolute bottom-0 inset-x-0 z-30 h-12 flex items-center px-3 gap-2"
        style={{
          background: "rgba(11,16,26,0.9)",
          backdropFilter: "blur(20px)",
          borderTop: "1px solid rgba(0,242,255,0.2)",
        }}
      >
        <button
          onClick={() => {
            sfxPortalBoom();
            navigate({ to: "/world" });
          }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-200 text-[11px] uppercase tracking-widest transition"
          onMouseEnter={sfxHover}
        >
          <Power className="w-3.5 h-3.5" />
          Exit World
        </button>
        <div className="w-px h-6 bg-white/10 mx-1" />
        {/* Running apps */}
        {windows.map((w) => (
          <button
            key={w.id}
            onClick={() => (w.minimized ? toggleMin(w.id) : focusWindow(w.id))}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] text-white/85 hover:bg-white/10 transition"
            style={{ background: w.minimized ? "transparent" : "rgba(0,242,255,0.1)" }}
          >
            {w.icon}
            {w.title}
          </button>
        ))}
        <div className="flex-1" />
        {/* System tray */}
        <div className="flex items-center gap-3 text-white/70">
          <Wifi className="w-4 h-4" />
          <Volume2 className="w-4 h-4" />
          <button
            onClick={() => navigate({ to: "/awakening" })}
            className="text-[10px] font-mono uppercase tracking-widest text-emerald-300 hover:text-emerald-200 border border-emerald-500/40 rounded px-2 py-0.5"
            title="Launch MASSG Awakening"
          >
            Awakening
          </button>
          <div className="text-[11px] font-mono text-white/90 tabular-nums w-16 text-right">
            {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
      </div>

      {/* Return chip */}
      <button
        onClick={() => navigate({ to: "/world" })}
        className="fixed top-4 left-1/2 -translate-x-1/2 z-40 rounded-full px-4 py-1.5 text-[10px] uppercase tracking-widest text-white/80 hover:text-cyan-200 flex items-center gap-2 transition"
        style={{
          background: "rgba(11,16,26,0.7)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <ArrowLeft className="w-3 h-3" />
        World
      </button>
    </div>
  );
}

function DesktopIcon({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onDoubleClick={onClick}
      onClick={onClick}
      onMouseEnter={sfxHover}
      className="flex flex-col items-center gap-1 w-20 py-2 hover:bg-white/10 rounded transition"
    >
      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-500/30 to-violet-500/30 border border-cyan-400/40 flex items-center justify-center text-cyan-200">
        {icon}
      </div>
      <span className="text-[10px] text-white/85 text-center leading-tight">{label}</span>
    </button>
  );
}

function DesktopWindow({
  win,
  children,
  onClose,
  onFocus,
  onMin,
  onMove,
}: {
  win: WinState;
  children: React.ReactNode;
  onClose: () => void;
  onFocus: () => void;
  onMin: () => void;
  onMove: (dx: number, dy: number) => void;
}) {
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });

  const startDrag = (e: React.MouseEvent) => {
    dragging.current = true;
    last.current = { x: e.clientX, y: e.clientY };
    onFocus();
  };
  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (!dragging.current) return;
      onMove(e.clientX - last.current.x, e.clientY - last.current.y);
      last.current = { x: e.clientX, y: e.clientY };
    };
    const up = () => (dragging.current = false);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, [onMove]);

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="absolute rounded-xl overflow-hidden shadow-2xl"
      style={{
        left: win.x,
        top: win.y,
        width: win.w,
        height: win.h,
        zIndex: win.z,
        background: "rgba(20,24,40,0.96)",
        border: "1px solid rgba(0,242,255,0.35)",
        boxShadow: "0 20px 60px -10px rgba(0,0,0,0.7), 0 0 40px rgba(0,242,255,0.2)",
      }}
      onMouseDown={onFocus}
    >
      {/* Title bar */}
      <div
        onMouseDown={startDrag}
        className="h-9 flex items-center justify-between px-3 cursor-move select-none"
        style={{
          background: "linear-gradient(90deg, rgba(0,242,255,0.15), rgba(124,58,237,0.12))",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <div className="flex items-center gap-2 text-white/90 text-[12px]">
          {win.icon}
          {win.title}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onMin}
            className="w-6 h-6 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 rounded"
          >
            <Minus className="w-3 h-3" />
          </button>
          <button className="w-6 h-6 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 rounded">
            <MinBox className="w-3 h-3" />
          </button>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center text-white/60 hover:text-white hover:bg-red-500/70 rounded"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>
      <div className="w-full h-[calc(100%-2.25rem)] overflow-hidden bg-[#141828]">{children}</div>
    </motion.div>
  );
}
