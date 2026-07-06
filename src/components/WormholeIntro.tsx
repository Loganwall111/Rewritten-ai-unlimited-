/**
 * Three-phase cinematic wormhole intro.
 *
 *  0.0–1.8s  WARP-TUNNEL DIVE
 *    Camera flies forward through a tunnel of stretched, colored light streaks
 *    with radial "ring" lensing artefacts. Streaks accelerate toward the end.
 *
 *  1.8–3.2s  ORB APPROACH
 *    A single giant wireframe orb (matching the billing "Infinity" sphere)
 *    rises from the center and grows to fill the screen. Streaks curve around
 *    its edge like Einstein-ring lensing. The orb rotates on its axis.
 *
 *  3.2–4.2s  BLACK-HOLE PLUNGE
 *    Camera dives INTO the orb. Its interior becomes a swirling accretion
 *    disk viewed from above (shader ring), collapsing toward a bright core.
 *    Whiteout flash → onComplete().
 *
 * All rendered in one R3F Canvas so timing is frame-locked. The old canvas
 * 2D version is replaced entirely.
 */
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, Bloom, ChromaticAberration, Vignette } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import * as THREE from "three";
import { motion, AnimatePresence } from "framer-motion";
import { playWormhole } from "@/lib/sound";

const DURATION = 4200; // ms — total intro length
const T_TUNNEL_END = 0.43; // 0..1 progress
const T_ORB_END = 0.78;
// remaining 0.78..1.0 is the plunge + flash

/* ─────── tunnel of star-streaks flying past the camera ─────── */
function TunnelStreaks({ progress }: { progress: React.RefObject<number> }) {
  const ref = useRef<THREE.Points>(null!);
  const count = 900;
  const { positions, colors } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // spawn in a tube along -Z, random radius
      const r = 0.4 + Math.random() * 8;
      const a = Math.random() * Math.PI * 2;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = Math.sin(a) * r;
      pos[i * 3 + 2] = -Math.random() * 60;
      // hue: cyan → violet
      const hue = 0.5 + Math.random() * 0.25;
      const c = new THREE.Color().setHSL(hue, 1, 0.7);
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    return { positions: pos, colors: col };
  }, []);

  useFrame((_s, dt) => {
    if (!ref.current) return;
    const geom = ref.current.geometry;
    const pos = geom.attributes.position.array as Float32Array;
    const p = progress.current ?? 0;
    // speed ramps up through the tunnel phase, then slows during orb approach
    const speed = p < T_TUNNEL_END ? 20 + p * 200 : Math.max(4, 100 - p * 120);
    for (let i = 0; i < count; i++) {
      pos[i * 3 + 2] += dt * speed;
      if (pos[i * 3 + 2] > 5) {
        // recycle back into the far distance
        pos[i * 3 + 2] = -60 + Math.random() * -20;
        const r = 0.4 + Math.random() * 8;
        const a = Math.random() * Math.PI * 2;
        pos[i * 3] = Math.cos(a) * r;
        pos[i * 3 + 1] = Math.sin(a) * r;
      }
    }
    geom.attributes.position.needsUpdate = true;
    // fade streaks during orb approach & plunge
    const mat = ref.current.material as THREE.PointsMaterial;
    mat.opacity = p < T_TUNNEL_END ? 1 : Math.max(0, 1 - (p - T_TUNNEL_END) / 0.25);
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        vertexColors
        size={0.12}
        sizeAttenuation
        transparent
        opacity={1}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/* ─────── giant wireframe orb that rises during phase 2 ─────── */
function ApproachOrb({ progress }: { progress: React.RefObject<number> }) {
  const groupRef = useRef<THREE.Group>(null!);
  const shellRef = useRef<THREE.Mesh>(null!);
  const wireRef = useRef<THREE.LineSegments>(null!);
  const coreRef = useRef<THREE.Mesh>(null!);
  const coreMat = useRef<THREE.ShaderMaterial>(null!);

  const wireGeom = useMemo(() => {
    const g = new THREE.SphereGeometry(1, 32, 24);
    return new THREE.WireframeGeometry(g);
  }, []);

  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);

  useFrame((_s, dt) => {
    const p = progress.current ?? 0;
    if (!groupRef.current) return;

    // Phase 1: tucked far behind camera, invisible
    // Phase 2 (T_TUNNEL_END → T_ORB_END): rises from z=-15 to z=-1.5, scale 0.4 → 3.5
    // Phase 3 (T_ORB_END → 1): flies past camera (scale × 6, z→ +5)
    let z = -30;
    let scale = 0.4;
    let opacity = 0;
    if (p >= T_TUNNEL_END && p < T_ORB_END) {
      const t = (p - T_TUNNEL_END) / (T_ORB_END - T_TUNNEL_END); // 0..1
      z = -15 + t * 13.5; // → -1.5
      scale = 0.4 + t * 3.1;
      opacity = Math.min(1, t * 2);
    } else if (p >= T_ORB_END) {
      const t = (p - T_ORB_END) / (1 - T_ORB_END); // 0..1
      z = -1.5 + t * 6.5; // camera passes THROUGH
      scale = 3.5 + t * 6;
      opacity = 1 - t * 0.6;
    }

    groupRef.current.position.z = z;
    groupRef.current.scale.setScalar(scale);
    groupRef.current.rotation.y += dt * 0.6;
    groupRef.current.rotation.x = Math.sin(_s.clock.elapsedTime * 0.3) * 0.15;

    if (shellRef.current) {
      (shellRef.current.material as THREE.MeshBasicMaterial).opacity = opacity * 0.35;
    }
    if (wireRef.current) {
      (wireRef.current.material as THREE.LineBasicMaterial).opacity = opacity * 0.85;
    }
    if (coreRef.current) {
      (coreRef.current.material as THREE.ShaderMaterial).uniforms.uTime.value += dt;
      const coreOpacity = p < T_ORB_END ? 0 : Math.min(1, (p - T_ORB_END) * 6);
      coreRef.current.scale.setScalar(0.6 + coreOpacity * 0.6);
    }
  });

  return (
    <group ref={groupRef}>
      {/* dark refractive shell */}
      <mesh ref={shellRef}>
        <sphereGeometry args={[1, 32, 24]} />
        <meshBasicMaterial color="#0a1428" transparent opacity={0} depthWrite={false} />
      </mesh>
      {/* wireframe */}
      <lineSegments ref={wireRef} geometry={wireGeom}>
        <lineBasicMaterial color="#a8e6ff" transparent opacity={0} depthWrite={false} />
      </lineSegments>
      {/* bright core that ignites during plunge */}
      <mesh ref={coreRef}>
        <sphereGeometry args={[0.55, 32, 24]} />
        <shaderMaterial
          ref={coreMat}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          uniforms={uniforms}
          vertexShader={`
            varying vec3 vNormal;
            void main() {
              vNormal = normalize(normalMatrix * normal);
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `}
          fragmentShader={`
            uniform float uTime;
            varying vec3 vNormal;
            void main() {
              float rim = pow(1.0 - abs(vNormal.z), 1.5);
              vec3 col = mix(vec3(0.0, 0.95, 1.0), vec3(0.7, 0.4, 1.0), rim);
              col += vec3(1.0) * (0.5 + 0.5 * sin(uTime * 4.0));
              gl_FragColor = vec4(col, rim * 0.9);
            }
          `}
        />
      </mesh>
    </group>
  );
}

/* ─────── camera + FOV animation controller ─────── */
function IntroCamera({ progress }: { progress: React.RefObject<number> }) {
  const { camera } = useThree();
  useFrame(() => {
    const p = progress.current ?? 0;
    // Phase 1: strong forward pull, slight roll
    if (p < T_TUNNEL_END) {
      const t = p / T_TUNNEL_END;
      (camera as THREE.PerspectiveCamera).fov = 75 + t * 30; // widen for warp feel
      camera.rotation.z = t * 0.6;
    } else if (p < T_ORB_END) {
      const t = (p - T_TUNNEL_END) / (T_ORB_END - T_TUNNEL_END);
      (camera as THREE.PerspectiveCamera).fov = 105 - t * 45;
      camera.rotation.z = 0.6 - t * 0.6;
    } else {
      const t = (p - T_ORB_END) / (1 - T_ORB_END);
      (camera as THREE.PerspectiveCamera).fov = 60 + t * 40;
      camera.rotation.z = t * 0.3;
    }
    (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
  });
  return null;
}

/* ─────── main component ─────── */
export default function WormholeIntro({ onComplete }: { onComplete: () => void }) {
  const [gone, setGone] = useState(false);
  const [flash, setFlash] = useState(false);
  const progress = useRef(0);
  const startTime = useRef<number | null>(null);

  useEffect(() => {
    playWormhole();
    let raf = 0;
    const tick = (now: number) => {
      if (startTime.current === null) startTime.current = now;
      const t = Math.min(1, (now - startTime.current) / DURATION);
      progress.current = t;
      if (t >= 0.94 && !flash) setFlash(true);
      if (t >= 1) {
        setGone(true);
        setTimeout(onComplete, 450);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onComplete]);

  return (
    <AnimatePresence>
      {!gone && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[200] bg-black"
        >
          <Canvas
            gl={{
              alpha: false,
              antialias: true,
              powerPreference: "high-performance",
            }}
            camera={{ position: [0, 0, 0.1], fov: 75, near: 0.01, far: 200 }}
            dpr={[1, 1.75]}
          >
            <color attach="background" args={["#02040a"]} />
            <Suspense fallback={null}>
              <IntroCamera progress={progress} />
              <TunnelStreaks progress={progress} />
              <ApproachOrb progress={progress} />
              <EffectComposer multisampling={0}>
                <Bloom
                  intensity={1.6}
                  luminanceThreshold={0.15}
                  luminanceSmoothing={0.7}
                  mipmapBlur
                />
                <ChromaticAberration
                  offset={[0.003, 0.004] as unknown as THREE.Vector2}
                  blendFunction={BlendFunction.NORMAL}
                  radialModulation={false}
                  modulationOffset={0}
                />
                <Vignette eskil={false} offset={0.15} darkness={0.85} />
              </EffectComposer>
            </Suspense>
          </Canvas>

          {/* whiteout flash */}
          <motion.div
            className="pointer-events-none absolute inset-0 bg-white"
            initial={{ opacity: 0 }}
            animate={{ opacity: flash ? 0.95 : 0 }}
            transition={{ duration: 0.35 }}
          />

          {/* label */}
          <div className="absolute inset-x-0 bottom-16 flex items-center justify-center pointer-events-none">
            <p className="font-mono text-[10px] tracking-[0.5em] uppercase text-[#a8e6ff]/70 drop-shadow-[0_0_12px_rgba(0,242,255,0.5)]">
              entering the lens…
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
