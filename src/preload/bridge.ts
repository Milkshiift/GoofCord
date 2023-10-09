import {contextBridge, ipcRenderer} from "electron";

contextBridge.exposeInMainWorld("goofcord", {
    window: {
        show: () => ipcRenderer.send("win-show"),
        hide: () => ipcRenderer.send("win-hide"),
        minimize: () => ipcRenderer.send("win-minimize"),
        maximize: () => ipcRenderer.send("win-maximize")
    },
    titlebar: {
        isTitlebar: ipcRenderer.sendSync("titlebar")
    },
    electron: process.versions.electron,
    version: ipcRenderer.sendSync("get-app-version", "app-version"),
    packageVersion: ipcRenderer.sendSync("get-package-version", "app-version"),
    userData: ipcRenderer.sendSync("get-user-data-path"),
    getEncryptionPassword: "TEST",
    openSettingsWindow: () => ipcRenderer.send("openSettingsWindow"),
    sendMessage: (message: string, channelId: string) => ipcRenderer.send("encryptMessage", message, channelId),
});

let windowCallback: (arg0: object) => void;
contextBridge.exposeInMainWorld("GoofCordRPC", {
    listen: (callback: (arg0: object) => void) => {
        windowCallback = callback;
    }
});
ipcRenderer.on("rpc", (_event, data: object) => {
    windowCallback(data);
});
