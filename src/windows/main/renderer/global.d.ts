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
		__GOOFCORD_PATCHES__: any[];
		GoofCordPatchGlobals: Record<string, any>;
	}
}
