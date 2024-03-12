import {contextBridge, ipcRenderer} from "electron";
import {flashTitlebar, flashTitlebarWithText} from "./titlebar";

let windowCallback: (arg0: object) => void;
contextBridge.exposeInMainWorld("goofcord", {
    window: {
        show: () => ipcRenderer.send("window:Show"),
        hide: () => ipcRenderer.send("window:Hide"),
        minimize: () => ipcRenderer.send("window:Minimize"),
        maximize: () => ipcRenderer.send("window:Maximize")
    },
    titlebar: {
        flashTitlebar: (color: string) => flashTitlebar(color),
        flashTitlebarWithText: (color: string, text: string) => flashTitlebarWithText(color, text),
    },
    electron: process.versions.electron,
    version: ipcRenderer.sendSync("getAppVersion", "app-version"),
    packageVersion: ipcRenderer.sendSync("getPackageVersion", "app-version"),
    getConfig: async (toGet: string) => await ipcRenderer.invoke("config:getPermanentConfig", toGet),
    encryptMessage: (message: string) => ipcRenderer.invoke("encryptMessage", message),
    decryptMessage: (message: string) => ipcRenderer.sendSync("decryptMessage", message),
    openSettingsWindow: () => ipcRenderer.send("openSettingsWindow"),
    setBadgeCount: (count: number) => ipcRenderer.send("setBadgeCount", count),
    rpcListen: (callback: any) => { windowCallback = callback; } // https://github.com/Milkshiift/GoofCord-Scripts/blob/main/patches/AL11_richPresence.js
});

ipcRenderer.on("rpc", (_event, data: object) => {
    windowCallback(data);
});
