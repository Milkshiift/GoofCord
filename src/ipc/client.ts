import { ipcRenderer } from "electron";
import type { IpcHandleChannel, IpcOnChannel, IpcParams, IpcReturn } from "./types.ts";

export function invoke<T extends IpcHandleChannel>(
    channel: T,
    ...args: IpcParams<T>
): Promise<IpcReturn<T>> {
    return ipcRenderer.invoke(channel, ...args);
}

export function sendSync<T extends IpcOnChannel>(
    channel: T,
    ...args: IpcParams<T>
): IpcReturn<T> {
    return ipcRenderer.sendSync(channel, ...args);
}
