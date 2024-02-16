import {app, BrowserWindow, clipboard, ipcMain, shell} from "electron";
import {getCustomIcon, getDisplayVersion, getVersion} from "../utils";
import path from "path";
import os from "os";
import fs from "fs-extra";
import {getConfigLocation} from "../config/config";

let settingsWindow: BrowserWindow;
let instance: number = 0;
const userDataPath = app.getPath("userData");

export async function createSettingsWindow() {
    console.log("Creating a settings window.");
    instance = instance + 1;
    if (instance > 1) {
        settingsWindow?.show();
        settingsWindow?.restore();
    } else {
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

        ipcMain.on("openStorageFolder", async () => {
            await shell.openPath(path.join(userDataPath, "/storage/"));
        });
        ipcMain.on("openScriptsFolder", async () => {
            await shell.openPath(path.join(userDataPath, "/scripts/"));
        });
        ipcMain.on("openExtensionsFolder", async () => {
            await shell.openPath(path.join(userDataPath, "/extensions/"));
        });
        ipcMain.on("crash", async () => {
            process.crash();
        });
        ipcMain.on("copyDebugInfo", async () => {
            const settingsFileContent = await fs.promises.readFile(getConfigLocation(), "utf-8");
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
                settingsFileContent +
                "`"
            );
        });
        settingsWindow.webContents.setWindowOpenHandler(({url}) => {
            shell.openExternal(url);
            return {action: "deny"};
        });

        await settingsWindow.loadURL(`file://${path.join(__dirname, "/assets/html/settings.html")}`);

        settingsWindow.on("close", () => {
            instance = 0;
        });
    }
}