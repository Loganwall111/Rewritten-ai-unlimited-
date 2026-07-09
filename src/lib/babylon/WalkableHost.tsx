/**
 * WalkableHost — FreeCamera walkable layer on top of the Babylon foundation.
 *
 * Features:
 *   • FreeCamera first-person with optional 3rd-person body (avatar)
 *   • WASD walk, pointer-lock / drag-to-look, Space jump, Shift sprint
 *   • Head-bob while walking
 *   • Terrain-following gravity via a height sampler
 *   • Swim mode (buoyant, Space=up, Shift=dive) when below waterLevel
 *   • cinematic / dayNight / weather options wired to vfx + lifeSystems
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Engine,
  Scene,
  FreeCamera,
  Vector3,
  Color3,
  Color4,
  HemisphericLight,
  DirectionalLight,
  ShadowGenerator,
} from "@babylonjs/core";
import "@babylonjs/core/Materials/standardMaterial";
import "@babylonjs/core/Materials/PBR/pbrMaterial";
import "@babylonjs/core/Helpers/sceneHelpers";
import {
  createAvatar,
  loadSavedAvatar,
  hexToColor3,
  ARCHETYPES,
  DEFAULT_AVATAR_COLORS,
  type AvatarInstance,
} from "./avatar";
import { attachCinematicVfx, type CinematicLevel, type VfxHandles } from "./vfx";
import {
  createDayNightCycle,
  createWeatherController,
  type DayNightCycle,
  type WeatherController,
  type WeatherKind,
} from "./lifeSystems";

export interface WalkableSceneApi {
  engine: Engine;
  scene: Scene;
  camera: FreeCamera;
  /** Register cleanup that runs before the engine disposes. */
  onDispose: (fn: () => void) => void;
  /** Override the ground height sampler (default flat y=0). */
  setHeightSampler: (fn: (x: number, z: number) => number) => void;
  /** Set water surface Y — camera below this enters swim mode. null = no water. */
  setWaterLevel: (y: number | null) => void;
  /** Current player eye position (read-only snapshot). */
  getPlayerPosition: () => Vector3;
  /** Is the player currently swimming? */
  isSwimming: () => boolean;
  dayNight: DayNightCycle | null;
  weather: WeatherController | null;
  avatar: AvatarInstance | null;
}

export interface WalkableHostOptions {
  /** Spawn eye position. */
  spawn?: [number, number, number];
  /** Background clear color. */
  clearColor?: Color4;
  /** Attach HDR env helper. */
  hdr?: boolean;
  ambient?: number;
  sun?: {
    direction?: [number, number, number];
    intensity?: number;
    shadowMapSize?: number;
    shadowFrustum?: number;
  };
  /** Cinematic post-process level. */
  cinematic?: CinematicLevel;
  /** Enable day/night cycle. */
  dayNight?: boolean | { cycleSeconds?: number; phase?: number };
  /** Initial weather. */
  weather?: WeatherKind;
  /** Show 3rd-person body under camera. */
  showAvatar?: boolean;
  /** Eye height above ground. */
  eyeHeight?: number;
  /** Walk / sprint speeds (units/sec). */
  walkSpeed?: number;
  sprintSpeed?: number;
  /** Jump impulse. */
  jumpForce?: number;
  /** Gravity (units/sec²). */
  gravity?: number;
  /** Initial water level (null = none). */
  waterLevel?: number | null;
  fog?: {
    mode?: number;
    color?: Color3;
    density?: number;
    start?: number;
    end?: number;
  };
}

interface Props extends WalkableHostOptions {
  setup: (api: WalkableSceneApi) => void;
  children?: ReactNode;
  className?: string;
  onFrame?: (dt: number, api: WalkableSceneApi) => void;
}

const LOOK_SENS = 0.0022;
const BOB_FREQ = 9;
const BOB_AMP = 0.045;

export function WalkableHost({
  setup,
  children,
  className,
  clearColor,
  spawn = [0, 2, 0],
  hdr = true,
  ambient = 0.55,
  sun,
  cinematic = "soft",
  dayNight: dayNightOpt,
  weather: weatherOpt,
  showAvatar = true,
  eyeHeight = 1.7,
  walkSpeed = 6,
  sprintSpeed = 11,
  jumpForce = 7.5,
  gravity = 18,
  waterLevel: initialWater = null,
  fog,
  onFrame,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const [pointerLocked, setPointerLocked] = useState(false);
  const [swimmingHud, setSwimmingHud] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const cleanups: Array<() => void> = [];
    let engine: Engine | null = null;
    let scene: Scene | null = null;
    let cam: FreeCamera | null = null;
    let vfx: VfxHandles | null = null;
    let dayNight: DayNightCycle | null = null;
    let weather: WeatherController | null = null;
    let avatar: AvatarInstance | null = null;
    let disposed = false;

    // --- Input state ---
    const keys = new Set<string>();
    let velY = 0;
    let grounded = false;
    let swimming = false;
    let heightSampler: (x: number, z: number) => number = () => 0;
    let waterLevel: number | null = initialWater;
    let yaw = 0;
    let pitch = 0;
    let bobPhase = 0;
    let dragging = false;
    let lastMx = 0;
    let lastMy = 0;

    const onKeyDown = (e: KeyboardEvent) => {
      // Ignore when typing in inputs.
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      keys.add(e.code);
      // Prevent page scroll on Space.
      if (e.code === "Space") e.preventDefault();
    };
    const onKeyUp = (e: KeyboardEvent) => keys.delete(e.code);
    const onBlur = () => keys.clear();

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    cleanups.push(() => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    });

    const init = async () => {
      if (disposed) return;
      engine = new Engine(
        canvas,
        true,
        {
          preserveDrawingBuffer: true,
          stencil: true,
          antialias: true,
          powerPreference: "high-performance",
          disableWebGL2Support: false,
        },
        true,
      );
      engine.setHardwareScalingLevel(1 / Math.min(window.devicePixelRatio || 1, 2));

      scene = new Scene(engine);
      if (clearColor) scene.clearColor = clearColor;
      else scene.clearColor = new Color4(0.02, 0.04, 0.08, 1);
      scene.ambientColor = new Color3(ambient, ambient, ambient);
      scene.useRightHandedSystem = true;

      if (fog) {
        scene.fogMode = fog.mode ?? Scene.FOGMODE_EXP2;
        scene.fogColor = fog.color ?? new Color3(0.02, 0.03, 0.08);
        scene.fogDensity = fog.density ?? 0.01;
        if (fog.start != null) scene.fogStart = fog.start;
        if (fog.end != null) scene.fogEnd = fog.end;
      }

      if (hdr) {
        try {
          scene.createDefaultEnvironment({ createGround: false, createSkybox: false });
        } catch {
          /* optional */
        }
      }

      // Lights
      const hemi = new HemisphericLight("hemi", new Vector3(0, 1, 0), scene);
      hemi.intensity = ambient;
      hemi.diffuse = new Color3(0.6, 0.75, 1.0);
      hemi.groundColor = new Color3(0.15, 0.1, 0.25);

      let shadowGen: ShadowGenerator | null = null;
      let sunLight: DirectionalLight | null = null;
      if (sun !== null) {
        const sunOpts = sun ?? {
          direction: [-0.5, -1, -0.7] as [number, number, number],
          intensity: 1.8,
          shadowMapSize: 2048,
          shadowFrustum: 80,
        };
        const dir = sunOpts.direction ?? [-0.5, -1, -0.7];
        sunLight = new DirectionalLight("sun", new Vector3(...dir), scene);
        sunLight.intensity = sunOpts.intensity ?? 1.8;
        sunLight.diffuse = new Color3(1.0, 0.95, 0.85);
        sunLight.position = new Vector3(-dir[0] * 40, -dir[1] * 40, -dir[2] * 40);
        const size = sunOpts.shadowMapSize ?? 2048;
        if (size > 0) {
          shadowGen = new ShadowGenerator(size, sunLight);
          shadowGen.usePercentageCloserFiltering = true;
          shadowGen.filteringQuality = ShadowGenerator.QUALITY_MEDIUM;
          sunLight.shadowMinZ = 1;
          sunLight.shadowMaxZ = 200;
          if (sunOpts.shadowFrustum) {
            const o = sunOpts.shadowFrustum;
            sunLight.orthoTop = o;
            sunLight.orthoBottom = -o;
            sunLight.orthoLeft = -o;
            sunLight.orthoRight = o;
          }
        }
      }
      (scene.metadata as Record<string, unknown> | null) ??= {};
      scene.metadata!.shadowGenerator = shadowGen;

      // --- FreeCamera ---
      const groundY = heightSampler(spawn[0], spawn[2]);
      cam = new FreeCamera(
        "walkCam",
        new Vector3(spawn[0], Math.max(spawn[1], groundY + eyeHeight), spawn[2]),
        scene,
      );
      cam.minZ = 0.05;
      cam.maxZ = 2000;
      cam.fov = 1.0;
      cam.speed = 0; // we drive movement ourselves
      cam.angularSensibility = 0; // we drive look ourselves
      cam.inertia = 0;
      // Don't attach default controls — we fully own input.
      cam.inputs.clear();

      // Initial look direction: -Z
      yaw = 0;
      pitch = 0;
      applyLook(cam, yaw, pitch);

      // VFX
      vfx = attachCinematicVfx(scene, cam, { cinematic });
      cleanups.push(() => vfx?.dispose());

      // Day/night
      if (dayNightOpt) {
        const dn =
          typeof dayNightOpt === "object" ? dayNightOpt : { cycleSeconds: 180, phase: 0.3 };
        dayNight = createDayNightCycle(scene, {
          ...dn,
          sun: sunLight,
          hemi,
        });
        cleanups.push(() => dayNight?.dispose());
      }

      // Weather
      if (weatherOpt) {
        weather = createWeatherController(scene, weatherOpt);
        cleanups.push(() => weather?.dispose());
      }

      // Avatar body (chase cam offset below eye)
      if (showAvatar) {
        const saved = loadSavedAvatar();
        const colors = saved
          ? { body: hexToColor3(saved.bodyHex), accent: hexToColor3(saved.accentHex) }
          : { ...DEFAULT_AVATAR_COLORS };
        const arch = ARCHETYPES.find((a) => a.id === saved?.archetypeId) ?? ARCHETYPES[0];
        avatar = createAvatar(scene, {
          parent: cam,
          colors,
          archetype: arch,
          // Body sits below the camera eye, slightly back so you see shoulders.
          cameraOffset: new Vector3(0, -eyeHeight, 0.15),
        });
        // Hide head in first-person so it doesn't clip the view.
        const head = avatar.root.getChildMeshes().find((m) => m.name === "head");
        if (head) head.visibility = 0;
        // Hide eyes too.
        avatar.root.getChildMeshes().forEach((m) => {
          if (m.name.startsWith("eye")) m.visibility = 0;
        });
        cleanups.push(() => avatar?.dispose());
      }

      // --- Pointer lock / drag look ---
      const onClick = () => {
        if (document.pointerLockElement !== canvas) {
          canvas.requestPointerLock?.();
        }
      };
      const onPLChange = () => setPointerLocked(document.pointerLockElement === canvas);
      const onMouseMove = (e: MouseEvent) => {
        if (document.pointerLockElement === canvas) {
          yaw += e.movementX * LOOK_SENS;
          pitch += e.movementY * LOOK_SENS;
          pitch = Math.max(-1.45, Math.min(1.45, pitch));
          if (cam) applyLook(cam, yaw, pitch);
        } else if (dragging) {
          const dx = e.clientX - lastMx;
          const dy = e.clientY - lastMy;
          lastMx = e.clientX;
          lastMy = e.clientY;
          yaw += dx * LOOK_SENS * 1.4;
          pitch += dy * LOOK_SENS * 1.4;
          pitch = Math.max(-1.45, Math.min(1.45, pitch));
          if (cam) applyLook(cam, yaw, pitch);
        }
      };
      const onMouseDown = (e: MouseEvent) => {
        if (e.button === 0 && document.pointerLockElement !== canvas) {
          dragging = true;
          lastMx = e.clientX;
          lastMy = e.clientY;
        }
      };
      const onMouseUp = () => {
        dragging = false;
      };

      canvas.addEventListener("click", onClick);
      document.addEventListener("pointerlockchange", onPLChange);
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mousedown", onMouseDown);
      window.addEventListener("mouseup", onMouseUp);
      cleanups.push(() => {
        canvas.removeEventListener("click", onClick);
        document.removeEventListener("pointerlockchange", onPLChange);
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mousedown", onMouseDown);
        window.removeEventListener("mouseup", onMouseUp);
        if (document.pointerLockElement === canvas) document.exitPointerLock?.();
      });

      // API for scene builders
      const api: WalkableSceneApi = {
        engine: engine!,
        scene: scene!,
        camera: cam!,
        onDispose: (fn) => cleanups.push(fn),
        setHeightSampler: (fn) => {
          heightSampler = fn;
        },
        setWaterLevel: (y) => {
          waterLevel = y;
        },
        getPlayerPosition: () => cam!.position.clone(),
        isSwimming: () => swimming,
        dayNight,
        weather,
        avatar,
      };

      setup(api);
      if (disposed) return;
      setReady(true);

      // --- Movement + render loop ---
      let last = performance.now();
      engine!.runRenderLoop(() => {
        if (!scene || !cam) return;
        const now = performance.now();
        const dt = Math.min((now - last) / 1000, 0.05);
        last = now;

        // Day/night + weather
        dayNight?.update(dt);
        weather?.update(dt);

        // Movement
        const sprint = keys.has("ShiftLeft") || keys.has("ShiftRight");
        const speed = sprint ? sprintSpeed : walkSpeed;

        // Forward / right from yaw only (no pitch in walk dir — more natural).
        const forward = new Vector3(Math.sin(yaw), 0, Math.cos(yaw));
        const right = new Vector3(Math.cos(yaw), 0, -Math.sin(yaw));

        let move = Vector3.Zero();
        if (keys.has("KeyW") || keys.has("ArrowUp")) move = move.add(forward);
        if (keys.has("KeyS") || keys.has("ArrowDown")) move = move.subtract(forward);
        if (keys.has("KeyA") || keys.has("ArrowLeft")) move = move.subtract(right);
        if (keys.has("KeyD") || keys.has("ArrowRight")) move = move.add(right);

        const moving = move.lengthSquared() > 0.001;
        if (moving) {
          move.normalize();
        }

        // Swim detection
        const wasSwimming = swimming;
        if (waterLevel != null && cam.position.y < waterLevel + 0.3) {
          swimming = true;
        } else if (waterLevel != null && cam.position.y > waterLevel + eyeHeight * 0.5) {
          swimming = false;
        } else if (waterLevel == null) {
          swimming = false;
        }
        if (swimming !== wasSwimming) setSwimmingHud(swimming);

        if (swimming) {
          // Buoyant swim: Space=up, Shift=dive, WASD horizontal + look-dir vertical bias.
          const swimSpeed = sprint ? 7 : 4.5;
          if (moving) {
            cam.position.addInPlace(move.scale(swimSpeed * dt));
          }
          // Vertical from keys + slight look pitch influence.
          let vy = 0;
          if (keys.has("Space")) vy += swimSpeed;
          if (sprint) vy -= swimSpeed; // Shift dives while swimming
          // Drift toward look pitch a bit.
          vy += -Math.sin(pitch) * swimSpeed * 0.35 * (moving ? 1 : 0.3);
          // Buoyancy: gently float toward water surface if not diving.
          if (!sprint && !keys.has("Space")) {
            const target = (waterLevel ?? cam.position.y) - 0.4;
            vy += (target - cam.position.y) * 0.6;
          }
          cam.position.y += vy * dt;
          // Clamp not too deep / not too high above surface.
          if (waterLevel != null) {
            cam.position.y = Math.min(cam.position.y, waterLevel + 0.5);
            cam.position.y = Math.max(cam.position.y, waterLevel - 40);
          }
          grounded = false;
          velY = 0;
        } else {
          // Ground walk + gravity + jump
          if (moving) {
            cam.position.addInPlace(move.scale(speed * dt));
          }

          const ground = heightSampler(cam.position.x, cam.position.z);
          const feetY = cam.position.y - eyeHeight;

          // Jump
          if ((keys.has("Space") || keys.has("KeyE")) && grounded) {
            velY = jumpForce;
            grounded = false;
          }

          // Gravity
          velY -= gravity * dt;
          cam.position.y += velY * dt;

          // Terrain collision
          const newFeet = cam.position.y - eyeHeight;
          if (newFeet <= ground) {
            cam.position.y = ground + eyeHeight;
            velY = 0;
            grounded = true;
          } else {
            grounded = false;
          }

          // Head bob
          if (moving && grounded) {
            bobPhase += dt * BOB_FREQ * (sprint ? 1.4 : 1);
            const bob = Math.sin(bobPhase) * BOB_AMP * (sprint ? 1.3 : 1);
            cam.position.y += bob;
          } else {
            bobPhase *= 0.9;
          }

          void feetY;
        }

        // Avatar animation
        const moveSpeedNorm = moving ? (sprint && !swimming ? 1 : 0.6) : 0;
        avatar?.update(dt, moveSpeedNorm, swimming);
        // Keep body facing walk yaw (camera already owns yaw via parent).
        if (avatar) {
          // Body faces movement direction; since parented to cam which has full look,
          // counter-rotate pitch so body stays upright-ish.
          avatar.root.rotation.x = swimming ? -0.25 : 0;
        }

        onFrame?.(dt, api);
        scene.render();
      });
    };

    init().catch((err) => console.error("[WalkableHost] init failed", err));

    const onResize = () => engine?.resize();
    window.addEventListener("resize", onResize);
    cleanups.push(() => window.removeEventListener("resize", onResize));

    return () => {
      disposed = true;
      cleanups.forEach((fn) => {
        try {
          fn();
        } catch {
          /* ignore */
        }
      });
      scene?.dispose();
      engine?.dispose();
      engine = null;
      scene = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={className} style={{ position: "relative", width: "100%", height: "100%" }}>
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height: "100%",
          display: "block",
          touchAction: "none",
          outline: "none",
          cursor: pointerLocked ? "none" : "crosshair",
        }}
      />
      {ready && children}
      {ready && (
        <div
          className="pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2"
          style={{ zIndex: 5 }}
        >
          <div
            className="rounded-full px-5 py-2 text-[10px] font-mono uppercase tracking-[0.2em] text-[#E0F7FA]/70"
            style={{
              background: "rgba(11,16,26,0.6)",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(140,180,255,0.15)",
            }}
          >
            {swimmingHud
              ? "Swim · WASD · Space up · Shift dive"
              : pointerLocked
                ? "WASD walk · Shift sprint · Space jump · Esc release"
                : "Click to look · drag · WASD walk · Space jump"}
          </div>
        </div>
      )}
    </div>
  );
}

function applyLook(cam: FreeCamera, yaw: number, pitch: number) {
  // Build a target point from yaw/pitch (right-handed Y-up).
  const dir = new Vector3(
    Math.sin(yaw) * Math.cos(pitch),
    -Math.sin(pitch),
    Math.cos(yaw) * Math.cos(pitch),
  );
  cam.setTarget(cam.position.add(dir));
}

/** Re-export castShadow convenience for walkable worlds. */
export { castShadow } from "./BabylonSceneHost";
