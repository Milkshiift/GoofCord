import { startDomOptimizer } from "./domOptimizer.ts";
import { fixNotifications } from "./notificationFix.ts";
// @ts-expect-error
import patchModules from "./patches/**/*.ts";
import { loadPatches } from "./patchManager.ts";
import { patchScreenshare } from "./screensharePatch.ts";
import { initShelterPlugins } from "./shelterPluginInit.ts";

const patches = Object.values(patchModules).map((mod: any) => mod.default);
loadPatches(patches);

fixNotifications();
startDomOptimizer();
patchScreenshare();
void initShelterPlugins();
