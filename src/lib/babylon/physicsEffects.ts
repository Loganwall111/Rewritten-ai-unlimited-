import {
  Camera,
  Color3,
  Color4,
  DynamicTexture,
  Mesh,
  MeshBuilder,
  ParticleSystem,
  PointLight,
  PointerEventTypes,
  Scene,
  StandardMaterial,
  Texture,
  Vector3,
  VertexBuffer,
} from "@babylonjs/core";
import { glowTexture, glass, glow, hsl, pbr } from "./graphics";
import type { HavokController } from "./havok";

type DisasterKind = "earthquake" | "storm" | "eruption" | "tsunami";

interface Ripple {
  x: number;
  z: number;
  age: number;
  strength: number;
}

export class DynamicWaterBody {
  mesh: Mesh;
  material: StandardMaterial;
  bumpTexture: DynamicTexture;
  private basePositions: Float32Array;
  private ripples: Ripple[] = [];
  private observer: ReturnType<Scene["onBeforeRenderObservable"]["add"]>;

  constructor(
    private scene: Scene,
    opts: { size?: number; subdivisions?: number; y?: number; color?: Color3 } = {},
  ) {
    this.mesh = MeshBuilder.CreateGround(
      "dynamic-water",
      {
        width: opts.size ?? 80,
        height: opts.size ?? 80,
        subdivisions: opts.subdivisions ?? 96,
        updatable: true,
      },
      scene,
    );
    this.mesh.position.y = opts.y ?? 0;
    this.material = glass(scene, opts.color ?? hsl(190, 0.85, 0.42), 0.48);
    this.material.backFaceCulling = false;
    this.bumpTexture = new DynamicTexture("water-bump", { width: 256, height: 256 }, scene, false);
    this.bumpTexture.wrapU = Texture.WRAP_ADDRESSMODE;
    this.bumpTexture.wrapV = Texture.WRAP_ADDRESSMODE;
    this.material.bumpTexture = this.bumpTexture;
    this.mesh.material = this.material;
    this.basePositions = new Float32Array(
      this.mesh.getVerticesData(VertexBuffer.PositionKind) ?? [],
    );
    this.drawBump(0);
    this.observer = scene.onBeforeRenderObservable.add(() =>
      this.update(scene.getEngine().getDeltaTime() / 1000),
    );
  }

  addRipple(x: number, z: number, strength = 1) {
    this.ripples.push({ x, z, age: 0, strength });
    if (this.ripples.length > 24) this.ripples.shift();
  }

  update(dt: number) {
    const positions = this.mesh.getVerticesData(VertexBuffer.PositionKind);
    if (!positions) return;
    const t = performance.now() * 0.001;
    for (let i = 0; i < positions.length; i += 3) {
      const x = this.basePositions[i];
      const z = this.basePositions[i + 2];
      let y = Math.sin(x * 0.17 + t * 1.7) * 0.08 + Math.cos(z * 0.14 - t * 1.25) * 0.06;
      for (const ripple of this.ripples) {
        const d = Math.hypot(x - ripple.x, z - ripple.z);
        const ring = ripple.age * 7;
        const envelope = Math.exp(-Math.abs(d - ring) * 1.4) * Math.max(0, 1 - ripple.age / 4);
        y += Math.sin(d * 2.3 - ripple.age * 9) * envelope * ripple.strength * 0.45;
      }
      positions[i + 1] = y;
    }
    this.mesh.updateVerticesData(VertexBuffer.PositionKind, positions);
    this.mesh.createNormals(true);
    this.ripples.forEach((ripple) => (ripple.age += dt));
    this.ripples = this.ripples.filter((ripple) => ripple.age < 4.2);
    this.drawBump(t);
  }

  dispose() {
    this.scene.onBeforeRenderObservable.remove(this.observer);
    this.bumpTexture.dispose();
    this.mesh.dispose();
  }

  private drawBump(t: number) {
    const ctx = this.bumpTexture.getContext() as CanvasRenderingContext2D;
    const size = 256;
    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, `hsl(${185 + Math.sin(t) * 15}, 80%, 45%)`);
    grad.addColorStop(1, `hsl(${215 + Math.cos(t * 0.7) * 20}, 90%, 58%)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 14; i++) {
      ctx.beginPath();
      const y = ((i * 22 + t * 36) % (size + 40)) - 20;
      ctx.moveTo(0, y);
      for (let x = 0; x <= size; x += 16) ctx.lineTo(x, y + Math.sin(x * 0.05 + t + i) * 8);
      ctx.stroke();
    }
    this.bumpTexture.update(false);
  }
}

export class NaturalDisaster {
  private active = false;
  private elapsed = 0;
  private duration = 0;
  private light: PointLight;
  private particles: ParticleSystem | null = null;
  private wave: Mesh | null = null;
  private lastShake = Vector3.Zero();
  private observer: ReturnType<Scene["onBeforeRenderObservable"]["add"]>;

  constructor(
    private scene: Scene,
    private camera: Camera,
    private kind: DisasterKind,
  ) {
    this.light = new PointLight(`disaster-${kind}-light`, new Vector3(0, 18, 0), scene);
    this.light.diffuse = kind === "eruption" ? hsl(12, 1, 0.55) : hsl(205, 1, 0.72);
    this.light.intensity = 0;
    this.light.range = 90;
    this.observer = scene.onBeforeRenderObservable.add(() =>
      this.update(scene.getEngine().getDeltaTime() / 1000),
    );
  }

  trigger(duration = 8) {
    this.active = true;
    this.elapsed = 0;
    this.duration = duration;
    this.spawnParticles();
    if (this.kind === "tsunami" && !this.wave) {
      this.wave = MeshBuilder.CreateTorus(
        "tsunami-ring",
        { diameter: 10, thickness: 0.3, tessellation: 96 },
        this.scene,
      );
      this.wave.position.y = 0.45;
      this.wave.material = glow(this.scene, hsl(190, 1, 0.58), 1.1);
    }
  }

  stop() {
    this.active = false;
    this.camera.position.subtractInPlace(this.lastShake);
    this.lastShake.setAll(0);
    this.light.intensity = 0;
    this.particles?.stop();
    this.wave?.setEnabled(false);
  }

  dispose() {
    this.stop();
    this.scene.onBeforeRenderObservable.remove(this.observer);
    this.light.dispose();
    this.particles?.dispose();
    this.wave?.dispose();
  }

  private update(dt: number) {
    if (!this.active) return;
    this.elapsed += dt;
    if (this.elapsed > this.duration) {
      this.stop();
      return;
    }
    const intensity = Math.sin((this.elapsed / this.duration) * Math.PI);
    const shakeScale = this.kind === "earthquake" ? 0.22 : this.kind === "storm" ? 0.11 : 0.15;
    const nextShake = new Vector3(
      (Math.random() - 0.5) * shakeScale * intensity,
      (Math.random() - 0.5) * shakeScale * intensity * 0.45,
      (Math.random() - 0.5) * shakeScale * intensity,
    );
    this.camera.position.subtractInPlace(this.lastShake).addInPlace(nextShake);
    this.lastShake = nextShake;

    if (this.kind === "storm" && Math.random() < dt * 2.6) this.flashLightning(1.8);
    else this.light.intensity *= 0.88;
    if (this.kind === "eruption") this.light.intensity = 0.4 + intensity * 1.8;
    if (this.wave) {
      this.wave.setEnabled(true);
      const scale = 1 + this.elapsed * 4;
      this.wave.scaling.set(scale, scale, scale);
      this.wave.rotation.y += dt * 0.8;
    }
  }

  private flashLightning(power = 1) {
    this.light.position.set(
      (Math.random() - 0.5) * 55,
      22 + Math.random() * 25,
      (Math.random() - 0.5) * 55,
    );
    this.light.intensity = power * (2 + Math.random() * 2);
  }

  private spawnParticles() {
    this.particles?.dispose();
    const ps = new ParticleSystem(`disaster-${this.kind}-particles`, 1200, this.scene);
    ps.particleTexture = glowTexture(this.scene);
    ps.emitter = new Vector3(0, this.kind === "eruption" ? 2 : 18, 0);
    ps.minEmitBox = new Vector3(-40, 0, -40);
    ps.maxEmitBox = new Vector3(40, 3, 40);
    ps.color1 =
      this.kind === "eruption" ? new Color4(1, 0.25, 0.05, 1) : new Color4(0.5, 0.75, 1, 0.7);
    ps.color2 =
      this.kind === "earthquake"
        ? new Color4(0.55, 0.45, 0.35, 0.8)
        : new Color4(0.9, 0.95, 1, 0.8);
    ps.colorDead = new Color4(0, 0, 0, 0);
    ps.minSize = this.kind === "eruption" ? 0.25 : 0.08;
    ps.maxSize = this.kind === "eruption" ? 1.1 : 0.45;
    ps.minLifeTime = 0.8;
    ps.maxLifeTime = 2.8;
    ps.emitRate = this.kind === "earthquake" ? 180 : 520;
    ps.gravity = this.kind === "eruption" ? new Vector3(0, -1.3, 0) : new Vector3(2.5, -5.5, 0.5);
    ps.direction1 = new Vector3(-2, this.kind === "eruption" ? 8 : -2, -2);
    ps.direction2 = new Vector3(2, this.kind === "eruption" ? 14 : -6, 2);
    ps.minEmitPower = 0.2;
    ps.maxEmitPower = 2.4;
    ps.start();
    this.particles = ps;
  }
}

export class ClothBanner {
  mesh: Mesh;
  private basePositions: Float32Array;
  private observer: ReturnType<Scene["onBeforeRenderObservable"]["add"]>;

  constructor(
    private scene: Scene,
    position: Vector3,
    opts: { width?: number; height?: number; hue?: number; wind?: number } = {},
  ) {
    this.mesh = MeshBuilder.CreateGround(
      "cloth-banner",
      { width: opts.width ?? 4, height: opts.height ?? 7, subdivisions: 28, updatable: true },
      scene,
    );
    this.mesh.position.copyFrom(position);
    this.mesh.rotation.x = Math.PI / 2;
    this.mesh.material = pbr(scene, {
      baseColor: hsl(opts.hue ?? 285, 0.55, 0.34),
      roughness: 0.75,
      metallic: 0.05,
      emissive: hsl(opts.hue ?? 285, 0.65, 0.08),
    });
    this.basePositions = new Float32Array(
      this.mesh.getVerticesData(VertexBuffer.PositionKind) ?? [],
    );
    const wind = opts.wind ?? 1;
    this.observer = scene.onBeforeRenderObservable.add(() => {
      const t = performance.now() * 0.001;
      const positions = this.mesh.getVerticesData(VertexBuffer.PositionKind);
      if (!positions) return;
      for (let i = 0; i < positions.length; i += 3) {
        const x = this.basePositions[i];
        const z = this.basePositions[i + 2];
        const pin = Math.max(0, Math.min(1, (x + (opts.width ?? 4) / 2) / (opts.width ?? 4)));
        positions[i + 1] =
          this.basePositions[i + 1] + Math.sin(t * 2.1 * wind + z * 2.7 + x) * 0.35 * pin;
      }
      this.mesh.updateVerticesData(VertexBuffer.PositionKind, positions);
      this.mesh.createNormals(true);
    });
  }

  dispose() {
    this.scene.onBeforeRenderObservable.remove(this.observer);
    this.mesh.dispose();
  }
}

export class ShatterableGlass {
  mesh: Mesh;
  private shards: Array<{ mesh: Mesh; velocity: Vector3; spin: Vector3; life: number }> = [];
  private pointerObserver: ReturnType<Scene["onPointerObservable"]["add"]>;
  private frameObserver: ReturnType<Scene["onBeforeRenderObservable"]["add"]>;
  private shattered = false;

  constructor(
    private scene: Scene,
    position: Vector3,
    opts: { width?: number; height?: number; hue?: number } = {},
  ) {
    this.mesh = MeshBuilder.CreateBox(
      "shatterable-glass",
      { width: opts.width ?? 5, height: opts.height ?? 3, depth: 0.06 },
      scene,
    );
    this.mesh.position.copyFrom(position);
    this.mesh.material = glass(scene, hsl(opts.hue ?? 190, 0.75, 0.64), 0.33);
    this.pointerObserver = scene.onPointerObservable.add((info) => {
      if (info.type !== PointerEventTypes.POINTERDOWN || this.shattered) return;
      const pick = scene.pick(scene.pointerX, scene.pointerY, (mesh) => mesh === this.mesh);
      if (pick?.hit) this.shatter(pick.pickedPoint ?? this.mesh.position);
    });
    this.frameObserver = scene.onBeforeRenderObservable.add(() =>
      this.update(scene.getEngine().getDeltaTime() / 1000),
    );
  }

  shatter(origin: Vector3 = this.mesh.position) {
    if (this.shattered) return;
    this.shattered = true;
    this.mesh.setEnabled(false);
    const havok = this.scene.metadata?.havok as HavokController | null | undefined;
    for (let i = 0; i < 20; i++) {
      const shard = MeshBuilder.CreateBox(
        `glass-shard-${i}`,
        { width: 0.18 + Math.random() * 0.42, height: 0.06 + Math.random() * 0.16, depth: 0.025 },
        this.scene,
      );
      shard.position
        .copyFrom(origin)
        .addInPlace(
          new Vector3(
            (Math.random() - 0.5) * 1.4,
            (Math.random() - 0.5) * 1,
            (Math.random() - 0.5) * 0.25,
          ),
        );
      shard.material = glass(this.scene, hsl(190 + Math.random() * 40, 0.9, 0.7), 0.55);
      const velocity = new Vector3(
        (Math.random() - 0.5) * 7,
        Math.random() * 4 + 1,
        (Math.random() - 0.5) * 5,
      );
      const spin = new Vector3(Math.random() * 6, Math.random() * 6, Math.random() * 6);
      this.shards.push({ mesh: shard, velocity, spin, life: 2.5 + Math.random() * 1.5 });
      havok?.makeDynamic(shard);
    }
    this.sparkles(origin);
  }

  dispose() {
    this.scene.onPointerObservable.remove(this.pointerObserver);
    this.scene.onBeforeRenderObservable.remove(this.frameObserver);
    this.mesh.dispose();
    this.shards.forEach((shard) => shard.mesh.dispose());
  }

  private update(dt: number) {
    for (let i = this.shards.length - 1; i >= 0; i--) {
      const shard = this.shards[i];
      shard.life -= dt;
      shard.velocity.y -= dt * 5.5;
      shard.mesh.position.addInPlace(shard.velocity.scale(dt));
      shard.mesh.rotation.addInPlace(shard.spin.scale(dt));
      shard.mesh.visibility = Math.max(0, Math.min(1, shard.life));
      if (shard.life <= 0) {
        shard.mesh.dispose();
        this.shards.splice(i, 1);
      }
    }
  }

  private sparkles(pos: Vector3) {
    const ps = new ParticleSystem("glass-sparkles", 260, this.scene);
    ps.particleTexture = glowTexture(this.scene);
    ps.emitter = pos.clone();
    ps.minEmitBox = new Vector3(-0.2, -0.2, -0.2);
    ps.maxEmitBox = new Vector3(0.2, 0.2, 0.2);
    ps.color1 = new Color4(0.65, 0.95, 1, 1);
    ps.color2 = new Color4(1, 1, 1, 1);
    ps.colorDead = new Color4(0, 0, 0, 0);
    ps.minSize = 0.05;
    ps.maxSize = 0.22;
    ps.minLifeTime = 0.25;
    ps.maxLifeTime = 0.8;
    ps.emitRate = 900;
    ps.targetStopDuration = 0.12;
    ps.disposeOnStop = true;
    ps.direction1 = new Vector3(-3, -1, -3);
    ps.direction2 = new Vector3(3, 4, 3);
    ps.minEmitPower = 0.8;
    ps.maxEmitPower = 2.2;
    ps.start();
  }
}
