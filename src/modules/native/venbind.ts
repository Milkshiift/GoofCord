// @ts-nocheck Bun will not install venbind on macOS, so typescript won't compile with checks

import { createRequire } from "node:module";

import { isWayland } from "@root/src/utils.ts";
// @ts-expect-error
import venbindPath from "native-module:../../../assets/native/venbind-*.node";
import pc from "picocolors";
// @ts-ignore Venbind may not be installed on all platforms
import type { Venbind as VenbindType } from "venbind";

import { mainWindow } from "../../windows/main/main.ts";

const require = createRequire(import.meta.url);

let venbind: VenbindType | undefined;
let venbindLoadAttempted = false;

export async function obtainVenbind() {
	if (venbind !== undefined || process.argv.some((arg) => arg === "--no-venbind") || venbindLoadAttempted || !venbindPath) return venbind;
	try {
		venbind = require(venbindPath);
		if (!venbind) throw new Error("Venbind is undefined");
		await startVenbind(venbind);
		console.log(pc.green("[Venbind]"), "Loaded venbind");
	} catch (e: unknown) {
		console.error("Failed to import venbind", e);
	}
	venbindLoadAttempted = true;
	return venbind;
}

export async function startVenbind(venbind: VenbindType) {
	venbind?.defineErrorHandle((err: string) => {
		console.error("venbind error:", err);
	});
	venbind?.startKeybinds((id, keyup) => {
		if (!isWayland && mainWindow.isFocused()) return;
		mainWindow.webContents.send("keybinds:trigger", id, keyup);
	}, "io.github.milkshiift.GoofCord");
}

export async function setKeybinds<IPCHandle>(keybinds: { id: string; name?: string; shortcut?: string }[]) {
	console.log(pc.green("[Venbind]"), "Setting keybinds");
	(await obtainVenbind())?.setKeybinds(keybinds);
}

export async function isVenbindLoaded<IPCHandle>() {
	return (await obtainVenbind()) !== undefined;
}
