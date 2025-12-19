import { addPatch, scripts } from "./defaultScripts.ts";
// @ts-expect-error
import screensharePatch from "./scripts/screensharePatch.js" with { type: "text" };

addPatch({
	patches: [
		{
			find: "this.getDefaultGoliveQuality()",
			replacement: {
				match: /this\.getDefaultGoliveQuality\(\)/,
				replace: "$self.patchStreamQuality($&)",
			},
		},
	],
	// biome-ignore lint/suspicious/noExplicitAny: Needed
	patchStreamQuality(opts: any) {
		// @ts-expect-error
		const screenshareQuality = window.screenshareSettings;
		if (!screenshareQuality) return opts;

		const framerate = Number(screenshareQuality.framerate);
		const height = Number(screenshareQuality.resolution);
		const width = Math.round(height * (screen.width / screen.height));

		Object.assign(opts, {
			bitrateMin: 500000,
			bitrateMax: 8000000,
			bitrateTarget: 600000,
		});
		if (opts?.encode) {
			Object.assign(opts.encode, {
				framerate,
				width,
				height,
				pixelCount: height * width,
			});
		}
		Object.assign(opts.capture, {
			framerate,
			width,
			height,
			pixelCount: height * width,
		});
		return opts;
	},
});

scripts.push(["screensharePatch", screensharePatch]);
