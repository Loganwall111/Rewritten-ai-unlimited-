import {
  Camera,
  Color3,
  Material,
  Mesh,
  MeshBuilder,
  PointLight,
  Scene,
  TransformNode,
  Vector3,
} from "@babylonjs/core";
import { glow, hsl, pbr } from "./graphics";
import { playClick } from "@/lib/sound";

export type VehicleType = "hoverboard" | "speeder" | "submarine" | "glider";

export interface VehicleController {
  root: TransformNode;
  type: VehicleType;
  isMounted: () => boolean;
  mount: () => void;
  dismount: () => void;
  dispose: () => void;
}

const toVector = (value: Vector3 | [number, number, number]) =>
  Array.isArray(value) ? new Vector3(value[0], value[1], value[2]) : value.clone();

export function spawnVehicle(
  scene: Scene,
  camera: Camera,
  model: VehicleType,
  pos: Vector3 | [number, number, number],
): VehicleController {
  const root = new TransformNode(`vehicle-${model}`, scene);
  root.position.copyFrom(toVector(pos));
  const hue = { hoverboard: 190, speeder: 325, submarine: 170, glider: 45 }[model];
  const speed = { hoverboard: 10, speeder: 16, submarine: 7, glider: 12 }[model];
  const vertical = model === "glider" || model === "submarine";
  const meshes = buildVehicleMesh(scene, root, model, hue);
  const light = new PointLight(
    `vehicle-light-${model}`,
    root.position.add(new Vector3(0, 1, 0)),
    scene,
  );
  light.diffuse = hsl(hue, 1, 0.62);
  light.intensity = 0.8;
  light.range = 9;

  let mounted = false;
  const keys = new Set<string>();

  const mount = () => {
    if (mounted) return;
    mounted = true;
    playClick();
    (scene.metadata as Record<string, unknown> | null) ??= {};
    scene.metadata!.vehicleMounted = model;
  };
  const dismount = () => {
    if (!mounted) return;
    mounted = false;
    playClick();
    if (scene.metadata) scene.metadata.vehicleMounted = null;
    root.position.copyFrom(camera.position).subtractInPlace(new Vector3(0, 1.25, 0));
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const target = event.target as HTMLElement | null;
    if (
      target &&
      (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
    )
      return;
    keys.add(event.code);
    if (event.code === "KeyF") {
      const dist = Vector3.Distance(camera.position, root.position);
      if (mounted) dismount();
      else if (dist < 5) mount();
    }
  };
  const onKeyUp = (event: KeyboardEvent) => keys.delete(event.code);
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);

  const observer = scene.onBeforeRenderObservable.add(() => {
    const dt = scene.getEngine().getDeltaTime() / 1000;
    const t = performance.now() * 0.001;
    if (!mounted) {
      root.position.y += Math.sin(t * 2.1 + hue) * dt * 0.08;
      root.rotation.y += dt * 0.18;
      const near = Vector3.Distance(camera.position, root.position) < 5;
      light.intensity = near ? 1.4 : 0.65;
      light.position.copyFrom(root.position.add(new Vector3(0, 1.2, 0)));
      return;
    }

    const forward = camera.getDirection(new Vector3(0, 0, 1));
    forward.y = 0;
    if (forward.lengthSquared() < 0.001) forward.z = 1;
    forward.normalize();
    const right = new Vector3(forward.z, 0, -forward.x).normalize();
    const move = Vector3.Zero();
    if (keys.has("KeyW") || keys.has("ArrowUp")) move.addInPlace(forward);
    if (keys.has("KeyS") || keys.has("ArrowDown")) move.subtractInPlace(forward);
    if (keys.has("KeyA") || keys.has("ArrowLeft")) move.subtractInPlace(right);
    if (keys.has("KeyD") || keys.has("ArrowRight")) move.addInPlace(right);
    if (vertical && keys.has("Space")) move.y += 0.7;
    if (vertical && (keys.has("ShiftLeft") || keys.has("ShiftRight"))) move.y -= 0.7;
    if (move.lengthSquared() > 0.001) {
      move.normalize();
      camera.position.addInPlace(move.scale(speed * dt));
      root.rotation.y = Math.atan2(forward.x, forward.z);
    }
    const rideOffset = model === "submarine" ? new Vector3(0, -0.15, 0) : new Vector3(0, -1.15, 0);
    root.position.copyFrom(camera.position).addInPlace(rideOffset);
    root.rotation.z = Math.sin(t * 3) * 0.04;
    root.rotation.x = move.z * -0.02;
    light.position.copyFrom(root.position.add(new Vector3(0, 1.2, 0)));
    light.intensity = 1.8;
  });

  return {
    root,
    type: model,
    isMounted: () => mounted,
    mount,
    dismount,
    dispose: () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      scene.onBeforeRenderObservable.remove(observer);
      light.dispose();
      meshes.forEach((mesh) => mesh.dispose());
      root.dispose();
    },
  };
}

function buildVehicleMesh(
  scene: Scene,
  root: TransformNode,
  model: VehicleType,
  hue: number,
): Mesh[] {
  const bodyMat = pbr(scene, {
    baseColor: hsl(hue, 0.62, 0.32),
    metallic: 0.85,
    roughness: 0.22,
    emissive: hsl(hue, 0.85, 0.16),
  });
  const trimMat = glow(scene, hsl(hue + 30, 1, 0.62), 1.5);
  const darkMat = pbr(scene, {
    baseColor: new Color3(0.015, 0.02, 0.035),
    metallic: 0.7,
    roughness: 0.35,
  });
  const meshes: Mesh[] = [];
  const add = (mesh: Mesh, material: Material = bodyMat) => {
    mesh.parent = root;
    mesh.material = material;
    meshes.push(mesh);
    return mesh;
  };

  if (model === "hoverboard") {
    add(MeshBuilder.CreateBox("hoverboard-deck", { width: 2.5, height: 0.18, depth: 0.72 }, scene));
    const railA = add(
      MeshBuilder.CreateTorus("hoverboard-ring-a", { diameter: 0.58, thickness: 0.045 }, scene),
      trimMat,
    );
    railA.position.x = -0.92;
    railA.rotation.x = Math.PI / 2;
    const railB = add(
      MeshBuilder.CreateTorus("hoverboard-ring-b", { diameter: 0.58, thickness: 0.045 }, scene),
      trimMat,
    );
    railB.position.x = 0.92;
    railB.rotation.x = Math.PI / 2;
  } else if (model === "speeder") {
    const body = add(
      MeshBuilder.CreateBox("speeder-body", { width: 1.35, height: 0.5, depth: 2.8 }, scene),
    );
    body.position.y = 0.25;
    const nose = add(
      MeshBuilder.CreateCylinder(
        "speeder-nose",
        { diameterTop: 0.18, diameterBottom: 0.85, height: 1.5, tessellation: 16 },
        scene,
      ),
    );
    nose.rotation.x = Math.PI / 2;
    nose.position.z = 1.65;
    const engineA = add(
      MeshBuilder.CreateCylinder("speeder-engine-a", { diameter: 0.35, height: 1.1 }, scene),
      trimMat,
    );
    engineA.rotation.x = Math.PI / 2;
    engineA.position.set(-0.75, 0.05, -1.15);
    const engineB = add(
      MeshBuilder.CreateCylinder("speeder-engine-b", { diameter: 0.35, height: 1.1 }, scene),
      trimMat,
    );
    engineB.rotation.x = Math.PI / 2;
    engineB.position.set(0.75, 0.05, -1.15);
  } else if (model === "submarine") {
    const hull = add(
      MeshBuilder.CreateSphere(
        "sub-hull",
        { diameterX: 1.6, diameterY: 1.05, diameterZ: 3.1 },
        scene,
      ),
    );
    hull.position.y = 0.2;
    const dome = add(
      MeshBuilder.CreateSphere("sub-dome", { diameter: 0.85, segments: 16, slice: 0.55 }, scene),
      darkMat,
    );
    dome.position.y = 0.82;
    const prop = add(
      MeshBuilder.CreateTorus(
        "sub-prop",
        { diameter: 0.72, thickness: 0.07, tessellation: 24 },
        scene,
      ),
      trimMat,
    );
    prop.rotation.x = Math.PI / 2;
    prop.position.z = -1.75;
  } else {
    const spine = add(
      MeshBuilder.CreateBox("glider-spine", { width: 0.25, height: 0.15, depth: 2.2 }, scene),
    );
    spine.position.y = 0.05;
    const wingL = add(
      MeshBuilder.CreateBox("glider-wing-l", { width: 2.2, height: 0.08, depth: 0.85 }, scene),
    );
    wingL.position.set(-1.05, 0, 0.1);
    wingL.rotation.z = -0.16;
    const wingR = add(
      MeshBuilder.CreateBox("glider-wing-r", { width: 2.2, height: 0.08, depth: 0.85 }, scene),
    );
    wingR.position.set(1.05, 0, 0.1);
    wingR.rotation.z = 0.16;
    const tail = add(
      MeshBuilder.CreateBox("glider-tail", { width: 0.8, height: 0.07, depth: 0.55 }, scene),
      trimMat,
    );
    tail.position.z = -1.05;
  }

  return meshes;
}
