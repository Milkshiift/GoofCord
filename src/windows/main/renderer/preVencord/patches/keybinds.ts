import { definePatch } from "../patchManager.ts";

export default definePatch({
	patches: [
		{
			find: "keybindActionTypes",
			replacement: [
				{ match: /\i\.isPlatformEmbedded/g, replace: "true" },
				{ match: /\(0,\i\.isDesktop\)\(\)/g, replace: "true" },

				{
					match: /(CUSTOM_KEYBINDS_SETTING.*?Component:\s*(?:function\(\)\{|\(\)=>)\s*(?:return\s*)?)\i\.\i(\s*\?)/,
					replace: "$1true$2"
				},
				{
					match: /(SYSTEM_CUSTOM_KEYBINDS_CATEGORY.*?useHeaderDecoration:\s*(?:function\(\)\{|\(\)=>)\s*(?:return\s*)?)\i\.\i(\s*\?)/,
					replace: "$1true$2"
				}
			],
		},
	],
});
