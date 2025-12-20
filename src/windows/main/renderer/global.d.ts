import type { Patch } from "@vencord/types/utils/types";
import type { GoofCordApi } from "../preload/bridge";

declare global {
	interface Window {
		goofcord: GoofCordApi;
		screenshareSettings: {
			framerate: number;
			resolution: number;
			contentHint?: string;
			width?: number;
		};
		__GOOFCORD_PATCHES__: Patch[];
		GoofCordPatchGlobals: Record<string, { [p: string]: unknown }>;
		// biome-ignore lint/suspicious/noExplicitAny: Shelter
		shelter: any;
	}
}
