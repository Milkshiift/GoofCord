import {contextBridge, ipcRenderer} from "electron";

console.log("GoofCord Settings");

contextBridge.exposeInMainWorld("settings", {
    save: (...args: object[]) => ipcRenderer.send("saveSettings", ...args),
    restart: () => ipcRenderer.send("restart"),
    get: (toGet: string) => ipcRenderer.invoke("getSetting", toGet),
    openScriptsFolder: () => ipcRenderer.send("openScriptsFolder"),
    openExtensionsFolder: () => ipcRenderer.send("openExtensionsFolder"),
    openStorageFolder: () => ipcRenderer.send("openStorageFolder"),
    openCrashesFolder: () => ipcRenderer.send("openCrashesFolder"),
    copyDebugInfo: () => ipcRenderer.send("copyDebugInfo"),
    crash: () => ipcRenderer.send("crash"),
    flashTitlebar: (color: string) => ipcRenderer.send("flashTitlebar", color),
    encryptSafeStorage: (string: string) => ipcRenderer.invoke("encryptSafeStorage", string),
    decryptSafeStorage: (string: string) => ipcRenderer.invoke("decryptSafeStorage", string),
});