import {
  AbstractMesh,
  HavokPlugin,
  Mesh,
  MeshBuilder,
  PhysicsAggregate,
  PhysicsShapeType,
  Scene,
  Vector3,
} from "@babylonjs/core";
import HavokPhysics from "@babylonjs/havok";
import { pbr, hsl } from "./graphics";

export interface HavokController {
  plugin: HavokPlugin;
  addStaticGround: (mesh: AbstractMesh) => PhysicsAggregate | null;
  addDynamicBox: (pos: Vector3, size?: Vector3 | number) => Mesh | null;
  addDynamicSphere: (pos: Vector3, diameter?: number) => Mesh | null;
  makeDynamic: (mesh: AbstractMesh) => PhysicsAggregate | null;
}

let havokRuntimePromise: ReturnType<typeof HavokPhysics> | null = null;

async function getHavokRuntime() {
  havokRuntimePromise ??= HavokPhysics();
  return havokRuntimePromise;
}

/**
 * Lazy-load Havok WASM and enable Babylon Physics V2 for a scene.
 *
 * Returns null if the WASM payload cannot be fetched/compiled, so walkable worlds
 * keep running in no-physics mode on restricted browsers/CDNs.
 */
export async function enableHavok(scene: Scene): Promise<HavokController | null> {
  try {
    const havok = await getHavokRuntime();
    const plugin = new HavokPlugin(true, havok);
    scene.enablePhysics(new Vector3(0, -9.81, 0), plugin);

    const controller: HavokController = {
      plugin,
      addStaticGround: (mesh) => {
        try {
          return new PhysicsAggregate(
            mesh,
            PhysicsShapeType.MESH,
            { mass: 0, friction: 0.9 },
            scene,
          );
        } catch (error) {
          console.warn("[havok] failed to add static ground", error);
          return null;
        }
      },
      addDynamicBox: (pos, size = 1) => {
        try {
          const scale = typeof size === "number" ? new Vector3(size, size, size) : size;
          const box = MeshBuilder.CreateBox(
            "dynamic-box",
            { width: scale.x, height: scale.y, depth: scale.z },
            scene,
          );
          box.position.copyFrom(pos);
          box.material = pbr(scene, {
            baseColor: hsl(205, 0.7, 0.55),
            metallic: 0.45,
            roughness: 0.35,
            emissive: hsl(205, 0.8, 0.18),
          });
          new PhysicsAggregate(
            box,
            PhysicsShapeType.BOX,
            { mass: 1, friction: 0.55, restitution: 0.25 },
            scene,
          );
          return box;
        } catch (error) {
          console.warn("[havok] failed to add dynamic box", error);
          return null;
        }
      },
      addDynamicSphere: (pos, diameter = 1) => {
        try {
          const sphere = MeshBuilder.CreateSphere(
            "dynamic-sphere",
            { diameter, segments: 18 },
            scene,
          );
          sphere.position.copyFrom(pos);
          sphere.material = pbr(scene, {
            baseColor: hsl(290, 0.75, 0.55),
            metallic: 0.55,
            roughness: 0.28,
            emissive: hsl(290, 0.8, 0.18),
          });
          new PhysicsAggregate(
            sphere,
            PhysicsShapeType.SPHERE,
            { mass: 1, friction: 0.45, restitution: 0.45 },
            scene,
          );
          return sphere;
        } catch (error) {
          console.warn("[havok] failed to add dynamic sphere", error);
          return null;
        }
      },
      makeDynamic: (mesh) => {
        try {
          return new PhysicsAggregate(
            mesh,
            PhysicsShapeType.CONVEX_HULL,
            { mass: 1, friction: 0.5 },
            scene,
          );
        } catch (error) {
          console.warn("[havok] failed to make mesh dynamic", error);
          return null;
        }
      },
    };

    (scene.metadata as Record<string, unknown> | null) ??= {};
    scene.metadata!.havok = controller;
    return controller;
  } catch (error) {
    console.warn("[havok] Havok WASM unavailable; continuing without physics", error);
    (scene.metadata as Record<string, unknown> | null) ??= {};
    scene.metadata!.havok = null;
    return null;
  }
}
