/** Floating Islands — sky archipelago with bridges of light. */
import { MeshBuilder, Vector3 } from "@babylonjs/core";
import type { WalkableSceneApi } from "../../WalkableHost";
import {
  sky,
  hsl,
  pbr,
  glow,
  bindWalk,
  placeRingCollectibles,
  createBirdFlock,
  castShadow,
  onTick,
  nebulaParticles,
} from "./_kit";
import { Color4 } from "@babylonjs/core";

export function buildFloatingIslands(api: WalkableSceneApi) {
  const { scene } = api;
  sky(scene, 0.35, 0.55, 0.85);

  // Islands as flattened spheres
  const islands: Array<{ x: number; z: number; y: number; r: number }> = [
    { x: 0, z: 0, y: 0, r: 14 },
    { x: 28, z: 10, y: 4, r: 9 },
    { x: -24, z: 18, y: -2, r: 10 },
    { x: 15, z: -30, y: 6, r: 8 },
    { x: -30, z: -20, y: 3, r: 11 },
    { x: 40, z: -15, y: 8, r: 7 },
  ];

  islands.forEach((isl, i) => {
    const top = MeshBuilder.CreateCylinder(
      `isl${i}`,
      {
        diameter: isl.r * 2,
        height: 2,
        tessellation: 24,
      },
      scene,
    );
    top.position.set(isl.x, isl.y, isl.z);
    top.material = pbr(scene, {
      baseColor: hsl(130, 0.4, 0.3),
      metallic: 0.05,
      roughness: 0.85,
    });
    top.receiveShadows = true;
    const rock = MeshBuilder.CreateSphere(
      `rock${i}`,
      {
        diameterX: isl.r * 1.8,
        diameterY: isl.r * 1.2,
        diameterZ: isl.r * 1.8,
        segments: 10,
      },
      scene,
    );
    rock.position.set(isl.x, isl.y - isl.r * 0.5, isl.z);
    rock.material = pbr(scene, {
      baseColor: hsl(30, 0.2, 0.3),
      metallic: 0.1,
      roughness: 0.9,
    });
    castShadow(scene, rock);

    // Beacon
    const b = MeshBuilder.CreateIcoSphere(`b${i}`, { radius: 0.5, subdivisions: 1 }, scene);
    b.position.set(isl.x, isl.y + 2, isl.z);
    b.material = glow(scene, hsl(190 + i * 20, 1, 0.6), 1.8);
  });

  // Height: only solid on island tops (rough disk check)
  const sample = (x: number, z: number) => {
    let best = -80;
    for (const isl of islands) {
      const dx = x - isl.x;
      const dz = z - isl.z;
      if (dx * dx + dz * dz < isl.r * isl.r * 0.9) {
        best = Math.max(best, isl.y + 1);
      }
    }
    return best;
  };
  bindWalk(api, sample);

  // Light bridges between first few islands
  for (let i = 0; i < 4; i++) {
    const a = islands[i];
    const b = islands[i + 1];
    const mid = new Vector3((a.x + b.x) / 2, (a.y + b.y) / 2 + 1, (a.z + b.z) / 2);
    const dist = Vector3.Distance(new Vector3(a.x, a.y, a.z), new Vector3(b.x, b.y, b.z));
    const bridge = MeshBuilder.CreateBox(
      `br${i}`,
      { width: 1.2, height: 0.15, depth: dist },
      scene,
    );
    bridge.position.copyFrom(mid);
    bridge.lookAt(new Vector3(b.x, b.y + 1, b.z));
    bridge.material = glow(scene, hsl(195, 1, 0.6), 0.8);
  }

  nebulaParticles(scene, {
    count: 1200,
    color1: new Color4(1, 1, 1, 0.8),
    color2: new Color4(0.7, 0.85, 1, 0.6),
    minSize: 0.15,
    maxSize: 0.6,
    minEmitBox: new Vector3(-80, -20, -80),
    maxEmitBox: new Vector3(80, 40, 80),
    texture: "star",
  });

  const birds = createBirdFlock(scene, { count: 16, radius: 50, y: 18 });
  api.onDispose(() => birds.dispose());
  placeRingCollectibles(api, { radius: 6, y: 2, hue: 50 });
  onTick(api, (dt) => birds.update(dt));
}
