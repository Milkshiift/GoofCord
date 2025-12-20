import { definePatch } from "../patchManager";

export default definePatch({
	patches: [
		{
			find: '"mod+alt+i"',
			replacement: {
				match: /"discord\.com"===location\.host/,
				replace: "false",
			},
		},
		{
			find: "setDevtoolsCallbacks",
			replacement: {
				match: /if\(null!=i&&"0.0.0"===i\.remoteApp\.getVersion\(\)\)/,
				replace: "if(true)",
			},
		},
	],
});
