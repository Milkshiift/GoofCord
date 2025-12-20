import type { Patch } from "@vencord/types/utils/types";

export interface PatchDefinition {
	patches: Omit<Patch, "plugin">[];
	condition?: () => boolean;
	[helperName: string]: unknown;
}

const IDENTIFIER_PATTERN = "(?:[A-Za-z_$][\\w$]*)";
const PATCHES = "__GOOFCORD_PATCHES__";
const GLOBALS = "GoofCordPatchGlobals";
const GLOBAL_REF = `window.${GLOBALS}`;

window[PATCHES] = window[PATCHES] || [];
window[GLOBALS] = window[GLOBALS] || {};

export const definePatch = (config: PatchDefinition) => config;

export function loadPatches(definitions: PatchDefinition[]) {
	for (const def of definitions) {
		const { patches, condition, ...helpers } = def;

		if (condition && !condition()) continue;

		Object.assign(window[GLOBALS], helpers);

		const readyPatches = patches.map(processPatch);
		window[PATCHES].push(...readyPatches);
	}
}

function processPatch(patch: Omit<Patch, "plugin">): Patch {
	const replacements = Array.isArray(patch.replacement) ? patch.replacement : [patch.replacement];

	return {
		...patch,
		plugin: "GoofCord",
		find: expandRegex(patch.find),
		replacement: replacements.map((rep) => ({
			match: expandRegex(rep.match),
			replace: linkHelpers(rep.replace.toString()),
		})),
	};
}

function expandRegex(input: string | RegExp): string | RegExp {
	if (input instanceof RegExp) {
		const source = input.source.replaceAll("\\i", IDENTIFIER_PATTERN);
		return new RegExp(source, input.flags);
	}
	return input.replaceAll("\\i", IDENTIFIER_PATTERN);
}

function linkHelpers(input: string): string {
	return input.replaceAll("$self", GLOBAL_REF);
}
