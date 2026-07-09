import {
  Camera,
  Color3,
  Mesh,
  MeshBuilder,
  PointerEventTypes,
  PointLight,
  Scene,
  StandardMaterial,
  Vector3,
} from "@babylonjs/core";
import { addItem, ITEM_BY_ID } from "@/lib/inventory";
import { glow, hsl } from "./graphics";
import { sfxSparkleBurst } from "@/lib/sound";

export interface InteractableDef {
  id: string;
  itemId: string;
  position: Vector3 | [number, number, number];
  quantity?: number;
  label?: string;
  hue?: number;
  autoCollectRadius?: number;
  interactRadius?: number;
}

export interface InteractableController {
  dispose: () => void;
  remaining: () => number;
}

interface PickupRecord {
  def: InteractableDef;
  root: Mesh;
  light: PointLight;
  collected: boolean;
  phase: number;
}

const toVector = (value: Vector3 | [number, number, number]) =>
  Array.isArray(value) ? new Vector3(value[0], value[1], value[2]) : value.clone();

export function spawnInteractables(
  scene: Scene,
  camera: Camera,
  defs: InteractableDef[],
): InteractableController {
  const records: PickupRecord[] = defs
    .filter((def) => ITEM_BY_ID[def.itemId])
    .map((def, index) => {
      const item = ITEM_BY_ID[def.itemId];
      const hue = def.hue ?? 180 + ((index * 37) % 160);
      const pos = toVector(def.position);
      const root = MeshBuilder.CreateIcoSphere(
        `pickup-${def.id}`,
        { radius: 0.55, subdivisions: 2 },
        scene,
      );
      root.position.copyFrom(pos);
      root.material = glow(scene, hsl(hue, 0.95, 0.62), 1.7);
      root.metadata = { ...(root.metadata ?? {}), interactableId: def.id };

      const ring = MeshBuilder.CreateTorus(
        `pickup-ring-${def.id}`,
        { diameter: 1.65, thickness: 0.055, tessellation: 36 },
        scene,
      );
      ring.parent = root;
      ring.rotation.x = Math.PI / 2;
      ring.material = glow(scene, hsl(hue + 24, 1, 0.66), 1.35);
      ring.metadata = { ...(ring.metadata ?? {}), interactableId: def.id };

      const iconPlane = MeshBuilder.CreatePlane(`pickup-icon-${def.id}`, { size: 0.72 }, scene);
      iconPlane.parent = root;
      iconPlane.position.z = -0.61;
      const iconMat = new StandardMaterial(`pickup-icon-mat-${def.id}`, scene);
      iconMat.diffuseColor = new Color3(1, 1, 1);
      iconMat.emissiveColor = hsl(hue, 0.9, 0.72);
      iconMat.alpha = 0.18;
      iconPlane.material = iconMat;
      iconPlane.metadata = { ...(iconPlane.metadata ?? {}), interactableId: def.id };

      const light = new PointLight(`pickup-light-${def.id}`, pos.add(new Vector3(0, 1, 0)), scene);
      light.diffuse = hsl(hue, 1, 0.62);
      light.intensity = 0.7;
      light.range = 6;

      void item;
      return { def, root, light, collected: false, phase: Math.random() * Math.PI * 2 };
    });

  const collect = (record: PickupRecord) => {
    if (record.collected) return;
    record.collected = true;
    addItem(record.def.itemId, record.def.quantity ?? 1);
    const hue = record.def.hue ?? 190;
    sfxSparkleBurst(hue / 180 - 1);
    record.root.setEnabled(false);
    record.light.setEnabled(false);
  };

  const nearestCollectible = (radius: number) => {
    let best: PickupRecord | null = null;
    let bestDist = Infinity;
    for (const record of records) {
      if (record.collected) continue;
      const dist = Vector3.Distance(camera.position, record.root.getAbsolutePosition());
      if (dist < radius && dist < bestDist) {
        best = record;
        bestDist = dist;
      }
    }
    return best;
  };

  const frameObserver = scene.onBeforeRenderObservable.add(() => {
    const dt = scene.getEngine().getDeltaTime() / 1000;
    const t = performance.now() * 0.001;
    for (const record of records) {
      if (record.collected) continue;
      record.root.position.y += Math.sin(t * 2.3 + record.phase) * dt * 0.16;
      record.root.rotation.y += dt * 1.35;
      record.root.rotation.x = Math.sin(t + record.phase) * 0.18;
      record.light.position.copyFrom(record.root.position.add(new Vector3(0, 1.1, 0)));
      const autoRadius = record.def.autoCollectRadius ?? 1.65;
      if (Vector3.Distance(camera.position, record.root.getAbsolutePosition()) <= autoRadius)
        collect(record);
    }
  });

  const keyHandler = (event: KeyboardEvent) => {
    const target = event.target as HTMLElement | null;
    if (
      target &&
      (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
    )
      return;
    if (event.code !== "KeyE") return;
    const record = nearestCollectible(5.2);
    if (record) collect(record);
  };
  window.addEventListener("keydown", keyHandler);

  const pointerObserver = scene.onPointerObservable.add((pointerInfo) => {
    if (pointerInfo.type !== PointerEventTypes.POINTERDOWN) return;
    const pick = scene.pick(scene.pointerX, scene.pointerY, (mesh) =>
      Boolean(mesh.metadata?.interactableId),
    );
    const id = pick?.pickedMesh?.metadata?.interactableId;
    if (!id) return;
    const record = records.find((entry) => entry.def.id === id && !entry.collected);
    if (record) collect(record);
  });

  return {
    dispose: () => {
      scene.onBeforeRenderObservable.remove(frameObserver);
      scene.onPointerObservable.remove(pointerObserver);
      window.removeEventListener("keydown", keyHandler);
      records.forEach((record) => {
        record.root.dispose(false, true);
        record.light.dispose();
      });
    },
    remaining: () => records.filter((record) => !record.collected).length,
  };
}
