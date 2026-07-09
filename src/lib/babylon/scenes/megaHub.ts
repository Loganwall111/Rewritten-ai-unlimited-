import {
  Color3,
  Color4,
  DynamicTexture,
  Mesh,
  MeshBuilder,
  PointLight,
  PointerEventTypes,
  Scene,
  StandardMaterial,
  Texture,
  Vector3,
} from "@babylonjs/core";
import type { WalkableSceneApi } from "../WalkableHost";
import { glow, hsl, pbr, starField } from "../graphics";
import { castShadow } from "../BabylonSceneHost";
import { DynamicWaterBody } from "../physicsEffects";
import { spawnInteractables } from "../interactables";
import { spawnVehicle } from "../vehicles";
import type { HavokController } from "../havok";

const PORTAL_TARGETS = [
  { slug: "quantum-ocean", label: "Ocean", hue: 180 },
  { slug: "cyber-city", label: "Cyber", hue: 320 },
  { slug: "floating-islands", label: "Sky", hue: 198 },
  { slug: "void", label: "Void", hue: 280 },
  { slug: "crystal-cavern", label: "Crystal", hue: 292 },
  { slug: "volcanic", label: "Forge", hue: 16 },
  { slug: "glow-forest", label: "Forest", hue: 145 },
  { slug: "deep-reef", label: "Reef", hue: 165 },
];

const SHOPS = [
  { name: "Cosmetics", hue: 305, x: -72, z: -54 },
  { name: "Vehicles", hue: 42, x: -28, z: -78 },
  { name: "Relics", hue: 220, x: 28, z: -78 },
  { name: "Keys", hue: 195, x: 72, z: -54 },
  { name: "Starfruit", hue: 95, x: 78, z: 18 },
  { name: "Nebula", hue: 275, x: 44, z: 72 },
  { name: "Havok", hue: 12, x: -44, z: 72 },
  { name: "Portal Lab", hue: 185, x: -78, z: 18 },
];

export function buildMegaHub(api: WalkableSceneApi) {
  const { scene, camera } = api;
  scene.clearColor = new Color4(0.012, 0.018, 0.04, 1);
  scene.fogMode = Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.006;
  scene.fogColor = new Color3(0.018, 0.025, 0.055);
  starField(scene, 1500, 480, hsl(205, 0.9, 0.9));

  const havok = scene.metadata?.havok as HavokController | null | undefined;
  const plazaMat = pbr(scene, {
    baseColor: hsl(225, 0.16, 0.105),
    metallic: 0.78,
    roughness: 0.13,
    emissive: hsl(220, 0.5, 0.025),
  });
  const plaza = MeshBuilder.CreateGround(
    "megahub-plaza-200",
    { width: 200, height: 200, subdivisions: 4 },
    scene,
  );
  plaza.material = plazaMat;
  plaza.receiveShadows = true;
  havok?.addStaticGround(plaza);

  // Light-path inlays: bright mall transit lines across the 200×200 plaza.
  const pathMat = glow(scene, hsl(190, 1, 0.58), 1.35);
  for (let i = -4; i <= 4; i++) {
    const stripX = MeshBuilder.CreateBox(
      `light-path-x-${i}`,
      { width: 184, height: 0.035, depth: 0.18 },
      scene,
    );
    stripX.position.set(0, 0.035, i * 18);
    stripX.material = pathMat;
    const stripZ = MeshBuilder.CreateBox(
      `light-path-z-${i}`,
      { width: 0.18, height: 0.035, depth: 184 },
      scene,
    );
    stripZ.position.set(i * 18, 0.04, 0);
    stripZ.material = pathMat;
  }
  for (let i = 0; i < 4; i++) {
    const ring = MeshBuilder.CreateTorus(
      `plaza-orbit-${i}`,
      { diameter: 36 + i * 22, thickness: 0.06, tessellation: 160 },
      scene,
    );
    ring.position.y = 0.07 + i * 0.004;
    ring.material = glow(scene, hsl(190 + i * 34, 1, 0.58), 0.9);
  }

  // Central fountain + obelisk.
  const fountainMat = pbr(scene, {
    baseColor: hsl(210, 0.18, 0.72),
    metallic: 0.25,
    roughness: 0.28,
  });
  const basin = MeshBuilder.CreateCylinder(
    "central-fountain-basin",
    { diameter: 18, height: 1.1, tessellation: 96 },
    scene,
  );
  basin.position.y = 0.55;
  basin.material = fountainMat;
  castShadow(scene, basin);
  const fountainWater = new DynamicWaterBody(scene, {
    size: 14.5,
    subdivisions: 72,
    y: 1.14,
    color: hsl(190, 0.9, 0.48),
  });
  api.onDispose(() => fountainWater.dispose());
  const obelisk = MeshBuilder.CreateCylinder(
    "central-obelisk",
    { diameterTop: 0.6, diameterBottom: 2.4, height: 25, tessellation: 4 },
    scene,
  );
  obelisk.position.y = 13.4;
  obelisk.rotation.y = Math.PI / 4;
  obelisk.material = glow(scene, hsl(198, 1, 0.62), 1.45);
  castShadow(scene, obelisk);
  const obeliskLight = new PointLight("obelisk-point-light", new Vector3(0, 17, 0), scene);
  obeliskLight.diffuse = hsl(198, 1, 0.66);
  obeliskLight.intensity = 1.2;
  obeliskLight.range = 65;

  // 20-step grand staircase to upper terrace.
  const stairMat = pbr(scene, { baseColor: hsl(220, 0.12, 0.58), metallic: 0.22, roughness: 0.3 });
  const stepHeight = 0.25;
  const stepDepth = 1.45;
  for (let i = 0; i < 20; i++) {
    const step = MeshBuilder.CreateBox(
      `grand-stair-${i + 1}`,
      { width: 34, height: stepHeight, depth: stepDepth },
      scene,
    );
    step.position.set(0, stepHeight * (i + 0.5), -32 - i * stepDepth);
    step.material = stairMat;
    step.receiveShadows = true;
    castShadow(scene, step);
  }
  const terrace = MeshBuilder.CreateBox(
    "upper-terrace",
    { width: 92, height: 0.6, depth: 54 },
    scene,
  );
  terrace.position.set(0, 5.05, -76);
  terrace.material = pbr(scene, {
    baseColor: hsl(230, 0.14, 0.18),
    metallic: 0.8,
    roughness: 0.12,
    emissive: hsl(230, 0.7, 0.04),
  });
  terrace.receiveShadows = true;
  havok?.addStaticGround(terrace);

  // Shops around the mall ring.
  SHOPS.forEach((shop, index) =>
    buildShop(scene, shop.name, shop.hue, new Vector3(shop.x, 0, shop.z), index),
  );

  // Portal doors with warped opacity texture, inner void and point light.
  PORTAL_TARGETS.forEach((target, index) => {
    const angle = (index / PORTAL_TARGETS.length) * Math.PI * 2 + Math.PI / 8;
    const pos = new Vector3(Math.cos(angle) * 55, 0, Math.sin(angle) * 55);
    buildPortalDoor(scene, target, pos, -angle + Math.PI / 2);
  });

  // Connecting arches between districts.
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const arch = MeshBuilder.CreateTorus(
      `connecting-arch-${i}`,
      { diameter: 9, thickness: 0.32, tessellation: 48 },
      scene,
    );
    arch.position.set(Math.cos(angle) * 38, 4.3, Math.sin(angle) * 38);
    arch.rotation.x = Math.PI / 2;
    arch.rotation.y = -angle;
    arch.material = glow(scene, hsl(185 + i * 18, 0.95, 0.56), 0.75);
  }

  // God-ray skylights from an invisible vaulted ceiling.
  for (let i = 0; i < 10; i++) {
    const ray = MeshBuilder.CreatePlane(
      `skylight-godray-${i}`,
      { width: 7 + (i % 3) * 2, height: 42 },
      scene,
    );
    ray.position.set(-60 + i * 13, 22, -8 + Math.sin(i) * 36);
    ray.rotation.x = Math.PI / 2.7;
    ray.rotation.z = (i - 5) * 0.07;
    const mat = new StandardMaterial(`godray-mat-${i}`, scene);
    mat.diffuseColor = hsl(195, 0.95, 0.7);
    mat.emissiveColor = hsl(195, 0.95, 0.62);
    mat.alpha = 0.12;
    mat.disableLighting = true;
    mat.backFaceCulling = false;
    ray.material = mat;
  }

  const interactables = spawnInteractables(scene, camera, [
    {
      id: "crystal-fountain",
      itemId: "energy-crystal",
      position: [0, 2.4, 9],
      hue: 190,
      quantity: 1,
    },
    { id: "starfruit-shop", itemId: "starfruit", position: [77, 1.6, 25], hue: 90, quantity: 2 },
    { id: "berry-kiosk", itemId: "nebula-berry", position: [42, 1.6, 69], hue: 285, quantity: 3 },
    { id: "relic-vault", itemId: "ancient-relic", position: [-30, 6.8, -82], hue: 42, quantity: 1 },
    { id: "platinum-key", itemId: "platinum-key", position: [30, 6.8, -82], hue: 210, quantity: 1 },
    { id: "void-shard", itemId: "void-shard", position: [-56, 1.5, -20], hue: 275, quantity: 1 },
  ]);
  api.onDispose(() => interactables.dispose());

  const vehicles = [
    spawnVehicle(scene, camera, "hoverboard", [11, 1.1, 15]),
    spawnVehicle(scene, camera, "speeder", [-12, 1.2, 18]),
    spawnVehicle(scene, camera, "glider", [0, 6.1, -92]),
  ];
  api.onDispose(() => vehicles.forEach((vehicle) => vehicle.dispose()));

  const portalPointer = scene.onPointerObservable.add((info) => {
    if (info.type !== PointerEventTypes.POINTERDOWN) return;
    const pick = scene.pick(scene.pointerX, scene.pointerY, (mesh) =>
      Boolean(mesh.metadata?.portalSlug),
    );
    const slug = pick?.pickedMesh?.metadata?.portalSlug as string | undefined;
    if (slug && typeof window !== "undefined") window.location.href = `/play/${slug}`;
  });
  api.onDispose(() => scene.onPointerObservable.remove(portalPointer));

  api.setHeightSampler((x, z) => sampleMegaHubHeight(x, z));
  api.onDispose(() => {
    obeliskLight.dispose();
  });
  scene.onBeforeRenderObservable.add(() => {
    const t = performance.now() * 0.001;
    obelisk.rotation.y += 0.003;
    obeliskLight.intensity = 1.1 + Math.sin(t * 1.7) * 0.25;
    if (Math.random() < 0.03)
      fountainWater.addRipple((Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5, 0.6);
  });
}

function sampleMegaHubHeight(x: number, z: number): number {
  if (Math.abs(x) < 19 && z <= -32 && z >= -61.5) {
    const i = Math.max(0, Math.min(19, Math.floor((-32 - z) / 1.45)));
    return (i + 1) * 0.25;
  }
  if (Math.abs(x) < 48 && z < -61.5 && z > -104) return 5.35;
  return 0;
}

function buildShop(scene: Scene, name: string, hue: number, position: Vector3, index: number) {
  const wallMat = pbr(scene, {
    baseColor: hsl(hue, 0.26, 0.18),
    metallic: 0.55,
    roughness: 0.24,
    emissive: hsl(hue, 0.7, 0.035),
  });
  const roofMat = pbr(scene, {
    baseColor: hsl(hue + 24, 0.5, 0.27),
    metallic: 0.8,
    roughness: 0.18,
    emissive: hsl(hue, 0.7, 0.06),
  });
  const body = MeshBuilder.CreateBox(
    `shop-${name}-walls`,
    { width: 22, height: 13, depth: 17 },
    scene,
  );
  body.position.copyFrom(position).addInPlace(new Vector3(0, 6.5, 0));
  body.rotation.y = Math.atan2(position.x, position.z) + Math.PI;
  body.material = wallMat;
  castShadow(scene, body);

  const roof = MeshBuilder.CreateCylinder(
    `shop-${name}-roof`,
    { diameterTop: 14, diameterBottom: 25, height: 5, tessellation: 4 },
    scene,
  );
  roof.position.copyFrom(position).addInPlace(new Vector3(0, 15.4, 0));
  roof.rotation.y = body.rotation.y + Math.PI / 4;
  roof.material = roofMat;
  castShadow(scene, roof);

  const sign = MeshBuilder.CreateBox(
    `shop-${name}-glowing-sign`,
    { width: 13, height: 2.2, depth: 0.35 },
    scene,
  );
  const forward = position.clone().normalize().scale(-1);
  sign.position
    .copyFrom(position)
    .addInPlace(new Vector3(0, 10.2, 0))
    .addInPlace(forward.scale(8.8));
  sign.rotation.y = body.rotation.y;
  sign.material = glow(scene, hsl(hue, 1, 0.62), 1.25);
  sign.metadata = { label: name };

  const windowMat = glow(scene, hsl(hue + 30, 1, 0.58), 0.65);
  for (let i = -1; i <= 1; i++) {
    const window = MeshBuilder.CreateBox(
      `shop-${name}-window-${i}`,
      { width: 3, height: 4, depth: 0.25 },
      scene,
    );
    window.position
      .copyFrom(position)
      .addInPlace(new Vector3(i * 5, 5.5, 0))
      .addInPlace(forward.scale(8.95));
    window.rotation.y = body.rotation.y;
    window.material = windowMat;
  }

  const light = new PointLight(`shop-${name}-light`, position.add(new Vector3(0, 10, 0)), scene);
  light.diffuse = hsl(hue, 1, 0.62);
  light.intensity = 0.55 + (index % 3) * 0.12;
  light.range = 34;
}

function buildPortalDoor(
  scene: Scene,
  target: { slug: string; label: string; hue: number },
  position: Vector3,
  rotationY: number,
) {
  const frame = MeshBuilder.CreateTorus(
    `portal-frame-${target.slug}`,
    { diameter: 8.2, thickness: 0.36, tessellation: 80 },
    scene,
  );
  frame.position.copyFrom(position).addInPlace(new Vector3(0, 4.7, 0));
  frame.rotation.x = Math.PI / 2;
  frame.rotation.y = rotationY;
  frame.material = glow(scene, hsl(target.hue, 1, 0.58), 1.2);
  frame.metadata = { portalSlug: target.slug };

  const voidDisc = MeshBuilder.CreateDisc(
    `portal-inner-void-${target.slug}`,
    { radius: 3.55, tessellation: 96 },
    scene,
  );
  voidDisc.position.copyFrom(frame.position);
  voidDisc.rotation.y = rotationY;
  voidDisc.material = makePortalVoidMaterial(scene, target.hue);
  voidDisc.metadata = { portalSlug: target.slug };

  const label = MeshBuilder.CreateBox(
    `portal-label-${target.slug}`,
    { width: 5.4, height: 0.55, depth: 0.12 },
    scene,
  );
  label.position.copyFrom(position).addInPlace(new Vector3(0, 8.9, 0));
  label.rotation.y = rotationY;
  label.material = glow(scene, hsl(target.hue + 18, 1, 0.67), 0.9);

  const light = new PointLight(`portal-light-${target.slug}`, frame.position.clone(), scene);
  light.diffuse = hsl(target.hue, 1, 0.65);
  light.intensity = 1.1;
  light.range = 24;
}

function makePortalVoidMaterial(scene: Scene, hue: number): StandardMaterial {
  const tex = new DynamicTexture(
    `portal-opacity-${hue}`,
    { width: 256, height: 256 },
    scene,
    false,
  );
  const ctx = tex.getContext() as CanvasRenderingContext2D;
  const size = 256;
  ctx.clearRect(0, 0, size, size);
  const grad = ctx.createRadialGradient(size / 2, size / 2, 8, size / 2, size / 2, size / 2);
  grad.addColorStop(0, "rgba(255,255,255,0.95)");
  grad.addColorStop(0.36, "rgba(255,255,255,0.55)");
  grad.addColorStop(0.62, "rgba(255,255,255,0.22)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = "rgba(255,255,255,0.8)";
  for (let i = 0; i < 10; i++) {
    ctx.beginPath();
    ctx.ellipse(size / 2, size / 2, 18 + i * 10, 55 + Math.sin(i) * 8, i * 0.42, 0, Math.PI * 2);
    ctx.stroke();
  }
  tex.update();
  tex.wrapU = Texture.CLAMP_ADDRESSMODE;
  tex.wrapV = Texture.CLAMP_ADDRESSMODE;

  const mat = new StandardMaterial(`portal-void-mat-${hue}`, scene);
  mat.diffuseColor = Color3.Black();
  mat.emissiveColor = hsl(hue, 1, 0.32);
  mat.opacityTexture = tex;
  mat.alpha = 0.88;
  mat.disableLighting = true;
  mat.backFaceCulling = false;
  return mat;
}

void Mesh;
