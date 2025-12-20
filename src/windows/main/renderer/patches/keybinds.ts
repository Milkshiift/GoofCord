import { definePatch } from "../patchManager";

export default definePatch({
	patches: [
		{
			find: "keybindActionTypes",
			replacement: [
				{ match: /\i\.isPlatformEmbedded/g, replace: "true" },
				{ match: /\(0,\i\.isDesktop\)\(\)/g, replace: "true" },
			],
		},
	],
});
