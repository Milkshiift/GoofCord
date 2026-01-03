import type { Patch } from "@vencord/types/utils/types";
import type { GoofCordApi } from "../preload/bridge.ts";
import type { KeybindApi } from "../preload/keybinds.ts";

declare global {
	let GoofCord: GoofCordApi;
	let VC: typeof import("@vencord/types/Vencord");
	let Common: typeof import("@vencord/types/Vencord")["Webpack"]["Common"];

	interface Window {
		goofcord: GoofCordApi;
		keybinds: KeybindApi;
		screenshareSettings: {
			framerate: number;
			resolution: number;
			contentHint?: string;
			width?: number;
		};
		invidiousInstance: string;
		__GOOFCORD_PATCHES__: Patch[];
		GoofCordPatchGlobals: Record<string, { [p: string]: unknown }>;
		Vencord: typeof import("@vencord/types/Vencord");
		// biome-ignore lint/suspicious/noExplicitAny: @vencord/types doesn't provide types for VencordNative
		VencordNative: any;
	}
}
