import {app, BrowserWindow, clipboard, ipcMain, shell} from "electron";
import {getCustomIcon, getDisplayVersion, getVersion} from "../utils";
import path from "path";
import os from "os";
import {cachedConfig} from "../config";

let settingsWindow: BrowserWindow;
const userDataPath = app.getPath("userData");
let isOpen = false;

ipcMain.handle("openFolder", async (_event, folder: string) => {
    await shell.openPath(path.join(userDataPath, `/${folder}/`));
});
ipcMain.handle("crash", () => {
    process.crash();
});
ipcMain.handle("copyDebugInfo", () => {
    clipboard.writeText(
        "**OS:** " +
        os.platform() +
        " " +
        os.version() +
        "\n**Architecture:** " +
        os.arch() +
        "\n**GoofCord version:** " +
        getVersion() +
        "\n**Electron version:** " +
        process.versions.electron +
        "\n`" +
        JSON.stringify(cachedConfig) +
        "`"
    );
});

export async function createSettingsWindow() {
    if (isOpen) {
        settingsWindow.show();
        settingsWindow.restore();
        return;
    }

    console.log("Creating a settings window.");
    settingsWindow = new BrowserWindow({
        width: 660,
        height: 670,
        title: `GoofCord Settings | Version: ${getDisplayVersion()}`,
        darkTheme: true,
        frame: true,
        icon: getCustomIcon(),
        backgroundColor: "#2f3136",
        autoHideMenuBar: true,
        webPreferences: {
            sandbox: false,
            preload: path.join(__dirname, "/settings/preload.js"),
            nodeIntegrationInSubFrames: false,
            webSecurity: true,
            plugins: false,
            contextIsolation: true
        }
    });
    isOpen = true;

    settingsWindow.webContents.setWindowOpenHandler(({url}) => {
        shell.openExternal(url);
        return {action: "deny"};
    });

    await settingsWindow.loadURL(`file://${path.join(__dirname, "/assets/html/settings.html")}`);

    settingsWindow.on("close", () => {
        isOpen = false;
    });
}
