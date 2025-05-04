import { createRequire } from "node:module";
import type { Venbind as VenbindType } from "venbind";
import { getAsset } from "../utils.ts";
import { mainWindow } from "../windows/main/main.ts";
import pc from "picocolors";

let venbind: VenbindType | undefined = undefined;
let venbindLoaded = false;
export async function obtainVenbind() {
    if (venbind !== undefined || process.argv.some((arg) => arg === "--no-venbind") || venbindLoaded) return venbind;
    try {
        venbind = (createRequire(import.meta.url)(getAsset(`venbind-${process.platform}-${process.arch}.node`)));
        if (!venbind) throw new Error("Venbind is undefined");
        await startVenbind(venbind);
        console.log(pc.green("[Venbind]"), "Loaded venbind");
    } catch (e: unknown) {
        console.error("Failed to import venbind", e);
    }
    venbindLoaded = true;
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
    (await obtainVenbind())?.setKeybinds(keybinds);
}

export async function isVenbindLoaded<IPCHandle>() {
    return (await obtainVenbind()) !== undefined;
}