/**
 * SceneViewer — mounts a single Babylon scene entry inside a BabylonSceneHost,
 * with a cinematic HUD overlay (title, blurb, back nav, scene controls).
 */

import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowLeft, Eye, RotateCcw, Cpu } from "lucide-react";
import type { SceneEntry } from "@/lib/babylon/registry";
import { BabylonSceneHost } from "@/lib/babylon/BabylonSceneHost";
import { sfxHover, playClick } from "@/lib/sound";

export function SceneViewer({ entry }: { entry: SceneEntry }) {
  const [webgpu, setWebgpu] = useState(false);

  // Reset scroll on mount + detect WebGPU availability.
  useEffect(() => {
    window.scrollTo(0, 0);
    // @ts-expect-error - navigator.gpu is not in older lib.dom typings.
    setWebgpu(!!navigator.gpu);
  }, [entry.slug]);

  return (
    <div className="fixed inset-0 z-[500] bg-black">
      <BabylonSceneHost
        setup={entry.builder}
        hdr={entry.options.hdr}
        ambient={entry.options.ambient}
        camera={entry.options.camera}
        sun={entry.options.sun}
        postProcess={entry.options.postProcess}
        fog={entry.options.fog}
        clearColor={entry.options.clearColor}
        className="absolute inset-0"
      >
        {/* Top bar */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="absolute top-0 left-0 right-0 p-5 flex items-start justify-between pointer-events-none"
        >
          <Link
            to="/scenes"
            onMouseEnter={sfxHover}
            className="pointer-events-auto inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[10px] font-mono uppercase tracking-[0.25em] text-[#E0F7FA]/80 hover:text-white transition hover:scale-105"
            style={{
              background: "rgba(11,16,26,0.55)",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(140,180,255,0.18)",
            }}
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Gallery
          </Link>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="pointer-events-auto rounded-2xl px-5 py-3 max-w-sm"
            style={{
              background: "rgba(11,16,26,0.55)",
              backdropFilter: "blur(16px)",
              border: `1px solid hsla(${entry.hue}, 80%, 55%, 0.35)`,
            }}
          >
            <div className="flex items-center gap-2.5">
              <span className="text-xl">{entry.icon}</span>
              <div>
                <h1
                  className="text-base leading-tight"
                  style={{ fontFamily: "var(--font-display), sans-serif", color: "#E8F4FF" }}
                >
                  {entry.title}
                </h1>
                <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#E0F7FA]/45">
                  {entry.category} · Babylon engine
                </p>
              </div>
            </div>
            <p className="mt-2 text-[11.5px] text-[#E0F7FA]/65 leading-snug">{entry.blurb}</p>
          </motion.div>
        </motion.div>

        {/* Bottom hint */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="absolute bottom-5 left-1/2 -translate-x-1/2 pointer-events-none"
        >
          <div
            className="rounded-full px-5 py-2 flex items-center gap-4 text-[10px] font-mono uppercase tracking-[0.2em] text-[#E0F7FA]/65"
            style={{ background: "rgba(11,16,26,0.6)", backdropFilter: "blur(16px)", border: "1px solid rgba(140,180,255,0.15)" }}
          >
            <span className="flex items-center gap-1.5"><Eye className="w-3 h-3" /> Drag to orbit</span>
            <span className="opacity-40">·</span>
            <span className="flex items-center gap-1.5"><RotateCcw className="w-3 h-3" /> Scroll to zoom</span>
            {webgpu && (
              <>
                <span className="opacity-40">·</span>
                <span className="flex items-center gap-1.5 text-emerald-300">
                  <Cpu className="w-3 h-3" /> WebGPU
                </span>
              </>
            )}
          </div>
        </motion.div>
      </BabylonSceneHost>
    </div>
  );
}

void playClick;
