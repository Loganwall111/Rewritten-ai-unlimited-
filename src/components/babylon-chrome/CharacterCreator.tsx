/**
 * CharacterCreator — pick body colour / accent / archetype with a live
 * Babylon 3D preview, then save to localStorage.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Engine,
  Scene,
  ArcRotateCamera,
  Vector3,
  Color3,
  Color4,
  HemisphericLight,
  DirectionalLight,
} from "@babylonjs/core";
import {
  ARCHETYPES,
  DEFAULT_AVATAR_COLORS,
  createPreviewAvatar,
  color3ToHex,
  hexToColor3,
  loadSavedAvatar,
  saveAvatar,
  type AvatarInstance,
  type AvatarArchetype,
} from "@/lib/babylon/avatar";
import { marbleFloor, hsl } from "@/lib/babylon/graphics";
import { sfxHover, playClick } from "@/lib/sound";

const BODY_SWATCHES = [
  "#4ecdc4",
  "#45b7d1",
  "#96ceb4",
  "#ffeaa7",
  "#dfe6e9",
  "#fd79a8",
  "#a29bfe",
  "#e17055",
  "#2d3436",
  "#00b894",
];
const ACCENT_SWATCHES = [
  "#00f2ff",
  "#ff6bcb",
  "#ffe66d",
  "#7c5cff",
  "#ff9f43",
  "#26de81",
  "#fc5c65",
  "#45aaf2",
];

interface Props {
  onComplete: () => void;
  onSkip?: () => void;
}

export function CharacterCreator({ onComplete, onSkip }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const avatarRef = useRef<AvatarInstance | null>(null);
  const saved = loadSavedAvatar();

  const [bodyHex, setBodyHex] = useState(saved?.bodyHex ?? color3ToHex(DEFAULT_AVATAR_COLORS.body));
  const [accentHex, setAccentHex] = useState(
    saved?.accentHex ?? color3ToHex(DEFAULT_AVATAR_COLORS.accent),
  );
  const [archetypeId, setArchetypeId] = useState(saved?.archetypeId ?? ARCHETYPES[0].id);
  const [name, setName] = useState(saved?.name ?? "Operator");

  // Live preview engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let engine: Engine | null = null;
    let scene: Scene | null = null;
    let avatar: AvatarInstance | null = null;
    let disposed = false;

    const init = () => {
      engine = new Engine(canvas, true, { adaptToDeviceRatio: true }, true);
      scene = new Scene(engine);
      scene.clearColor = new Color4(0.03, 0.04, 0.1, 1);
      const cam = new ArcRotateCamera(
        "c",
        -Math.PI / 2,
        Math.PI / 2.4,
        5.5,
        new Vector3(0, 1, 0),
        scene,
      );
      cam.attachControl(canvas, true);
      cam.lowerRadiusLimit = 3;
      cam.upperRadiusLimit = 10;
      cam.wheelDeltaPercentage = 0.02;
      const hemi = new HemisphericLight("h", new Vector3(0, 1, 0), scene);
      hemi.intensity = 0.7;
      const sun = new DirectionalLight("s", new Vector3(-0.5, -1, -0.4), scene);
      sun.intensity = 1.2;
      marbleFloor(scene, 20, hsl(260, 0.2, 0.1));

      const arch = ARCHETYPES.find((a) => a.id === archetypeId) ?? ARCHETYPES[0];
      avatar = createPreviewAvatar(
        scene,
        { body: hexToColor3(bodyHex), accent: hexToColor3(accentHex) },
        arch,
      );
      avatarRef.current = avatar;

      let t = 0;
      engine.runRenderLoop(() => {
        if (!scene || !avatar) return;
        const dt = scene.getEngine().getDeltaTime() / 1000;
        t += dt;
        // Idle walk cycle preview
        avatar.update(dt, 0.35 + Math.sin(t * 0.5) * 0.15, false);
        avatar.root.rotation.y += dt * 0.35;
        scene.render();
      });
    };

    init();
    const onResize = () => engine?.resize();
    window.addEventListener("resize", onResize);
    return () => {
      disposed = true;
      window.removeEventListener("resize", onResize);
      avatar?.dispose();
      avatarRef.current = null;
      scene?.dispose();
      engine?.dispose();
      void disposed;
    };
    // Only mount once — colour/archetype updates go through avatarRef.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Push colour / archetype changes into the live avatar.
  useEffect(() => {
    const a = avatarRef.current;
    if (!a) return;
    a.setColors({ body: hexToColor3(bodyHex), accent: hexToColor3(accentHex) });
  }, [bodyHex, accentHex]);

  useEffect(() => {
    const a = avatarRef.current;
    if (!a) return;
    const arch = ARCHETYPES.find((x) => x.id === archetypeId) ?? ARCHETYPES[0];
    a.setArchetype(arch);
  }, [archetypeId]);

  const handleSave = useCallback(() => {
    playClick();
    saveAvatar({ bodyHex, accentHex, archetypeId, name: name.trim() || "Operator" });
    onComplete();
  }, [bodyHex, accentHex, archetypeId, name, onComplete]);

  return (
    <div className="fixed inset-0 z-[550] bg-black flex flex-col md:flex-row">
      {/* 3D preview */}
      <div className="relative flex-1 min-h-[45vh] md:min-h-0">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ display: "block", touchAction: "none", outline: "none" }}
        />
        <div className="absolute top-5 left-5 pointer-events-none">
          <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#00F2FF]/80">
            Character Creator
          </p>
          <h2
            className="text-2xl mt-1 text-[#E8F4FF]"
            style={{ fontFamily: "var(--font-display), sans-serif" }}
          >
            Shape your operator
          </h2>
        </div>
      </div>

      {/* Controls */}
      <motion.aside
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
        className="w-full md:w-[380px] p-6 md:p-8 flex flex-col gap-5 overflow-y-auto"
        style={{
          background: "rgba(11,16,26,0.92)",
          borderLeft: "1px solid rgba(140,180,255,0.15)",
          backdropFilter: "blur(20px)",
        }}
      >
        <label className="block">
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#E0F7FA]/50">
            Callsign
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 24))}
            className="mt-1.5 w-full rounded-xl px-4 py-2.5 text-sm text-[#E8F4FF] outline-none"
            style={{
              background: "rgba(0,0,0,0.35)",
              border: "1px solid rgba(140,180,255,0.2)",
            }}
            maxLength={24}
          />
        </label>

        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#E0F7FA]/50 mb-2">
            Archetype
          </p>
          <div className="grid grid-cols-1 gap-2">
            {ARCHETYPES.map((a: AvatarArchetype) => {
              const active = a.id === archetypeId;
              return (
                <button
                  key={a.id}
                  type="button"
                  onMouseEnter={sfxHover}
                  onClick={() => {
                    playClick();
                    setArchetypeId(a.id);
                  }}
                  className="rounded-xl px-4 py-2.5 text-left transition hover:scale-[1.01]"
                  style={{
                    background: active ? "rgba(0,242,255,0.12)" : "rgba(0,0,0,0.3)",
                    border: active
                      ? "1px solid rgba(0,242,255,0.55)"
                      : "1px solid rgba(140,180,255,0.12)",
                  }}
                >
                  <span className="text-sm text-[#E8F4FF]">{a.label}</span>
                  <span className="ml-2 text-[10px] font-mono uppercase tracking-widest text-[#E0F7FA]/40">
                    {a.build}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <SwatchRow
          label="Body colour"
          value={bodyHex}
          options={BODY_SWATCHES}
          onChange={setBodyHex}
        />
        <SwatchRow
          label="Accent"
          value={accentHex}
          options={ACCENT_SWATCHES}
          onChange={setAccentHex}
        />

        <div className="mt-auto flex flex-col gap-2 pt-4">
          <button
            type="button"
            onClick={handleSave}
            onMouseEnter={sfxHover}
            className="rounded-full px-5 py-3 text-xs font-mono uppercase tracking-[0.3em] text-[#001018] font-semibold transition hover:scale-[1.02]"
            style={{
              background: "linear-gradient(135deg, #00F2FF, #7C5CFF)",
              boxShadow: "0 0 30px rgba(0,242,255,0.35)",
            }}
          >
            Enter the worlds →
          </button>
          {onSkip && (
            <button
              type="button"
              onClick={() => {
                playClick();
                onSkip();
              }}
              onMouseEnter={sfxHover}
              className="rounded-full px-5 py-2.5 text-[10px] font-mono uppercase tracking-[0.3em] text-[#E0F7FA]/55 hover:text-white transition"
            >
              Skip for now
            </button>
          )}
        </div>
      </motion.aside>
    </div>
  );
}

function SwatchRow({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (hex: string) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#E0F7FA]/50">
          {label}
        </p>
        <span className="font-mono text-[10px] text-[#E0F7FA]/40">{value}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((hex) => {
          const active = hex.toLowerCase() === value.toLowerCase();
          return (
            <button
              key={hex}
              type="button"
              aria-label={hex}
              onMouseEnter={sfxHover}
              onClick={() => {
                playClick();
                onChange(hex);
              }}
              className="w-8 h-8 rounded-full transition hover:scale-110"
              style={{
                background: hex,
                boxShadow: active ? `0 0 0 2px #0b101a, 0 0 0 4px ${hex}` : "none",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
            />
          );
        })}
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded-full cursor-pointer bg-transparent border-0 p-0"
          title="Custom colour"
        />
      </div>
    </div>
  );
}

void Color3;
