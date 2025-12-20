import { definePatch } from "../patchManager";

export default definePatch({
	patches: [
		{
			find: "this.getDefaultGoliveQuality()",
			replacement: {
				match: /this\.getDefaultGoliveQuality\(\)/,
				replace: "$self.patchStreamQuality($&)",
			},
		},
	],
	// biome-ignore lint/suspicious/noExplicitAny: opts structure is unknown and comes from Discord
	patchStreamQuality(opts: any) {
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

		const videoParams = {
			framerate,
			width,
			height,
			pixelCount: height * width,
		};

		if (opts?.encode) Object.assign(opts.encode, videoParams);
		Object.assign(opts.capture, videoParams);

		return opts;
	},
});
