/** Gateway — sprawling MegaHub city-mall walkable portal plaza. */
import type { WalkableSceneApi } from "../../WalkableHost";
import { buildMegaHub } from "../megaHub";

export function buildGateway(api: WalkableSceneApi) {
  buildMegaHub(api);
}
