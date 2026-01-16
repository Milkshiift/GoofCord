// @ts-expect-error See /build/globbyGlob.ts
import patchModules from "glob-import:./patches/**/*.ts";
import { startDomOptimizer } from "./domOptimizer.ts";
import { fixNotifications } from "./notificationFix.ts";
import { loadPatches } from "./patchManager.ts";

if (window.goofcord.isVencordPresent()) {
	// biome-ignore lint/suspicious/noExplicitAny: Dynamic module import structure is not typed
	const patches = Object.values(patchModules).map((mod: any) => mod.default);
	loadPatches(patches);
}

fixNotifications();
startDomOptimizer();
