import { definePatch } from "../patchManager";

export default definePatch({
	patches: [
		{
			find: ".systemBar,",
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
