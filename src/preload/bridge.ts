import {contextBridge, ipcRenderer} from "electron";
import {injectTitlebar} from "./titlebar";

const CANCEL_ID = "desktop-capturer-selection__cancel";
const desktopCapturer = {
    getSources: (opts: any) => ipcRenderer.invoke("DESKTOP_CAPTURER_GET_SOURCES", opts)
};

interface IPCSources {
    id: string;
    name: string;
    thumbnail: HTMLCanvasElement;
}

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
    openSettingsWindow: () => ipcRenderer.send("openSettingsWindow")
});
