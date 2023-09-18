import {contextBridge, ipcRenderer} from "electron";

console.log("GoofCord Settings");

contextBridge.exposeInMainWorld("settings", {
    save: (...args: any) => ipcRenderer.send("saveSettings", ...args),
    restart: () => ipcRenderer.send("restart"),
    saveAlert: (restartFunc: unknown) => ipcRenderer.send("saveAlert", restartFunc),
    get: (toGet: string) => ipcRenderer.invoke("getSetting", toGet),
    openScriptsFolder: () => ipcRenderer.send("openScriptsFolder"),
    openPluginsFolder: () => ipcRenderer.send("openPluginsFolder"),
    openStorageFolder: () => ipcRenderer.send("openStorageFolder"),
    openCrashesFolder: () => ipcRenderer.send("openCrashesFolder"),
    copyDebugInfo: () => ipcRenderer.send("copyDebugInfo"),
    crash: () => ipcRenderer.send("crash"),
});