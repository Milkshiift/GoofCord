import { definePatch } from "../patchManager.ts";

export default definePatch({
	patches: [
		{
			find: ',"%"),maxWidth',
			replacement: {
				match: /(:[^,]+,src:[^\.]+.url)/,
				replace: "$1?.replace('https://www.youtube.com/embed/', (window.invidiousInstance ?? 'https://www.youtube.com')+'/embed/')+'?autoplay=1&player_style=youtube&local=true'",
			},
		},
	],
});
