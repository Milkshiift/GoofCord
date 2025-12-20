import { ipcMain } from "electron";

type AnyFunction = (...args: any[]) => any;

export const ipcHandleRegistry = {} as Record<string, AnyFunction>;
export const ipcOnRegistry = {} as Record<string, AnyFunction>;

export function registerHandle<TChannel extends string, THandler extends AnyFunction>(
    channel: TChannel,
    handler: THandler
): void {
    ipcHandleRegistry[channel] = handler;
    ipcMain.handle(channel, async (_event, ...args) => {
        return await handler(...args);
    });
}

export function registerOn<TChannel extends string, THandler extends AnyFunction>(
    channel: TChannel,
    handler: THandler
): void {
    ipcOnRegistry[channel] = handler;
    ipcMain.on(channel, (event, ...args) => {
        event.returnValue = handler(...args);
    });
}