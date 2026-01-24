import { definePatch } from "../patchManager.ts";

export default definePatch({
	condition: () => window.goofcord.getConfig("customTitlebar"),
	patches: [
		{
			find: '"refresh-title-bar-small"',
			replacement: [
				{ match: /\i===\i\.PlatformTypes\.WINDOWS/g, replace: "true" },
				{ match: /\i===\i\.PlatformTypes\.WEB/g, replace: "false" },
			],
		},
		{
			find: ",setSystemTrayApplications",
			replacement: [
				{
					match: /\i\.window\.(close|minimize|maximize)/g,
					replace: "goofcord.window.$1",
				},
			],
		},
	],
});
