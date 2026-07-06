import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree, extend } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import {
  EffectComposer,
  Bloom,
  ChromaticAberration,
  Vignette,
  Noise,
} from "@react-three/postprocessing";
import { BlendFunction, Effect } from "postprocessing";
import * as THREE from "three";
import { playWhale, playVortex } from "@/lib/sound";
import { useDragOrbit } from "@/lib/useDragOrbit";

/* ─────────── Gravitational-lens post-processing pass ───────────
 * Full-screen fragment shader that samples the scene texture and applies a
 * radial displacement around a moving "lens center" — a real light-bending
 * effect on the whole rendered background. Configurable strength + count.
 */
class GravLensEffectImpl extends Effect {
  constructor() {
    super(
      "GravLensEffect",
      /* glsl */ `
      uniform vec2 uLens1;
      uniform vec2 uLens2;
      uniform vec2 uLens3;
      uniform float uStrength;
      uniform float uTime;

      float lensAt(vec2 uv, vec2 c) {
        vec2 d = uv - c;
        // aspect-correct radial distance
        d.x *= 1.6;
        float r2 = dot(d, d);
        // Einstein-ring style pull: strong near center, decays like 1/(r^2 + eps)
        return 1.0 / (r2 * 40.0 + 0.02);
      }

      void mainUv(inout vec2 uv) {
        vec2 pull = vec2(0.0);
        vec2 d1 = uv - uLens1; d1.x *= 1.6; pull -= normalize(d1 + 1e-4) * lensAt(uv, uLens1);
        vec2 d2 = uv - uLens2; d2.x *= 1.6; pull -= normalize(d2 + 1e-4) * lensAt(uv, uLens2);
        vec2 d3 = uv - uLens3; d3.x *= 1.6; pull -= normalize(d3 + 1e-4) * lensAt(uv, uLens3);
        uv += pull * uStrength * 0.02;
        // subtle chromatic swirl
        uv += 0.0015 * vec2(sin(uv.y * 30.0 + uTime), cos(uv.x * 30.0 + uTime));
      }

      void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
        // sampled color from displaced uv (handled by mainUv) — brighten near lens cores
        float glow = smoothstep(0.15, 0.0, distance(uv, uLens1))
                   + smoothstep(0.15, 0.0, distance(uv, uLens2))
                   + smoothstep(0.15, 0.0, distance(uv, uLens3));
        vec3 halo = vec3(0.0, 0.95, 1.0) * glow * 0.35
                  + vec3(0.55, 0.35, 1.0) * glow * 0.25;
        outputColor = vec4(inputColor.rgb + halo, inputColor.a);
      }
      `,
      {
        blendFunction: BlendFunction.NORMAL,
        uniforms: new Map<string, THREE.Uniform>([
          ["uLens1", new THREE.Uniform(new THREE.Vector2(0.28, 0.7))],
          ["uLens2", new THREE.Uniform(new THREE.Vector2(0.72, 0.35))],
          ["uLens3", new THREE.Uniform(new THREE.Vector2(0.5, 0.85))],
          ["uStrength", new THREE.Uniform(1.0)],
          ["uTime", new THREE.Uniform(0)],
        ]),
      },
    );
  }
  update(_r: THREE.WebGLRenderer, _i: THREE.WebGLRenderTarget, dt: number) {
    const t = (this.uniforms.get("uTime") as THREE.Uniform).value as number;
    (this.uniforms.get("uTime") as THREE.Uniform).value = t + dt;
    // drift the lens centers slowly
    const time = t + dt;
    (this.uniforms.get("uLens1") as THREE.Uniform).value.set(
      0.28 + Math.sin(time * 0.15) * 0.06,
      0.7 + Math.cos(time * 0.11) * 0.05,
    );
    (this.uniforms.get("uLens2") as THREE.Uniform).value.set(
      0.72 + Math.cos(time * 0.13) * 0.05,
      0.35 + Math.sin(time * 0.09) * 0.06,
    );
    (this.uniforms.get("uLens3") as THREE.Uniform).value.set(
      0.5 + Math.sin(time * 0.07) * 0.04,
      0.85 + Math.cos(time * 0.1) * 0.04,
    );
  }
}
extend({ GravLensEffectImpl });

function GravitationalLensPass() {
  const ref = useRef<GravLensEffectImpl>(null!);
  const effect = useMemo(() => new GravLensEffectImpl(), []);
  return <primitive ref={ref} object={effect} />;
}

/* ─────────── Drag-orbit camera ───────────
 * The scene "listens" to the shared drag state (also used by the DOM parallax)
 * and gently orbits the camera around the origin. Damped, always returns to
 * center when the user stops dragging.
 */
function DragCamera() {
  const drag = useDragOrbit();
  const { camera } = useThree();
  const state = useRef({
    yaw: 0,
    pitch: 0,
    dolly: 0,
    tYaw: 0,
    tPitch: 0,
    tDolly: 0,
  });

  useFrame((_s, dt) => {
    // Target values from normalized drag offsets (-1.5..1.5 for xy, -1..1 for z)
    state.current.tYaw = drag.x.get() * 0.55;
    state.current.tPitch = -drag.y.get() * 0.32;
    state.current.tDolly = drag.z.get() * 4; // camera pulls in/out ±4 units

    const k = 1 - Math.exp(-dt * 4);
    state.current.yaw += (state.current.tYaw - state.current.yaw) * k;
    state.current.pitch += (state.current.tPitch - state.current.pitch) * k;
    state.current.dolly += (state.current.tDolly - state.current.dolly) * k;

    const r = 8 + state.current.dolly;
    camera.position.x = Math.sin(state.current.yaw) * r;
    camera.position.z = Math.cos(state.current.yaw) * r;
    camera.position.y = Math.sin(state.current.pitch) * r * 0.55;
    camera.lookAt(0, 0, 0);
  });
  return null;
}

/* ─────────── Black hole vortex (shader-swirl disk) ─────────── */
function BlackHole({
  position,
  scale = 1,
  hue = 0.55,
}: {
  position: [number, number, number];
  scale?: number;
  hue?: number;
}) {
  const ref = useRef<THREE.Mesh>(null!);
  const mat = useRef<THREE.ShaderMaterial>(null!);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uHue: { value: hue },
    }),
    [hue],
  );

  useFrame((_state, dt) => {
    if (mat.current) mat.current.uniforms.uTime.value += dt;
    if (ref.current) ref.current.rotation.z += dt * 0.15;
  });

  return (
    <mesh ref={ref} position={position} scale={scale} onClick={() => playVortex()}>
      <ringGeometry args={[0.6, 3, 128]} />
      <shaderMaterial
        ref={mat}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
        vertexShader={`
          varying vec2 vUv;
          varying vec3 vPos;
          void main(){
            vUv = uv;
            vPos = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          precision mediump float;
          varying vec2 vUv;
          varying vec3 vPos;
          uniform float uTime;
          uniform float uHue;

          vec3 hsl(float h, float s, float l){
            vec3 rgb = clamp(abs(mod(h*6.0 + vec3(0.,4.,2.),6.)-3.)-1., 0., 1.);
            return l + s*(rgb-0.5)*(1.-abs(2.*l-1.));
          }
          void main(){
            float r = length(vPos.xy);
            float a = atan(vPos.y, vPos.x);
            float swirl = sin(a*6.0 + uTime*2.0 - r*3.0);
            float ring = smoothstep(3.0, 0.8, r);
            float core = smoothstep(0.9, 0.6, r);
            float glow = ring * (0.4 + 0.6*swirl*swirl);
            vec3 col = hsl(uHue + swirl*0.05, 0.9, 0.55) * glow;
            col *= (1.0 - core);
            float alpha = glow * (1.0 - core*0.9) * 0.85;
            gl_FragColor = vec4(col, alpha);
          }
        `}
      />
    </mesh>
  );
}

/* ─────────── 3D Whale ─────────── */
function Whale({
  path,
  speed = 0.05,
  scale = 1,
  color = "#8ec5ff",
}: {
  path: [number, number, number][];
  speed?: number;
  scale?: number;
  color?: string;
}) {
  const group = useRef<THREE.Group>(null!);
  const tail = useRef<THREE.Mesh>(null!);
  const curve = useMemo(
    () =>
      new THREE.CatmullRomCurve3(
        path.map((p) => new THREE.Vector3(...p)),
        true,
        "catmullrom",
        0.5,
      ),
    [path],
  );
  const t = useRef(Math.random());
  const lastCall = useRef(0);
  const { camera, size } = useThree();

  useFrame((state, dt) => {
    t.current = (t.current + dt * speed) % 1;
    const pos = curve.getPointAt(t.current);
    const next = curve.getPointAt((t.current + 0.001) % 1);
    if (group.current) {
      group.current.position.copy(pos);
      group.current.lookAt(next);
    }
    if (tail.current) {
      tail.current.rotation.y = Math.sin(state.clock.elapsedTime * 3) * 0.5;
    }

    // Ambient whale calls — every ~28-45s a whale calls with a stereo pan
    // based on its current on-screen position. Feels alive without spamming.
    if (state.clock.elapsedTime - lastCall.current > 28 + Math.random() * 17) {
      lastCall.current = state.clock.elapsedTime;
      if (group.current) {
        // Project world position → NDC → screen x for the pan value.
        const world = group.current.position.clone();
        const projected = world.project(camera);
        const inView =
          projected.z < 1 &&
          projected.x > -1.2 &&
          projected.x < 1.2 &&
          projected.y > -1.2 &&
          projected.y < 1.2;
        if (inView) {
          const startPan = Math.max(-1, Math.min(1, projected.x));
          // Estimate pan a moment later by projecting the "next" point
          const nextWorld = curve.getPointAt((t.current + 0.02) % 1).project(camera);
          const endPan = Math.max(-1, Math.min(1, nextWorld.x));
          void size; // suppress unused-lint on `size` while keeping the import warm
          playWhale({ from: startPan, to: endPan });
        }
      }
    }
  });

  return (
    <group ref={group} scale={scale} onClick={() => playWhale()}>
      <mesh>
        <sphereGeometry args={[0.9, 24, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.25}
          metalness={0.2}
          roughness={0.6}
          transparent
          opacity={0.85}
        />
      </mesh>
      <mesh position={[-0.3, 0.05, 0]} scale={[1.6, 0.75, 0.9]}>
        <sphereGeometry args={[0.7, 20, 14]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.2}
          transparent
          opacity={0.85}
        />
      </mesh>
      <mesh position={[0.7, 0.1, 0]}>
        <sphereGeometry args={[0.55, 16, 12]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.25}
          transparent
          opacity={0.85}
        />
      </mesh>
      <mesh position={[0.0, -0.05, 0.6]} rotation={[0, 0.4, 0.3]}>
        <coneGeometry args={[0.2, 0.7, 8]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.15}
          transparent
          opacity={0.8}
        />
      </mesh>
      <mesh position={[0.0, -0.05, -0.6]} rotation={[0, -0.4, -0.3]}>
        <coneGeometry args={[0.2, 0.7, 8]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.15}
          transparent
          opacity={0.8}
        />
      </mesh>
      <mesh ref={tail} position={[-1.6, 0.05, 0]}>
        <coneGeometry args={[0.4, 0.9, 6]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.2}
          transparent
          opacity={0.85}
        />
      </mesh>
      <pointLight color={color} intensity={2} distance={5} />
    </group>
  );
}

/* ─────────── 3D Octopus ─────────── */
function Tentacle({ i, color }: { i: number; color: string }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime * 2 + i;
    ref.current.rotation.x = Math.sin(t) * 0.5;
    ref.current.rotation.z = Math.cos(t * 0.8) * 0.3;
  });
  const angle = (i / 8) * Math.PI * 2;
  return (
    <mesh
      ref={ref}
      position={[Math.cos(angle) * 0.4, -0.4, Math.sin(angle) * 0.4]}
      rotation={[Math.PI * 0.4, 0, angle]}
    >
      <cylinderGeometry args={[0.05, 0.14, 1.0, 6, 4]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.2}
        transparent
        opacity={0.8}
      />
    </mesh>
  );
}

function Octopus({
  path,
  speed = 0.03,
  scale = 1,
  color = "#d484ff",
}: {
  path: [number, number, number][];
  speed?: number;
  scale?: number;
  color?: string;
}) {
  const group = useRef<THREE.Group>(null!);
  const curve = useMemo(
    () =>
      new THREE.CatmullRomCurve3(
        path.map((p) => new THREE.Vector3(...p)),
        true,
        "catmullrom",
        0.5,
      ),
    [path],
  );
  const t = useRef(Math.random());
  useFrame((state, dt) => {
    t.current = (t.current + dt * speed) % 1;
    const pos = curve.getPointAt(t.current);
    if (group.current) {
      group.current.position.copy(pos);
      group.current.rotation.y = state.clock.elapsedTime * 0.3;
      group.current.position.y += Math.sin(state.clock.elapsedTime + t.current * 10) * 0.002;
    }
  });
  return (
    <group ref={group} scale={scale}>
      <mesh>
        <sphereGeometry args={[0.55, 20, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.3}
          transparent
          opacity={0.85}
          metalness={0.3}
          roughness={0.5}
        />
      </mesh>
      <mesh position={[0, 0.15, 0]} scale={[0.9, 0.6, 0.9]}>
        <sphereGeometry args={[0.45, 16, 12]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.2}
          transparent
          opacity={0.7}
        />
      </mesh>
      {Array.from({ length: 8 }, (_, i) => (
        <Tentacle key={i} i={i} color={color} />
      ))}
      <pointLight color={color} intensity={1.5} distance={4} />
    </group>
  );
}

/* ─────────── Floating dust particles ─────────── */
function DustField({ count = 600 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null!);
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 40;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 24;
      arr[i * 3 + 2] = -Math.random() * 20 - 2;
    }
    return arr;
  }, [count]);

  useFrame((_s, dt) => {
    if (!ref.current) return;
    ref.current.rotation.y += dt * 0.02;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.04}
        color="#9ff"
        transparent
        opacity={0.65}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/* ─────────── Scene ─────────── */
function Scene() {
  const whales = useMemo(
    () => [
      {
        path: [
          [-10, 3, -5],
          [-4, 5, -8],
          [6, 4, -6],
          [10, 2, -4],
          [4, 0, -2],
          [-6, 1, -3],
        ] as [number, number, number][],
        speed: 0.03,
        scale: 1.4,
        color: "#8ec5ff",
      },
      {
        path: [
          [8, -3, -6],
          [3, -5, -8],
          [-6, -4, -6],
          [-10, -2, -3],
          [-4, 0, -5],
          [4, -1, -7],
        ] as [number, number, number][],
        speed: 0.025,
        scale: 1.1,
        color: "#a4e1ff",
      },
    ],
    [],
  );
  const octos = useMemo(
    () => [
      {
        path: [
          [-6, -1, -3],
          [-3, -3, -5],
          [2, -1, -4],
          [4, 1, -6],
          [-1, 2, -3],
        ] as [number, number, number][],
        speed: 0.04,
        scale: 0.9,
        color: "#d484ff",
      },
      {
        path: [
          [5, 3, -4],
          [7, 1, -6],
          [3, -1, -5],
          [-2, 1, -3],
          [1, 3, -4],
        ] as [number, number, number][],
        speed: 0.05,
        scale: 0.75,
        color: "#ff88cc",
      },
    ],
    [],
  );

  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[0, 0, 5]} intensity={0.6} color="#00F2FF" />
      <fog attach="fog" args={["#040818", 6, 40]} />
      <Stars radius={80} depth={50} count={2500} factor={4} saturation={0} fade speed={0.5} />
      <DustField count={500} />
      <BlackHole position={[-6, 2, -10]} scale={0.9} hue={0.55} />
      <BlackHole position={[7, -3, -12]} scale={1.3} hue={0.75} />
      <BlackHole position={[0, 4, -14]} scale={0.7} hue={0.9} />
      <BlackHole position={[-4, -4, -11]} scale={0.8} hue={0.15} />
      {whales.map((w, i) => (
        <Whale key={i} {...w} />
      ))}
      {octos.map((o, i) => (
        <Octopus key={i} {...o} />
      ))}
    </>
  );
}

/* ─────────── Root export ─────────── */
export default function BackgroundScene3D() {
  // Detect prefers-reduced-motion to skip heavy passes for accessibility.
  const reduced = useReducedMotion();

  return (
    <div className="fixed inset-0 -z-[5] pointer-events-none">
      <Canvas
        camera={{ position: [0, 0, 8], fov: 60 }}
        gl={{
          alpha: true,
          antialias: true,
          powerPreference: "high-performance",
        }}
        dpr={[1, 1.75]}
        style={{ background: "transparent" }}
      >
        <Suspense fallback={null}>
          <DragCamera />
          <Scene />
          {!reduced && (
            <EffectComposer multisampling={0}>
              <GravitationalLensPass />
              {/* Two bloom passes: one wide for atmospheric glow, one tight for sharp highlights */}
              <Bloom
                intensity={1.35}
                luminanceThreshold={0.12}
                luminanceSmoothing={0.72}
                mipmapBlur
                radius={0.85}
              />
              <Bloom
                intensity={0.55}
                luminanceThreshold={0.55}
                luminanceSmoothing={0.4}
                mipmapBlur
                radius={0.35}
              />
              <ChromaticAberration
                offset={[0.0014, 0.0018] as unknown as THREE.Vector2}
                blendFunction={BlendFunction.NORMAL}
                radialModulation={false}
                modulationOffset={0}
              />
              <Vignette eskil={false} offset={0.2} darkness={0.85} />
              <Noise opacity={0.06} blendFunction={BlendFunction.OVERLAY} />
            </EffectComposer>
          )}
        </Suspense>
      </Canvas>
    </div>
  );
}

function useReducedMotion() {
  const ref = useRef(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    ref.current = m.matches;
    const l = (e: MediaQueryListEvent) => {
      ref.current = e.matches;
    };
    m.addEventListener("change", l);
    return () => m.removeEventListener("change", l);
  }, []);
  return ref.current;
}
