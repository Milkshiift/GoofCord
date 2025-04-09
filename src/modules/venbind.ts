import { createRequire } from "node:module";
import type { Venbind as VenbindType } from "venbind";
import { getAsset } from "../utils.ts";
import { mainWindow } from "../windows/main/main.ts";

let venbind: VenbindType | undefined = undefined;
export function obtainVenbind() {
    if (venbind !== undefined || process.argv.some((arg) => arg === "--no-venbind")) return venbind;
    try {
        venbind = (createRequire(import.meta.url)(getAsset(`venbind-${process.platform}-${process.arch}.node`)));
    } catch (e: unknown) {
        console.error("Failed to import venbind", e);
    }
    return venbind;
}

export async function startVenbind() {
    const venbind = obtainVenbind();
    venbind?.defineErrorHandle((err: string) => {
        console.error("venbind error:", err);
    });
    venbind?.startKeybinds((id, keyup) => {
        if (mainWindow.isFocused()) return;
        mainWindow.webContents.send("keybinds:trigger", id, keyup);
    }, null);
}

export function setKeybinds<IPCHandle>(keybinds: { id: string; name?: string; shortcut?: string }[]) {
    venbind?.setKeybinds(keybinds);
}