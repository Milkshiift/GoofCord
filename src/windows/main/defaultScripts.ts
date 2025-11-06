import type { Patch } from "@vencord/types/utils/types";
import { ipcRenderer } from "electron";
import domOptimizer from "./scripts/domOptimizer.js" with { type: "text" };
import notificationFix from "./scripts/notificationFix.js" with { type: "text" };
import shelterPluginInit from "./scripts/shelterPluginInit.js" with { type: "text" };

let patchesScript = `
(() => {
if (!window.Vencord.Plugins.patches) return;
window.GCDP = {};
`;

interface PatchData {
	patches: Omit<Patch, "plugin">[];
	// biome-ignore lint/suspicious/noExplicitAny: Needed
	[key: string]: any;
}

export function addPatch(p: PatchData) {
	const { patches, ...globals } = p;

	patches.map((patch) => {
		if (!Array.isArray(patch.replacement)) patch.replacement = [patch.replacement];
		for (const r of patch.replacement) {
			if (typeof r.replace === "string") r.replace = r.replace.replaceAll("$self", "GCDP");
			if (typeof r.match !== "string") {
				// @ts-expect-error
				r.match = [r.match.source, r.match.flags];
			}
		}
		// @ts-expect-error
		patch.plugin = "GoofCord";
		return patch;
	});

	patchesScript += `
    window.Vencord.Plugins.patches.push(...${JSON.stringify(patches)}.map((patch)=>{
        for (const r of patch.replacement) {
            if (Array.isArray(r.match)) {
                r.match = new RegExp(r.match[0], r.match[1]);
            }
        }
        return patch;
    }));
    `;

	for (const globalF in globals) {
		patchesScript += `\nwindow.GCDP.${globalF}=function ${String(globals[globalF])}`;
	}
}

export const scripts: string[][] = [];

export function getDefaultScripts() {
	scripts.push(["notificationFix", notificationFix]);

	scripts.unshift(["vencordPatches", patchesScript + "})();"]);

	if (ipcRenderer.sendSync("config:getConfig", "domOptimizer")) {
		scripts.push(["domOptimizer", domOptimizer]);
	}

	if (ipcRenderer.sendSync("config:getConfig", "modNames").includes("shelter") && ipcRenderer.sendSync("config:getConfig", "installDefaultShelterPlugins")) {
		scripts.push(["shelterPluginInit", shelterPluginInit]);
	}

	return scripts;
}
