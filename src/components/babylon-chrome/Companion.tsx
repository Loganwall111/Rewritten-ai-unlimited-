/**
 * Companion — a small floating Babylon canvas widget that lives in the corner
 * of the app: a living, breathing orb-character with eyes that track the cursor
 * and gentle ambient motion. The global "3D companion character".
 */

import { useEffect, useRef } from "react";
import { Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight, Color3, MeshBuilder, StandardMaterial, Color4 } from "@babylonjs/core";

export function Companion({ hue = 190 }: { hue?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const eyeLRef = useRef<{ setTarget: (x: number, y: number) => void } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = new Engine(canvas, true, { alpha: true, antialias: true }, true);
    const scene = new Scene(engine);
    scene.clearColor = new Color4(0, 0, 0, 0);
    const camera = new ArcRotateCamera("c", -Math.PI / 2, Math.PI / 2.2, 8, new Vector3(0, 0, 0), scene);
    camera.minZ = 0.1;
    const hemi = new HemisphericLight("h", new Vector3(0, 1, 0), scene);
    hemi.intensity = 0.9;

    // Body.
    const body = MeshBuilder.CreateSphere("body", { diameter: 4, segments: 32 }, scene);
    const bodyMat = new StandardMaterial("bm", scene);
    bodyMat.diffuseColor = Color3.FromHexString(hslHex(hue));
    bodyMat.emissiveColor = Color3.FromHexString(hslHex(hue)).scale(0.4);
    body.material = bodyMat;

    // Eyes (whites).
    const whiteMat = new StandardMaterial("wm", scene);
    whiteMat.diffuseColor = new Color3(1, 1, 1);
    whiteMat.emissiveColor = new Color3(0.9, 0.9, 0.9);
    const pupilMat = new StandardMaterial("pm", scene);
    pupilMat.diffuseColor = new Color3(0.02, 0.02, 0.05);
    const eyes: { socket: any; pupil: any }[] = [];
    for (const sx of [-1, 1]) {
      const socket = MeshBuilder.CreateSphere(`eye${sx}`, { diameter: 1.1, segments: 16 }, scene);
      socket.position.set(sx * 0.9, 0.5, 1.6);
      socket.material = whiteMat;
      const pupil = MeshBuilder.CreateSphere(`pup${sx}`, { diameter: 0.45, segments: 12 }, scene);
      pupil.position.set(sx * 0.9, 0.5, 2.15);
      pupil.material = pupilMat;
      pupil.parent = socket;
      eyes.push({ socket, pupil });
    }

    // Eye tracking target setter.
    eyeLRef.current = {
      setTarget: (nx: number, ny: number) => {
        // nx, ny in [-1,1] (normalised from cursor over viewport).
        for (const { socket } of eyes) {
          socket.position.x = Math.sign(socket.position.x) * 0.9 + nx * 0.25;
          socket.position.y = 0.5 + ny * 0.25;
        }
      },
    };

    let t = 0;
    engine.runRenderLoop(() => {
      t += engine.getDeltaTime() / 1000;
      body.rotation.y = Math.sin(t * 0.5) * 0.2;
      body.position.y = Math.sin(t * 1.2) * 0.15;
      body.scaling.setAll(1 + Math.sin(t * 1.6) * 0.02);
      scene.render();
    });

    const onResize = () => engine.resize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      scene.dispose();
      engine.dispose();
    };
  }, [hue]);

  // Cursor tracking → eye direction.
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = -((e.clientY / window.innerHeight) * 2 - 1);
      eyeLRef.current?.setTarget(nx, ny);
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[60] w-24 h-24 sm:w-28 sm:h-28">
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}

function hslHex(h: number): string {
  h = ((h % 360) + 360) % 360;
  const s = 0.8, l = 0.55;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const to = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}
