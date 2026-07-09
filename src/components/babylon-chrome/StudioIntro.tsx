/**
 * StudioIntro — cinematic title card.
 *
 * "ONE BLOCK AWAY STUDIO PRESENTS" over a drifting starfield, then fades out
 * into the next stage of WalkableLanding.
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Color4,
  Vector3,
  MeshBuilder,
  FreeCamera,
  Engine,
  Scene,
  HemisphericLight,
} from "@babylonjs/core";
import { starField, nebulaParticles, glow, hsl } from "@/lib/babylon/graphics";

interface Props {
  onDone: () => void;
  /** Total duration before auto-advance (ms). */
  durationMs?: number;
}

export function StudioIntro({ onDone, durationMs = 4200 }: Props) {
  const [visible, setVisible] = useState(true);
  const [phase, setPhase] = useState(0); // 0 = studio, 1 = presents, 2 = out

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 1200);
    const t2 = setTimeout(() => setPhase(2), durationMs - 700);
    const t3 = setTimeout(() => {
      setVisible(false);
      setTimeout(onDone, 500);
    }, durationMs);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [durationMs, onDone]);

  // Skip on click / key
  useEffect(() => {
    const skip = () => {
      setVisible(false);
      setTimeout(onDone, 300);
    };
    window.addEventListener("keydown", skip, { once: true });
    window.addEventListener("pointerdown", skip, { once: true });
    return () => {
      window.removeEventListener("keydown", skip);
      window.removeEventListener("pointerdown", skip);
    };
  }, [onDone]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[600] bg-black"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          <StarDriftCanvas />
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <motion.p
              initial={{ opacity: 0, letterSpacing: "0.6em" }}
              animate={{
                opacity: phase >= 0 ? 1 : 0,
                letterSpacing: phase >= 1 ? "0.45em" : "0.6em",
              }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              className="font-mono text-[10px] sm:text-xs uppercase text-[#E0F7FA]/70"
            >
              One Block Away Studio
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{
                opacity: phase >= 1 ? 1 : 0,
                y: phase >= 1 ? 0 : 16,
                scale: phase >= 1 ? 1 : 0.96,
              }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              className="mt-5 text-3xl sm:text-5xl tracking-[0.2em] uppercase"
              style={{
                fontFamily: "var(--font-display), sans-serif",
                color: "#E8F4FF",
                textShadow:
                  "0 0 40px rgba(0,242,255,0.55), -1px 0 rgba(0,242,255,0.4), 1px 0 rgba(236,72,153,0.3)",
              }}
            >
              Presents
            </motion.h1>
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: phase >= 1 ? 1 : 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="mt-8 h-px w-40 origin-center"
              style={{
                background: "linear-gradient(90deg, transparent, rgba(0,242,255,0.8), transparent)",
              }}
            />
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: phase >= 1 ? 0.5 : 0 }}
              transition={{ delay: 0.6 }}
              className="mt-10 font-mono text-[9px] uppercase tracking-[0.4em] text-[#E0F7FA]/40"
            >
              Click or press any key to skip
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Tiny self-contained Babylon star drift — no WalkableHost dependency. */
function StarDriftCanvas() {
  useEffect(() => {
    const canvas = document.getElementById("studio-intro-canvas") as HTMLCanvasElement | null;
    if (!canvas) return;
    let engine: Engine | null = null;
    let scene: Scene | null = null;
    try {
      engine = new Engine(canvas, true, { adaptToDeviceRatio: true }, true);
      scene = new Scene(engine);
      scene.clearColor = new Color4(0.005, 0.008, 0.02, 1);
      const cam = new FreeCamera("c", new Vector3(0, 0, -10), scene);
      cam.setTarget(Vector3.Zero());
      const hemi = new HemisphericLight("h", new Vector3(0, 1, 0), scene);
      hemi.intensity = 0.4;

      starField(scene, 2500, 200);
      nebulaParticles(scene, {
        count: 800,
        color1: new Color4(0.3, 0.7, 1, 1),
        color2: new Color4(0.7, 0.3, 1, 1),
        minSize: 0.2,
        maxSize: 1,
        minEmitBox: new Vector3(-40, -20, -40),
        maxEmitBox: new Vector3(40, 20, 40),
        texture: "star",
      });

      const orb = MeshBuilder.CreateIcoSphere("orb", { radius: 1.2, subdivisions: 2 }, scene);
      orb.material = glow(scene, hsl(195, 1, 0.6), 2);

      let t = 0;
      engine.runRenderLoop(() => {
        if (!scene) return;
        t += scene.getEngine().getDeltaTime() / 1000;
        orb.rotation.y += 0.01;
        orb.rotation.x = Math.sin(t * 0.4) * 0.3;
        cam.position.x = Math.sin(t * 0.08) * 2;
        cam.position.y = Math.cos(t * 0.06) * 1;
        cam.setTarget(Vector3.Zero());
        scene.render();
      });
    } catch (err) {
      console.warn("[StudioIntro] canvas failed", err);
    }
    const onResize = () => engine?.resize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      scene?.dispose();
      engine?.dispose();
    };
  }, []);

  return (
    <canvas
      id="studio-intro-canvas"
      className="absolute inset-0 w-full h-full"
      style={{ display: "block" }}
    />
  );
}
