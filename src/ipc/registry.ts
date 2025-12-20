import { ipcMain } from "electron";

export type IpcHandler<Args extends unknown[], Return> = (...args: Args) => Promise<Return> | Return;

export const ipcHandleRegistry = new Map<string, IpcHandler<unknown[], unknown>>();
export const ipcOnRegistry = new Map<string, IpcHandler<unknown[], unknown>>();

export function registerHandle<Args extends unknown[], Return>(
    channel: string,
    handler: IpcHandler<Args, Return>
): void {
    ipcHandleRegistry.set(channel, handler as IpcHandler<unknown[], unknown>);

    ipcMain.handle(channel, async (_event, ...args) => {
        return handler(...(args as Args));
    });
}

export function registerOn<Args extends unknown[], Return>(
    channel: string,
    handler: IpcHandler<Args, Return>
): void {
    ipcOnRegistry.set(channel, handler as IpcHandler<unknown[], unknown>);

    ipcMain.on(channel, (event, ...args) => {
        event.returnValue = handler(...(args as Args));
    });
}