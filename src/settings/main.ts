import { BrowserWindow, ipcMain, shell } from "electron";
import { getCustomIcon, getDisplayVersion, userDataPath } from "../utils";
import path from "path";
import { clearCache } from "../modules/cacheManager";
import { deleteCloud, loadCloud, saveCloud } from "./cloud/cloud";

let settingsWindow: BrowserWindow;
let isOpen = false;

ipcMain.handle("deleteCloud", async () => {
    await deleteCloud();
});
ipcMain.handle("loadCloud", async () => {
    await loadCloud();
});
ipcMain.handle("saveCloud", async () => {
    await saveCloud();
});
ipcMain.handle("clearCache", async (_event) => {
    await clearCache();
});
ipcMain.handle("openFolder", async (_event, folder: string) => {
    await shell.openPath(path.join(userDataPath, `/${folder}/`));
});
ipcMain.handle("crash", () => {
    process.crash();
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
            nodeIntegrationInSubFrames: false
        }
    });
    isOpen = true;

    settingsWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: "deny" };
    });

    await settingsWindow.loadURL(`file://${path.join(__dirname, "/assets/html/settings.html")}`);

    settingsWindow.on("close", () => {
        isOpen = false;
    });
}
