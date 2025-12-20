import { startDomOptimizer } from "./domOptimizer.ts";
import { fixNotifications } from "./notificationFix.ts";
// @ts-expect-error
import patchModules from "./patches/**/*.ts";
import { loadPatches } from "./patchManager.ts";
import { patchScreenshare } from "./screensharePatch.ts";
import { initShelterPlugins } from "./shelterPluginInit.ts";

// biome-ignore lint/suspicious/noExplicitAny: Dynamic module import structure is not typed
const patches = Object.values(patchModules).map((mod: any) => mod.default);
loadPatches(patches);

fixNotifications();
startDomOptimizer();
patchScreenshare();
void initShelterPlugins();
