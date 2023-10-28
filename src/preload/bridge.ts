import {contextBridge, ipcRenderer} from "electron";
import {flashTitlebar, flashTitlebarWithText} from "./titlebar";

let windowCallback: (arg0: object) => void;
contextBridge.exposeInMainWorld("goofcord", {
    window: {
        show: () => ipcRenderer.send("win-show"),
        hide: () => ipcRenderer.send("win-hide"),
        minimize: () => ipcRenderer.send("win-minimize"),
        maximize: () => ipcRenderer.send("win-maximize")
    },
    titlebar: {
        flashTitlebar: (color: string) => flashTitlebar(color),
        flashTitlebarWithText: (color: string, text: string) => flashTitlebarWithText(color, text),
    },
    electron: process.versions.electron,
    version: ipcRenderer.sendSync("get-app-version", "app-version"),
    packageVersion: ipcRenderer.sendSync("get-package-version", "app-version"),
    userData: ipcRenderer.sendSync("get-user-data-path"),
    encryptMessage: (message: string) => ipcRenderer.invoke("encryptMessage", message),
    decryptMessage: (message: string) => ipcRenderer.sendSync("decryptMessage", message),
    openSettingsWindow: () => ipcRenderer.send("openSettingsWindow"),
    sendMessage: (message: string, channelId: string) => ipcRenderer.send("encryptMessage", message, channelId),
    rpcListen: (callback: any) => { windowCallback = callback; } // https://github.com/Milkshiift/GoofCord-Scripts/blob/main/patches/AL11_richPresence.js
});

ipcRenderer.on("rpc", (_event, data: object) => {
    windowCallback(data);
});
