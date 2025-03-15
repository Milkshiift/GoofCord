import { createRequire } from "node:module";
import { dialog } from "electron";
import type { Venbind as VenbindType } from "venbind";
import { getAsset } from "../utils.ts";
import { mainWindow } from "../windows/main/main.ts";

let venbind: VenbindType | undefined = undefined;
export function obtainVenbind() {
    if (venbind !== undefined) return venbind;
    try {
        venbind = (createRequire(import.meta.url)(getAsset(`venbind-${process.platform}-${process.arch}.node`)));
    } catch (e: unknown) {
        console.error("Failed to import venbind", e);
    }
    return venbind;
}

export async function startVenbind() {
    const venbind = obtainVenbind();
    venbind?.startKeybinds((id, keyup) => {
        console.log(`Keybind triggered: ${id} ${keyup}`);
        void mainWindow.webContents.executeJavaScript(`GCDP.triggerKeybind(${id}, ${keyup})`);
    });
}

export function registerKeybind<IPCHandle>(shortcut: string, id: number) {
    try {
        obtainVenbind()?.registerKeybind(shortcut, id);
    } catch (e: unknown) {
        console.error("Failed to register keybind", e);
        dialog.showErrorBox("Venbind error", e?.toString() || "");
    }
}

export function unregisterKeybind<IPCHandle>(id: number) {
    try {
        obtainVenbind()?.unregisterKeybind(id);
    } catch (e: unknown) {
        console.error("Failed to unregister keybind", e);
        dialog.showErrorBox("Venbind error", e?.toString() || "");
    }
}

export function preregisterKeybinds<IPCHandle>(actions: { id: number; name: string }[]) {
    try {
        obtainVenbind()?.preregisterKeybinds(actions);
    } catch (e: unknown) {
        console.error("Failed to preregister keybinds", e);
        dialog.showErrorBox("Venbind error", e?.toString() || "");
    }
}

export function shouldPreregister<IPCOn>() {
    return process.platform === "linux" && (process.env.XDG_SESSION_TYPE === "wayland" || !!process.env.WAYLAND_DISPLAY || !!process.env.VENBIND_USE_XDG_PORTAL);
}