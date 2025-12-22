import type { Patch } from "@vencord/types/utils/types";
import type { GoofCordApi } from "../preload/bridge.ts";

declare global {
	let GoofCord: GoofCordApi;
	let VC: typeof import("@vencord/types/Vencord");
	let Common: typeof import("@vencord/types/Vencord")["Webpack"]["Common"];

	interface Window {
		goofcord: GoofCordApi;
		screenshareSettings: {
			framerate: number;
			resolution: number;
			contentHint?: string;
			width?: number;
		};
		invidiousInstance: string;
		__GOOFCORD_PATCHES__: Patch[];
		GoofCordPatchGlobals: Record<string, { [p: string]: unknown }>;
		// biome-ignore lint/suspicious/noExplicitAny: Shelter
		shelter: any;
		Vencord: typeof import("@vencord/types/Vencord");
	}
}
