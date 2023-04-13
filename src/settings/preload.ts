import {contextBridge, ipcRenderer} from "electron";
import {addStyle} from "../utils";

const {shell} = require("electron");

console.log("GoofCord Settings");

contextBridge.exposeInMainWorld("settings", {
    save: (...args: any) => ipcRenderer.send("saveSettings", ...args),
    restart: () => ipcRenderer.send("restart"),
    saveAlert: (restartFunc: any) => ipcRenderer.send("saveAlert", restartFunc),
    get: (toGet: string) => ipcRenderer.invoke("getSetting", toGet),
    openThemesFolder: () => ipcRenderer.send("openThemesFolder"),
    openPluginsFolder: () => ipcRenderer.send("openPluginsFolder"),
    openStorageFolder: () => ipcRenderer.send("openStorageFolder"),
    openCrashesFolder: () => ipcRenderer.send("openCrashesFolder"),
    copyDebugInfo: () => ipcRenderer.send("copyDebugInfo"),
    crash: () => ipcRenderer.send("crash"),
    openExternalLink: (url: string) => shell.openExternal(url)
});

ipcRenderer.on("themeLoader", (event, message) => {
    addStyle(message);
});
