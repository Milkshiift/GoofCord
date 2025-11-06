import { createRequire } from "node:module";
import pc from "picocolors";
import type { Venbind as VenbindType } from "venbind";
import { getAsset } from "../utils.ts";
import { mainWindow } from "../windows/main/main.ts";

let venbind: VenbindType | undefined;
let venbindLoadAttempted = false;
export async function obtainVenbind() {
	if (venbind !== undefined || process.argv.some((arg) => arg === "--no-venbind") || venbindLoadAttempted) return venbind;
	try {
		venbind = createRequire(import.meta.url)(getAsset(`venbind-${process.platform}-${process.arch}.node`));
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
		if (mainWindow.isFocused()) return;
		mainWindow.webContents.send("keybinds:trigger", id, keyup);
	}, null);
}

export async function setKeybinds<IPCHandle>(keybinds: { id: string; name?: string; shortcut?: string }[]) {
	console.log(pc.green("[Venbind]"), "Setting keybinds");
	(await obtainVenbind())?.setKeybinds(keybinds);
}

export async function isVenbindLoaded<IPCHandle>() {
	return (await obtainVenbind()) !== undefined;
}
