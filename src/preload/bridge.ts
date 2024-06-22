import {contextBridge, ipcRenderer} from "electron";
import {flashTitlebar, flashTitlebarWithText} from "./titlebar";

contextBridge.exposeInMainWorld("goofcord", {
    window: {
        show: () => ipcRenderer.invoke("window:Show"),
        hide: () => ipcRenderer.invoke("window:Hide"),
        minimize: () => ipcRenderer.invoke("window:Minimize"),
        maximize: () => ipcRenderer.invoke("window:Maximize")
    },
    titlebar: {
        flashTitlebar: (color: string) => flashTitlebar(color),
        flashTitlebarWithText: (color: string, text: string) => flashTitlebarWithText(color, text),
    },
    electron: process.versions.electron,
    version: ipcRenderer.sendSync("getAppVersion", "app-version"),
    packageVersion: ipcRenderer.sendSync("getPackageVersion", "app-version"),
    getConfig: (toGet: string) => ipcRenderer.sendSync("config:getConfig", toGet),
    setConfig: (key: string, value: any) => ipcRenderer.invoke("config:setConfig", key, value),
    encryptMessage: (message: string) => ipcRenderer.invoke("encryptMessage", message),
    decryptMessage: (message: string) => ipcRenderer.sendSync("decryptMessage", message),
    openSettingsWindow: () => ipcRenderer.invoke("openSettingsWindow"),
    setBadgeCount: (count: number) => ipcRenderer.invoke("setBadgeCount", count),
    rpcListen: (callback: any) => { windowCallback = callback; }
});

let windowCallback: (data: object) => void;
ipcRenderer.on("rpc", (_event, data: object) => {
    windowCallback(data);
});
