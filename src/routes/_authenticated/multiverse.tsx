import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Suspense, useMemo, useRef, useState, useEffect } from "react";
import { Canvas, useFrame, useThree, extend } from "@react-three/fiber";
import { Stars, Html, Line } from "@react-three/drei";
import { EffectComposer, Bloom, ChromaticAberration, Vignette } from "@react-three/postprocessing";
import { BlendFunction, Effect } from "postprocessing";
import * as THREE from "three";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, X, Info, Sparkles, Zap, Brain, Compass } from "lucide-react";
import type { ModelDef } from "@/lib/models";
import { MODELS } from "@/lib/models";
import { playClick, playVortex, playHorizonWhoomph, playMeteor, sfxPlanetPing } from "@/lib/sound";

export const Route = createFileRoute("/_authenticated/multiverse")({
  head: () => ({
    meta: [
      { title: "Multiverse · Rewritten AI" },
      {
        name: "description",
        content:
          "Explore the multiverse of AI models — a gravitationally-lensed black hole with galaxies of intelligence inside.",
      },
    ],
  }),
  component: MultiversePage,
});

/* ────────────────────── Post-processing lens pass ──────────────────────
 * A full-screen fragment shader that bends the scene UVs radially toward a
 * lens center — a real gravitational-lensing effect done as a post pass.
 * Strength grows as the camera approaches, then inverts when we pass into
 * the "inside" so the interior cosmos feels like it's inverted around us. */
class MultiverseLensImpl extends Effect {
  constructor() {
    super(
      "MultiverseLens",
      /* glsl */ `
      uniform vec2 uLensCenter;
      uniform float uStrength;
      uniform float uEinsteinR;
      uniform float uAberration;
      uniform float uTime;

      void mainUv(inout vec2 uv) {
        vec2 d = uv - uLensCenter;
        d.x *= 1.6;
        float r2 = dot(d, d);
        // Schwarzschild-like radial pull: strong near r=0, decays as 1/(r^2)
        float pull = uStrength / (r2 * 8.0 + 0.006);
        vec2 dir = normalize(d + 1e-5);
        uv -= dir * pull * 0.01;
        // Einstein-ring caustic: a subtle radial ripple around the horizon
        float ringR = uEinsteinR;
        float band = exp(-pow((sqrt(r2) - ringR) * 22.0, 2.0));
        uv += dir * band * 0.006 * sin(uTime * 1.2);
      }

      void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
        vec2 d = uv - uLensCenter; d.x *= 1.6;
        float r = length(d);
        // Chromatic split around the lens: RGB sampled with slight offsets in
        // the tangent direction, weighted by lens strength.
        vec2 dir = normalize(d + 1e-5);
        vec2 tang = vec2(-dir.y, dir.x) * uAberration * (uStrength / (r * 4.0 + 0.05));
        vec3 col = inputColor.rgb;
        col.r = texture(inputBuffer, uv + tang).r;
        col.b = texture(inputBuffer, uv - tang).b;
        // Add a violet halo at the Einstein ring for that photon-ring look
        float ring = exp(-pow((r - uEinsteinR) * 45.0, 2.0));
        col += vec3(0.4, 0.55, 1.0) * ring * 0.45 * uStrength;
        outputColor = vec4(col, inputColor.a);
      }
      `,
      {
        blendFunction: BlendFunction.NORMAL,
        uniforms: new Map<string, THREE.Uniform>([
          ["uLensCenter", new THREE.Uniform(new THREE.Vector2(0.5, 0.5))],
          ["uStrength", new THREE.Uniform(1.0)],
          ["uEinsteinR", new THREE.Uniform(0.18)],
          ["uAberration", new THREE.Uniform(0.6)],
          ["uTime", new THREE.Uniform(0)],
        ]),
      },
    );
  }
  update(_r: THREE.WebGLRenderer, _i: THREE.WebGLRenderTarget, dt: number) {
    const t = (this.uniforms.get("uTime") as THREE.Uniform).value as number;
    (this.uniforms.get("uTime") as THREE.Uniform).value = t + dt;
  }
}
extend({ MultiverseLensImpl });

function MultiverseLensPass({
  strengthRef,
  einsteinRef,
}: {
  strengthRef: React.RefObject<number>;
  einsteinRef: React.RefObject<number>;
}) {
  const effect = useMemo(() => new MultiverseLensImpl(), []);
  useFrame(() => {
    (effect.uniforms.get("uStrength") as THREE.Uniform).value = strengthRef.current ?? 1;
    (effect.uniforms.get("uEinsteinR") as THREE.Uniform).value = einsteinRef.current ?? 0.18;
  });
  return <primitive object={effect} />;
}

/* ────────────────────── The Black Hole itself ────────────────────── */

/** Volumetric shader disk — the accretion disk with realistic swirl + Doppler */
function BlackHole({ zoomRef }: { zoomRef: React.RefObject<number> }) {
  const groupRef = useRef<THREE.Group>(null!);
  const diskRef = useRef<THREE.Mesh>(null!);
  const diskMatRef = useRef<THREE.ShaderMaterial>(null!);
  const horizonRef = useRef<THREE.Mesh>(null!);
  const photonRingRef = useRef<THREE.Mesh>(null!);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uZoom: { value: 0 },
    }),
    [],
  );

  useFrame((_s, dt) => {
    if (diskMatRef.current) {
      diskMatRef.current.uniforms.uTime.value += dt;
      diskMatRef.current.uniforms.uZoom.value = zoomRef.current ?? 0;
    }
    if (diskRef.current) {
      diskRef.current.rotation.z += dt * 0.12;
    }
    if (groupRef.current) {
      // As we zoom in, the black hole slowly tilts to reveal the disk edge-on
      const z = zoomRef.current ?? 0;
      groupRef.current.rotation.x = Math.PI * 0.15 - z * 0.5;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Accretion disk — big flat ring with a fragment shader */}
      <mesh ref={diskRef} rotation={[Math.PI * 0.42, 0, 0]} onClick={() => playVortex()}>
        <ringGeometry args={[1.3, 5.0, 256, 4]} />
        <shaderMaterial
          ref={diskMatRef}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
          vertexShader={`
            varying vec2 vUv;
            varying vec3 vPos;
            void main() {
              vUv = uv;
              vPos = position;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `}
          fragmentShader={`
            precision highp float;
            varying vec2 vUv;
            varying vec3 vPos;
            uniform float uTime;
            uniform float uZoom;

            // Hash for noise
            float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
            float noise(vec2 p){
              vec2 i = floor(p), f = fract(p);
              vec2 u = f*f*(3.0-2.0*f);
              return mix(mix(hash(i), hash(i+vec2(1,0)), u.x),
                         mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y);
            }
            float fbm(vec2 p){
              float v = 0.0, a = 0.5;
              for (int i = 0; i < 4; i++) { v += a*noise(p); p *= 2.03; a *= 0.5; }
              return v;
            }

            void main() {
              float r = length(vPos.xy);
              float a = atan(vPos.y, vPos.x);
              // Rotation-warped uvs for a swirl look
              float rot = a - uTime * 1.6 + r * 1.4;
              vec2 nUv = vec2(rot * 1.8, r * 3.0);
              float turb = fbm(nUv + uTime * 0.15);
              turb = pow(turb, 1.3);

              // Doppler-boost — one side of the disk is bright, opposite side darker
              float doppler = 0.55 + 0.55 * sin(a + uTime * 0.25);

              // Temperature falloff — inner edge white-hot, outer edge magenta
              float t = smoothstep(5.0, 1.3, r);
              vec3 hot   = vec3(1.0, 0.95, 0.85);
              vec3 mid   = vec3(1.0, 0.55, 0.15);
              vec3 cool  = vec3(0.85, 0.30, 0.95);
              vec3 col = mix(cool, mix(mid, hot, t * t), t);
              col *= (0.55 + 0.85 * turb) * doppler;

              // Fade edges softly
              float edgeIn  = smoothstep(1.3, 1.55, r);
              float edgeOut = 1.0 - smoothstep(4.3, 5.0, r);
              float alpha = edgeIn * edgeOut * (0.6 + 0.65 * turb) * doppler;
              // As we zoom in, the disk fades so we can see the inside
              alpha *= (1.0 - uZoom * 0.85);
              gl_FragColor = vec4(col, alpha);
            }
          `}
        />
      </mesh>

      {/* Event horizon — pitch-black sphere */}
      <mesh ref={horizonRef}>
        <sphereGeometry args={[1.15, 64, 32]} />
        <meshBasicMaterial color="#000000" />
      </mesh>

      {/* Photon ring — thin bright ring right at the Schwarzschild boundary */}
      <mesh ref={photonRingRef} rotation={[Math.PI * 0.42, 0, 0]}>
        <ringGeometry args={[1.16, 1.24, 128]} />
        <meshBasicMaterial
          color="#c9e6ff"
          transparent
          opacity={0.9}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Second perpendicular photon ring — gives that "Interstellar" halo */}
      <mesh rotation={[0, 0, 0]}>
        <torusGeometry args={[1.2, 0.02, 12, 128]} />
        <meshBasicMaterial
          color="#e0f2ff"
          transparent
          opacity={0.55}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

/* ────────────────────── Inner Cosmos ──────────────────────
 * A collection of AI-model "planets" clustered inside the event horizon.
 * Only rendered when zoom > 0.5. Each planet is a small emissive sphere with
 * a shader ring and its own hue. They orbit a central sun that represents
 * the "Singularity" master AI (unlocked via hidden button).
 */
export type PlanetSnapshot = {
  pos: THREE.Vector3;
  hue: number;
  provider: string;
  modality: string[];
  visible: boolean;
  size: number;
};

type PlanetProps = {
  model: (typeof MODELS)[number];
  index: number;
  visible: boolean;
  onClick: () => void;
  /** Ref array; each planet writes its live world position + metadata into
   *  slot `index` on every frame. Sibling components (gravity wells,
   *  constellation lines) read from this. */
  snapshots: React.MutableRefObject<PlanetSnapshot[]>;
};

function Planet({ model, index, visible, onClick, snapshots }: PlanetProps) {
  const ref = useRef<THREE.Group>(null!);
  const meshRef = useRef<THREE.Mesh>(null!);
  const ringRef = useRef<THREE.Mesh>(null!);
  const N = MODELS.length;
  const goldenAngle = 2.399963;

  const { orbitR, orbitTilt, phase, hue, size } = useMemo(() => {
    const t = index / N;
    const orbitR = 2.6 + t * 3.4;
    const orbitTilt = (index * 37) % 90;
    const phase = index * goldenAngle;
    const hueMap: Record<string, number> = {
      Google: 210,
      OpenAI: 145,
      ByteDance: 15,
      Runway: 285,
    };
    const hue = hueMap[model.provider] ?? 320;
    const size = 0.18 + Math.min(0.32, model.credits / 40);
    return { orbitR, orbitTilt, phase, hue, size };
  }, [index, N, model.provider, model.credits]);

  const color = useMemo(() => new THREE.Color().setHSL(hue / 360, 0.85, 0.6), [hue]);

  useFrame((state, dt) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime * 0.12 + phase;
    const tiltR = (orbitTilt * Math.PI) / 180;
    ref.current.position.x = Math.cos(t) * orbitR * Math.cos(tiltR);
    ref.current.position.y = Math.sin(t) * orbitR * 0.55;
    ref.current.position.z = Math.sin(t) * orbitR * Math.sin(tiltR);
    if (meshRef.current) meshRef.current.rotation.y += dt * 0.5;
    if (ringRef.current) ringRef.current.rotation.z += dt * 0.15;
    const target = visible ? 1 : 0;
    const cur = ref.current.scale.x;
    const next = cur + (target - cur) * dt * 3.5;
    ref.current.scale.setScalar(Math.max(0.001, next));

    // Publish snapshot for gravity wells + constellation lines to consume
    if (!snapshots.current[index]) {
      snapshots.current[index] = {
        pos: new THREE.Vector3(),
        hue,
        provider: model.provider,
        modality: model.modality as string[],
        visible,
        size,
      };
    }
    const snap = snapshots.current[index];
    snap.pos.copy(ref.current.position);
    snap.visible = visible && next > 0.6;
  });

  return (
    <group ref={ref} scale={0.001}>
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          playClick();
          sfxPlanetPing(hue, 0);
          onClick();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "none";
        }}
      >
        <sphereGeometry args={[size, 32, 24]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.55}
          roughness={0.35}
          metalness={0.4}
        />
      </mesh>
      {/* Saturn-style ring */}
      <mesh ref={ringRef} rotation={[Math.PI * 0.42, 0, 0]}>
        <ringGeometry args={[size * 1.4, size * 2.1, 48]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.35}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Point-light so nearby space is lit */}
      <pointLight color={color} intensity={0.6} distance={3.5} />
      {/* Floating label on hover-close range */}
      <Html distanceFactor={8} position={[0, size + 0.25, 0]} style={{ pointerEvents: "none" }}>
        <div
          style={{
            fontFamily: "ui-monospace, Consolas, monospace",
            fontSize: 10,
            color: `hsl(${hue}, 95%, 78%)`,
            textShadow: "0 2px 6px rgba(0,0,0,0.9)",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
          }}
        >
          {model.name}
        </div>
      </Html>
    </group>
  );
}

function CentralSingularity({
  visible,
  unlocked,
  onClick,
}: {
  visible: boolean;
  unlocked: boolean;
  onClick: () => void;
}) {
  const ref = useRef<THREE.Mesh>(null!);
  const matRef = useRef<THREE.ShaderMaterial>(null!);
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uUnlocked: { value: 0 } }), []);
  useFrame((state, dt) => {
    if (matRef.current) {
      matRef.current.uniforms.uTime.value += dt;
      matRef.current.uniforms.uUnlocked.value +=
        ((unlocked ? 1 : 0) - matRef.current.uniforms.uUnlocked.value) * dt * 2;
    }
    if (ref.current) {
      const target = visible ? 1 : 0;
      const cur = ref.current.scale.x;
      const next = cur + (target - cur) * dt * 3;
      ref.current.scale.setScalar(Math.max(0.001, next));
      ref.current.rotation.y += dt * 0.3;
    }
  });

  return (
    <mesh
      ref={ref}
      scale={0.001}
      onClick={(e) => {
        e.stopPropagation();
        playClick();
        onClick();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "none";
      }}
    >
      <sphereGeometry args={[0.55, 64, 32]} />
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        vertexShader={`
          varying vec3 vNormal;
          varying vec3 vPos;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            vPos = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform float uTime;
          uniform float uUnlocked;
          varying vec3 vNormal;
          varying vec3 vPos;
          void main() {
            float rim = pow(1.0 - abs(vNormal.z), 1.6);
            vec3 base = mix(vec3(0.0, 0.95, 1.0), vec3(0.75, 0.35, 1.0), rim);
            vec3 hot = mix(vec3(1.0, 0.4, 0.85), vec3(1.0), sin(uTime * 3.0) * 0.5 + 0.5);
            vec3 col = mix(base, hot, uUnlocked);
            float pulse = 0.6 + 0.4 * sin(uTime * (2.0 + uUnlocked * 3.0));
            col += vec3(1.0) * pulse * 0.15;
            gl_FragColor = vec4(col, rim * (0.75 + uUnlocked * 0.25));
          }
        `}
      />
    </mesh>
  );
}

/* ────────────────────── Gravity Well Star Field ──────────────────────
 * A field of stars distributed on a big sphere shell around the interior.
 * Each star's rendered position is displaced toward the nearest planet based
 * on inverse-square distance — the stars appear to "bend" around each planet,
 * creating a real gravity-well effect. Stars behind planets (from the
 * camera's view) get subtly bent aside like the classic Interstellar shot.
 */
function GravityWellStars({
  snapshots,
  visible,
}: {
  snapshots: React.MutableRefObject<PlanetSnapshot[]>;
  visible: boolean;
}) {
  const ptsRef = useRef<THREE.Points>(null!);
  const count = 900;
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // Uniform spherical distribution using Fibonacci lattice
      const phi = Math.acos(1 - (2 * (i + 0.5)) / count);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      const r = 8 + Math.random() * 4;
      arr[i * 3] = r * Math.cos(theta) * Math.sin(phi);
      arr[i * 3 + 1] = r * Math.sin(theta) * Math.sin(phi);
      arr[i * 3 + 2] = r * Math.cos(phi);
    }
    g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    g.setAttribute("original", new THREE.BufferAttribute(arr.slice(), 3));
    return g;
  }, []);
  const matRef = useRef<THREE.PointsMaterial>(null!);
  useFrame(() => {
    if (!ptsRef.current) return;
    const posAttr = ptsRef.current.geometry.attributes.position as THREE.BufferAttribute;
    const origAttr = ptsRef.current.geometry.attributes.original as THREE.BufferAttribute;
    const planets = snapshots.current.filter((s) => s?.visible);
    const tmp = new THREE.Vector3();
    const disp = new THREE.Vector3();
    for (let i = 0; i < count; i++) {
      tmp.set(origAttr.getX(i), origAttr.getY(i), origAttr.getZ(i));
      disp.set(0, 0, 0);
      // Sum inverse-square pull from every visible planet
      for (const p of planets) {
        const dx = p.pos.x - tmp.x;
        const dy = p.pos.y - tmp.y;
        const dz = p.pos.z - tmp.z;
        const r2 = dx * dx + dy * dy + dz * dz;
        if (r2 < 0.001) continue;
        // Pull toward planet; scale by mass proxy (size²)
        const pull = (p.size * p.size) / (r2 * r2 + 0.02);
        // clamp to avoid singularities near planets
        const clamped = Math.min(pull, 0.5);
        disp.x += dx * clamped;
        disp.y += dy * clamped;
        disp.z += dz * clamped;
      }
      posAttr.setXYZ(i, tmp.x + disp.x, tmp.y + disp.y, tmp.z + disp.z);
    }
    posAttr.needsUpdate = true;
    if (matRef.current) {
      matRef.current.opacity = visible ? 0.9 : 0;
    }
  });

  return (
    <points ref={ptsRef} geometry={geo}>
      <pointsMaterial
        ref={matRef}
        size={0.06}
        sizeAttenuation
        color="#eaf3ff"
        transparent
        opacity={0}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/* ────────────────────── Provider Constellation Lines ──────────────────────
 * Draws thin fading lines between planets that share a provider — connections
 * that reveal the shape of each AI "family" inside the multiverse. Refreshes
 * lazily (every ~200ms) so we don't rebuild geometry every frame.
 */
function ProviderConstellation({
  snapshots,
  visible,
}: {
  snapshots: React.MutableRefObject<PlanetSnapshot[]>;
  visible: boolean;
}) {
  const [pairs, setPairs] = useState<
    Array<{ from: THREE.Vector3; to: THREE.Vector3; color: string }>
  >([]);

  useFrame(({ clock }) => {
    // Only rebuild every 200ms
    if ((clock.elapsedTime * 5) % 1 > 0.05) return;
    if (!visible) {
      if (pairs.length) setPairs([]);
      return;
    }
    const groups: Record<string, PlanetSnapshot[]> = {};
    for (const s of snapshots.current) {
      if (!s?.visible) continue;
      (groups[s.provider] ??= []).push(s);
    }
    const next: typeof pairs = [];
    for (const [prov, arr] of Object.entries(groups)) {
      if (arr.length < 2) continue;
      // Connect each planet only to its nearest sibling (keeps it uncluttered)
      for (let i = 0; i < arr.length; i++) {
        let nearest = -1;
        let best = Infinity;
        for (let j = 0; j < arr.length; j++) {
          if (i === j) continue;
          const d = arr[i].pos.distanceTo(arr[j].pos);
          if (d < best) {
            best = d;
            nearest = j;
          }
        }
        if (nearest >= 0 && nearest > i) {
          next.push({
            from: arr[i].pos.clone(),
            to: arr[nearest].pos.clone(),
            color: `hsl(${arr[0].hue}, 90%, 70%)`,
          });
        }
      }
      void prov;
    }
    setPairs(next);
  });

  if (!visible || pairs.length === 0) return null;
  return (
    <>
      {pairs.map((p, i) => (
        <Line
          key={i}
          points={[p.from, p.to]}
          color={p.color}
          lineWidth={0.8}
          transparent
          opacity={0.35}
          dashed={false}
        />
      ))}
    </>
  );
}

/* ────────────────────── Meteor Shower ──────────────────────
 * Spawns short-lived arc meteors when the user clicks empty space inside the
 * horizon. Each meteor is a growing line that fades — pure R3F geometry
 * updated per frame. Managed via a global window event dispatched from the
 * page component so the click handler doesn't have to live on this mesh.
 */
type Meteor = {
  id: number;
  start: THREE.Vector3;
  dir: THREE.Vector3;
  life: number;
  hue: number;
  speed: number;
};

function MeteorShower({ meteorsRef }: { meteorsRef: React.MutableRefObject<Meteor[]> }) {
  const groupRef = useRef<THREE.Group>(null!);
  const [, force] = useState(0);

  useFrame((_s, dt) => {
    const arr = meteorsRef.current;
    let changed = false;
    for (let i = arr.length - 1; i >= 0; i--) {
      arr[i].life -= dt * 0.9;
      if (arr[i].life <= 0) {
        arr.splice(i, 1);
        changed = true;
      }
    }
    if (changed) force((v) => v + 1);
  });

  return (
    <group ref={groupRef}>
      {meteorsRef.current.map((m) => {
        const len = 1.2 + (1 - m.life) * 5 * m.speed;
        const tip = m.start.clone().add(m.dir.clone().multiplyScalar(len));
        const tail = m.start.clone().add(m.dir.clone().multiplyScalar(Math.max(0, len - 1.6)));
        return (
          <Line
            key={m.id}
            points={[tail, tip]}
            color={`hsl(${m.hue}, 100%, 78%)`}
            lineWidth={1.6}
            transparent
            opacity={Math.max(0, m.life)}
          />
        );
      })}
    </group>
  );
}

/* ────────────────────── Secret Galaxy Clusters ──────────────────────
 * Three hidden model-family clusters distributed at specific yaw/pitch
 * angles the user must "find" by orbiting. Each cluster is a swirl of tiny
 * distant lights + a discreet name label. They become discoverable when the
 * camera looks within ~0.6 radians of their coordinates. On first discovery
 * they trigger a soft chime + reveal in the HUD.
 */
type SecretGalaxy = {
  id: string;
  name: string;
  hue: number;
  yaw: number;
  pitch: number;
  size: number;
};

const SECRET_GALAXIES: SecretGalaxy[] = [
  { id: "vision", name: "Vision Cluster", hue: 320, yaw: 2.4, pitch: 0.6, size: 1.4 },
  { id: "code", name: "Code Cluster", hue: 145, yaw: -1.3, pitch: -0.5, size: 1.2 },
  { id: "cinema", name: "Cinema Cluster", hue: 285, yaw: 0.1, pitch: -0.9, size: 1.6 },
];

function SecretGalaxies({
  yawRef,
  pitchRef,
  visible,
  onDiscover,
  discovered,
}: {
  yawRef: React.RefObject<number>;
  pitchRef: React.RefObject<number>;
  visible: boolean;
  onDiscover: (g: SecretGalaxy) => void;
  discovered: Set<string>;
}) {
  const groups = useRef<Record<string, THREE.Group | null>>({});

  useFrame(() => {
    if (!visible) return;
    const yaw = yawRef.current ?? 0;
    const pitch = pitchRef.current ?? 0;
    for (const g of SECRET_GALAXIES) {
      const dy = ((yaw - g.yaw + Math.PI) % (Math.PI * 2)) - Math.PI;
      const dp = pitch - g.pitch;
      const dist = Math.hypot(dy, dp);
      if (dist < 0.5 && !discovered.has(g.id)) {
        onDiscover(g);
      }
      const grp = groups.current[g.id];
      if (grp) {
        // Slow rotation for visual life
        grp.rotation.y += 0.002;
      }
    }
  });

  // Distribute each galaxy at its designated yaw/pitch on a large radius
  return (
    <group>
      {SECRET_GALAXIES.map((g) => {
        // World-space position from spherical (yaw, pitch)
        const R = 10;
        const x = Math.sin(g.yaw) * R * Math.cos(g.pitch);
        const y = Math.sin(g.pitch) * R;
        const z = Math.cos(g.yaw) * R * Math.cos(g.pitch);
        const stars = 60;
        const positions = new Float32Array(stars * 3);
        for (let i = 0; i < stars; i++) {
          const r = Math.random() * g.size;
          const a = Math.random() * Math.PI * 2;
          const b = (Math.random() - 0.5) * 0.5;
          positions[i * 3] = Math.cos(a) * r;
          positions[i * 3 + 1] = b;
          positions[i * 3 + 2] = Math.sin(a) * r;
        }
        const isDiscovered = discovered.has(g.id);
        return (
          <group
            key={g.id}
            ref={(el) => {
              groups.current[g.id] = el;
            }}
            position={[x, y, z]}
          >
            <points>
              <bufferGeometry>
                <bufferAttribute attach="attributes-position" args={[positions, 3]} />
              </bufferGeometry>
              <pointsMaterial
                size={isDiscovered ? 0.07 : 0.04}
                color={new THREE.Color().setHSL(g.hue / 360, 0.9, 0.7)}
                transparent
                opacity={visible ? (isDiscovered ? 0.95 : 0.55) : 0}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
                sizeAttenuation
              />
            </points>
            {/* soft halo */}
            <mesh>
              <sphereGeometry args={[g.size * 0.6, 20, 12]} />
              <meshBasicMaterial
                color={new THREE.Color().setHSL(g.hue / 360, 0.9, 0.6)}
                transparent
                opacity={visible ? (isDiscovered ? 0.14 : 0.06) : 0}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
              />
            </mesh>
            {isDiscovered && visible && (
              <Html center distanceFactor={10} style={{ pointerEvents: "none" }}>
                <div
                  style={{
                    fontFamily: "Orbitron, sans-serif",
                    fontSize: 11,
                    color: `hsl(${g.hue}, 95%, 82%)`,
                    letterSpacing: "0.3em",
                    textTransform: "uppercase",
                    textShadow: "0 2px 8px rgba(0,0,0,0.9)",
                    whiteSpace: "nowrap",
                    padding: "4px 10px",
                    borderRadius: 9999,
                    background: "rgba(11,16,26,0.7)",
                    border: `1px solid hsla(${g.hue}, 95%, 70%, 0.4)`,
                  }}
                >
                  ✦ {g.name}
                </div>
              </Html>
            )}
          </group>
        );
      })}
    </group>
  );
}

/* ────────────────────── Camera controller ────────────────────── */
function CameraRig({
  zoomRef,
  yawRef,
  pitchRef,
}: {
  zoomRef: React.RefObject<number>;
  yawRef: React.RefObject<number>;
  pitchRef: React.RefObject<number>;
}) {
  const { camera } = useThree();
  useFrame(() => {
    const z = zoomRef.current ?? 0;
    // z ranges 0..1 — camera pulls from 12 units → 2 units (past horizon)
    const r = 12 - z * 10;
    const yaw = yawRef.current ?? 0;
    const pitch = pitchRef.current ?? 0;
    camera.position.x = Math.sin(yaw) * r * Math.cos(pitch);
    camera.position.z = Math.cos(yaw) * r * Math.cos(pitch);
    camera.position.y = Math.sin(pitch) * r;
    camera.lookAt(0, 0, 0);
  });
  return null;
}

/* ────────────────────── The main page ────────────────────── */

function MultiversePage() {
  const navigate = useNavigate();

  // Shared refs consumed by camera + shaders (avoid re-renders on every frame)
  const zoomRef = useRef(0);
  const yawRef = useRef(0);
  const pitchRef = useRef(0);
  const lensStrengthRef = useRef(1);
  const einsteinRef = useRef(0.18);

  // Planet snapshots — filled by <Planet> children each frame, read by
  // gravity wells + constellation lines + meteor shower.
  const snapshotsRef = useRef<PlanetSnapshot[]>([]);
  // Meteor list — mutated by click handler; drained by <MeteorShower>.
  const meteorsRef = useRef<Meteor[]>([]);
  const meteorIdRef = useRef(0);

  // React state — sampled from refs on a 10Hz interval for the HUD
  const [zoom, setZoom] = useState(0);
  const [selected, setSelected] = useState<(typeof MODELS)[number] | null>(null);
  const [singularityOpen, setSingularityOpen] = useState(false);
  const [singularityUnlocked, setSingularityUnlocked] = useState(false);
  const [showHint, setShowHint] = useState(true);
  const [discovered, setDiscovered] = useState<Set<string>>(new Set());
  const [discoveredToast, setDiscoveredToast] = useState<SecretGalaxy | null>(null);
  const horizonCrossedRef = useRef(false);

  // Interaction — drag orbit, scroll zoom (page-local, not global)
  useEffect(() => {
    const state = { drag: false, lx: 0, ly: 0 };
    const onDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest("button, a, input, textarea, [data-nozoom]")) return;
      state.drag = true;
      state.lx = e.clientX;
      state.ly = e.clientY;
    };
    const onMove = (e: PointerEvent) => {
      if (!state.drag) return;
      const dx = (e.clientX - state.lx) / window.innerWidth;
      const dy = (e.clientY - state.ly) / window.innerHeight;
      state.lx = e.clientX;
      state.ly = e.clientY;
      yawRef.current += dx * 2.2;
      pitchRef.current = Math.max(-1.1, Math.min(1.1, pitchRef.current + dy * 1.6));
    };
    const onUp = () => {
      state.drag = false;
    };
    const onWheel = (e: WheelEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest("[data-nozoom], input, textarea")) return;
      e.preventDefault();
      const prev = zoomRef.current;
      zoomRef.current = Math.max(0, Math.min(1, zoomRef.current - e.deltaY * 0.0009));
      lensStrengthRef.current = 1 + zoomRef.current * 2.4;
      einsteinRef.current = 0.18 - zoomRef.current * 0.12;
      // ── Horizon crossing SFX: sub-bass whoomph when we pass 0.55 either way
      const crossedIn = prev < 0.55 && zoomRef.current >= 0.55;
      const crossedOut = prev >= 0.55 && zoomRef.current < 0.55;
      if ((crossedIn || crossedOut) && !horizonCrossedRef.current) {
        horizonCrossedRef.current = true;
        playHorizonWhoomph();
        setTimeout(() => (horizonCrossedRef.current = false), 900);
      }
    };
    // ── Meteor spawn on empty-space click (only inside horizon)
    const onEmptyClick = (e: MouseEvent) => {
      if (zoomRef.current < 0.55) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest("button, a, input, textarea, .info-panel, [data-nozoom]")) return;
      // Spawn a meteor at a random angle around the origin, aimed outward
      const angle = Math.random() * Math.PI * 2;
      const tilt = (Math.random() - 0.5) * 0.9;
      const start = new THREE.Vector3(Math.cos(angle) * 3, Math.sin(tilt) * 3, Math.sin(angle) * 3);
      const dir = new THREE.Vector3(
        Math.cos(angle + Math.PI / 2),
        Math.sin(tilt * 0.5),
        Math.sin(angle + Math.PI / 2),
      ).normalize();
      meteorsRef.current.push({
        id: ++meteorIdRef.current,
        start,
        dir,
        life: 1,
        hue: 180 + Math.random() * 120,
        speed: 0.8 + Math.random() * 0.6,
      });
      if (meteorsRef.current.length > 12) meteorsRef.current = meteorsRef.current.slice(-12);
      // Sound: pan based on screen X
      const pan = (e.clientX / window.innerWidth) * 2 - 1;
      playMeteor(pan);
    };
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("click", onEmptyClick);

    // Sample refs into state for HUD readouts
    const tick = setInterval(() => setZoom(zoomRef.current), 100);
    // Auto-dismiss hint on first interaction
    const dismiss = () => setShowHint(false);
    window.addEventListener("wheel", dismiss, { once: true });
    window.addEventListener("pointerdown", dismiss, { once: true });

    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("wheel", dismiss);
      window.removeEventListener("pointerdown", dismiss);
      window.removeEventListener("click", onEmptyClick);
      clearInterval(tick);
    };
  }, []);

  const insideHorizon = zoom > 0.55;

  return (
    <div
      className="relative -mx-24 -my-10 min-h-screen overflow-hidden"
      style={{ background: "#02040a" }}
    >
      {/* Return */}
      <button
        onClick={() => {
          playClick();
          navigate({ to: "/home" });
        }}
        className="absolute top-24 left-8 z-30 rounded-full glass-panel px-4 py-2 text-xs uppercase tracking-widest text-[#E0F7FA]/80 hover:text-[#00F2FF] hover:border-[#00F2FF]/50 flex items-center gap-2 transition"
        data-nozoom
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Portal
      </button>

      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.2 }}
        className="absolute top-24 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 pointer-events-none"
      >
        <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 glass-panel">
          <span
            className="inline-block w-1.5 h-1.5 rounded-full bg-[#00F2FF]"
            style={{
              boxShadow: `0 0 ${6 + zoom * 40}px ${2 + zoom * 4}px rgba(0,242,255,0.8)`,
              animation: "ambientPulse 2s ease-in-out infinite",
            }}
          />
          <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#00F2FF]/80">
            Multiverse · {insideHorizon ? "Interior" : "Approach"}
          </p>
        </div>
        <h1
          className="text-3xl md:text-4xl text-[#E0F7FA]"
          style={{
            fontFamily: "var(--font-display)",
            textShadow:
              "-1px 0 rgba(0,242,255,0.35), 1px 0 rgba(236,72,153,0.25), 0 0 24px rgba(120,180,255,0.35)",
          }}
        >
          {insideHorizon ? "One brain. All models." : "Fall into the singularity."}
        </h1>
      </motion.div>

      {/* Ominous vignette that intensifies as we approach */}
      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          background: `radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,${0.55 + zoom * 0.35}) 100%)`,
          transition: "background 0.4s ease",
        }}
        aria-hidden
      />

      {/* Zoom indicator + secret-galaxies counter */}
      <div
        className="absolute bottom-8 left-8 z-30 flex flex-col gap-2 pointer-events-none"
        data-nozoom
      >
        <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-[#E0F7FA]/50">
          Zoom · {Math.round(zoom * 100)}%
        </p>
        <div className="h-1 w-40 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: `${zoom * 100}%`,
              background:
                "linear-gradient(90deg, rgba(0,242,255,0.9), rgba(124,58,237,0.9), rgba(236,72,153,0.9))",
              boxShadow: "0 0 10px rgba(0,242,255,0.6)",
              transition: "width 0.2s ease",
            }}
          />
        </div>
        {insideHorizon && (
          <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.3em] text-[#E0F7FA]/50 flex items-center gap-1.5">
            <Compass className="w-3 h-3 text-[#00F2FF]/70" />
            Clusters · {discovered.size} / {SECRET_GALAXIES.length}
          </p>
        )}
      </div>

      {/* Interaction hint */}
      <AnimatePresence>
        {showHint && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, delay: 1 }}
            className="pointer-events-none absolute inset-x-0 bottom-24 z-30 flex justify-center"
          >
            <div className="glass-panel px-5 py-2 rounded-full text-[11px] font-mono uppercase tracking-widest text-[#E0F7FA]/80 flex gap-4">
              <span>⌖ DRAG · ORBIT</span>
              <span className="text-[#00F2FF]/60">·</span>
              <span>SCROLL · ZOOM IN</span>
              {insideHorizon && (
                <>
                  <span className="text-[#00F2FF]/60">·</span>
                  <span>CLICK PLANETS · CLICK VOID = METEOR</span>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Discovered-galaxy toast */}
      <AnimatePresence>
        {discoveredToast && (
          <motion.div
            key={discoveredToast.id}
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-none absolute top-40 left-1/2 -translate-x-1/2 z-30"
          >
            <div
              className="glass-panel-strong rounded-full px-5 py-2.5 flex items-center gap-3"
              style={{
                boxShadow: `0 0 40px hsla(${discoveredToast.hue}, 95%, 65%, 0.6), 0 10px 40px -10px rgba(0,0,0,0.6)`,
                border: `1px solid hsla(${discoveredToast.hue}, 95%, 65%, 0.5)`,
              }}
            >
              <Compass
                className="w-4 h-4"
                style={{
                  color: `hsl(${discoveredToast.hue}, 95%, 78%)`,
                  filter: `drop-shadow(0 0 8px hsla(${discoveredToast.hue}, 95%, 70%, 0.95))`,
                }}
              />
              <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#00F2FF]/80">
                Discovered
              </span>
              <span
                className="text-sm"
                style={{
                  fontFamily: "var(--font-display)",
                  color: `hsl(${discoveredToast.hue}, 95%, 82%)`,
                }}
              >
                {discoveredToast.name}
              </span>
              <span className="font-mono text-[10px] text-[#E0F7FA]/50">
                {discovered.size} / {SECRET_GALAXIES.length}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* The 3D canvas */}
      <div className="absolute inset-0 z-0" style={{ cursor: "grab" }}>
        <Canvas
          camera={{ position: [0, 0, 12], fov: 55, near: 0.05, far: 200 }}
          gl={{ antialias: true, powerPreference: "high-performance" }}
          dpr={[1, 1.75]}
        >
          <color attach="background" args={["#02040a"]} />
          <ambientLight intensity={0.25} />
          <pointLight position={[0, 0, 0]} intensity={2.5} color="#ffaa60" distance={12} />
          <Stars radius={140} depth={60} count={3500} factor={4} saturation={0} fade speed={0.4} />
          <Suspense fallback={null}>
            <CameraRig zoomRef={zoomRef} yawRef={yawRef} pitchRef={pitchRef} />
            <BlackHole zoomRef={zoomRef} />
            {/* Inner cosmos — planets appear as we zoom past horizon */}
            {MODELS.map((m, i) => (
              <Planet
                key={m.id}
                model={m}
                index={i}
                visible={insideHorizon}
                onClick={() => setSelected(m)}
                snapshots={snapshotsRef}
              />
            ))}
            {/* Gravity wells bend the interior star field around each planet */}
            <GravityWellStars snapshots={snapshotsRef} visible={insideHorizon} />
            {/* Constellation lines between planets of the same provider */}
            <ProviderConstellation snapshots={snapshotsRef} visible={insideHorizon} />
            {/* Meteor shower — populated by empty-space clicks */}
            <MeteorShower meteorsRef={meteorsRef} />
            {/* Secret galaxies — must be found by orbiting to hidden angles */}
            <SecretGalaxies
              yawRef={yawRef}
              pitchRef={pitchRef}
              visible={insideHorizon}
              discovered={discovered}
              onDiscover={(g) => {
                if (discovered.has(g.id)) return;
                setDiscovered((prev) => {
                  const n = new Set(prev);
                  n.add(g.id);
                  return n;
                });
                setDiscoveredToast(g);
                setTimeout(() => setDiscoveredToast(null), 4000);
                playVortex();
              }}
            />
            <CentralSingularity
              visible={insideHorizon}
              unlocked={singularityUnlocked}
              onClick={() => setSingularityOpen(true)}
            />
            <EffectComposer multisampling={0}>
              <MultiverseLensPass strengthRef={lensStrengthRef} einsteinRef={einsteinRef} />
              <Bloom
                intensity={1.5}
                luminanceThreshold={0.18}
                luminanceSmoothing={0.7}
                mipmapBlur
              />
              <ChromaticAberration
                offset={[0.002, 0.0025] as unknown as THREE.Vector2}
                blendFunction={BlendFunction.NORMAL}
                radialModulation={false}
                modulationOffset={0}
              />
              <Vignette eskil={false} offset={0.1} darkness={0.92} />
            </EffectComposer>
          </Suspense>
        </Canvas>
      </div>

      {/* Hidden singularity trigger — a tiny "black hole" pixel at the bottom
          of the page that unlocks the Singularity when clicked (or reveals a
          more distorted Master AI). */}
      <button
        onClick={() => {
          setSingularityUnlocked(true);
          setSingularityOpen(true);
          playVortex();
        }}
        aria-label="Reveal the singularity"
        title="…"
        className="absolute z-40 rounded-full hover:opacity-100 opacity-30 transition-opacity"
        data-nozoom
        style={{
          bottom: 10,
          left: "50%",
          transform: "translateX(-50%)",
          width: 14,
          height: 14,
          background:
            "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 55%, rgba(120,60,220,0.5) 70%, rgba(0,242,255,0.4) 85%, transparent 100%)",
          boxShadow: "0 0 8px 2px rgba(0,242,255,0.4), 0 0 20px 4px rgba(124,58,237,0.3)",
        }}
      />

      {/* Selected planet info panel */}
      <AnimatePresence>
        {selected && (
          <motion.div
            key={selected.id}
            initial={{ opacity: 0, x: 40, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.96 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="absolute top-40 right-8 z-30 w-80 glass-panel-strong rounded-3xl p-5 tilt-3d"
            data-nozoom
            style={{
              boxShadow:
                "0 30px 80px -20px rgba(0,242,255,0.35), 0 20px 60px -20px rgba(124,58,237,0.35)",
            }}
          >
            <div className="flex justify-between items-start gap-3">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-widest text-[#00F2FF]/70">
                  {selected.provider}
                </p>
                <h3
                  className="mt-1 text-xl text-[#E0F7FA]"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {selected.name}
                </h3>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-[#E0F7FA]/60 hover:text-[#00F2FF]"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {selected.desc && (
              <p className="mt-3 text-xs text-[#E0F7FA]/75 leading-relaxed">{selected.desc}</p>
            )}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <InfoStat
                icon={<Zap className="w-3 h-3" />}
                label="Cost"
                value={selected.tier === "hosted" ? `${selected.credits} cr` : "Free"}
              />
              <InfoStat
                icon={<Sparkles className="w-3 h-3" />}
                label="Tier"
                value={selected.tier}
              />
            </div>
            <div className="mt-4">
              <p className="mb-2 font-mono text-[9px] uppercase tracking-widest text-[#E0F7FA]/50">
                Modalities
              </p>
              <div className="flex flex-wrap gap-1.5">
                {selected.modality.map((m) => (
                  <span
                    key={m}
                    className="rounded-full glass-panel px-2 py-0.5 text-[10px] font-mono text-[#E0F7FA]/80"
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>
            {selected.requiresKey && (
              <p className="mt-4 text-[10px] font-mono text-amber-300/80">
                ⚠ Requires <code>{selected.requiresKey}</code>
              </p>
            )}
            <button
              onClick={() => {
                setSelected(null);
                navigate({ to: "/chat" });
              }}
              className="mt-5 w-full rounded-full portal-tab active py-2.5 text-xs uppercase tracking-widest text-[#00F2FF]"
              style={{
                boxShadow: "inset 0 0 30px rgba(0,242,255,0.25), 0 0 30px rgba(0,242,255,0.35)",
              }}
            >
              ▸ Talk to {selected.name.split(" ")[0]}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Singularity dialog */}
      <AnimatePresence>
        {singularityOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-xl px-4"
            onClick={() => setSingularityOpen(false)}
            data-nozoom
          >
            <motion.div
              initial={{ scale: 0.6, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.6, y: 20 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="max-w-lg glass-panel-strong rounded-3xl p-8 relative overflow-hidden lens-warp-strong"
              style={{
                boxShadow:
                  "0 40px 120px -30px rgba(0,242,255,0.5), 0 20px 80px -20px rgba(236,72,153,0.4), 0 0 60px rgba(124,58,237,0.4)",
              }}
            >
              <div className="flex justify-center mb-4">
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center"
                  style={{
                    background:
                      "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 45%, rgba(124,58,237,0.7) 60%, rgba(0,242,255,0.6) 80%, transparent 100%)",
                    boxShadow:
                      "0 0 40px 8px rgba(0,242,255,0.6), 0 0 80px 16px rgba(124,58,237,0.4)",
                    animation: "singularitySpin 8s linear infinite",
                  }}
                >
                  <Brain className="w-8 h-8 text-white/95" strokeWidth={1.4} />
                </div>
              </div>
              <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#00F2FF]/70 text-center">
                Singularity · MASTER AI
              </p>
              <h2
                className="mt-2 text-center text-3xl text-[#E0F7FA]"
                style={{
                  fontFamily: "var(--font-display)",
                  textShadow:
                    "-1.5px 0 rgba(0,242,255,0.6), 1.5px 0 rgba(236,72,153,0.5), 0 0 40px rgba(120,180,255,0.6)",
                }}
              >
                One brain to rule them all.
              </h2>
              <p className="mt-4 text-sm text-[#E0F7FA]/75 text-center leading-relaxed">
                The Singularity draws every model in the multiverse into a single conversation. It
                routes each request to the model best suited for it, blends their outputs, and
                speaks with a unified voice. All models. One consciousness.
              </p>
              <div className="mt-6 flex flex-wrap gap-1.5 justify-center">
                {MODELS.slice(0, 12).map((m) => (
                  <span
                    key={m.id}
                    className="rounded-full glass-panel px-2 py-0.5 text-[9px] font-mono text-[#E0F7FA]/75"
                  >
                    {m.name}
                  </span>
                ))}
                <span className="rounded-full glass-panel px-2 py-0.5 text-[9px] font-mono text-[#E0F7FA]/60">
                  +{Math.max(0, MODELS.length - 12)} more
                </span>
              </div>
              <div className="mt-6 flex gap-3 justify-center">
                <button
                  onClick={() => {
                    setSingularityOpen(false);
                    navigate({ to: "/singularity" });
                  }}
                  className="rounded-full portal-tab active px-8 py-3 text-xs uppercase tracking-widest text-[#00F2FF]"
                  style={{
                    boxShadow: "inset 0 0 40px rgba(0,242,255,0.35), 0 0 40px rgba(0,242,255,0.5)",
                  }}
                >
                  ▸ Enter Singularity ▸
                </button>
                <button
                  onClick={() => setSingularityOpen(false)}
                  className="rounded-full glass-panel px-6 py-3 text-xs uppercase tracking-widest text-[#E0F7FA]/70 hover:text-[#00F2FF]"
                >
                  Close
                </button>
              </div>
              <p className="mt-4 text-center text-[9px] font-mono text-[#E0F7FA]/40 flex items-center justify-center gap-1">
                <Info className="w-3 h-3" />
                Uncovered by the pinch at page bottom.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function InfoStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="glass-panel rounded-xl px-3 py-2">
      <div className="flex items-center gap-1.5 text-[#00F2FF]/70">
        {icon}
        <span className="font-mono text-[9px] uppercase tracking-widest">{label}</span>
      </div>
      <p className="mt-1 text-sm text-[#E0F7FA]">{value}</p>
    </div>
  );
}
